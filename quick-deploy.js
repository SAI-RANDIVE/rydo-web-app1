/**
 * RYDO Web App - Quick Deployment Script
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create a simplified netlify.toml file
const netlifyToml = `[build]
  publish = "frontend"
  functions = "netlify/functions"
  command = "node netlify-deploy.js"
  
[build.environment]
  NODE_VERSION = "18"
  MONGODB_URI = "mongodb+srv://rydoapp:rydoapp123@cluster0.mongodb.net/rydo_db?retryWrites=true&w=majority"
  SESSION_SECRET = "rydo_secure_session_key_for_production_2025"
  GOOGLE_MAPS_API_KEY = "AIzaSyCeQRIk26TAxjwxFU0-YFV19lJf7Oe8sjc"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/auth/*"
  to = "/.netlify/functions/auth/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/verification/*"
  to = "/.netlify/functions/verification/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

// Write simplified netlify.toml
fs.writeFileSync('netlify.toml', netlifyToml);
console.log('Created simplified netlify.toml');

// Run netlify-deploy.js to prepare frontend files
try {
  require('./netlify-deploy');
  console.log('Frontend files prepared successfully');
} catch (error) {
  console.error('Error preparing frontend files:', error);
  process.exit(1);
}

// Deploy to Netlify
console.log('Deploying to Netlify...');
try {
  execSync('netlify deploy --prod --dir=frontend --functions=netlify/functions', { stdio: 'inherit' });
  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error);
  process.exit(1);
}
