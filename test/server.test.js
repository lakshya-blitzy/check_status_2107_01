'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const SERVER_PATH = path.join(__dirname, '..', 'server.js');

// Bound requests, startup, teardown, and each test because node:test has no default timeout.
const REQUEST_TIMEOUT_MS = 5000;
const READY_TIMEOUT_MS = 5000;
const TERMINATION_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 100;
const TEST_OPTIONS = { timeout: 45000 };
// A probed free port can be claimed by another process before the child binds it, so
// the whole allocate-spawn-await sequence is retried rather than trusted once.
const START_ATTEMPTS = 3;

let startup = null;
let server = null;
let teardownRegistered = false;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

// redirect: 'manual' is what keeps every assertion specific to the route under test. Under
// fetch's default 'follow' mode a handler that answers with a redirect would be judged by the
// final response of the chain, so a wrong route could borrow another URL's status, body, and
// headers - and the runner could be steered to an unintended destination. Manual mode returns
// the 3xx the requested route actually emitted, which fails the assertion instead of hiding it.
function request(url) {
  return fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function spawnServer(port) {
  const child = spawn(process.execPath, [SERVER_PATH], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });
  const state = { child, port, baseUrl: `http://127.0.0.1:${port}`, error: null };
  // A ChildProcess emits 'error' for a failed spawn AND for a failed kill, so it can fire more
  // than once and an unhandled one would throw. This listener therefore stays attached for the
  // child's whole life and only records the error - it never claims the process is gone.
  child.on('error', (error) => {
    state.error = error;
  });
  // Do not let the child handle keep the runner alive; registered teardown still terminates it.
  child.unref();
  return state;
}

// Only the child's own exit state proves the process is gone. An 'error' event does not: kill()
// can fail on a process that is still running, and a failed spawn reports exitCode without ever
// emitting 'exit'. Lifecycle decisions (waiting, escalating signals, the last-resort SIGKILL)
// must consult this, never the error field.
function hasExited(state) {
  return state.child.exitCode !== null || state.child.signalCode !== null;
}

// Why the child cannot serve requests, or null while it is healthy. Unlike hasExited(), a
// recorded error counts here: a child that failed to spawn cannot answer either.
function childFailure(state) {
  if (hasExited(state)) {
    return `it exited (code ${state.child.exitCode}, signal ${state.child.signalCode})`;
  }
  if (state.error) {
    return `it reported an error (${state.error.message})`;
  }
  return null;
}

async function waitUntilServing(state) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    if (childFailure(state)) return 'dead';
    try {
      const res = await request(`${state.baseUrl}/`);
      await res.text();
      // Any answered request proves the listener is bound, whatever status it carried. Readiness
      // deliberately does not require a 2xx: judging status or body here would let a single
      // broken route stall startup and mask every other endpoint's result, and those contracts
      // are owned by the five tests below.
      // Allow a pending EADDRINUSE exit to surface before declaring this child ready.
      await delay(POLL_INTERVAL_MS);
      return childFailure(state) ? 'dead' : 'serving';
    } catch {
      // server not up yet
    }
    if (Date.now() >= deadline) return 'timeout';
    await delay(POLL_INTERVAL_MS);
  }
}

async function waitForExit(state, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (!hasExited(state) && Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
  }
  return hasExited(state);
}

async function terminate(state) {
  if (!state || hasExited(state)) return;
  // Signal, then wait for a real exit. kill() reporting false and any 'error' it triggers are
  // both treated as "still running", so the escalation to SIGKILL happens instead of being
  // skipped on the assumption that the child is already dead.
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    state.child.kill(signal);
    if (await waitForExit(state, TERMINATION_TIMEOUT_MS)) return;
  }
  const lastError = state.error ? `; last child error: ${state.error.message}` : '';
  throw new Error(`server.js (pid ${state.child.pid}) survived SIGTERM and SIGKILL${lastError}`);
}

// Early Node 18 releases lack node:test lifecycle hooks, so process events own cleanup.
// beforeExit can schedule async termination; exit provides a synchronous SIGKILL fallback.
function registerTeardown() {
  if (teardownRegistered) return;
  teardownRegistered = true;
  process.once('beforeExit', () => {
    terminate(server).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  });
  process.once('exit', () => {
    // Actual exit state decides this last resort; an earlier kill error must not skip the signal.
    if (server && !hasExited(server)) server.child.kill('SIGKILL');
  });
}

async function startServer() {
  const failures = [];
  for (let attempt = 1; attempt <= START_ATTEMPTS; attempt += 1) {
    const state = spawnServer(await findFreePort());
    server = state;
    registerTeardown();
    const outcome = await waitUntilServing(state);
    if (outcome === 'serving') return state;
    const reason = childFailure(state) || 'it answered no request in time';
    failures.push(`attempt ${attempt} on port ${state.port}: ${reason}`);
    await terminate(state);
    server = null;
  }
  throw new Error(`${SERVER_PATH} never became ready - ${failures.join('; ')}`);
}

async function serverBaseUrl() {
  if (!startup) startup = startServer();
  const state = await startup;
  const failure = childFailure(state);
  assert.equal(failure, null, `the spawned server.js is unusable: ${failure}`);
  return state.baseUrl;
}

test('GET / returns exactly "Hello world"', TEST_OPTIONS, async () => {
  const baseUrl = await serverBaseUrl();
  const res = await request(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Hello world');
});

test('GET /good-evening returns exactly "Good evening"', TEST_OPTIONS, async () => {
  const baseUrl = await serverBaseUrl();
  const res = await request(`${baseUrl}/good-evening`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Good evening');
});

test('GET / still works after the new route was added (regression)', TEST_OPTIONS, async () => {
  const baseUrl = await serverBaseUrl();
  const res = await request(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Hello world');
});

test('unmatched paths return a generic 404 that does not reflect the path', TEST_OPTIONS, async () => {
  const baseUrl = await serverBaseUrl();
  const res = await request(`${baseUrl}/%3Cscript%3Ealert(1)%3C/script%3E`);
  assert.equal(res.status, 404);
  const body = await res.text();
  assert.equal(body, 'Not Found');
  assert.ok(!body.includes('script'));
  assert.ok(!body.includes('alert'));
  assert.ok(!body.includes('%3C'));

  // The two documented endpoints are exact-path contracts, so these near-misses are not aliases of
  // them: case variants, a trailing slash, and a doubled slash must all reach the same generic 404
  // rather than serving a 200. This guards the routing settings that make that true.
  for (const path of ['/GOOD-EVENING', '/Good-Evening', '/good-evening/', '//', '/nope']) {
    const variant = await request(`${baseUrl}${path}`);
    assert.equal(variant.status, 404, `${path} must not match a documented route`);
    assert.equal(await variant.text(), 'Not Found', `${path} must return the generic 404 body`);
  }
});

test('responses do not advertise the framework and set nosniff', TEST_OPTIONS, async () => {
  const baseUrl = await serverBaseUrl();
  const res = await request(`${baseUrl}/`);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});
