/**
 * Profile Editor Component
 * Handles user profile editing functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize profile editor if it exists on the page
    const profileEditor = document.getElementById('profile-editor');
    if (profileEditor) {
        initProfileEditor();
    }

    // Add event listener to edit profile button
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', openProfileEditor);
    }
});

/**
 * Initialize the profile editor
 */
function initProfileEditor() {
    // Load user data from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Populate form fields with user data
    document.getElementById('profile-first-name').value = user.first_name || '';
    document.getElementById('profile-last-name').value = user.last_name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.getElementById('profile-address').value = user.address || '';
    
    // Add event listener to form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfile);
    }
    
    // Add event listener to cancel button
    const cancelBtn = document.querySelector('.cancel-profile-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeProfileEditor);
    }
}

/**
 * Open the profile editor modal
 */
function openProfileEditor() {
    const profileModal = document.getElementById('profile-editor-modal');
    if (profileModal) {
        profileModal.style.display = 'block';
        initProfileEditor();
    } else {
        createProfileEditorModal();
    }
}

/**
 * Create the profile editor modal if it doesn't exist
 */
function createProfileEditorModal() {
    // Get user data
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'profile-editor-modal';
    modal.className = 'modal';
    
    // Create modal content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Profile</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <form id="profile-form">
                    <div class="form-group">
                        <label for="profile-first-name">First Name</label>
                        <input type="text" id="profile-first-name" value="${user.first_name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="profile-last-name">Last Name</label>
                        <input type="text" id="profile-last-name" value="${user.last_name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="profile-email">Email</label>
                        <input type="email" id="profile-email" value="${user.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="profile-phone">Phone</label>
                        <input type="tel" id="profile-phone" value="${user.phone || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="profile-address">Address</label>
                        <textarea id="profile-address" rows="3">${user.address || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-profile-btn">Cancel</button>
                        <button type="submit" class="save-profile-btn">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to the document
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', closeProfileEditor);
    modal.querySelector('.cancel-profile-btn').addEventListener('click', closeProfileEditor);
    modal.querySelector('#profile-form').addEventListener('submit', saveProfile);
    
    // Show the modal
    modal.style.display = 'block';
}

/**
 * Close the profile editor modal
 */
function closeProfileEditor() {
    const profileModal = document.getElementById('profile-editor-modal');
    if (profileModal) {
        profileModal.style.display = 'none';
    }
}

/**
 * Save profile changes
 * @param {Event} e - Form submission event
 */
async function saveProfile(e) {
    e.preventDefault();
    
    // Get form values
    const firstName = document.getElementById('profile-first-name').value;
    const lastName = document.getElementById('profile-last-name').value;
    const email = document.getElementById('profile-email').value;
    const phone = document.getElementById('profile-phone').value;
    const address = document.getElementById('profile-address').value;
    
    try {
        // Get current user data
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Update user data
        const updatedUser = {
            ...user,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            address: address
        };
        
        // Save to API (mock)
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedUser)
        });
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Update UI
        updateProfileUI(updatedUser);
        
        // Close modal
        closeProfileEditor();
        
        // Show success message
        alert('Profile updated successfully!');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
    }
}

/**
 * Update the profile UI with new user data
 * @param {Object} user - Updated user data
 */
function updateProfileUI(user) {
    // Update profile name
    const profileName = document.getElementById('user-name');
    if (profileName) {
        profileName.textContent = `Welcome, ${user.first_name || 'User'}`;
    }
    
    // Update welcome message
    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName) {
        welcomeName.textContent = user.first_name || 'User';
    }
    
    // Update profile email
    const profileEmail = document.getElementById('user-email');
    if (profileEmail) {
        profileEmail.textContent = user.email || '';
    }
    
    // Update avatar
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        if (user.profile_image) {
            userAvatar.src = user.profile_image;
        } else {
            // Use first letter of name as avatar
            const firstLetter = (user.first_name || 'U').charAt(0).toUpperCase();
            userAvatar.style.backgroundImage = 'none';
            userAvatar.style.backgroundColor = '#3F51B5';
            userAvatar.style.color = 'white';
            userAvatar.style.display = 'flex';
            userAvatar.style.alignItems = 'center';
            userAvatar.style.justifyContent = 'center';
            userAvatar.style.fontWeight = 'bold';
            userAvatar.style.fontSize = '24px';
            userAvatar.textContent = firstLetter;
        }
    }
}
