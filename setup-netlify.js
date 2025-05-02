/**
 * RYDO Web App Netlify Setup Script
 * This script prepares the application for Netlify deployment
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
 * Create a directory if it doesn't exist
 * @param {string} dirPath - Path to directory
 */
function createDirIfNotExists(dirPath) {
  if (!fileExists(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`, colors.fg.green);
  }
}

/**
 * Copy a file
 * @param {string} source - Source file path
 * @param {string} destination - Destination file path
 */
function copyFile(source, destination) {
  try {
    fs.copyFileSync(source, destination);
    log(`Copied file from ${source} to ${destination}`, colors.fg.green);
  } catch (error) {
    log(`Failed to copy file: ${error.message}`, colors.fg.red);
  }
}

/**
 * Ensure all HTML files include animations and security scripts
 */
function ensureAnimationsIncluded() {
  const frontendDir = path.join(__dirname, 'frontend');
  
  if (!fileExists(frontendDir)) {
    log('Frontend directory not found. Skipping animation inclusion.', colors.fg.yellow);
    return;
  }
  
  // Get all HTML files
  const htmlFiles = findHtmlFiles(frontendDir);
  
  htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Add security meta tags if not present
    if (!content.includes('Cache-Control') && content.includes('<head>')) {
      const securityMeta = `<head>
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">`;      
      content = content.replace('<head>', securityMeta);
      modified = true;
      log(`Added security meta tags to ${file}`, colors.fg.green);
    }
    
    // Check if animations are already included
    if (!content.includes('animations.css') && content.includes('</head>')) {
      content = content.replace('</head>', `    <link rel="stylesheet" href="/css/animations.css">\n</head>`);
      modified = true;
      log(`Added animations.css to ${file}`, colors.fg.green);
    }
    
    // Add include-animations.js before closing body tag if not present
    if (!content.includes('include-animations.js') && content.includes('</body>')) {
      content = content.replace('</body>', `  <script src="/js/include-animations.js"></script>\n</body>`);
      modified = true;
      log(`Added include-animations.js to ${file}`, colors.fg.green);
    }
    
    // Add logout.js to login page for security
    if (file.includes('login.html') && !content.includes('logout.js') && content.includes('</body>')) {
      content = content.replace('</body>', `  <script src="/js/logout.js"></script>\n</body>`);
      modified = true;
      log(`Added logout.js to login page for security`, colors.fg.green);
    }
    
    // Save changes if modified
    if (modified) {
      fs.writeFileSync(file, content);
      log(`Updated ${file}`, colors.fg.green);
    } else {
      log(`No changes needed for ${file}`, colors.fg.yellow);
    }
  });
}

/**
 * Find all HTML files in a directory (recursive)
 * @param {string} dir - Directory to search
 * @returns {string[]} - Array of HTML file paths
 */
function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Copy all files from public directory to frontend directory
 * This ensures all assets (CSS, JS, images) are available in the deployed site
 */
function copyPublicToFrontend() {
  const publicDir = path.join(__dirname, 'public');
  const frontendDir = path.join(__dirname, 'frontend');
  
  if (!fileExists(publicDir)) {
    log('Public directory not found. Skipping copy.', colors.fg.yellow);
    return;
  }
  
  // Create frontend directory if it doesn't exist
  createDirIfNotExists(frontendDir);
  
  // Create directories for assets
  createDirIfNotExists(path.join(frontendDir, 'css'));
  createDirIfNotExists(path.join(frontendDir, 'js'));
  createDirIfNotExists(path.join(frontendDir, 'images'));
  
  log('Copying CSS files...', colors.fg.blue);
  copyDirectoryContents(path.join(publicDir, 'css'), path.join(frontendDir, 'css'));
  
  log('Copying JS files...', colors.fg.blue);
  copyDirectoryContents(path.join(publicDir, 'js'), path.join(frontendDir, 'js'));
  
  log('Copying image files...', colors.fg.blue);
  copyDirectoryContents(path.join(publicDir, 'images'), path.join(frontendDir, 'images'));
  
  log('All public assets copied to frontend directory', colors.fg.green);
}

/**
 * Copy all contents from one directory to another
 * @param {string} sourceDir - Source directory
 * @param {string} targetDir - Target directory
 */
function copyDirectoryContents(sourceDir, targetDir) {
  if (!fileExists(sourceDir)) {
    log(`Source directory ${sourceDir} not found.`, colors.fg.yellow);
    return;
  }
  
  createDirIfNotExists(targetDir);
  
  const files = fs.readdirSync(sourceDir);
  
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectoryContents(sourcePath, targetPath);
    } else {
      copyFile(sourcePath, targetPath);
    }
  });
}

/**
 * Main setup function
 */
async function setup() {
  log('\n========================================', colors.fg.blue);
  log('       RYDO WEB APP NETLIFY SETUP', colors.fg.blue + colors.bright);
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
  command = "node setup-netlify.js"

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
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*; connect-src 'self' https://maps.googleapis.com;"
    Cache-Control = "no-store, no-cache, must-revalidate, max-age=0"`;
    
    fs.writeFileSync('./netlify.toml', netlifyConfig);
    log('netlify.toml created successfully', colors.fg.green);
  }
  
  // Check if functions directory exists
  createDirIfNotExists('./functions');
  
  // Check if api.js exists in functions directory
  if (!fileExists('./functions/api.js')) {
    log('api.js not found in functions directory. Creating it...', colors.fg.yellow);
    
    // Create api.js
    const apiJs = `const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'RYDO API is running'
  });
});

// Export the serverless function
exports.handler = serverless(app);`;
    
    fs.writeFileSync('./functions/api.js', apiJs);
    log('api.js created successfully', colors.fg.green);
  }
  
  // Copy public files to frontend directory
  log('\nCopying public files to frontend directory...', colors.fg.blue);
  copyPublicToFrontend();
  
  // Ensure animations are included in all HTML files
  log('\nEnsuring animations and security features are included in all HTML files...', colors.fg.blue);
  ensureAnimationsIncluded();
  
  // Create or update logout.js if not exists
  if (!fileExists('./public/js/logout.js')) {
    log('\nCreating logout.js for session security...', colors.fg.blue);
    const logoutJs = `/**
 * RYDO Logout Handler
 * Securely clears all user session data and redirects to login page
 */

function logout() {
    // Clear all session storage
    sessionStorage.clear();
    
    // Clear all localStorage items that might contain sensitive data
    localStorage.removeItem('user_data');
    localStorage.removeItem('temp_credentials');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_preferences');
    
    // Clear cookies by setting them to expire in the past
    document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Redirect to login page
    window.location.href = '/login.html';
}

// Add event listeners to all logout buttons
document.addEventListener('DOMContentLoaded', function() {
    const logoutButtons = document.querySelectorAll('.logout-btn, .btn-logout, [data-action="logout"]');
    
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
});`;
    
    fs.writeFileSync('./public/js/logout.js', logoutJs);
    // Also copy to frontend directory
    fs.writeFileSync('./frontend/js/logout.js', logoutJs);
    log('logout.js created successfully', colors.fg.green);
  }
  
  // Install dependencies
  log('\nInstalling dependencies...', colors.fg.blue);
  runCommand('npm install', 'Failed to install dependencies');
  
  // Install required packages for serverless functions
  log('\nInstalling serverless function dependencies...', colors.fg.blue);
  runCommand('npm install express serverless-http cors body-parser', 'Failed to install serverless dependencies');
  
  // Install Netlify CLI if not already installed
  try {
    execSync('netlify --version', { stdio: 'ignore' });
    log('Netlify CLI is already installed', colors.fg.green);
  } catch (error) {
    log('Installing Netlify CLI...', colors.fg.yellow);
    runCommand('npm install -g netlify-cli', 'Failed to install Netlify CLI');
  }
  
  // Success message
  log('\n========================================', colors.fg.green);
  log('       SETUP SUCCESSFUL!', colors.fg.green + colors.bright);
  log('========================================\n', colors.fg.green);
  log('Your RYDO Web App is now ready for Netlify deployment.', colors.fg.green);
  log('To deploy, run the following commands:', colors.fg.green);
  log('  1. netlify login', colors.fg.yellow);
  log('  2. npm run build', colors.fg.yellow);
  log('  3. npm run deploy', colors.fg.yellow);
  log('\nOr use the deploy.js script:', colors.fg.green);
  log('  node deploy.js', colors.fg.yellow);
  log('\nMake sure to set up your environment variables in the Netlify dashboard after deployment.', colors.fg.green);
}

// Run setup
setup().catch(error => {
  log(`Setup failed: ${error.message}`, colors.fg.red);
  process.exit(1);
});
