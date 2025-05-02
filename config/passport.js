const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Configure Google OAuth Strategy with hardcoded credentials for development
// In production, these should be loaded from environment variables
const GOOGLE_CLIENT_ID = "885696492604-cqnuj7fnj7oaplnr48jf165u9jr6oj0h.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
// The callback URL must exactly match what's configured in Google Cloud Console
const GOOGLE_CALLBACK_URL = "http://localhost:5002/api/auth/google/callback";

console.log('Google OAuth configured with:', {
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET.substring(0, 5) + '...',
  callbackURL: GOOGLE_CALLBACK_URL
});

// Always use the Google strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
        scope: ['profile', 'email'],
        // Add these options to fix the Bad Request error
        proxy: true,
        state: true
      },
    async (req, accessToken, refreshToken, profile, done) => {
      console.log('Google OAuth callback received with profile:', profile.id);
      console.log('Profile email:', profile.emails[0].value);
      
      try {
        // Check if user already exists by email or googleId
        console.log('Checking if user exists in the users table...');
        let user = await User.findOne({
          where: {
            [Op.or]: [
              { email: profile.emails[0].value },
              { googleId: profile.id }
            ]
          }
        });
        
        console.log('User search result:', user ? `Found user with ID ${user.id}` : 'No user found');

        if (user) {
          // If user exists but doesn't have googleId, update it
          if (!user.googleId) {
            user = await user.update({ 
              googleId: profile.id,
              profilePicture: profile.photos[0].value || user.profilePicture
            });
          }
          return done(null, user);
        }

        // Generate a random password for OAuth users
        console.log('Generating random password for new user...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), salt);

        // Create new user directly in the users table
        try {
            // Create new user directly in the users table
            const userData = {
                name: profile.displayName,
                email: profile.emails[0].value,
                password: hashedPassword,
                googleId: profile.id,
                profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
                phone: '0000000000', // Default phone number, user will update later
                role: 'customer' // Default role
            };
            
            console.log('User data to be created:', userData);
            
            // Use findOrCreate to avoid duplicate user creation
            const [newUser, created] = await User.findOrCreate({
                where: { email: profile.emails[0].value },
                defaults: userData
            });
            
            // If user exists but doesn't have googleId, update it
            if (!created && !newUser.googleId) {
                await newUser.update({ 
                    googleId: profile.id,
                    profilePicture: userData.profilePicture || newUser.profilePicture
                });
                console.log('Updated existing user with Google ID:', newUser.id);
            } else if (created) {
                console.log('Created new user with Google ID:', newUser.id);
            }

            console.log('New user created successfully with ID:', newUser.id);
            return done(null, newUser);
        } catch (err) {
            console.error('Error in Google OAuth strategy:', err);
            return done(err, null);
        }
      } catch (err) {
        console.error('Error in Google OAuth strategy:', err);
        return done(err, null);
      }
    }
    )
  );

module.exports = passport;
