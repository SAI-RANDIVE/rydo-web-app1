# RYDO Web App - Render.com Deployment Guide

## Step 1: Create a Render.com Account
1. Go to [Render.com](https://render.com) and sign up for an account if you don't have one already.
2. Verify your email address and log in to your account.

## Step 2: Create a New Web Service
1. Click on the "New +" button in the top right corner of the dashboard.
2. Select "Web Service" from the dropdown menu.
3. Choose "Build and deploy from a Git repository" option.
4. Connect your GitHub account if prompted.
5. Select your RYDO Web App repository.

## Step 3: Configure Your Web Service
1. Fill in the following details:
   - **Name**: `rydo-web-app`
   - **Environment**: `Node`
   - **Region**: Choose the region closest to your users
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm install && node netlify-deploy.js`
   - **Start Command**: `node backend/server.js`
   - **Plan**: Free (or choose a paid plan if you need more resources)

## Step 4: Set Environment Variables
Add the following environment variables:
- `NODE_ENV`: `production`
- `PORT`: `3002`
- `MONGODB_URI`: Your MongoDB connection string
- `SESSION_SECRET`: A secure random string
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
- `EMAIL_SERVICE`: `gmail`
- `EMAIL_USER`: Your email for sending OTPs
- `EMAIL_PASSWORD`: Your app password
- `RAZORPAY_KEY_ID`: Your Razorpay key ID
- `RAZORPAY_KEY_SECRET`: Your Razorpay key secret
- `RAZORPAY_COMMISSION_PERCENTAGE`: `7.5`

## Step 5: Deploy Your Application
1. Click on the "Create Web Service" button.
2. Wait for the deployment to complete. This may take a few minutes.
3. Once deployed, Render will provide you with a URL to access your application.

## Step 6: Test Your Application
1. Visit the provided URL to ensure your application is running correctly.
2. Test all the features, including:
   - User authentication
   - Booking system
   - Payment processing
   - Real-time tracking
   - Notifications

## Troubleshooting
If you encounter any issues during deployment:
1. Check the deployment logs in the Render dashboard.
2. Ensure all environment variables are correctly set.
3. Verify that your MongoDB connection string is correct and accessible.
4. Check if your Google Maps API key is valid and has the necessary permissions.

## Additional Resources
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
