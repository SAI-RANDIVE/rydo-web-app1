/**
 * RYDO Service Provider Registration JavaScript
 * Handles form validation, multi-step form navigation, and form submission
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize registration form
    initRegistrationForm();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize the registration form
 */
function initRegistrationForm() {
    // Show the first step
    document.getElementById('step-1').style.display = 'block';
    
    // Set up service type selection
    const serviceTypeOptions = document.querySelectorAll('.service-type-option');
    serviceTypeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            serviceTypeOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to selected option
            this.classList.add('active');
            
            // Store selected service type
            const serviceType = this.getAttribute('data-type');
            document.getElementById('provider-registration-form').setAttribute('data-service-type', serviceType);
            
            // Show/hide service-specific fields based on selection
            showServiceFields(serviceType);
        });
    });
    
    // Set up password strength meter
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            updatePasswordStrength(this.value);
        });
    }
}

/**
 * Set up event listeners for form navigation and submission
 */
function setupEventListeners() {
    // Next button click
    const nextButtons = document.querySelectorAll('.btn-next');
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            const currentStep = this.closest('.form-step');
            const nextStepId = this.getAttribute('data-next');
            
            if (validateStep(currentStep.id)) {
                // Hide current step
                currentStep.style.display = 'none';
                
                // Show next step
                document.getElementById(nextStepId).style.display = 'block';
                
                // Scroll to top of form
                document.querySelector('.registration-container').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Previous button click
    const prevButtons = document.querySelectorAll('.btn-prev');
    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            const currentStep = this.closest('.form-step');
            const prevStepId = this.getAttribute('data-prev');
            
            // Hide current step
            currentStep.style.display = 'none';
            
            // Show previous step
            document.getElementById(prevStepId).style.display = 'block';
            
            // Scroll to top of form
            document.querySelector('.registration-container').scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    // Form submission
    const registrationForm = document.getElementById('provider-registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateForm()) {
                submitForm();
            }
        });
    }
}

/**
 * Show service-specific fields based on selected service type
 * @param {string} serviceType - The selected service type (driver, caretaker, shuttle)
 */
function showServiceFields(serviceType) {
    // Hide all service-specific fields
    const serviceFields = document.querySelectorAll('.service-specific');
    serviceFields.forEach(field => {
        field.style.display = 'none';
    });
    
    // Show fields for selected service type
    if (serviceType === 'driver') {
        document.getElementById('driver-fields').style.display = 'block';
        
        // Show driver-specific document fields
        const driverDocuments = document.querySelectorAll('.driver-document');
        driverDocuments.forEach(doc => {
            doc.style.display = 'block';
        });
    } else if (serviceType === 'caretaker') {
        document.getElementById('caretaker-fields').style.display = 'block';
        
        // Show caretaker-specific document fields
        const caretakerDocuments = document.querySelectorAll('.caretaker-document');
        caretakerDocuments.forEach(doc => {
            doc.style.display = 'block';
        });
    } else if (serviceType === 'shuttle') {
        document.getElementById('shuttle-fields').style.display = 'block';
        
        // Show shuttle-specific document fields
        const shuttleDocuments = document.querySelectorAll('.shuttle-document');
        shuttleDocuments.forEach(doc => {
            doc.style.display = 'block';
        });
    }
}

/**
 * Validate a specific form step
 * @param {string} stepId - The ID of the step to validate
 * @returns {boolean} - Whether the step is valid
 */
function validateStep(stepId) {
    let isValid = true;
    
    if (stepId === 'step-1') {
        // Validate basic information
        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (!firstName) {
            showError('first-name', 'First name is required');
            isValid = false;
        } else {
            clearError('first-name');
        }
        
        if (!lastName) {
            showError('last-name', 'Last name is required');
            isValid = false;
        } else {
            clearError('last-name');
        }
        
        if (!email) {
            showError('email', 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('email', 'Please enter a valid email address');
            isValid = false;
        } else {
            clearError('email');
        }
        
        if (!phone) {
            showError('phone', 'Phone number is required');
            isValid = false;
        } else if (!isValidPhone(phone)) {
            showError('phone', 'Please enter a valid 10-digit phone number');
            isValid = false;
        } else {
            clearError('phone');
        }
        
        if (!password) {
            showError('password', 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            showError('password', 'Password must be at least 8 characters long');
            isValid = false;
        } else {
            clearError('password');
        }
        
        if (!confirmPassword) {
            showError('confirm-password', 'Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            showError('confirm-password', 'Passwords do not match');
            isValid = false;
        } else {
            clearError('confirm-password');
        }
    } else if (stepId === 'step-2') {
        // Validate personal details
        const dob = document.getElementById('dob').value;
        const gender = document.getElementById('gender').value;
        const address = document.getElementById('address').value.trim();
        const city = document.getElementById('city').value.trim();
        const state = document.getElementById('state').value.trim();
        const pincode = document.getElementById('pincode').value.trim();
        
        if (!dob) {
            showError('dob', 'Date of birth is required');
            isValid = false;
        } else {
            clearError('dob');
        }
        
        if (!gender) {
            showError('gender', 'Please select your gender');
            isValid = false;
        } else {
            clearError('gender');
        }
        
        if (!address) {
            showError('address', 'Address is required');
            isValid = false;
        } else {
            clearError('address');
        }
        
        if (!city) {
            showError('city', 'City is required');
            isValid = false;
        } else {
            clearError('city');
        }
        
        if (!state) {
            showError('state', 'State is required');
            isValid = false;
        } else {
            clearError('state');
        }
        
        if (!pincode) {
            showError('pincode', 'Pincode is required');
            isValid = false;
        } else if (!isValidPincode(pincode)) {
            showError('pincode', 'Please enter a valid 6-digit pincode');
            isValid = false;
        } else {
            clearError('pincode');
        }
        
        // Check if service type is selected
        const serviceType = document.getElementById('provider-registration-form').getAttribute('data-service-type');
        if (!serviceType) {
            showError('service-type-selector', 'Please select a service type');
            isValid = false;
        } else {
            clearError('service-type-selector');
            
            // Validate service-specific fields
            if (serviceType === 'driver') {
                isValid = validateDriverFields() && isValid;
            } else if (serviceType === 'caretaker') {
                isValid = validateCaretakerFields() && isValid;
            } else if (serviceType === 'shuttle') {
                isValid = validateShuttleFields() && isValid;
            }
        }
    }
    
    return isValid;
}

/**
 * Validate driver-specific fields
 * @returns {boolean} - Whether the fields are valid
 */
function validateDriverFields() {
    let isValid = true;
    
    const licenseNumber = document.getElementById('license-number').value.trim();
    const licenseExpiry = document.getElementById('license-expiry').value;
    const vehicleType = document.getElementById('vehicle-type').value;
    const make = document.getElementById('vehicle-make').value.trim();
    const model = document.getElementById('vehicle-model').value.trim();
    const licensePlate = document.getElementById('license-plate').value.trim();
    const registrationNumber = document.getElementById('registration-number').value.trim();
    
    if (!licenseNumber) {
        showError('license-number', 'License number is required');
        isValid = false;
    } else {
        clearError('license-number');
    }
    
    if (!licenseExpiry) {
        showError('license-expiry', 'License expiry date is required');
        isValid = false;
    } else {
        clearError('license-expiry');
    }
    
    if (!vehicleType) {
        showError('vehicle-type', 'Please select a vehicle type');
        isValid = false;
    } else {
        clearError('vehicle-type');
    }
    
    if (!make) {
        showError('vehicle-make', 'Vehicle make is required');
        isValid = false;
    } else {
        clearError('vehicle-make');
    }
    
    if (!model) {
        showError('vehicle-model', 'Vehicle model is required');
        isValid = false;
    } else {
        clearError('vehicle-model');
    }
    
    if (!licensePlate) {
        showError('license-plate', 'License plate number is required');
        isValid = false;
    } else {
        clearError('license-plate');
    }
    
    if (!registrationNumber) {
        showError('registration-number', 'Registration number is required');
        isValid = false;
    } else {
        clearError('registration-number');
    }
    
    return isValid;
}

/**
 * Validate caretaker-specific fields
 * @returns {boolean} - Whether the fields are valid
 */
function validateCaretakerFields() {
    let isValid = true;
    
    const specialization = document.getElementById('specialization').value;
    const experienceYears = document.getElementById('experience-years').value;
    const certification = document.getElementById('certification').value.trim();
    
    if (!specialization) {
        showError('specialization', 'Please select a specialization');
        isValid = false;
    } else {
        clearError('specialization');
    }
    
    if (!experienceYears && experienceYears !== '0') {
        showError('experience-years', 'Years of experience is required');
        isValid = false;
    } else {
        clearError('experience-years');
    }
    
    if (!certification) {
        showError('certification', 'Certification/License is required');
        isValid = false;
    } else {
        clearError('certification');
    }
    
    return isValid;
}

/**
 * Validate shuttle-specific fields
 * @returns {boolean} - Whether the fields are valid
 */
function validateShuttleFields() {
    let isValid = true;
    
    const licenseNumber = document.getElementById('shuttle-license-number').value.trim();
    const licenseExpiry = document.getElementById('shuttle-license-expiry').value;
    const vehicleType = document.getElementById('shuttle-vehicle-type').value;
    const make = document.getElementById('shuttle-make').value.trim();
    const model = document.getElementById('shuttle-model').value.trim();
    const seatingCapacity = document.getElementById('seating-capacity').value;
    const licensePlate = document.getElementById('shuttle-license-plate').value.trim();
    const registrationNumber = document.getElementById('shuttle-registration-number').value.trim();
    
    if (!licenseNumber) {
        showError('shuttle-license-number', 'License number is required');
        isValid = false;
    } else {
        clearError('shuttle-license-number');
    }
    
    if (!licenseExpiry) {
        showError('shuttle-license-expiry', 'License expiry date is required');
        isValid = false;
    } else {
        clearError('shuttle-license-expiry');
    }
    
    if (!vehicleType) {
        showError('shuttle-vehicle-type', 'Please select a vehicle type');
        isValid = false;
    } else {
        clearError('shuttle-vehicle-type');
    }
    
    if (!make) {
        showError('shuttle-make', 'Vehicle make is required');
        isValid = false;
    } else {
        clearError('shuttle-make');
    }
    
    if (!model) {
        showError('shuttle-model', 'Vehicle model is required');
        isValid = false;
    } else {
        clearError('shuttle-model');
    }
    
    if (!seatingCapacity) {
        showError('seating-capacity', 'Seating capacity is required');
        isValid = false;
    } else {
        clearError('seating-capacity');
    }
    
    if (!licensePlate) {
        showError('shuttle-license-plate', 'License plate number is required');
        isValid = false;
    } else {
        clearError('shuttle-license-plate');
    }
    
    if (!registrationNumber) {
        showError('shuttle-registration-number', 'Registration number is required');
        isValid = false;
    } else {
        clearError('shuttle-registration-number');
    }
    
    return isValid;
}

/**
 * Validate the entire form before submission
 * @returns {boolean} - Whether the form is valid
 */
function validateForm() {
    let isValid = true;
    
    // Validate step 1 and 2
    isValid = validateStep('step-1') && validateStep('step-2');
    
    // Validate document uploads
    const idProof = document.getElementById('id-proof').files.length;
    const addressProof = document.getElementById('address-proof').files.length;
    const profilePhoto = document.getElementById('profile-photo').files.length;
    const terms = document.getElementById('terms').checked;
    
    if (!idProof) {
        showError('id-proof', 'Please upload ID proof');
        isValid = false;
    } else {
        clearError('id-proof');
    }
    
    if (!addressProof) {
        showError('address-proof', 'Please upload address proof');
        isValid = false;
    } else {
        clearError('address-proof');
    }
    
    if (!profilePhoto) {
        showError('profile-photo', 'Please upload a profile photo');
        isValid = false;
    } else {
        clearError('profile-photo');
    }
    
    if (!terms) {
        showError('terms', 'You must agree to the terms and conditions');
        isValid = false;
    } else {
        clearError('terms');
    }
    
    // Validate service-specific document uploads
    const serviceType = document.getElementById('provider-registration-form').getAttribute('data-service-type');
    
    if (serviceType === 'driver' || serviceType === 'shuttle') {
        const drivingLicense = document.getElementById('driving-license').files.length;
        const vehicleRegistration = document.getElementById('vehicle-registration').files.length;
        const vehicleInsurance = document.getElementById('vehicle-insurance').files.length;
        
        if (!drivingLicense) {
            showError('driving-license', 'Please upload driving license');
            isValid = false;
        } else {
            clearError('driving-license');
        }
        
        if (!vehicleRegistration) {
            showError('vehicle-registration', 'Please upload vehicle registration certificate');
            isValid = false;
        } else {
            clearError('vehicle-registration');
        }
        
        if (!vehicleInsurance) {
            showError('vehicle-insurance', 'Please upload vehicle insurance');
            isValid = false;
        } else {
            clearError('vehicle-insurance');
        }
    } else if (serviceType === 'caretaker') {
        const qualificationCertificate = document.getElementById('qualification-certificate').files.length;
        
        if (!qualificationCertificate) {
            showError('qualification-certificate', 'Please upload qualification certificate');
            isValid = false;
        } else {
            clearError('qualification-certificate');
        }
    }
    
    return isValid;
}

/**
 * Submit the registration form
 */
function submitForm() {
    // Show loading state
    const submitButton = document.querySelector('.btn-submit');
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitButton.disabled = true;
    
    // Create FormData object
    const formData = new FormData(document.getElementById('provider-registration-form'));
    
    // Add service type
    const serviceType = document.getElementById('provider-registration-form').getAttribute('data-service-type');
    formData.append('service_type', serviceType);
    
    // Send form data to server
    fetch('/api/auth/provider-register', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            showSuccessMessage(data.message || 'Registration successful! Your application is under review.');
            
            // Redirect to login page after delay
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        } else {
            // Show error message
            showErrorMessage(data.message || 'Registration failed. Please try again.');
            
            // Reset submit button
            submitButton.innerHTML = 'Submit Application';
            submitButton.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        
        // Show error message
        showErrorMessage('An error occurred. Please try again later.');
        
        // Reset submit button
        submitButton.innerHTML = 'Submit Application';
        submitButton.disabled = false;
    });
}

/**
 * Update password strength meter
 * @param {string} password - The password to check
 */
function updatePasswordStrength(password) {
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');
    
    // Calculate password strength
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (password.match(/[a-z]+/)) strength += 1;
    if (password.match(/[A-Z]+/)) strength += 1;
    if (password.match(/[0-9]+/)) strength += 1;
    if (password.match(/[^a-zA-Z0-9]+/)) strength += 1;
    
    // Update strength meter
    switch (strength) {
        case 0:
        case 1:
            strengthMeter.style.width = '20%';
            strengthMeter.style.backgroundColor = '#ff4d4d';
            strengthText.textContent = 'Very Weak';
            break;
        case 2:
            strengthMeter.style.width = '40%';
            strengthMeter.style.backgroundColor = '#ffa64d';
            strengthText.textContent = 'Weak';
            break;
        case 3:
            strengthMeter.style.width = '60%';
            strengthMeter.style.backgroundColor = '#ffff4d';
            strengthText.textContent = 'Medium';
            break;
        case 4:
            strengthMeter.style.width = '80%';
            strengthMeter.style.backgroundColor = '#4dff4d';
            strengthText.textContent = 'Strong';
            break;
        case 5:
            strengthMeter.style.width = '100%';
            strengthMeter.style.backgroundColor = '#4d4dff';
            strengthText.textContent = 'Very Strong';
            break;
    }
}

/**
 * Show error message for a form field
 * @param {string} fieldId - The ID of the field
 * @param {string} message - The error message
 */
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = field.parentElement.querySelector('.error-message');
    
    if (errorElement) {
        errorElement.textContent = message;
    } else {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        field.parentElement.appendChild(errorDiv);
    }
    
    field.classList.add('error');
}

/**
 * Clear error message for a form field
 * @param {string} fieldId - The ID of the field
 */
function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = field.parentElement.querySelector('.error-message');
    
    if (errorElement) {
        errorElement.remove();
    }
    
    field.classList.remove('error');
}

/**
 * Show success message
 * @param {string} message - The success message
 */
function showSuccessMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'success-message';
    messageElement.textContent = message;
    
    const form = document.getElementById('provider-registration-form');
    form.innerHTML = '';
    form.appendChild(messageElement);
    
    // Scroll to message
    messageElement.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Show error message
 * @param {string} message - The error message
 */
function showErrorMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'error-message global-error';
    messageElement.textContent = message;
    
    const form = document.getElementById('provider-registration-form');
    const existingMessage = form.querySelector('.global-error');
    
    if (existingMessage) {
        existingMessage.remove();
    }
    
    form.prepend(messageElement);
    
    // Scroll to message
    messageElement.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
function isValidPhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate pincode format
 * @param {string} pincode - The pincode to validate
 * @returns {boolean} - Whether the pincode is valid
 */
function isValidPincode(pincode) {
    const pincodeRegex = /^\d{6}$/;
    return pincodeRegex.test(pincode);
}
