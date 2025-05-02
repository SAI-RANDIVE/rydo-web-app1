/**
 * RYDO Web App - Netlify Deployment with MongoDB
 * This script deploys the application to Netlify with MongoDB integration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

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
  log('  RYDO WEB APP - NETLIFY DEPLOYMENT', colors.blue);
  log('========================================\n', colors.blue);

  try {
    // 1. Load MongoDB environment variables
    log('Loading MongoDB environment variables...', colors.yellow);
    const envPath = path.join(__dirname, '.env.mongodb');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      for (const key in envConfig) {
        process.env[key] = envConfig[key];
      }
      log('Environment variables loaded successfully', colors.green);
    } else {
      log('Warning: .env.mongodb file not found. Using default environment variables.', colors.yellow);
    }

    // 2. Install dependencies
    log('\nInstalling dependencies...', colors.yellow);
    execSync('npm install', { stdio: 'inherit' });
    log('Dependencies installed successfully', colors.green);

    // 3. Prepare Netlify functions directory
    log('\nPreparing Netlify functions...', colors.yellow);
    const functionsDir = path.join(__dirname, 'netlify', 'functions');
    if (!fs.existsSync(functionsDir)) {
      fs.mkdirSync(functionsDir, { recursive: true });
    }
    log('Netlify functions directory prepared', colors.green);

    // 4. Run the netlify-deploy.js script to prepare frontend files
    log('\nPreparing frontend files...', colors.yellow);
    require('./netlify-deploy');
    log('Frontend files prepared successfully', colors.green);

    // 5. Deploy to Netlify
    log('\nDeploying to Netlify...', colors.yellow);
    try {
      execSync('netlify deploy --prod', { stdio: 'inherit' });
      log('\nDeployment successful!', colors.green);
      log('Your RYDO Web App is now live on Netlify with MongoDB integration.', colors.green);
    } catch (deployError) {
      log('\nDeployment failed. Please check the error message above.', colors.red);
      log('You may need to authenticate with Netlify first using: netlify login', colors.yellow);
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
