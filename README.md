# RYDO Web Application

## Overview

RYDO is a comprehensive ride and care service platform that connects customers with drivers, caretakers, and shuttle services. This web application provides a seamless experience for users to book services, manage their profiles, track their bookings, and make payments.

## Features

### For Customers
- Book drivers for personal vehicle driving
- Book caretakers for medical and personal assistance
- Book shuttle services for regular commutes
- Track service providers in real-time
- Rate and review service providers
- Manage wallet and payment methods
- View booking history and upcoming bookings

### For Service Providers (Drivers, Caretakers, Shuttle Drivers)
- Manage availability and service areas
- Accept or decline booking requests
- Track earnings and payment history
- View customer ratings and feedback
- Update profile and service details

### For Administrators
- Monitor all bookings and transactions
- Manage users and service providers
- Handle disputes and customer support
- View analytics and generate reports
- Configure system settings and pricing

## Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Responsive design with custom CSS
- Google Maps API for location services
- WebSocket for real-time tracking

### Backend
- Node.js with Express.js framework
- MySQL database for data storage
- RESTful API architecture
- Session-based authentication
- WebSocket server for real-time communications

### Security Features
- Password hashing with bcrypt
- OTP verification for phone numbers
- Session management
- Input validation and sanitization

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm (v6 or higher)

### Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/rydo-web-app.git
   cd rydo-web-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     DB_HOST=localhost
     DB_USER=your_database_user
     DB_PASSWORD=your_database_password
     DB_NAME=rydo_db
     PORT=3000
     SESSION_SECRET=your_session_secret
     GOOGLE_MAPS_API_KEY=your_google_maps_api_key
     ```

4. Set up the database:
   ```
   npm run setup-db
   ```

5. Start the application:
   ```
   npm start
   ```

6. Access the application:
   - Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
rydo-web-app/
├── backend/
│   ├── controllers/       # Business logic
│   ├── routes/            # API routes
│   ├── services/          # External services integration
│   └── server.js          # Main server file
├── config/
│   └── db.js              # Database configuration
├── frontend/
│   ├── admin/             # Admin dashboard pages
│   ├── caretaker/         # Caretaker dashboard pages
│   ├── customer/          # Customer dashboard pages
│   ├── driver/            # Driver dashboard pages
│   ├── shuttle/           # Shuttle service dashboard pages
│   ├── views/             # Shared view templates
│   ├── login.html         # Login page
│   └── signup.html        # Signup page
├── public/
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   ├── images/            # Image assets
│   └── uploads/           # User uploaded files
├── .env                   # Environment variables
├── package.json           # Project dependencies
└── README.md              # Project documentation
```

## API Documentation

The RYDO API follows RESTful principles and uses JSON for data exchange. All API endpoints are prefixed with `/api/v1`.

### Authentication Endpoints

- `POST /auth/signup`: Register a new user
- `POST /auth/login`: Authenticate a user
- `POST /auth/verify-otp`: Verify OTP for phone number
- `GET /auth/logout`: Log out the current user

### Customer Endpoints

- `GET /customer/dashboard-stats`: Get customer dashboard statistics
- `GET /customer/profile`: Get customer profile information
- `PUT /customer/profile`: Update customer profile
- `POST /customer/bookings`: Create a new booking
- `GET /customer/bookings`: Get all customer bookings
- `GET /customer/bookings/:id`: Get details of a specific booking
- `POST /customer/bookings/:id/cancel`: Cancel a booking
- `POST /customer/bookings/:id/rate`: Submit a rating for a booking
- `GET /customer/wallet`: Get wallet balance and transactions

### Service Provider Endpoints

- `GET /driver/dashboard-stats`: Get driver dashboard statistics
- `GET /caretaker/dashboard-stats`: Get caretaker dashboard statistics
- `GET /shuttle/dashboard-stats`: Get shuttle driver dashboard statistics
- `PUT /driver/availability`: Update driver availability
- `GET /driver/bookings`: Get driver bookings
- `POST /driver/bookings/:id/accept`: Accept a booking
- `POST /driver/bookings/:id/complete`: Mark a booking as completed

### Admin Endpoints

- `GET /admin/users`: Get all users
- `GET /admin/bookings`: Get all bookings
- `GET /admin/transactions`: Get all transactions
- `PUT /admin/settings`: Update system settings

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Deployment

### Deploying to Netlify

The RYDO Web App can be easily deployed to Netlify for testing and production purposes. Follow these steps to deploy your application:

1. **Prerequisites**
   - Netlify account (create one at [netlify.com](https://www.netlify.com) if you don't have one)
   - Node.js and npm installed locally

2. **Install Netlify CLI**
   ```
   npm install -g netlify-cli
   ```

3. **Login to Netlify**
   ```
   netlify login
   ```

4. **Prepare for Deployment**
   - Ensure you have the `netlify.toml` configuration file in your project root
   - Make sure the `functions` directory exists with the serverless functions

5. **Using the Deployment Script**
   The project includes a deployment script that automates the process:
   ```
   node deploy.js
   ```
   This script will:
   - Check for required files and create them if missing
   - Install dependencies
   - Build serverless functions
   - Deploy to Netlify

6. **Manual Deployment**
   If you prefer to deploy manually:
   ```
   npm run build    # Build serverless functions
   npm run deploy   # Deploy to Netlify
   ```

7. **Environment Variables**
   After deployment, set up the following environment variables in the Netlify dashboard:
   - `DB_HOST`: Your database host
   - `DB_USER`: Database username
   - `DB_PASSWORD`: Database password
   - `DB_NAME`: Database name
   - `SESSION_SECRET`: Secret for session management
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
   - `NODE_ENV`: Set to `production` for production deployment

8. **Database Connection**
   - For testing, you can use a cloud-hosted MySQL database
   - Make sure your database allows connections from Netlify's IP addresses

### Continuous Deployment

To set up continuous deployment:

1. Connect your GitHub repository to Netlify
2. Configure build settings in the Netlify dashboard
3. Set up branch deploys for testing different versions

## Contact

For any inquiries, please contact support@rydo.com
