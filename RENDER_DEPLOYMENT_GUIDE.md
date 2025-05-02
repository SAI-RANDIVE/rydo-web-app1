# RYDO Web App - Render.com Deployment Guide

This guide will help you deploy the RYDO Web App to Render.com, a reliable and free hosting platform that works well with MongoDB and Node.js applications.

## Prerequisites

1. A Render.com account (free tier available)
2. Your MongoDB Atlas database (already set up)
3. The RYDO Web App codebase (already migrated to MongoDB)

## Deployment Steps

### 1. Sign Up for Render.com

1. Go to [Render.com](https://render.com/) and sign up for a free account
2. Verify your email address and log in to your Render dashboard

### 2. Prepare Your Application

The `render.yaml` file has already been created in your project root. This file tells Render how to deploy your application.

### 3. Deploy to Render

#### Option 1: Deploy via GitHub (Recommended)

1. Push your code to a GitHub repository
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Render deployment"
   git remote add origin https://github.com/yourusername/rydo-web-app.git
   git push -u origin main
   ```

2. In the Render dashboard:
   - Click "New" and select "Blueprint"
   - Connect your GitHub account
   - Select the repository containing your RYDO Web App
   - Render will automatically detect the `render.yaml` file and set up your services
   - Click "Apply" to start the deployment

#### Option 2: Deploy via Render Dashboard

1. In the Render dashboard:
   - Click "New" and select "Web Service"
   - Connect your GitHub repository or choose "Upload Files"
   - Set the following configuration:
     - Name: `rydo-web-app`
     - Environment: `Node`
     - Build Command: `npm install && node netlify-deploy.js`
     - Start Command: `node backend/server.js`
   - Add the environment variables from the `render.yaml` file
   - Click "Create Web Service"

### 4. Verify Deployment

1. Once deployment is complete, Render will provide a URL for your application (e.g., `https://rydo-web-app.onrender.com`)
2. Visit the URL to verify that your application is running correctly
3. Test key functionality:
   - User authentication
   - OTP verification
   - Booking services
   - Real-time tracking

## Environment Variables

The following environment variables are required for your application to function correctly:

- `NODE_ENV`: Set to `production`
- `PORT`: Set to `3002` (or any port Render supports)
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `SESSION_SECRET`: Secret key for session management
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
- `EMAIL_SERVICE`: Email service for OTP verification (e.g., `gmail`)
- `EMAIL_USER`: Email address for sending OTPs
- `RAZORPAY_COMMISSION_PERCENTAGE`: Commission percentage for Razorpay payments

## Troubleshooting

If you encounter any issues during deployment:

1. Check the Render logs for error messages
2. Verify that all environment variables are set correctly
3. Ensure your MongoDB Atlas database is accessible from Render
4. Check that your application's port configuration matches Render's requirements

## Updating Your Application

To update your application after making changes:

1. Push the changes to your GitHub repository
2. Render will automatically detect the changes and redeploy your application

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)

---

If you need further assistance with deployment, please refer to the Render documentation or contact Render support.
