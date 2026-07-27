# check_status_2107_01

A minimal Node.js HTTP server built with the [Express](https://expressjs.com/) web framework. It exposes two plain-text `GET` endpoints — a pre-existing `Hello world` response and a newly added `Good evening` response.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer. Express 5 requires Node.js 18 or higher, so that same floor is declared as `engines.node` (`">= 18"`) in `package.json`.
- npm, which is bundled with Node.js.

## Installation

Install the project's single runtime dependency, `express`:

```bash
npm install
```

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

## Endpoints

| Method | Path | Response body | Status |
|--------|------|---------------|--------|
| `GET` | `/` | `Hello world` | 200 |
| `GET` | `/good-evening` | `Good evening` | 200 |

Both bodies are sent exactly as shown, with no trailing newline: `Hello world` is 11 bytes and `Good evening` is 12 bytes. Any other path returns status `404` with the generic body `Not Found`, and that response never echoes the requested path back.

Because each handler sends a string, Express applies its documented default of `Content-Type: text/html; charset=utf-8` and derives `Content-Length` and an `ETag` automatically. The bodies themselves are plain text; that header is a media type, not a rendered document.

## Example requests

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

Alongside the server, this repository holds a few unrelated Python scratch files. `600Kloc.py` generates the `large.csv` dataset by writing 600,000 rows of the form `<i>,Sample Data <i>`, and `asdas.py`, `sdfsd.py`, and `testing.py` are placeholders. They are independent of the Express server: it neither imports, runs, nor reads any of them, and none of them is served by an endpoint.
