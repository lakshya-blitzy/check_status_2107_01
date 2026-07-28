/**
 * @file Minimal Express HTTP service for the `check_status_2107_01` repository.
 *
 * The service exposes two fixed-body `GET` endpoints — `/` answering
 * `Hello world` and `/good-evening` answering `Good evening` — plus a terminal
 * catch-all that answers every other path with a generic `404 Not Found`. An
 * unhandled method on a known path receives that same 404, with one exception:
 * `OPTIONS` on one of the canonical registered paths is handed back to Express,
 * which answers it with `Allow: GET, HEAD`. The service keeps no state, reads
 * no files, talks to no database, and takes exactly one configuration input:
 * the `PORT` environment variable, which falls back to `3000`.
 *
 * Much of the observable response comes from Express 5 rather than from this
 * file: the `text/html; charset=utf-8` content type of the plain-text bodies,
 * the weak `ETag`, the conditional `304`, the bodyless `HEAD` reply, the
 * automatic `Allow` header, and `X-Powered-By` being on until it is switched
 * off. Each is cited to its source line beside the statement it affects, so a
 * reader does not misattribute a framework default to project code.
 *
 * The `@example` blocks transcribe observed responses without the `Date`,
 * `ETag` and connection headers.
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

/**
 * The Express factory, called once below to build the application instance.
 *
 * @constant {Function}
 * @memberof module:server
 */
// Express is this project's only runtime dependency: `package.json` declares
// `"express": "^5.2.1"` and `package-lock.json` pins it to exactly 5.2.1.
// `require` rather than `import` because this file and the manifest are both
// CommonJS.
const express = require('express');

/**
 * The Express application instance: the single request dispatcher that owns the
 * router, the settings table and the layer stack registered below.
 *
 * @constant {object}
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
 * Project code reads nothing from the request, so the body handed to `res.send`
 * is the same constant for every caller. What the client observes is still
 * request-dependent, because `res.send` consults the request before it writes:
 * a `HEAD` request receives the headers with the body suppressed
 * (express/lib/response.js:L216-L218), and a conditional request whose
 * validator still matches is downgraded to a bodyless `304` with
 * `Content-Type` and `Content-Length` removed (express/lib/response.js:L199
 * and L202-L207, over the `req.fresh` getter defined at
 * express/lib/request.js:L456-L469).
 *
 * @name GET /
 * @function
 * @memberof module:server
 * @param {ExpressRequest} req Incoming request. Never read by project code, so
 *   no request value takes part in building the body; Express itself still
 *   inspects it inside `res.send` for the behaviour described above.
 * @param {ExpressResponse} res Response used to set the hardening header and
 *   send the body.
 * @returns {void} Nothing. The response is completed by `res.send`.
 * @example
 * // An ordinary, non-conditional GET. A caller that returns the response's
 * // `ETag` in an `If-None-Match` header is answered `304` with no body.
 * //   $ curl -i http://localhost:3000/
 * //   HTTP/1.1 200 OK
 * //   X-Content-Type-Options: nosniff
 * //   Content-Type: text/html; charset=utf-8
 * //   Content-Length: 11
 * //
 * //   Hello world
 * @see README.md — the "API Reference" section, subsection "GET /", documents
 *   this same contract; change both together.
 */
app.get('/', (req, res) => {
  // `res.send` below is handed a string, and Express then defaults the content
  // type to HTML (express/lib/response.js:L138 calls `this.type('html')`, with
  // the charset appended at response.js:L163), so this plain-text body travels
  // as `text/html; charset=utf-8`. That default is left exactly as it is; the
  // header below pins a browser to the declared type instead of letting it
  // sniff the bytes and reinterpret them as something else.
  //
  // One visible consequence of that content type: a browser parses these bytes
  // as an HTML document, and because a bare greeting carries no doctype it
  // falls back to quirks mode (`document.compatMode` reads `BackCompat`) and
  // notes as much in its developer tools. There is no markup here to lay out,
  // so nothing renders differently, but the notice is expected on every load of
  // any of this service's responses rather than a symptom of a defect.
  res.set('X-Content-Type-Options', 'nosniff');

  // The body is a literal, never a template: nothing from the request is
  // interpolated, so there is no injection surface. The 11-byte
  // `Content-Length` and the weak `ETag` — weak because Express defaults
  // `etag` to `'weak'` at express/lib/application.js:L95 — are both derived
  // from these constant bytes, which is what makes a conditional 304 cheap.
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
 * @param {ExpressRequest} req Incoming request. Unused, and subject to the same
 *   Express `HEAD` and conditional-request behaviour as the root handler.
 * @param {ExpressResponse} res Response used to set the hardening header and
 *   send the body.
 * @returns {void} Nothing. The response is completed by `res.send`.
 * @example
 * //   $ curl -i http://localhost:3000/good-evening
 * //   HTTP/1.1 200 OK
 * //   X-Content-Type-Options: nosniff
 * //   Content-Type: text/html; charset=utf-8
 * //   Content-Length: 12
 * //
 * //   Good evening
 * @see README.md — the "API Reference" section, subsection "GET /good-evening",
 *   documents this same contract; change both together.
 */
app.get('/good-evening', (req, res) => {
  // Set for the same reason as on the root route, and set per route rather
  // than in a shared middleware: with only two routes, each endpoint's whole
  // response contract stays readable in one place.
  res.set('X-Content-Type-Options', 'nosniff');
  res.send('Good evening');
});

// Kept immediately below the two `app.get` calls it mirrors: this set has to be
// updated in the same edit that adds or removes a route, or the OPTIONS
// carve-out in the catch-all would go stale — either denying method discovery on
// a new endpoint, or claiming it for a path that no longer exists.

/**
 * The canonical, exact paths of the two routes registered above, held as a
 * `Set` so the catch-all's membership test is one O(1) lookup rather than a
 * scan.
 *
 * It exists solely to let the catch-all recognise an `OPTIONS` request aimed at
 * one of those exact paths and step aside, so Express's own automatic `Allow`
 * responder can answer it. Membership is exact string comparison, whereas
 * Express route matching is case-insensitive and tolerates a trailing slash
 * by default: `OPTIONS /GOOD-EVENING` and `OPTIONS /good-evening/` are
 * therefore not members here even though `GET` on those spellings reaches the
 * route.
 *
 * @constant {Set<string>}
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
 * a generic `404 Not Found`, and defers to Express for an `OPTIONS` request
 * aimed at one of the canonical registered paths.
 *
 * Not all of the traffic it answers is sent deliberately: a browser asks for
 * `/favicon.ico` by itself the first time it opens this service in a session,
 * and this handler replies with the same generic 404 it gives any other unknown
 * path — after which the browser remembers that failure for the origin and
 * stops re-requesting it on later pages. The 404 a browser reports for that
 * request is an artifact of the request it made on its own, not a fault in the
 * response the caller asked for.
 *
 * @name notFoundHandler
 * @function
 * @memberof module:server
 * @param {ExpressRequest} req Incoming request. Only `method` and `path` are
 *   read, and only to decide whether to defer to the router's OPTIONS
 *   responder.
 * @param {ExpressResponse} res Response used to set the status, the two
 *   hardening headers and the constant body.
 * @param {ExpressNext} next Continuation invoked for `OPTIONS` on one of the
 *   canonical registered paths, so the router's automatic `Allow` responder
 *   answers instead of this handler.
 * @returns {void} Nothing. The response is either completed by `res.send` or
 *   handed on by `next`.
 * @example
 * // Unmatched path:
 * //   $ curl -i http://localhost:3000/nope
 * //   HTTP/1.1 404 Not Found
 * //   X-Content-Type-Options: nosniff
 * //   Content-Security-Policy: default-src 'none'
 * //   Content-Type: text/html; charset=utf-8
 * //   Content-Length: 9
 * //
 * //   Not Found
 * @example
 * // An unhandled method on a known path returns the same status, body and
 * // headers: `curl -i -X POST http://localhost:3000/` answers `404 Not Found`.
 * @example
 * // OPTIONS on a canonical path is deferred and answered by the router, which
 * // writes a content type of its own rather than this file's text/html:
 * //   $ curl -i -X OPTIONS http://localhost:3000/
 * //   HTTP/1.1 200 OK
 * //   Allow: GET, HEAD
 * //   Content-Length: 9
 * //   Content-Type: text/plain
 * //   X-Content-Type-Options: nosniff
 * //
 * //   GET, HEAD
 * @see README.md — the "API Reference" subsections "Unmatched paths and methods
 *   (404)" and "OPTIONS and HEAD behaviour" document these same contracts;
 *   change both layers together.
 */
app.use((req, res, next) => {
  // A path-less `app.use` layer runs for every method, OPTIONS included, and
  // the router deliberately ignores `.use` layers when it builds an `Allow`
  // list (router/index.js:L350-L352). Left alone, this handler would swallow
  // method-discovery requests and answer 404 where a caller expects the allowed
  // verbs. Deferring instead — but only for a path this file really has
  // registered — hands the request back to the router, whose OPTIONS-aware
  // continuation (installed at router/index.js:L177-L179) writes the whole
  // response itself at router/index.js:L710-L714. `HEAD` appears in that allow
  // list without being registered anywhere because the router appends it to a
  // GET route's method list (router/lib/route.js:L79-L81, called from
  // router/index.js:L265); a HEAD request is then matched (route.js:L64-L66)
  // and dispatched (route.js:L111-L113) through the GET handler.
  if (req.method === 'OPTIONS' && ROUTE_PATHS.has(req.path)) {
    // The `return` is load-bearing: without it execution would continue into
    // the 404 branch and this handler would try to answer a request it has just
    // delegated, which Node reports as "Cannot set headers after they are sent
    // to the client".
    return next();
  }

  res.status(404);

  // Same reason as on the two 200 routes (express/lib/response.js:L138), and it
  // matters most here: an error body is the one most likely to be opened in a
  // browser tab by accident.
  res.set('X-Content-Type-Options', 'nosniff');

  // Sent on the error path only. A 404 body is not a document: it must never
  // fetch a script, stylesheet, image or frame, and `default-src 'none'` denies
  // every fetch directive in one declaration. The two 200 responses are
  // deliberately excluded — they are the service's payload, not an error
  // surface, and a policy there would be a behavioural change rather than
  // hardening of an error page.
  res.set('Content-Security-Policy', "default-src 'none'");

  // The body is a constant that says nothing about the request: no path, no
  // method and no header is reflected back into the response. An unmatched path
  // and an unhandled method on a known path therefore share one static status,
  // body and header set, so this response does not disclose which of the two
  // produced it. It is not a route-discovery defence: a registered path still
  // answers 200 where an unregistered one answers 404.
  res.send('Not Found');
});

// `process.env.PORT || 3000` is this service's only configuration input: any
// non-empty value wins and an unset or empty variable falls back to 3000, so a
// platform that injects `PORT` needs no code change. The value arrives as a
// string (`PORT=8080` becomes `'8080'`), which `listen` accepts directly.
//
// That value is handed on unvalidated, so it has to be an integer from 0 to
// 65535 — the range Node accepts as a TCP port — and everything else takes one
// of two very different paths. A value Node reads as a number but cannot use as
// a port fails loudly: `PORT=65536` is out of range, `PORT=8080.5` is not a
// whole number, and a whitespace-only `PORT=' '` is rejected outright, so each
// of them makes this line throw `RangeError [ERR_SOCKET_BAD_PORT]`, and the
// process then exits 1 without ever listening. `PORT=0` is inside the range but
// asks the kernel for any free port, so the service comes up on an
// unpredictable one rather than on 3000.
//
// A value that is not a number at all, or that is negative, means something
// else entirely. Node chooses between a TCP port and an inter-process socket by
// converting the argument with `Number()`, and a result that is `NaN` or below
// zero is read as a file-system path for the `server.listen(path)` overload:
// `PORT=abc`, `PORT=3000abc` and `PORT=-1` therefore bind a Unix-domain socket
// named `./abc`, `./3000abc` or `./-1` in the process working directory and no
// TCP port at all. The service does answer HTTP over that socket, but it prints
// nothing — this file logs nothing by design — and never exits, so a supervisor
// watching only process liveness reports a healthy deployment while every TCP
// client is refused, and the socket file outlives the process until something
// deletes it.
//
// `curl -sf http://localhost:$PORT/` tells those two apart: it exits 0 only
// when a TCP listener really answered, and 7 when nothing is bound there, which
// is why a deployment should be gated on that probe rather than on process
// liveness. Rejecting a malformed `PORT` here would change how the service
// behaves rather than describe it, so the constraint is documented instead. The
// README's Configuration and Troubleshooting sections carry the same contract;
// change both together.
//
// Binding last means every layer above is registered before the first
// connection can be accepted.
app.listen(process.env.PORT || 3000);
