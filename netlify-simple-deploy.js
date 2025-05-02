/**
 * RYDO Web App - Simple Netlify Deployment Script
 * This script prepares the application for Netlify deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n========================================');
console.log('  RYDO WEB APP - NETLIFY DEPLOYMENT');
console.log('========================================\n');

// 1. Prepare frontend files
console.log('Preparing frontend files...');
require('./netlify-deploy');
console.log('Frontend files prepared successfully');

// 2. Create a simplified netlify.toml file
console.log('\nCreating Netlify configuration...');
const netlifyToml = `[build]
  publish = "frontend"
  functions = "netlify/functions"
  command = "node netlify-deploy.js"
  
[build.environment]
  NODE_VERSION = "18"

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

fs.writeFileSync('netlify.toml', netlifyToml);
console.log('Netlify configuration created successfully');

// 3. Create a .env.example file without sensitive information
console.log('\nCreating safe environment variables example...');
const envExample = `# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rydo_db?retryWrites=true&w=majority

# Server Configuration
PORT=3002
NODE_ENV=production

# Session Configuration
SESSION_SECRET=your_session_secret_here

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Razorpay Configuration (for payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_COMMISSION_PERCENTAGE=7.5

# Email Configuration for OTP Verification
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
`;

fs.writeFileSync('.env.example', envExample);
console.log('Environment variables example created successfully');

// 4. Create a README.md with deployment instructions
console.log('\nCreating deployment instructions...');
const readmeContent = `# RYDO Web App - MongoDB Version

## Netlify Deployment Instructions

1. Install Netlify CLI if not already installed:
   \`\`\`
   npm install -g netlify-cli
   \`\`\`

2. Login to Netlify:
   \`\`\`
   netlify login
   \`\`\`

3. Deploy to Netlify:
   \`\`\`
   netlify deploy --prod
   \`\`\`

4. When prompted, select "Create & configure a new site"

5. After deployment, set the following environment variables in the Netlify dashboard:
   - MONGODB_URI: Your MongoDB connection string
   - SESSION_SECRET: A secure random string
   - GOOGLE_MAPS_API_KEY: Your Google Maps API key
   - EMAIL_SERVICE: gmail
   - EMAIL_USER: Your email for sending OTPs
   - EMAIL_PASSWORD: Your app password
   - RAZORPAY_KEY_ID: Your Razorpay key ID
   - RAZORPAY_KEY_SECRET: Your Razorpay key secret
   - RAZORPAY_COMMISSION_PERCENTAGE: 7.5

## Features

- User authentication with OTP verification
- Booking system for drivers, caretakers, and shuttle services
- Real-time tracking of service providers
- Payment processing with Razorpay integration
- Rating and review system
- Admin dashboard for monitoring
`;

fs.writeFileSync('NETLIFY_DEPLOYMENT.md', readmeContent);
console.log('Deployment instructions created successfully');

// 5. Print deployment steps
console.log('\n========================================');
console.log('  DEPLOYMENT STEPS');
console.log('========================================');
console.log('1. Run: netlify login');
console.log('2. Run: netlify deploy --prod');
console.log('3. Select: Create & configure a new site');
console.log('4. After deployment, set environment variables in the Netlify dashboard');
console.log('\nSee NETLIFY_DEPLOYMENT.md for detailed instructions');
console.log('========================================\n');
