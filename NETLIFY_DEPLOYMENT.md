# RYDO Web App - MongoDB Version

## Netlify Deployment Instructions

1. Install Netlify CLI if not already installed:
   ```
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```
   netlify login
   ```

3. Deploy to Netlify:
   ```
   netlify deploy --prod
   ```

4. When prompted, select "Create & configure a new site"

5. After deployment, set the following environment variables in the Netlify dashboard:
   - MONGODB_URI: Your MongoDB connection string
   - SESSION_SECRET: A secure random string
   - GOOGLE_MAPS_API_KEY: Your Google Maps API key
   - EMAIL_SERVICE: gmail
   - EMAIL_USER: Your email for sending OTPs
   - EMAIL_PASSWORD: Your app password
   - RAZORPAY_KEY_ID: Your Razorpay key ID
   - RAZORPAY_KEY_SECRET: Your Razorpay key secret
   - RAZORPAY_COMMISSION_PERCENTAGE: 7.5

## Features

- User authentication with OTP verification
- Booking system for drivers, caretakers, and shuttle services
- Real-time tracking of service providers
- Payment processing with Razorpay integration
- Rating and review system
- Admin dashboard for monitoring
