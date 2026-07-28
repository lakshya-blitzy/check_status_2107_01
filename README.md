# check_status_2107_01

A minimal Node.js HTTP server built with the [Express](https://expressjs.com/) web framework. It exposes two plain-text `GET` endpoints — a pre-existing `Hello world` response and a newly added `Good evening` response.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer. Express 5 requires Node.js 18 or higher, so that same floor is declared as `engines.node` (`">= 18"`) in `package.json`.
- npm, which is bundled with Node.js.

## Installation

Install the project's dependencies — `express` is the only one the project declares, and there are no development dependencies:

```bash
npm install
```

That one declared dependency resolves to `express@5.2.1` and brings its own transitive dependencies with it, so the installed tree is larger than the manifest: the committed `package-lock.json` pins every package in that tree — 67 in total — which lets `npm ci` reproduce it exactly.

## Running the server

```bash
npm start
# Listening on http://localhost:3000
```

The server listens on port `3000` by default. Set the `PORT` environment variable to bind a different port:

```bash
PORT=8080 npm start
# Listening on http://localhost:8080
```

If the port cannot be bound, the server writes `Failed to listen on port <port>: <reason>` to stderr and exits with a non-zero status code instead of printing the listening line.

## Endpoints

| Method | Path | Response body | Status |
|--------|------|---------------|--------|
| `GET` | `/` | `Hello world` | 200 |
| `GET` | `/good-evening` | `Good evening` | 200 |

Both bodies are sent exactly as shown, with no trailing newline: `Hello world` is 11 bytes and `Good evening` is 12 bytes. The two paths are matched exactly: matching is case-sensitive and a trailing slash is significant, so `/GOOD-EVENING` and `/good-evening/` are not the `/good-evening` endpoint. Any other path returns status `404` with the generic body `Not Found`, and that response never echoes the requested path back.

Because each handler sends a string, Express applies its documented default of `Content-Type: text/html; charset=utf-8` and derives `Content-Length` and a weak `ETag` automatically. The bodies themselves are plain text; that header is a media type, not a rendered document. Every response also sets `X-Content-Type-Options: nosniff`, and the `X-Powered-By` header is disabled.

## Example requests

With the server running on the default port:

```bash
curl -s http://localhost:3000/
# Hello world

curl -s http://localhost:3000/good-evening
# Good evening
```

## Tests

```bash
npm test
```

`npm test` runs `node --test`, the test runner built into Node.js, which discovers `test/server.test.js` without any configuration. The suite starts `server.js` as a child process on an ephemeral port and asserts both response bodies, their status codes, the generic `404`, and the response headers over live HTTP. No third-party test framework is used.

## Repository contents

Alongside the server, this repository holds a few unrelated Python scratch files. `600Kloc.py` generates the `large.csv` dataset by writing 600,000 rows of the form `<i>,Sample Data <i>`, and `asdas.py`, `sdfsd.py`, and `testing.py` are placeholders. They are independent of the Express server: they share no process, module namespace, or data path with it, the server neither imports, runs, nor reads any of them, and none of them is served by an endpoint.
