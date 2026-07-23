/**
 * server.js
 * -----------------------------------------------------------------------------
 * Minimal Express HTTP server for the check_status_2107_01 tutorial project.
 *
 * Exposes two plain-text GET endpoints:
 *   GET /              -> "Hello world"   (pre-existing endpoint, preserved)
 *   GET /good-evening  -> "Good evening"  (new, additive endpoint)
 *
 * Any other request is answered by a catch-all handler with a generic "404 Not
 * Found" response whose body never reflects the request path (see below).
 *
 * Module system: CommonJS (require). The HTTP listener binds to the port given
 * by the PORT environment variable, falling back to 3000 when PORT is unset.
 *
 * Response-header hardening (behavior-preserving — response bodies and status
 * codes are unchanged):
 *   - "X-Powered-By" is disabled on every response so the server does not
 *     advertise the Express framework fingerprint (app.disable('x-powered-by')).
 *   - "X-Content-Type-Options: nosniff" is set on the 200 responses and on the
 *     custom 404 so the anti-MIME-sniffing header is applied consistently across
 *     all responses (Express's automatic OPTIONS response already emits nosniff).
 *
 * Unmatched-request handling:
 *   - A final catch-all handler returns a generic "404 Not Found" body that never
 *     echoes the request path, replacing Express's default final handler (which
 *     reflects the request target). It also sets "nosniff" and a locked-down
 *     "Content-Security-Policy: default-src 'none'", matching the default 404's
 *     header posture. OPTIONS requests to the two real routes still receive
 *     Express's automatic "Allow" method-discovery response.
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

// The set of real, registered route paths. Used only to decide when to defer to
// Express's built-in automatic OPTIONS responder in the catch-all below.
const ROUTE_PATHS = new Set(['/', '/good-evening']);

// Catch-all 404 handler for every request that does not match a route above.
//
// Express's default "final handler" answers unmatched requests with an HTML body
// that echoes the request target back to the client (e.g. "Cannot GET /<path>").
// Reflecting the attacker-controlled request path — even URL-encoded and inert —
// fails the project's no-reflection acceptance criterion, so this handler replaces
// that behavior with a generic, constant response that never includes the path.
//
// This must be registered AFTER the two routes (so real requests are handled by
// them first) and BEFORE app.listen(). It is defined with app.use() rather than
// app.get('*') because Express 5 (path-to-regexp v8) no longer accepts the bare
// "*" string pattern.
app.use((req, res, next) => {
  // Preserve Express's automatic OPTIONS method-discovery response ("200 Allow:
  // GET, HEAD") for the real routes by letting those requests fall through to the
  // framework's built-in handler. Every other unmatched request — including
  // OPTIONS against unknown paths — receives the generic 404 below, so no request
  // path is ever reflected.
  if (req.method === 'OPTIONS' && ROUTE_PATHS.has(req.path)) {
    return next();
  }

  // Generic 404: a constant body with no request-path reflection. The security
  // headers mirror the posture Express's default 404 already emitted
  // ("X-Content-Type-Options: nosniff" and a locked-down Content-Security-Policy),
  // so the only behavioral change versus the default is the removal of the
  // reflected path.
  res.status(404);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'");
  res.send('Not Found');
});

// Start listening for incoming HTTP requests. The listen port honors the PORT
// environment variable when set, otherwise defaults to 3000 for local/tutorial use.
app.listen(process.env.PORT || 3000);
