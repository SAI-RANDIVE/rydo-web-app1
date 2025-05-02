/**
 * RYDO Logout Handler
 * Securely clears all user session data and redirects to login page
 */

function logout() {
    // Clear all session storage
    sessionStorage.clear();
    
    // Clear all localStorage items that might contain sensitive data
    localStorage.removeItem('user_data');
    localStorage.removeItem('temp_credentials');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_preferences');
    
    // Clear cookies by setting them to expire in the past
    document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Redirect to login page
    window.location.href = '/login.html';
}

// Add event listeners to all logout buttons
document.addEventListener('DOMContentLoaded', function() {
    const logoutButtons = document.querySelectorAll('.logout-btn, .btn-logout, [data-action="logout"]');
    
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
});
