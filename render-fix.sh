#!/bin/bash
# This script helps fix the Render.com deployment issue

# Print current directory structure
echo "Current directory structure:"
ls -la

# Copy package.json to the expected location if needed
if [ ! -f "package.json" ]; then
  echo "package.json not found in root directory, searching for it..."
  PACKAGE_JSON_PATH=$(find . -name "package.json" -type f | head -n 1)
  
  if [ -n "$PACKAGE_JSON_PATH" ]; then
    echo "Found package.json at $PACKAGE_JSON_PATH"
    cp "$PACKAGE_JSON_PATH" ./package.json
    echo "Copied package.json to root directory"
  else
    echo "No package.json found in the repository"
    exit 1
  fi
fi

# Install dependencies
npm install

# Create server.js in the root directory if it doesn't exist
if [ ! -f "server.js" ]; then
  echo "Creating server.js in the root directory..."
  echo "/**
 * RYDO Web App - Root Server File
 * This file redirects to the actual server implementation
 */

// Simply require the actual server implementation
require('./backend/server.js');" > server.js
  echo "Created server.js in root directory"
fi

echo "Deployment preparation completed successfully!"
