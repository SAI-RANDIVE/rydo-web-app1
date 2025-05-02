# RYDO Web App Deployment Guide

This guide provides step-by-step instructions for deploying the RYDO Web App to Netlify.

## Prerequisites

Before deploying, ensure you have:

1. A Netlify account (create one at [netlify.com](https://www.netlify.com) if you don't have one)
2. Node.js and npm installed on your local machine
3. Access to a MySQL database (either local or cloud-hosted)
4. The RYDO Web App codebase on your local machine

## Step 1: Install Required Dependencies

First, install all the required dependencies:

```bash
# Navigate to your project directory
cd "e:\Final Year Project\RYDO WEB APP"

# Install project dependencies
npm install

# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli
```

## Step 2: Configure Environment Variables

1. Create a `.env` file in the root of your project (use `.env.example` as a template)
2. Fill in your database credentials and other required variables

```
DB_HOST=your_database_host
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_NAME=rydo_db
SESSION_SECRET=your_session_secret
GOOGLE_MAPS_API_KEY=AIzaSyCeQRIk26TAxjwxFU0-YFV19lJf7Oe8sjc
```

## Step 3: Login to Netlify

```bash
netlify login
```

Follow the prompts to authenticate with your Netlify account.

## Step 4: Deploy Using the Automated Script

The RYDO Web App includes a deployment script that automates the process:

```bash
node deploy.js
```

This script will:
- Check for required files
- Install dependencies
- Build serverless functions
- Deploy to Netlify

## Step 5: Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# Build the serverless functions
npm run build

# Deploy to Netlify
npm run deploy
```

## Step 6: Configure Environment Variables in Netlify

After deployment:

1. Go to the Netlify dashboard
2. Select your site
3. Navigate to Site settings > Build & deploy > Environment
4. Add the same environment variables from your `.env` file

## Step 7: Database Setup

Ensure your database is accessible from Netlify:

1. If using a local database, consider migrating to a cloud-hosted solution like AWS RDS, Google Cloud SQL, or PlanetScale
2. Update your database security settings to allow connections from Netlify's IP addresses
3. Verify the connection by testing the deployed application

## Step 8: Test Your Deployment

1. Visit the URL provided by Netlify after deployment
2. Test all functionality:
   - User authentication
   - Driver/caretaker/shuttle service booking
   - Nearby driver search
   - Booking management with timeout functionality
   - Profile management

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database credentials in environment variables
   - Check if your database allows remote connections
   - Ensure proper network security settings

2. **Missing Environment Variables**
   - Double-check all required variables are set in Netlify

3. **Function Timeout Errors**
   - Optimize database queries
   - Consider increasing function timeout in Netlify settings

4. **CORS Issues**
   - Verify CORS settings in your Express app
   - Add appropriate headers in Netlify configuration

### Getting Help

If you encounter issues not covered in this guide:

1. Check the Netlify logs for error messages
2. Refer to the Netlify documentation: [docs.netlify.com](https://docs.netlify.com)
3. Contact the RYDO development team for assistance

## Continuous Deployment

To set up continuous deployment from your Git repository:

1. Connect your GitHub repository to Netlify
2. Configure build settings in the Netlify dashboard
3. Set up branch deploys for testing different versions

---

**Note:** This deployment guide is specific to the RYDO Web App. For general Netlify deployment information, refer to the [Netlify documentation](https://docs.netlify.com/site-deploys/overview/).
