#!/usr/bin/env node
'use strict';
const express = require('express');
const app = express();

const proxy = require('./util/index.js'); // Import the proxy handler from index.js
const PORT = process.env.PORT || 8080;

app.enable('trust proxy');  // Enable trust proxy if behind a proxy

// Define routes
app.get('/', proxy);  // Use proxy handler for root route
app.get('/favicon.ico', (req, res) => res.status(204).end());  // Favicon route



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
