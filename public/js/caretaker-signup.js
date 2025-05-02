document.addEventListener('DOMContentLoaded', function() {
    // Multi-step form navigation
    const formSteps = document.querySelectorAll('.form-step');
    const progressBar = document.getElementById('form-progress');
    const steps = document.querySelectorAll('.step');
    let currentStep = 1;
    
    // Next button functionality
    const nextButtons = document.querySelectorAll('.btn-next');
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Validate current step
            if (validateStep(currentStep)) {
                // Hide current step
                document.querySelector(`.form-step[data-step="${currentStep}"]`).style.display = 'none';
                
                // Update current step
                currentStep++;
                
                // Show next step
                document.querySelector(`.form-step[data-step="${currentStep}"]`).style.display = 'block';
                
                // Update progress bar and steps
                updateProgress();
                
                // If it's the last step, populate review section
                if (currentStep === 4) {
                    populateReviewSection();
                }
                
                // Scroll to top of form
                document.querySelector('.form-container').scrollTo(0, 0);
            }
        });
    });
    
    // Previous button functionality
    const prevButtons = document.querySelectorAll('.btn-prev');
    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Hide current step
            document.querySelector(`.form-step[data-step="${currentStep}"]`).style.display = 'none';
            
            // Update current step
            currentStep--;
            
            // Show previous step
            document.querySelector(`.form-step[data-step="${currentStep}"]`).style.display = 'block';
            
            // Update progress bar and steps
            updateProgress();
        });
    });
    
    // Update progress bar and steps
    function updateProgress() {
        // Update progress bar width
        progressBar.style.width = `${(currentStep / 4) * 100}%`;
        
        // Update step indicators
        steps.forEach((step, index) => {
            if (index + 1 < currentStep) {
                step.classList.add('completed');
                step.classList.add('active');
                step.innerHTML = '<i class="fas fa-check"></i>';
            } else if (index + 1 === currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
                step.innerHTML = index + 1;
            } else {
                step.classList.remove('active');
                step.classList.remove('completed');
                step.innerHTML = index + 1;
            }
        });
    }
    
    // Validate current step
    function validateStep(step) {
        const currentStepElement = document.querySelector(`.form-step[data-step="${step}"]`);
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        let isValid = true;
        
        // Remove any existing error messages
        const errorMessages = currentStepElement.querySelectorAll('.error-message');
        errorMessages.forEach(error => error.remove());
        
        // Check each required field
        requiredFields.forEach(field => {
            // Reset field styling
            field.style.borderColor = '';
            
            if (field.type === 'checkbox') {
                // For checkboxes (like terms agreement)
                if (!field.checked) {
                    isValid = false;
                    field.style.borderColor = 'var(--error-color)';
                    
                    // Add error message
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'error-message visible';
                    errorMessage.textContent = 'This field is required';
                    field.parentNode.appendChild(errorMessage);
                }
            } else if (field.type === 'file') {
                // For file inputs
                if (!field.files || field.files.length === 0) {
                    isValid = false;
                    field.parentNode.querySelector('.file-label').style.borderColor = 'var(--error-color)';
                    
                    // Add error message
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'error-message visible';
                    errorMessage.textContent = 'Please upload a file';
                    field.parentNode.parentNode.appendChild(errorMessage);
                }
            } else if (field.name === 'languages_known' || field.name === 'skills' || field.name === 'services_offered') {
                // For checkbox groups
                const checkboxGroup = field.closest('.form-group').querySelectorAll('input[type="checkbox"]');
                let isChecked = false;
                
                checkboxGroup.forEach(checkbox => {
                    if (checkbox.checked) {
                        isChecked = true;
                    }
                });
                
                if (!isChecked) {
                    isValid = false;
                    
                    // Add error message if it doesn't exist
                    if (!field.closest('.form-group').querySelector('.error-message')) {
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'error-message visible';
                        errorMessage.textContent = 'Please select at least one option';
                        field.closest('.form-group').appendChild(errorMessage);
                    }
                }
            } else {
                // For text, email, password, etc.
                if (field.value.trim() === '') {
                    isValid = false;
                    field.style.borderColor = 'var(--error-color)';
                    
                    // Add error message
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'error-message visible';
                    errorMessage.textContent = 'This field is required';
                    field.parentNode.appendChild(errorMessage);
                } else if (field.validity && !field.validity.valid) {
                    isValid = false;
                    field.style.borderColor = 'var(--error-color)';
                    
                    // Add error message
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'error-message visible';
                    errorMessage.textContent = field.validationMessage;
                    field.parentNode.appendChild(errorMessage);
                }
            }
        });
        
        // Special validation for password confirmation
        if (step === 1) {
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirm_password');
            
            if (password.value !== confirmPassword.value) {
                isValid = false;
                confirmPassword.style.borderColor = 'var(--error-color)';
                
                // Add error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message visible';
                errorMessage.textContent = 'Passwords do not match';
                confirmPassword.parentNode.appendChild(errorMessage);
            }
        }
        
        return isValid;
    }
    
    // Populate review section
    function populateReviewSection() {
        const reviewPersonal = document.getElementById('review-personal');
        const reviewId = document.getElementById('review-id');
        const reviewProfessional = document.getElementById('review-professional');
        
        // Clear previous content
        reviewPersonal.innerHTML = '';
        reviewId.innerHTML = '';
        reviewProfessional.innerHTML = '';
        
        // Personal Information
        const personalFields = [
            { id: 'first_name', label: 'First Name' },
            { id: 'last_name', label: 'Last Name' },
            { id: 'email', label: 'Email' },
            { id: 'phone', label: 'Phone', prefix: '+91 ' },
            { id: 'gender', label: 'Gender' },
            { id: 'date_of_birth', label: 'Date of Birth' },
            { id: 'address', label: 'Address' },
            { id: 'city', label: 'City' },
            { id: 'state', label: 'State' },
            { id: 'pincode', label: 'Pincode' }
        ];
        
        personalFields.forEach(field => {
            const element = document.getElementById(field.id);
            let value = element.value;
            
            // For select elements, get the selected option text
            if (element.tagName === 'SELECT' && element.selectedIndex !== -1) {
                value = element.options[element.selectedIndex].text;
            }
            
            if (value) {
                const displayValue = field.prefix ? field.prefix + value : value;
                reviewPersonal.innerHTML += `<p><strong>${field.label}:</strong> ${displayValue}</p>`;
            }
        });
        
        // ID Verification
        const idFields = [
            { id: 'id_proof_type', label: 'ID Proof Type' },
            { id: 'id_proof_number', label: 'ID Number' },
            { id: 'aadhar_number', label: 'Aadhar Number' }
        ];
        
        idFields.forEach(field => {
            const element = document.getElementById(field.id);
            let value = element.value;
            
            // For select elements, get the selected option text
            if (element.tagName === 'SELECT' && element.selectedIndex !== -1) {
                value = element.options[element.selectedIndex].text;
            }
            
            if (value) {
                reviewId.innerHTML += `<p><strong>${field.label}:</strong> ${value}</p>`;
            }
        });
        
        // Add document upload confirmation
        const uploadFields = [
            { id: 'profile_photo', label: 'Profile Photo' },
            { id: 'id_proof_photo', label: 'ID Proof Photo' },
            { id: 'aadhar_photo_front', label: 'Aadhar Front Photo' },
            { id: 'aadhar_photo_back', label: 'Aadhar Back Photo' },
            { id: 'certification_photo', label: 'Certification Photo' },
            { id: 'medical_license_photo', label: 'Medical License Photo' }
        ];
        
        uploadFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element.files && element.files.length > 0) {
                reviewId.innerHTML += `<p><strong>${field.label}:</strong> Uploaded (${element.files[0].name})</p>`;
            }
        });
        
        // Professional Details
        const professionalSelectFields = [
            { id: 'specialization', label: 'Specialization' },
            { id: 'education_level', label: 'Education Level' },
            { id: 'certification_type', label: 'Certification Type' }
        ];
        
        professionalSelectFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element.selectedIndex !== -1) {
                reviewProfessional.innerHTML += `<p><strong>${field.label}:</strong> ${element.options[element.selectedIndex].text}</p>`;
            }
        });
        
        // Text fields
        const professionalTextFields = [
            { id: 'certification_number', label: 'Certification Number' },
            { id: 'medical_license_number', label: 'Medical License Number' },
            { id: 'experience_years', label: 'Experience', suffix: ' years' },
            { id: 'preferred_locations', label: 'Preferred Locations' },
            { id: 'upi_id', label: 'UPI ID' }
        ];
        
        professionalTextFields.forEach(field => {
            const value = document.getElementById(field.id).value;
            if (value) {
                const displayValue = field.suffix ? value + field.suffix : value;
                reviewProfessional.innerHTML += `<p><strong>${field.label}:</strong> ${displayValue}</p>`;
            }
        });
        
        // Languages
        const languageCheckboxes = document.querySelectorAll('input[name="languages_known"]:checked');
        if (languageCheckboxes.length > 0) {
            const languages = Array.from(languageCheckboxes).map(cb => cb.value).join(', ');
            reviewProfessional.innerHTML += `<p><strong>Languages Known:</strong> ${languages}</p>`;
        }
        
        // Skills
        const skillCheckboxes = document.querySelectorAll('input[name="skills"]:checked');
        if (skillCheckboxes.length > 0) {
            const skills = Array.from(skillCheckboxes).map(cb => cb.value).join(', ');
            reviewProfessional.innerHTML += `<p><strong>Special Skills:</strong> ${skills}</p>`;
        }
        
        // Services
        const serviceCheckboxes = document.querySelectorAll('input[name="services_offered"]:checked');
        if (serviceCheckboxes.length > 0) {
            const services = Array.from(serviceCheckboxes).map(cb => cb.value).join(', ');
            reviewProfessional.innerHTML += `<p><strong>Services Offered:</strong> ${services}</p>`;
        }
        
        // Emergency Contact
        const emergencyName = document.getElementById('emergency_contact_name').value;
        const emergencyPhone = document.getElementById('emergency_contact_phone').value;
        if (emergencyName && emergencyPhone) {
            reviewProfessional.innerHTML += `<p><strong>Emergency Contact:</strong> ${emergencyName} (+91 ${emergencyPhone})</p>`;
        }
    }
    
    // Toggle password visibility
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });
    
    // Password strength meter
    const passwordInput = document.getElementById('password');
    const strengthSegments = document.querySelectorAll('.strength-segment');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            // Length check
            if (password.length >= 8) strength++;
            
            // Contains lowercase
            if (/[a-z]/.test(password)) strength++;
            
            // Contains uppercase
            if (/[A-Z]/.test(password)) strength++;
            
            // Contains number
            if (/[0-9]/.test(password)) strength++;
            
            // Contains special character
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            // Update strength meter
            strengthSegments.forEach((segment, index) => {
                segment.classList.remove('weak', 'medium', 'strong');
                
                if (index < strength) {
                    if (strength <= 2) {
                        segment.classList.add('weak');
                    } else if (strength <= 4) {
                        segment.classList.add('medium');
                    } else {
                        segment.classList.add('strong');
                    }
                }
            });
        });
    }
    
    // File upload handling
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const fileName = this.files[0]?.name || 'No file chosen';
            const fileNameElement = this.parentNode.querySelector('.file-name');
            fileNameElement.textContent = fileName;
            
            // Validate file size (max 2MB)
            if (this.files[0] && this.files[0].size > 2 * 1024 * 1024) {
                // Remove any existing error message
                const existingError = this.parentNode.parentNode.querySelector('.error-message');
                if (existingError) {
                    existingError.remove();
                }
                
                // Add error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message visible';
                errorMessage.textContent = 'File size exceeds 2MB limit';
                this.parentNode.parentNode.appendChild(errorMessage);
                
                // Reset file input
                this.value = '';
                fileNameElement.textContent = 'No file chosen';
            }
        });
    });
    
    // Form submission
    const caretakerSignupForm = document.getElementById('caretaker-signup-form');
    if (caretakerSignupForm) {
        caretakerSignupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate final step
            if (!validateStep(currentStep)) {
                return;
            }
            
            // Create FormData object to handle file uploads
            const formData = new FormData(this);
            
            // Add checkbox groups as comma-separated values
            const languageCheckboxes = document.querySelectorAll('input[name="languages_known"]:checked');
            const languages = Array.from(languageCheckboxes).map(cb => cb.value).join(',');
            formData.set('languages_known', languages);
            
            const skillCheckboxes = document.querySelectorAll('input[name="skills"]:checked');
            const skills = Array.from(skillCheckboxes).map(cb => cb.value).join(',');
            formData.set('skills', skills);
            
            const serviceCheckboxes = document.querySelectorAll('input[name="services_offered"]:checked');
            const services = Array.from(serviceCheckboxes).map(cb => cb.value).join(',');
            formData.set('services_offered', services);
            
            // Add role
            formData.append('role', 'caretaker');
            
            try {
                // Disable submit button to prevent multiple submissions
                const submitButton = document.querySelector('.btn-submit');
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                
                const response = await fetch('/auth/caretaker-signup', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Redirect to verification page or dashboard
                    window.location.href = '/verification?email=' + encodeURIComponent(formData.get('email'));
                } else {
                    // Show error message
                    alert(data.message || 'Registration failed. Please try again.');
                    
                    // Re-enable submit button
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Submit Application';
                }
            } catch (error) {
                console.error('Signup error:', error);
                alert('An error occurred during registration. Please try again.');
                
                // Re-enable submit button
                const submitButton = document.querySelector('.btn-submit');
                submitButton.disabled = false;
                submitButton.innerHTML = 'Submit Application';
            }
        });
    }
    
    // Initialize Google Places Autocomplete for address
    const addressInput = document.getElementById('address');
    if (addressInput && window.google && window.google.maps && window.google.maps.places) {
        const autocomplete = new google.maps.places.Autocomplete(addressInput, {
            types: ['address'],
            componentRestrictions: { country: 'in' }
        });
        
        autocomplete.addListener('place_changed', function() {
            const place = autocomplete.getPlace();
            
            if (place.address_components) {
                // Extract address components
                for (const component of place.address_components) {
                    const componentType = component.types[0];
                    
                    switch (componentType) {
                        case 'locality':
                            document.getElementById('city').value = component.long_name;
                            break;
                        case 'administrative_area_level_1':
                            document.getElementById('state').value = component.long_name;
                            break;
                        case 'postal_code':
                            document.getElementById('pincode').value = component.long_name;
                            break;
                    }
                }
            }
        });
    }
});
