'use strict';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const SERVER_PATH = path.join(__dirname, '..', 'server.js');
let child;
let baseUrl;

// Ask the OS for a free ephemeral port so a stray server can never break the suite.
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

async function waitForReady(url, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
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

after(() => {
  if (child) child.kill();
});

test('GET / returns exactly "Hello world"', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Hello world');
});

test('GET /good-evening returns exactly "Good evening"', async () => {
  const res = await fetch(`${baseUrl}/good-evening`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Good evening');
});

test('GET / still works after the new route was added (regression)', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Hello world');
});

test('unknown path returns a generic 404 that does not reflect the path', async () => {
  const res = await fetch(`${baseUrl}/%3Cscript%3Ealert(1)%3C/script%3E`);
  assert.equal(res.status, 404);
  const body = await res.text();
  assert.equal(body, 'Not Found');
  assert.ok(!body.includes('script'));
  assert.ok(!body.includes('alert'));
  assert.ok(!body.includes('%3C'));
});

test('responses do not advertise the framework and set nosniff', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});
