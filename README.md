# check_status_2107_01

A minimal Node.js HTTP server built with the [Express](https://expressjs.com/) web framework. It exposes two plain-text `GET` endpoints — a pre-existing `Hello world` response and a newly added `Good evening` response.

## Prerequisites

- **Node.js 22.x** (validated against Node.js v22.23.1)
- **npm** (validated against npm 11.18.0)

## Installation

Install the project dependencies:

```bash
npm install
```

This installs the `express` dependency declared in `package.json` and materializes the `node_modules/` directory together with a `package-lock.json` lockfile for reproducible installs. (`node_modules/` is git-ignored.)

## Running the server

Start the server:

```bash
npm start
```

This runs the `start` script defined in `package.json`, which executes `node server.js`. By default the server listens on **http://localhost:3000**. To use a different port, set the `PORT` environment variable before starting (the server reads `process.env.PORT || 3000`):

```bash
PORT=8080 npm start
```

## Endpoints

| Method | Path | Response body |
|--------|------|---------------|
| GET | `/` | `Hello world` |
| GET | `/good-evening` | `Good evening` |

- The `Hello world` response is served by the pre-existing `GET /` endpoint.
- The `Good evening` response is served by the newly added `GET /good-evening` endpoint.

With the server running on the default port, you can exercise both endpoints using `curl`:

```bash
curl http://localhost:3000/
# -> Hello world

curl http://localhost:3000/good-evening
# -> Good evening
```
