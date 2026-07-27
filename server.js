/**
 * @file Minimal Express HTTP service for the `check_status_2107_01` repository.
 *
 * The service exposes two fixed-body `GET` endpoints — `/` answering
 * `Hello world` and `/good-evening` answering `Good evening` — plus a terminal
 * catch-all that answers every other path, and every unhandled method on a
 * known path, with a generic `404 Not Found`. It keeps no state, reads no
 * files, talks to no database, and takes exactly one configuration input: the
 * `PORT` environment variable, which falls back to `3000`.
 *
 * Several observable behaviours belong to Express 5 rather than to this file.
 * Each is cited beside the statement it affects so that a reader does not
 * misattribute framework defaults to project code:
 *
 * - the `text/html; charset=utf-8` content type of the plain-text bodies is
 *   applied at `node_modules/express/lib/response.js:L138`;
 * - the weak `ETag` comes from the `etag: 'weak'` default set at
 *   `node_modules/express/lib/application.js:L95`;
 * - the automatic `Allow: GET, HEAD` answer to `OPTIONS` is written by the
 *   router at `node_modules/router/index.js:L710`;
 * - `X-Powered-By` is enabled by default at
 *   `node_modules/express/lib/application.js:L94` and is switched off below.
 *
 * Verified toolchain: Node.js v22.23.1, express 5.2.1, router 2.2.0,
 * path-to-regexp 8.4.2; annotations validated with jsdoc 4.0.5.
 *
 * @module server
 * @requires express
 * @version 1.0.0
 * @license ISC
 */

// CommonJS modules are not strict by default — only ES modules are — and
// `package.json` declares `"type": "commonjs"`, so strict semantics have to be
// asked for explicitly. Without this directive an accidental assignment to an
// undeclared identifier would silently create a global instead of throwing.
'use strict';

// The three declarations below are documentation-only: they give the Express
// objects that reach the handlers a name JSDoc can resolve. Referencing the
// real framework types through the TypeScript-style dynamic-import type
// expression is deliberately avoided, because jsdoc 4.0.5 rejects that syntax as
// an "Invalid type expression", exits non-zero and silently discards every
// annotated type — a documentation failure that still looks like a successful
// build.
// Only the members this file actually touches are declared; the real Express
// request and response objects carry many more.

/**
 * The subset of the Express request object this service depends on.
 *
 * @typedef {object} ExpressRequest
 * @property {string} method HTTP verb of the incoming request, upper-cased by
 *   Node's HTTP parser. The catch-all compares it against `'OPTIONS'`.
 * @property {string} path Request path with the query string removed, used for
 *   the `ROUTE_PATHS` membership test in the catch-all.
 */

/**
 * The subset of the Express response object this service depends on.
 *
 * @typedef {object} ExpressResponse
 * @property {Function} set Sets a single response header, called as
 *   `res.set(name, value)`.
 * @property {Function} status Sets the numeric status code and returns the
 *   response object so further calls can be chained.
 * @property {Function} send Sends the body and ends the response. A string
 *   argument makes Express default the content type to HTML.
 */

/**
 * Continuation supplied by Express to a middleware function. Calling it hands
 * the request to the next matching layer; calling it with an error skips
 * straight to error-handling middleware.
 *
 * @callback ExpressNext
 * @param {Error} [err] Optional error that diverts the request to the
 *   error-handling chain instead of the next ordinary layer.
 * @returns {void}
 */

// Express is this project's only runtime dependency: `package.json` declares
// `"express": "^5.2.1"` and `package-lock.json` pins it to exactly 5.2.1 out of
// 68 locked packages. `require` rather than `import` because the manifest sets
// `"type": "commonjs"`; switching to ESM would break `npm start`, which runs
// this file directly as `node server.js`.
const express = require('express');

/**
 * The Express application instance: the single request dispatcher that owns the
 * router, the settings table and the layer stack registered below.
 *
 * Typed as `{object}` on purpose. The precise `express.Express` type cannot be
 * named through a dynamic-import type expression without breaking the jsdoc
 * 4.0.5 parser, and no local `@typedef` is worth writing for a value this file
 * only ever uses to register layers and to start listening.
 *
 * @constant {object} app
 * @memberof module:server
 */
const app = express();

// Express turns the `x-powered-by` setting ON by default: it is enabled during
// `defaultConfiguration` at express/lib/application.js:L94, and every response
// then receives `X-Powered-By: Express` from the guard at
// express/lib/application.js:L160-L161. Disabling the setting makes that guard
// false, which removes a header that discloses the server technology while
// giving a caller nothing it needs. This is the reason `X-Powered-By` is absent
// from every response documented in this file.
app.disable('x-powered-by');

/**
 * Answers the service root with the fixed greeting body `Hello world`.
 *
 * The handler reads nothing from the request, so its response is identical for
 * every caller and cannot be influenced by anything a client sends.
 *
 * @name GET /
 * @function
 * @memberof module:server
 * @param {ExpressRequest} req Incoming request. Unused: the response is a
 *   constant and no request value participates in producing it.
 * @param {ExpressResponse} res Response used to set the hardening header and
 *   to send the body.
 * @returns {void} Nothing. The response is completed by `res.send`.
 * @example
 * // Verified against a running instance (Node v22.23.1, express 5.2.1):
 * //   $ curl -i http://localhost:3000/
 * //   HTTP/1.1 200 OK
 * //   X-Content-Type-Options: nosniff
 * //   Content-Type: text/html; charset=utf-8
 * //   Content-Length: 11
 * //   ETag: W/"b-e1AsOh9IyGCa4hLN+2Od7jlnP14"
 * //
 * //   Hello world
 * @see README.md, section "API Reference" -> "GET /", which documents the same
 *   contract for consumers who never read the source.
 */
app.get('/', (req, res) => {
  // `res.send` below is handed a string, and Express then defaults the content
  // type to HTML (express/lib/response.js:L138 calls `this.type('html')`, with
  // the charset appended at response.js:L163), so this plain-text body travels
  // as `text/html; charset=utf-8`. That default is left exactly as it is; the
  // header below pins a browser to the declared type instead of letting it
  // sniff the bytes and reinterpret them as something else.
  res.set('X-Content-Type-Options', 'nosniff');

  // The body is a literal, never a template: nothing from the request is
  // interpolated, so there is no injection surface, and the 11-byte
  // `Content-Length` plus the weak `ETag` — weak because Express defaults
  // `etag` to `'weak'` at express/lib/application.js:L95 — are identical on
  // every request, which is what makes conditional requests cheap here.
  //
  // The handler is synchronous, so it needs no `try`/`catch` and no `.catch`
  // wrapper: Express 5 forwards a rejected promise returned by a handler to
  // error-handling middleware automatically, and there is no promise to reject.
  res.send('Hello world');
});

/**
 * Answers `/good-evening` with the fixed greeting body `Good evening`.
 *
 * Registered as a second, independent route rather than as a branch inside the
 * root handler, so that a request for an unrelated path still reaches the
 * catch-all below instead of receiving a greeting by accident.
 *
 * @name GET /good-evening
 * @function
 * @memberof module:server
 * @param {ExpressRequest} req Incoming request. Unused, for the same reason as
 *   the root handler: the response is a constant.
 * @param {ExpressResponse} res Response used to set the hardening header and
 *   to send the body.
 * @returns {void} Nothing. The response is completed by `res.send`.
 * @example
 * // Verified against a running instance (Node v22.23.1, express 5.2.1):
 * //   $ curl -i http://localhost:3000/good-evening
 * //   HTTP/1.1 200 OK
 * //   X-Content-Type-Options: nosniff
 * //   Content-Type: text/html; charset=utf-8
 * //   Content-Length: 12
 * //   ETag: W/"c-ak9U7+O0BzTfZwhjDzBQxAnHCaU"
 * //
 * //   Good evening
 * @see README.md, section "API Reference" -> "GET /good-evening", which
 *   documents the same contract for consumers who never read the source.
 */
app.get('/good-evening', (req, res) => {
  // Set for the same reason as on the root route, and set here rather than in a
  // shared middleware on purpose: with only two routes, a per-route header keeps
  // each endpoint's full contract readable in one place, and it guarantees the
  // header cannot be lost by a future reordering of the layer stack.
  res.set('X-Content-Type-Options', 'nosniff');

  // A different literal from the root route, so the observable contract differs
  // in exactly two places: `Content-Length` is 12 rather than 11, and the weak
  // `ETag` is derived from these bytes instead. Nothing else about the response
  // changes, which is why both endpoints are documented from one header table.
  res.send('Good evening');
});

// Kept immediately below the two `app.get` calls it mirrors: this set has to be
// updated in the same edit that adds or removes a route, or the OPTIONS
// carve-out in the catch-all would go stale — either denying method discovery on
// a new endpoint, or claiming it for a path that no longer exists.

/**
 * The paths that have a registered route, held as a `Set` so the catch-all's
 * membership test is a single O(1) lookup rather than a scan, and so the value
 * declares its own intent: an unordered collection of unique paths.
 *
 * It exists solely to let the catch-all recognise an `OPTIONS` request aimed at
 * a real endpoint and step aside, so Express's own automatic `Allow` responder
 * can answer it.
 *
 * @constant {Set<string>} ROUTE_PATHS
 * @memberof module:server
 */
const ROUTE_PATHS = new Set(['/', '/good-evening']);

// Registration order is dispatch order: Express walks its layer stack in the
// order the layers were added, so this catch-all is registered last on purpose.
// Moving it above the two routes would make it answer 404 for every request,
// including `/`.
//
// It is a terminal `app.use` rather than a wildcard `app.get` route because
// Express 5 matches paths through router 2.2.0 and path-to-regexp 8.4.2, which
// require *named* wildcards: registering the bare `'*'` pattern now throws
// `PathError: Missing parameter name at index 1: *`, so a wildcard `app.get`
// catch-all would crash the process at start-up. The Express 5 spellings are
// `/*splat`, or `/{*splat}` when the root path must match too. A path-less
// `app.use` sidesteps that syntax change entirely and, unlike an `app.get`
// route, also catches unhandled methods such as `POST` — which is what makes a
// single layer sufficient here.

/**
 * Terminal catch-all: answers anything the two routes above did not handle with
 * a generic `404 Not Found`, and defers to Express for `OPTIONS` requests aimed
 * at a registered path.
 *
 * @name notFoundHandler
 * @function
 * @memberof module:server
 * @param {ExpressRequest} req Incoming request. Only `method` and `path` are
 *   read, and only to decide whether to defer to the router's OPTIONS
 *   responder.
 * @param {ExpressResponse} res Response used to set the status, the two
 *   hardening headers and the constant body.
 * @param {ExpressNext} next Continuation invoked for `OPTIONS` on a registered
 *   path, so the router's automatic `Allow` responder answers instead of this
 *   handler.
 * @returns {void} Nothing. The response is either completed by `res.send` or
 *   handed on by `next`.
 * @example
 * // Unmatched path — verified against a running instance:
 * //   $ curl -i http://localhost:3000/nope
 * //   HTTP/1.1 404 Not Found
 * //   X-Content-Type-Options: nosniff
 * //   Content-Security-Policy: default-src 'none'
 * //   Content-Type: text/html; charset=utf-8
 * //   Content-Length: 9
 * //
 * //   Not Found
 * @example
 * // Unmatched method on a known path — a byte-identical answer, verified:
 * //   $ curl -i -X POST http://localhost:3000/
 * //   HTTP/1.1 404 Not Found
 * //   Content-Security-Policy: default-src 'none'
 * //   Content-Length: 9
 * //
 * //   Not Found
 * @example
 * // OPTIONS on a known path — deferred, answered by Express itself, verified.
 * // Note the observed content type: the router writes its own, so this is the
 * // one response of the three that is not labelled text/html.
 * //   $ curl -i -X OPTIONS http://localhost:3000/
 * //   HTTP/1.1 200 OK
 * //   Allow: GET, HEAD
 * //   Content-Length: 9
 * //   Content-Type: text/plain
 * //   X-Content-Type-Options: nosniff
 * //
 * //   GET, HEAD
 * @see README.md, sections "API Reference" -> "Unmatched paths and methods
 *   (404)" and "OPTIONS and HEAD behaviour", which document both branches.
 */
app.use((req, res, next) => {
  // A path-less `app.use` layer runs for every method, OPTIONS included, and the
  // router deliberately ignores `.use` layers when it builds an `Allow` list
  // (router/index.js:L350-L352). Left alone, this handler would therefore
  // swallow method-discovery requests and answer 404 where a caller expects the
  // allowed verbs. Deferring instead — but only when the path really is
  // registered — hands the request back to the router, whose OPTIONS-aware
  // continuation (installed at router/index.js:L177-L179) writes the whole
  // response itself at router/index.js:L710-L714: `Allow`, `Content-Length`, a
  // content type of its own choosing and `nosniff`, then the allow list as the
  // body. `HEAD` appears in that list without being registered anywhere because
  // the router falls back to GET routes for HEAD requests
  // (router/index.js:L269).
  if (req.method === 'OPTIONS' && ROUTE_PATHS.has(req.path)) {
    // The `return` is load-bearing: without it execution would continue into
    // the 404 branch and this handler would try to answer a request it has just
    // delegated, which Node reports as "Cannot set headers after they are sent
    // to the client".
    return next();
  }

  // The status is set as its own statement rather than passed alongside the
  // body: Express 5 removed the two-argument `res.json(obj, status)` and
  // `res.jsonp(obj, status)` signatures, so a status is either set like this or
  // chained as `res.status(404).send(...)`. Setting it first also guarantees the
  // code is already 404 if a later line ever throws.
  res.status(404);

  // Set for the same reason as on the two 200 routes: `res.send` will label this
  // plain-text body `text/html; charset=utf-8` (express/lib/response.js:L138),
  // so the declared type is pinned rather than left for a browser to sniff. It
  // matters slightly more here, because error bodies are the ones most likely to
  // be rendered in a browser tab by accident.
  res.set('X-Content-Type-Options', 'nosniff');

  // Sent on the error path only. A 404 body is not a document: it must never
  // fetch a script, stylesheet, image or frame, and `default-src 'none'` denies
  // every fetch directive in one declaration. The two 200 responses are
  // deliberately excluded — they are the service's payload, not an error
  // surface, and a policy there would be a behavioural change rather than
  // hardening of an error page.
  res.set('Content-Security-Policy', "default-src 'none'");

  // The body is a constant that says nothing about the request: no path, no
  // method and no header is reflected back into the response (reflection
  // hardening, introduced as SEC-3 in commit 20b7616). One consequence is worth
  // knowing when reading traffic: a `POST /` and a `GET /nope` produce
  // byte-identical answers, so the response alone can never reveal which of the
  // two a client sent, and probing for valid paths learns nothing.
  res.send('Not Found');
});

// `process.env.PORT || 3000` is this service's only configuration input. Any
// non-empty value wins, and an unset or empty variable falls back to 3000 —
// the port `npm start` binds locally and the port every example in this file
// and in the README assumes. A platform that injects `PORT` therefore needs no
// code change.
//
// The value arrives from the environment as a string (`PORT=8080` becomes
// `'8080'`), which Node's `listen` accepts directly, so no numeric conversion is
// performed here. Binding happens after every layer above has been registered,
// so the stack is complete before the first connection can be accepted.
app.listen(process.env.PORT || 3000);

