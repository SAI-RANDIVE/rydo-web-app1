/**
 * RYDO Web App Deployment Script
 * 
 * This script helps deploy the RYDO Web App to Netlify
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

/**
 * Log a message with color
 * @param {string} message - Message to log
 * @param {string} color - Color to use
 */
function log(message, color = colors.fg.white) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Run a command and log output
 * @param {string} command - Command to run
 * @param {string} errorMessage - Error message to show if command fails
 */
function runCommand(command, errorMessage) {
  try {
    log(`Running: ${command}`, colors.fg.cyan);
    const output = execSync(command, { encoding: 'utf8' });
    log(output, colors.fg.green);
    return output;
  } catch (error) {
    log(`${errorMessage}: ${error.message}`, colors.fg.red);
    process.exit(1);
  }
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to file
 * @returns {boolean} - Whether file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Main deployment function
 */
async function deploy() {
  // Display welcome message
  log('\n========================================', colors.fg.blue);
  log('       RYDO WEB APP DEPLOYMENT', colors.fg.blue + colors.bright);
  log('========================================\n', colors.fg.blue);
  
  // Check if netlify.toml exists
  if (!fileExists('./netlify.toml')) {
    log('netlify.toml not found. Creating it...', colors.fg.yellow);
    
    // Create netlify.toml
    const netlifyConfig = `[build]
  # Directory to change to before starting a build
  base = "/"
  
  # Directory that contains the deploy-ready HTML files and assets
  publish = "frontend"
  
  # Default build command
  command = "echo 'No build command needed for static site'"

# Redirects and rewrites
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
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
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*; connect-src 'self' https://maps.googleapis.com;"`;
    
    fs.writeFileSync('./netlify.toml', netlifyConfig);
    log('netlify.toml created successfully', colors.fg.green);
  }
  
  // Check if functions directory exists
  if (!fileExists('./functions')) {
    log('functions directory not found. Creating it...', colors.fg.yellow);
    fs.mkdirSync('./functions', { recursive: true });
    log('functions directory created successfully', colors.fg.green);
  }
  
  // Check if api.js exists in functions directory
  if (!fileExists('./functions/api.js')) {
    log('api.js not found in functions directory. Please create it first.', colors.fg.red);
    process.exit(1);
  }
  
  // Install dependencies
  log('\nInstalling dependencies...', colors.fg.blue);
  runCommand('npm install', 'Failed to install dependencies');
  
  // Build functions
  log('\nBuilding serverless functions...', colors.fg.blue);
  runCommand('npm run build', 'Failed to build serverless functions');
  
  // Deploy to Netlify
  log('\nDeploying to Netlify...', colors.fg.blue);
  runCommand('npm run deploy', 'Failed to deploy to Netlify');
  
  // Success message
  log('\n========================================', colors.fg.green);
  log('       DEPLOYMENT SUCCESSFUL!', colors.fg.green + colors.bright);
  log('========================================\n', colors.fg.green);
  log('Your RYDO Web App has been successfully deployed to Netlify.', colors.fg.green);
  log('You can view your site at the URL provided above.\n', colors.fg.green);
}

// Run deployment
deploy().catch(error => {
  log(`Deployment failed: ${error.message}`, colors.fg.red);
  process.exit(1);
});
