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

function request(url) {
  return fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

function spawnServer(port) {
  const child = spawn(process.execPath, [SERVER_PATH], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });
  const state = { child, port, baseUrl: `http://127.0.0.1:${port}`, death: null };
  child.once('error', (error) => {
    state.death = `it could not be spawned (${error.message})`;
  });
  child.once('exit', (code, signal) => {
    state.death = `it exited (code ${code}, signal ${signal})`;
  });
  // Do not let the child handle keep the runner alive; registered teardown still terminates it.
  child.unref();
  return state;
}

async function waitUntilServing(state) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    if (state.death) return 'dead';
    try {
      const res = await request(`${state.baseUrl}/`);
      await res.text();
      if (res.ok) {
        // Allow a pending EADDRINUSE exit to surface before declaring this child ready.
        await delay(POLL_INTERVAL_MS);
        return state.death ? 'dead' : 'serving';
      }
    } catch {
      // server not up yet
    }
    if (Date.now() >= deadline) return 'timeout';
    await delay(POLL_INTERVAL_MS);
  }
}

async function waitForExit(state, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (state.death === null && Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
  }
  return state.death !== null;
}

async function terminate(state) {
  if (!state || state.death) return;
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    if (state.child.kill(signal) && await waitForExit(state, TERMINATION_TIMEOUT_MS)) return;
  }
  if (await waitForExit(state, TERMINATION_TIMEOUT_MS)) return;
  throw new Error(`server.js (pid ${state.child.pid}) survived SIGTERM and SIGKILL`);
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
    if (server && !server.death) server.child.kill('SIGKILL');
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
    const reason = state.death || 'it answered no request in time';
    failures.push(`attempt ${attempt} on port ${state.port}: ${reason}`);
    await terminate(state);
    server = null;
  }
  throw new Error(`${SERVER_PATH} never became ready - ${failures.join('; ')}`);
}

async function serverBaseUrl() {
  if (!startup) startup = startServer();
  const state = await startup;
  assert.equal(state.death, null, `the spawned server.js is gone: ${state.death}`);
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

test('unknown path returns a generic 404 that does not reflect the path', TEST_OPTIONS, async () => {
  const baseUrl = await serverBaseUrl();
  const res = await request(`${baseUrl}/%3Cscript%3Ealert(1)%3C/script%3E`);
  assert.equal(res.status, 404);
  const body = await res.text();
  assert.equal(body, 'Not Found');
  assert.ok(!body.includes('script'));
  assert.ok(!body.includes('alert'));
  assert.ok(!body.includes('%3C'));
});

test('responses do not advertise the framework and set nosniff', TEST_OPTIONS, async () => {
  const baseUrl = await serverBaseUrl();
  const res = await request(`${baseUrl}/`);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});
