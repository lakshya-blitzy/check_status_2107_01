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
 * -----------------------------------------------------------------------------
 */

'use strict';

// Import the Express web framework (declared in package.json as "express": "^5.2.1").
const express = require('express');

// Instantiate the Express application — this is the HTTP/routing layer.
const app = express();

// GET / — pre-existing endpoint. Responds with the exact plain-text body "Hello world".
app.get('/', (req, res) => res.send('Hello world'));

// GET /good-evening — new, additive endpoint. Responds with the exact body "Good evening".
app.get('/good-evening', (req, res) => res.send('Good evening'));

// Start listening for incoming HTTP requests. The listen port honors the PORT
// environment variable when set, otherwise defaults to 3000 for local/tutorial use.
app.listen(process.env.PORT || 3000);
