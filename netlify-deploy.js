/**
 * RYDO Web App - MongoDB Netlify Deployment Script
 * This script prepares the application for Netlify deployment with MongoDB integration
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color) {
  console.log(`${color}${message}${colors.reset}`);
}

// Main function
async function deploy() {
  log('\n========================================', colors.blue);
  log('  RYDO WEB APP SIMPLIFIED DEPLOYMENT', colors.blue);
  log('========================================\n', colors.blue);

  // Ensure frontend directory exists
  if (!fs.existsSync('./frontend')) {
    fs.mkdirSync('./frontend', { recursive: true });
    log('Created frontend directory', colors.green);
  }

  // Copy index.html to frontend if it doesn't exist
  if (!fs.existsSync('./frontend/index.html')) {
    if (fs.existsSync('./public/index.html')) {
      fs.copyFileSync('./public/index.html', './frontend/index.html');
      log('Copied index.html from public to frontend', colors.green);
    } else {
      // Create a simple index.html that redirects to login.html
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>RYDO - Your Trusted Ride and Care Service</title>
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="/css/animations.css">
    <style>
        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #5B6EF5, #3F51B5);
            color: white;
            text-align: center;
        }
        .container {
            max-width: 800px;
            padding: 40px;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 20px;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        .btn {
            display: inline-block;
            background-color: white;
            color: #5B6EF5;
            padding: 12px 30px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            margin: 10px;
        }
        .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to RYDO</h1>
        <p>Your trusted partner for rides, care services, and shuttle transportation</p>
        <a href="/login.html" class="btn">Login Now</a>
        <a href="/signup.html" class="btn">Sign Up</a>
    </div>
    <script>
        // Check if we're on the homepage and redirect to login
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            // Add a slight delay for better user experience
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1500);
        }
    </script>
</body>
</html>`;
      
      fs.writeFileSync('./frontend/index.html', indexHtml);
      log('Created new index.html in frontend directory', colors.green);
    }
  }

  // Copy all HTML files from frontend to root of frontend
  const frontendFiles = fs.readdirSync('./frontend');
  frontendFiles.forEach(file => {
    if (file.endsWith('.html')) {
      // Copy the file to the root of frontend (it's already there, but this ensures it's in the right place)
      log(`Ensured ${file} is in frontend root`, colors.green);
    }
  });

  // Create directories for assets in frontend
  const assetDirs = ['css', 'js', 'images'];
  assetDirs.forEach(dir => {
    const frontendDir = path.join('./frontend', dir);
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
      log(`Created ${dir} directory in frontend`, colors.green);
    }
  });

  // Copy all assets from public to frontend
  assetDirs.forEach(dir => {
    const publicDir = path.join('./public', dir);
    const frontendDir = path.join('./frontend', dir);
    
    if (fs.existsSync(publicDir)) {
      const files = fs.readdirSync(publicDir);
      files.forEach(file => {
        const sourcePath = path.join(publicDir, file);
        const targetPath = path.join(frontendDir, file);
        
        if (fs.statSync(sourcePath).isFile()) {
          fs.copyFileSync(sourcePath, targetPath);
          log(`Copied ${dir}/${file} to frontend`, colors.green);
        }
      });
    }
  });

  log('\nDeployment preparation complete!', colors.green);
  log('Your RYDO Web App is ready for Netlify deployment.\n', colors.green);
}

// Run the deployment
deploy().catch(error => {
  console.error('Deployment failed:', error);
  process.exit(1);
});
