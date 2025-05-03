/**
 * Profile Controller
 * 
 * Handles user profile management for all user types
 */
const User = require('../models/UserMongo');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

/**
 * Get user profile
 */
exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find user by ID and exclude password
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error getting user profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            phone,
            address,
            city,
            state,
            pincode,
            bio,
            emergency_contact_name,
            emergency_contact_phone
        } = req.body;
        
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update basic fields
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (city) user.city = city;
        if (state) user.state = state;
        if (pincode) user.pincode = pincode;
        if (bio) user.bio = bio;
        if (emergency_contact_name) user.emergency_contact_name = emergency_contact_name;
        if (emergency_contact_phone) user.emergency_contact_phone = emergency_contact_phone;
        
        user.updated_at = Date.now();
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Update service provider details
 */
exports.updateServiceProviderDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if user is a service provider
        if (!['driver', 'caretaker', 'shuttle_driver'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only service providers can update service details'
            });
        }
        
        // Update service details based on role
        if (user.role === 'driver') {
            const {
                license_number,
                license_expiry,
                vehicle_model,
                vehicle_color,
                vehicle_year,
                vehicle_registration,
                experience_years,
                service_areas,
                languages,
                hourly_rate,
                is_available
            } = req.body;
            
            // Update driver-specific fields
            if (!user.driver_details) user.driver_details = {};
            
            if (license_number) user.driver_details.license_number = license_number;
            if (license_expiry) user.driver_details.license_expiry = license_expiry;
            if (vehicle_model) user.driver_details.vehicle_model = vehicle_model;
            if (vehicle_color) user.driver_details.vehicle_color = vehicle_color;
            if (vehicle_year) user.driver_details.vehicle_year = vehicle_year;
            if (vehicle_registration) user.driver_details.vehicle_registration = vehicle_registration;
            if (experience_years) user.driver_details.experience_years = experience_years;
            if (service_areas) user.driver_details.service_areas = service_areas;
            if (languages) user.driver_details.languages = languages;
            if (hourly_rate) user.driver_details.hourly_rate = hourly_rate;
            if (is_available !== undefined) user.driver_details.is_available = is_available;
            
        } else if (user.role === 'caretaker') {
            const {
                specialization,
                qualification,
                experience_years,
                certification,
                languages,
                service_areas,
                hourly_rate,
                is_available
            } = req.body;
            
            // Update caretaker-specific fields
            if (!user.caretaker_details) user.caretaker_details = {};
            
            if (specialization) user.caretaker_details.specialization = specialization;
            if (qualification) user.caretaker_details.qualification = qualification;
            if (experience_years) user.caretaker_details.experience_years = experience_years;
            if (certification) user.caretaker_details.certification = certification;
            if (languages) user.caretaker_details.languages = languages;
            if (service_areas) user.caretaker_details.service_areas = service_areas;
            if (hourly_rate) user.caretaker_details.hourly_rate = hourly_rate;
            if (is_available !== undefined) user.caretaker_details.is_available = is_available;
            
        } else if (user.role === 'shuttle_driver') {
            const {
                license_number,
                license_expiry,
                vehicle_model,
                vehicle_capacity,
                vehicle_registration,
                experience_years,
                service_areas,
                languages,
                hourly_rate,
                is_available
            } = req.body;
            
            // Update shuttle driver-specific fields
            if (!user.shuttle_details) user.shuttle_details = {};
            
            if (license_number) user.shuttle_details.license_number = license_number;
            if (license_expiry) user.shuttle_details.license_expiry = license_expiry;
            if (vehicle_model) user.shuttle_details.vehicle_model = vehicle_model;
            if (vehicle_capacity) user.shuttle_details.vehicle_capacity = vehicle_capacity;
            if (vehicle_registration) user.shuttle_details.vehicle_registration = vehicle_registration;
            if (experience_years) user.shuttle_details.experience_years = experience_years;
            if (service_areas) user.shuttle_details.service_areas = service_areas;
            if (languages) user.shuttle_details.languages = languages;
            if (hourly_rate) user.shuttle_details.hourly_rate = hourly_rate;
            if (is_available !== undefined) user.shuttle_details.is_available = is_available;
        }
        
        user.updated_at = Date.now();
        
        // If user is updating details and was previously rejected, set back to pending
        if (user.verification_status === 'rejected') {
            user.verification_status = 'pending';
            user.rejection_reason = null;
        }
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Service provider details updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Error updating service provider details:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;
        
        // Validate input
        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if current password is correct
        const isMatch = await bcrypt.compare(current_password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(new_password, salt);
        user.updated_at = Date.now();
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Upload profile picture
 */
exports.uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Check if file exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }
        
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Delete old profile picture if exists
        if (user.profile_picture && user.profile_picture !== 'default.jpg') {
            const oldPicturePath = path.join(__dirname, '../public/uploads/profile', user.profile_picture);
            if (fs.existsSync(oldPicturePath)) {
                fs.unlinkSync(oldPicturePath);
            }
        }
        
        // Update user profile picture
        user.profile_picture = req.file.filename;
        user.updated_at = Date.now();
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: {
                profile_picture: user.profile_picture
            }
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Upload document
 */
exports.uploadDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        const { document_type } = req.body;
        
        // Validate document type
        if (!document_type) {
            return res.status(400).json({
                success: false,
                message: 'Document type is required'
            });
        }
        
        // Check if file exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }
        
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if user is a service provider
        if (!['driver', 'caretaker', 'shuttle_driver'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only service providers can upload documents'
            });
        }
        
        // Initialize documents array if not exists
        if (!user.documents) {
            user.documents = [];
        }
        
        // Check if document type already exists
        const existingDocIndex = user.documents.findIndex(doc => doc.type === document_type);
        
        if (existingDocIndex !== -1) {
            // Delete old document file
            const oldDocPath = path.join(__dirname, '../public/uploads/documents', user.documents[existingDocIndex].file);
            if (fs.existsSync(oldDocPath)) {
                fs.unlinkSync(oldDocPath);
            }
            
            // Update existing document
            user.documents[existingDocIndex] = {
                type: document_type,
                file: req.file.filename,
                uploaded_at: Date.now(),
                verified: false
            };
        } else {
            // Add new document
            user.documents.push({
                type: document_type,
                file: req.file.filename,
                uploaded_at: Date.now(),
                verified: false
            });
        }
        
        // If user was previously rejected, set status back to pending
        if (user.verification_status === 'rejected') {
            user.verification_status = 'pending';
            user.rejection_reason = null;
        }
        
        user.updated_at = Date.now();
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                document_type,
                file: req.file.filename
            }
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Update location
 */
exports.updateLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { latitude, longitude } = req.body;
        
        // Validate coordinates
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }
        
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update location
        user.current_location = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
        
        user.updated_at = Date.now();
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Location updated successfully'
        });
    } catch (error) {
        console.error('Error updating location:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
