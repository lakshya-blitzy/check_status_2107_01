'use strict';

/**
 * check_status_2107_01 — Express HTTP service entry point.
 *
 * A minimal Node.js server built on the Express web framework, and the entire
 * runtime of this service: no router module, no service layer, no build step —
 * two constant-string endpoints do not warrant them.
 *
 * HTTP contract (the complete observable surface of this module):
 *
 *   GET /                          -> 200 "Hello world"  (11 bytes, no newline)
 *   GET /good-evening              -> 200 "Good evening" (12 bytes, no newline)
 *   OPTIONS on either known path   -> 200 with "Allow: GET, HEAD"
 *   anything else                  -> 404 "Not Found"    (never reflects the path)
 *
 * Two behaviours are intentional contracts rather than defects, so they are not
 * "corrected" here: (1) responses carry `Content-Type: text/html; charset=utf-8`,
 * Express's documented default for string bodies, from which `Content-Length` and
 * a weak `ETag` are derived automatically — those ETags are the fingerprint that
 * proves the bodies never drift by a byte, so neither header is overridden; and
 * (2) non-GET verbs on a known path answer 404, not 405, which is Express's
 * routing semantics for method-specific handlers.
 *
 * Configuration: the only tunable is the PORT environment variable (default 3000).
 * There is no config file and no dotenv dependency.
 *
 * The statement order below is load-bearing — see the comment on each step.
 *
 * @module server
 */

const express = require('express');

const app = express();

/**
 * Listening port. Defaults to 3000 so a plain `npm start` needs no configuration,
 * while deployment-time overrides remain possible via `PORT=<n> npm start`.
 */
const PORT = process.env.PORT || 3000;

// Express advertises itself with `X-Powered-By` by default. Disabling it removes
// that free fingerprint. Called once, before any route is registered. (This does
// not stop a determined attacker from identifying Express by other means.)
app.disable('x-powered-by');

// Baseline endpoint. Registered FIRST so its behaviour is unambiguous and provably
// unaffected by the endpoint added after it. The string is passed straight to
// `res.send` — no template, no serializer, no wrapper, no trailing newline.
app.get('/', (req, res) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.send('Hello world');
});

// The newly added endpoint. The path is a plain string, so Express matches it
// exactly and treats the hyphen literally: no escaping or pattern syntax needed.
app.get('/good-evening', (req, res) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.send('Good evening');
});

// Terminal middleware, sitting at the very bottom of the stack. In Express a 404
// is not an error, so error-handling middleware would never see it — an ordinary
// `app.use` handler registered below every route is the prescribed pattern. It is
// deliberately NOT a wildcard route: under path-to-regexp v8 (pulled in by
// router@2.2.0) an unnamed `'*'` pattern throws at registration.
//
// This replaces Express's stock 404 page, which echoes the requested path back to
// the caller. The body here is a fixed generic string and never interpolates
// `req.path`, `req.url` or `req.originalUrl`, so there is no reflection surface.
app.use((req, res, next) => {
  const known = req.path === '/' || req.path === '/good-evening';

  // One narrow pass-through: let Express's built-in OPTIONS responder answer
  // preflight-style probes for the two known paths with `Allow: GET, HEAD`
  // instead of masking them with a 404. Every other request falls through below.
  if (req.method === 'OPTIONS' && known) {
    return next();
  }

  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; sandbox");
  // Express 5 removed the `res.send(body, status)` overload; the status is chained.
  res.status(404).send('Not Found');
});

// Express 5 hands server `error` events to this callback instead of throwing them,
// which makes the callback the error channel: a failed bind (EADDRINUSE, EACCES,
// a privileged port) arrives here as `error`. It is reported with the port that
// could not be bound and the process is marked as failed via `process.exitCode`
// rather than `process.exit`, so buffered stdout/stderr still flushes cleanly.
app.listen(PORT, (error) => {
  if (error) {
    console.error(`Failed to listen on port ${PORT}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Listening on http://localhost:${PORT}`);
});
