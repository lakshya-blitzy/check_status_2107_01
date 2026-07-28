'use strict';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const SERVER_PATH = path.join(__dirname, '..', 'server.js');
let child;
let baseUrl;

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

// Every request passes redirect: 'manual' so each assertion stays specific to the route under test:
// fetch's default 'follow' would let a wrong route borrow another URL's status, body, and headers.
async function waitForReady(url, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      await res.text();
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

before(async () => {
  const port = await findFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, [SERVER_PATH], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });
  await waitForReady(`${baseUrl}/`);
});

// Only the child's own exit state proves it is gone, so termination escalates to SIGKILL.
after(async () => {
  if (!child) return;
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    child.kill(signal);
    const deadline = Date.now() + 2000;
    while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (child.exitCode !== null || child.signalCode !== null) return;
  }
  throw new Error(`server.js (pid ${child.pid}) survived SIGTERM and SIGKILL`);
});

test('GET / returns exactly "Hello world"', async () => {
  const res = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Hello world');
});

test('GET /good-evening returns exactly "Good evening"', async () => {
  const res = await fetch(`${baseUrl}/good-evening`, { redirect: 'manual' });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Good evening');
});

test('GET / still works after the new route was added (regression)', async () => {
  const res = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Hello world');
});

test('unmatched paths return a generic 404 that does not reflect the path', async () => {
  const res = await fetch(`${baseUrl}/%3Cscript%3Ealert(1)%3C/script%3E`, { redirect: 'manual' });
  assert.equal(res.status, 404);
  const body = await res.text();
  assert.equal(body, 'Not Found');
  assert.ok(!body.includes('script'));
  assert.ok(!body.includes('alert'));
  assert.ok(!body.includes('%3C'));
  // Exact-path contracts: case variants, a trailing slash, and a doubled slash must 404 as well.
  for (const near of ['/GOOD-EVENING', '/Good-Evening', '/good-evening/', '//', '/nope']) {
    const variant = await fetch(`${baseUrl}${near}`, { redirect: 'manual' });
    assert.equal(variant.status, 404, `${near} must not match a documented route`);
    assert.equal(await variant.text(), 'Not Found', `${near} must return the generic 404 body`);
  }
});

test('responses do not advertise the framework and set nosniff', async () => {
  const res = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});
