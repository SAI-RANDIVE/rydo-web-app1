/**
 * RYDO Web App - Render.com Deployment Script
 * This script prepares the application for deployment on Render.com
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  log('  RYDO WEB APP - RENDER DEPLOYMENT', colors.blue);
  log('========================================\n', colors.blue);

  try {
    // 1. Create a build directory
    log('Creating build directory...', colors.yellow);
    const buildDir = path.join(__dirname, 'build');
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDir);
    log('Build directory created successfully', colors.green);

    // 2. Copy necessary files to build directory
    log('\nCopying files to build directory...', colors.yellow);
    
    // Copy backend files
    fs.mkdirSync(path.join(buildDir, 'backend'), { recursive: true });
    copyDir(path.join(__dirname, 'backend'), path.join(buildDir, 'backend'));
    
    // Copy frontend files
    fs.mkdirSync(path.join(buildDir, 'frontend'), { recursive: true });
    copyDir(path.join(__dirname, 'frontend'), path.join(buildDir, 'frontend'));
    
    // Copy public files
    fs.mkdirSync(path.join(buildDir, 'public'), { recursive: true });
    copyDir(path.join(__dirname, 'public'), path.join(buildDir, 'public'));
    
    // Copy netlify functions
    fs.mkdirSync(path.join(buildDir, 'netlify', 'functions'), { recursive: true });
    copyDir(path.join(__dirname, 'netlify', 'functions'), path.join(buildDir, 'netlify', 'functions'));
    
    // Copy package.json
    fs.copyFileSync(path.join(__dirname, 'package.json'), path.join(buildDir, 'package.json'));
    
    // Copy netlify-deploy.js
    fs.copyFileSync(path.join(__dirname, 'netlify-deploy.js'), path.join(buildDir, 'netlify-deploy.js'));
    
    // Copy .env.render to .env
    fs.copyFileSync(path.join(__dirname, '.env.render'), path.join(buildDir, '.env'));
    
    // Create render.yaml
    const renderYaml = `services:
  # Web service for the RYDO Web App
  - type: web
    name: rydo-web-app
    env: node
    buildCommand: npm install && node netlify-deploy.js
    startCommand: node backend/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3002
      - key: MONGODB_URI
        fromDatabase:
          name: rydo-mongodb
          property: connectionString
      - key: SESSION_SECRET
        generateValue: true
      - key: GOOGLE_MAPS_API_KEY
        sync: false
      - key: EMAIL_SERVICE
        value: gmail
      - key: EMAIL_USER
        sync: false
      - key: RAZORPAY_COMMISSION_PERCENTAGE
        value: 7.5

databases:
  - name: rydo-mongodb
    databaseName: rydo_db
    plan: free
`;
    
    fs.writeFileSync(path.join(buildDir, 'render.yaml'), renderYaml);
    
    log('Files copied successfully', colors.green);

    // 3. Create a README.md file with deployment instructions
    log('\nCreating README.md with deployment instructions...', colors.yellow);
    const readmeContent = `# RYDO Web App - MongoDB Version

## Deployment Instructions

This application is configured for deployment on Render.com. Follow these steps:

1. Sign up for a Render.com account at https://render.com
2. Create a new Web Service
3. Upload this directory to Render.com
4. Set the following configuration:
   - Build Command: \`npm install && node netlify-deploy.js\`
   - Start Command: \`node backend/server.js\`
5. Add the required environment variables:
   - MONGODB_URI: Your MongoDB connection string
   - SESSION_SECRET: A secure random string
   - GOOGLE_MAPS_API_KEY: Your Google Maps API key
   - EMAIL_SERVICE: gmail
   - EMAIL_USER: Your email for sending OTPs
   - EMAIL_PASSWORD: Your app password for the email
   - RAZORPAY_KEY_ID: Your Razorpay key ID
   - RAZORPAY_KEY_SECRET: Your Razorpay key secret
   - RAZORPAY_COMMISSION_PERCENTAGE: 7.5
6. Deploy the application

## Features

- User authentication with OTP verification
- Booking system for drivers, caretakers, and shuttle services
- Real-time tracking of service providers
- Payment processing with Razorpay integration
- Rating and review system
- Admin dashboard for monitoring

## Technology Stack

- Backend: Node.js with Express.js
- Database: MongoDB (migrated from MySQL)
- Frontend: HTML, CSS, JavaScript
- Real-time Features: WebSockets
- Authentication: Session-based with OTP verification
`;
    
    fs.writeFileSync(path.join(buildDir, 'README.md'), readmeContent);
    log('README.md created successfully', colors.green);

    // 4. Create a ZIP file for easy upload
    log('\nCreating ZIP file for deployment...', colors.yellow);
    try {
      execSync(`cd "${buildDir}" && tar -czf "../rydo-web-app.tar.gz" .`, { stdio: 'inherit' });
      log('ZIP file created successfully: rydo-web-app.tar.gz', colors.green);
    } catch (zipError) {
      log('Error creating ZIP file. You can manually ZIP the build directory.', colors.yellow);
    }

    log('\nDeployment package prepared successfully!', colors.green);
    log('To deploy to Render.com:', colors.blue);
    log('1. Go to https://dashboard.render.com/new/web-service', colors.reset);
    log('2. Choose "Upload Files" and select the rydo-web-app.tar.gz file', colors.reset);
    log('3. Follow the README.md instructions to complete the deployment', colors.reset);

  } catch (error) {
    log(`\nDeployment preparation failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Helper function to copy directory recursively
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Skip node_modules and .git directories
    if (entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Run the deployment
deploy().catch(error => {
  log(`Deployment script error: ${error.message}`, colors.red);
  process.exit(1);
});
