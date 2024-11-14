#!/usr/bin/env node
'use strict';
const express = require('express');
const app = express();

const proxy = require('./index.js'); // Import the proxy handler from index.js

app.enable('trust proxy');  // Enable trust proxy if behind a proxy

// Define routes
app.get('/', proxy);  // Use proxy handler for root route
app.get('/favicon.ico', (req, res) => res.status(204).end());  // Favicon route

// Export the app
module.exports = app;
