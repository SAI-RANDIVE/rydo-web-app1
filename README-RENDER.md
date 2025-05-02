# RYDO Web App - MongoDB Version

## Render.com Deployment Instructions

1. Sign up for a Render.com account at https://render.com
2. Create a new Web Service by clicking the "New +" button
3. Select "Web Service" from the dropdown menu
4. Choose "Build and deploy from a Git repository" option
5. Connect your GitHub account if prompted
6. Select your RYDO Web App repository
7. Configure your web service:
   - Name: rydo-web-app
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm run start:render
8. Add the following environment variables:
   - MONGODB_URI: Your MongoDB connection string
   - SESSION_SECRET: A secure random string
   - GOOGLE_MAPS_API_KEY: Your Google Maps API key
   - EMAIL_SERVICE: gmail
   - EMAIL_USER: Your email for sending OTPs
   - EMAIL_PASSWORD: Your app password
   - RAZORPAY_KEY_ID: Your Razorpay key ID
   - RAZORPAY_KEY_SECRET: Your Razorpay key secret
   - RAZORPAY_COMMISSION_PERCENTAGE: 7.5
9. Click "Create Web Service" to deploy your application

## Features

- User authentication with OTP verification
- Booking system for drivers, caretakers, and shuttle services
- Real-time tracking of service providers
- Payment processing with Razorpay integration
- Rating and review system
- Admin dashboard for monitoring

## Technology Stack

- Backend: Node.js with Express.js
- Database: MongoDB (migrated from MySQL)
- Frontend: HTML, CSS, JavaScript
- Real-time Features: WebSockets
- Authentication: Session-based with OTP verification
