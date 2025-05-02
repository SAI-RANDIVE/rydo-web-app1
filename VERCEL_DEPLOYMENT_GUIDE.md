# RYDO Web App - Vercel Deployment Guide

This guide will help you deploy the RYDO Web App to Vercel, a popular and free hosting platform that's excellent for Node.js applications and offers a generous free tier.

## Prerequisites

1. A Vercel account (free tier available)
2. Your MongoDB Atlas database (already set up)
3. The RYDO Web App codebase (already migrated to MongoDB)

## Deployment Steps

### 1. Sign Up for Vercel

1. Go to [Vercel.com](https://vercel.com/) and sign up for a free account
2. You can sign up using GitHub, GitLab, or Bitbucket for easier integration

### 2. Install Vercel CLI

Install the Vercel CLI globally on your system:

```bash
npm install -g vercel
```

### 3. Prepare Your Application

The `vercel.json` file has already been created in your project root. This file tells Vercel how to deploy your application.

### 4. Deploy to Vercel

#### Option 1: Deploy via Vercel CLI (Quick)

1. Open a terminal in your project directory
2. Run the following command:
   ```bash
   vercel
   ```
3. Follow the prompts to log in and configure your project
4. When asked if you want to override the settings in `vercel.json`, choose "No"

#### Option 2: Deploy via GitHub Integration

1. Push your code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Vercel deployment"
   git remote add origin https://github.com/yourusername/rydo-web-app.git
   git push -u origin main
   ```

2. In the Vercel dashboard:
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the `vercel.json` file
   - Configure your environment variables (they should be pre-filled from `vercel.json`)
   - Click "Deploy"

### 5. Verify Deployment

1. Once deployment is complete, Vercel will provide a URL for your application (e.g., `https://rydo-web-app.vercel.app`)
2. Visit the URL to verify that your application is running correctly
3. Test key functionality:
   - User authentication
   - OTP verification
   - Booking services
   - Real-time tracking

## Environment Variables

The following environment variables are required for your application to function correctly:

- `NODE_ENV`: Set to `production`
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `SESSION_SECRET`: Secret key for session management
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
- `EMAIL_SERVICE`: Email service for OTP verification (e.g., `gmail`)
- `EMAIL_USER`: Email address for sending OTPs
- `RAZORPAY_COMMISSION_PERCENTAGE`: Commission percentage for Razorpay payments

These variables are already configured in your `vercel.json` file, but you can also set them in the Vercel dashboard under Project Settings > Environment Variables.

## Troubleshooting

If you encounter any issues during deployment:

1. Check the Vercel deployment logs for error messages
2. Verify that all environment variables are set correctly
3. Ensure your MongoDB Atlas database is accessible from Vercel (whitelist all IPs or specific Vercel IPs)
4. Check that your application's port configuration uses `process.env.PORT` as provided by Vercel

## Updating Your Application

To update your application after making changes:

1. If using GitHub integration, simply push changes to your repository and Vercel will automatically redeploy
2. If using Vercel CLI, run `vercel` again from your project directory

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Deploying Node.js to Vercel](https://vercel.com/guides/deploying-nodejs-to-vercel)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)

---

If you need further assistance with deployment, please refer to the Vercel documentation or contact Vercel support.
