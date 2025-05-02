/**
 * RYDO Web App - Ultra Simple Server
 * Minimal server for Render.com deployment
 */

const express = require('express');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3002;

// Basic middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.static('frontend'));

// Simple API endpoint to check server status
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', version: '1.0.0' });
});

// Simple mock authentication endpoints
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    token: 'demo-token-123',
    user: { name: 'Demo User', role: 'customer' }
  });
});

app.post('/api/auth/signup', (req, res) => {
  res.json({
    success: true,
    token: 'demo-token-456',
    user: { name: 'New User', role: 'customer' }
  });
});

// Serve static HTML pages
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'signup.html'));
});

app.get('/terms.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'terms.html'));
});

app.get('/privacy-policy.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'privacy-policy.html'));
});

// Default route serves index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
