/**
 * RYDO Web App - MongoDB Deployment Script
 * This script deploys the RYDO Web App to Netlify with MongoDB Atlas integration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Main deployment function
async function deploy() {
  log('\n========================================', colors.blue);
  log('  RYDO WEB APP - MONGODB DEPLOYMENT', colors.blue);
  log('========================================\n', colors.blue);

  try {
    // 1. Prepare frontend files
    log('Preparing frontend files...', colors.yellow);
    require('./netlify-deploy');
    log('Frontend files prepared successfully', colors.green);

    // 2. Create netlify.toml with MongoDB environment variables
    log('\nCreating Netlify configuration...', colors.yellow);
    const netlifyToml = `[build]
  # Directory to change to before starting a build
  base = "/"
  
  # Directory that contains the deploy-ready HTML files and assets
  publish = "frontend"
  functions = "netlify/functions"
  # Default build command - simplified for reliable deployment
  command = "node netlify-deploy.js"
  
[build.environment]
  # Set Node version
  NODE_VERSION = "18"
  # MongoDB Configuration
  MONGODB_URI = "${process.env.MONGODB_URI}"
  # Session Configuration
  SESSION_SECRET = "${process.env.SESSION_SECRET}"
  # Google Maps API Key
  GOOGLE_MAPS_API_KEY = "${process.env.GOOGLE_MAPS_API_KEY}"
  # Email Configuration for OTP Verification
  EMAIL_SERVICE = "${process.env.EMAIL_SERVICE}"
  EMAIL_USER = "${process.env.EMAIL_USER}"
  # Razorpay Configuration
  RAZORPAY_COMMISSION_PERCENTAGE = "${process.env.RAZORPAY_COMMISSION_PERCENTAGE}"

# Redirects and rewrites
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
  from = "/.netlify/functions/verification/*"
  to = "/.netlify/functions/verification/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Headers for security and caching
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https://*; connect-src 'self' https://maps.googleapis.com https://*.netlify.app https://*.windsurf.build;"
`;

    fs.writeFileSync('netlify.toml', netlifyToml);
    log('Netlify configuration created successfully', colors.green);

    // 3. Deploy to Netlify
    log('\nDeploying to Netlify...', colors.yellow);
    try {
      // First, install Netlify CLI if not already installed
      try {
        execSync('netlify --version', { stdio: 'ignore' });
        log('Netlify CLI is already installed', colors.green);
      } catch (e) {
        log('Installing Netlify CLI...', colors.yellow);
        execSync('npm install -g netlify-cli', { stdio: 'inherit' });
        log('Netlify CLI installed successfully', colors.green);
      }

      // Login to Netlify (if needed)
      try {
        execSync('netlify status', { stdio: 'ignore' });
        log('Already logged in to Netlify', colors.green);
      } catch (e) {
        log('Please login to Netlify...', colors.yellow);
        execSync('netlify login', { stdio: 'inherit' });
      }

      // Create a new site or deploy to existing site
      const siteId = process.env.NETLIFY_SITE_ID;
      if (siteId) {
        // Deploy to existing site
        log(`Deploying to existing Netlify site (${siteId})...`, colors.yellow);
        execSync(`netlify deploy --prod --site=${siteId}`, { stdio: 'inherit' });
      } else {
        // Create a new site
        log('Creating a new Netlify site...', colors.yellow);
        execSync('netlify deploy --prod', { stdio: 'inherit' });
      }

      log('\nDeployment successful!', colors.green);
      log('Your RYDO Web App is now live on Netlify with MongoDB integration.', colors.green);
    } catch (deployError) {
      log('\nDeployment failed. Please check the error message above.', colors.red);
      throw deployError;
    }

  } catch (error) {
    log(`\nDeployment failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run the deployment
deploy().catch(error => {
  log(`Deployment script error: ${error.message}`, colors.red);
  process.exit(1);
});
