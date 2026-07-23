/**
 * server.js
 * -----------------------------------------------------------------------------
 * Minimal Express HTTP server for the check_status_2107_01 tutorial project.
 *
 * Exposes two plain-text GET endpoints:
 *   GET /              -> "Hello world"   (pre-existing endpoint, preserved)
 *   GET /good-evening  -> "Good evening"  (new, additive endpoint)
 *
 * Module system: CommonJS (require). The HTTP listener binds to the port given
 * by the PORT environment variable, falling back to 3000 when PORT is unset.
 *
 * Response-header hardening (behavior-preserving — response bodies and status
 * codes are unchanged):
 *   - "X-Powered-By" is disabled on every response so the server does not
 *     advertise the Express framework fingerprint (app.disable('x-powered-by')).
 *   - "X-Content-Type-Options: nosniff" is set on the 200 responses so the
 *     anti-MIME-sniffing header is applied consistently across all responses
 *     (Express's default 404/OPTIONS responses already emit nosniff).
 * -----------------------------------------------------------------------------
 */

'use strict';

// Import the Express web framework (declared in package.json as "express": "^5.2.1").
const express = require('express');

// Instantiate the Express application — this is the HTTP/routing layer.
const app = express();

// Suppress the framework fingerprint. Express enables the "X-Powered-By: Express"
// response header by default; disabling it removes that header from every
// response (200s and Express's 404s alike) without altering any response body,
// status code, or route behavior.
app.disable('x-powered-by');

// GET / — pre-existing endpoint. Responds with the exact plain-text body "Hello world".
// "X-Content-Type-Options: nosniff" is set before sending so this 200 response
// carries the same anti-MIME-sniffing header that Express's 404 responses emit,
// giving a consistent header posture across all responses.
app.get('/', (req, res) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.send('Hello world');
});

// GET /good-evening — new, additive endpoint. Responds with the exact body "Good evening".
// "X-Content-Type-Options: nosniff" is set before sending for the same consistent,
// anti-MIME-sniffing header posture as the root endpoint above.
app.get('/good-evening', (req, res) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.send('Good evening');
});

// Start listening for incoming HTTP requests. The listen port honors the PORT
// environment variable when set, otherwise defaults to 3000 for local/tutorial use.
app.listen(process.env.PORT || 3000);
