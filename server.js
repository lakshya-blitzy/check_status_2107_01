'use strict';

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Express enables X-Powered-By by default; disabling it reduces framework fingerprinting.
app.disable('x-powered-by');

app.get('/', (req, res) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.send('Hello world');
});

app.get('/good-evening', (req, res) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.send('Good evening');
});

// Keep this middleware after the routes to replace Express's path-reflecting default 404.
app.use((req, res, next) => {
  const known = req.path === '/' || req.path === '/good-evening';
  // Narrow pass-through: keep Express's built-in OPTIONS responder reachable for known paths.
  if (req.method === 'OPTIONS' && known) {
    return next();
  }
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; sandbox");
  res.status(404).send('Not Found');
});

// Express 5 reports listener errors to this callback instead of throwing them.
app.listen(PORT, (error) => {
  if (error) {
    console.error(`Failed to listen on port ${PORT}: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Listening on http://localhost:${PORT}`);
});
