# RYDO Web App - MongoDB Deployment Guide

This guide will walk you through deploying the RYDO Web App to Netlify with MongoDB Atlas as the database.

## Prerequisites

1. A [Netlify](https://www.netlify.com/) account (free tier is sufficient)
2. A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free tier is sufficient)
3. A [Gmail account](https://mail.google.com) for sending OTP emails (or any other email provider)

## Step 1: Set Up MongoDB Atlas

1. Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new project named "RYDO"
3. Create a new cluster (the free M0 Shared Cluster is sufficient)
4. Once the cluster is created, click on "Connect"
5. Choose "Connect your application"
6. Select "Node.js" as the driver and copy the connection string
7. Replace `<password>` with your database user password and `myFirstDatabase` with `rydo_db`

## Step 2: Migrate Data from MySQL to MongoDB

1. Update the `.env` file with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rydo_db?retryWrites=true&w=majority
   ```

2. Set up email credentials for OTP verification:
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   ```
   Note: For Gmail, you need to use an "App Password" instead of your regular password. Generate one at https://myaccount.google.com/apppasswords

3. Run the migration script to transfer data from MySQL to MongoDB:
   ```
   node scripts/migrate-to-mongodb.js
   ```

## Step 3: Deploy to Netlify

1. Sign up or log in to [Netlify](https://www.netlify.com/)

2. Click "New site from Git" and connect your repository

3. Configure the build settings:
   - Build command: `node netlify-deploy.js`
   - Publish directory: `frontend`

4. Add the following environment variables in Netlify's site settings:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `SESSION_SECRET`: A secure random string for session encryption
   - `EMAIL_SERVICE`: Your email service (e.g., gmail)
   - `EMAIL_USER`: Your email address
   - `EMAIL_PASSWORD`: Your email app password
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
   - `RAZORPAY_KEY_ID`: Your Razorpay key ID
   - `RAZORPAY_KEY_SECRET`: Your Razorpay key secret
   - `RAZORPAY_COMMISSION_PERCENTAGE`: 7.5

5. Deploy the site

## Step 4: Configure Netlify Functions

1. Ensure your `netlify.toml` file has the correct redirects for API endpoints:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/api/:splat"
     status = 200
     force = true

   [[redirects]]
     from = "/auth/*"
     to = "/.netlify/functions/auth/:splat"
     status = 200
     force = true

   [[redirects]]
     from = "/verification/*"
     to = "/.netlify/functions/verification/:splat"
     status = 200
     force = true
   ```

2. Deploy again if you made any changes to the `netlify.toml` file

## Step 5: Testing the Deployment

1. Once deployed, visit your Netlify site URL
2. Test the login functionality
3. Test the OTP verification
4. Test booking a service
5. Test payment processing

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:
1. Check if your MongoDB Atlas IP whitelist includes `0.0.0.0/0` to allow connections from anywhere
2. Verify that your MongoDB connection string is correct in the Netlify environment variables
3. Check the function logs in the Netlify dashboard for specific error messages

### OTP Verification Issues

If OTP verification is not working:
1. Check if your email credentials are correct
2. For Gmail, ensure you're using an App Password and not your regular password
3. Check the function logs for email sending errors

### API Endpoint Issues

If API endpoints are not responding:
1. Check the Netlify function logs for errors
2. Verify that the redirects in `netlify.toml` are correctly configured
3. Test the endpoints directly using the `.netlify/functions/` prefix

## Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
