/**
 * RYDO Web App Animation Helper
 * This script adds animation classes to elements for a more dynamic UI
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add animation classes to elements
    applyAnimations();
    
    // Add animation classes to dynamically loaded content
    observeDynamicContent();
});

/**
 * Apply animations to elements on page load
 */
function applyAnimations() {
    // Navbar animation
    const navbar = document.querySelector('.main-header');
    if (navbar) {
        navbar.classList.add('fade-in');
    }
    
    // Sidebar animation
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.add('slide-in-left');
    }
    
    // Main content animation
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.classList.add('fade-in');
    }
    
    // Dashboard cards animation
    const dashboardCards = document.querySelectorAll('.dashboard-card');
    dashboardCards.forEach((card, index) => {
        card.classList.add('slide-in-bottom');
        card.style.animationDelay = `${0.1 * (index + 1)}s`;
    });
    
    // Booking list items animation
    const bookingItems = document.querySelectorAll('.booking-list-item');
    bookingItems.forEach((item, index) => {
        item.classList.add('slide-in-right');
        item.style.animationDelay = `${0.1 * (index + 1)}s`;
    });
    
    // Auth form animation
    const authForm = document.querySelector('.auth-form');
    if (authForm) {
        authForm.classList.add('fade-in');
        
        const formGroups = authForm.querySelectorAll('.form-group');
        formGroups.forEach((group, index) => {
            group.classList.add('slide-in-bottom');
            group.style.animationDelay = `${0.1 * (index + 1)}s`;
        });
        
        const submitBtn = authForm.querySelector('.btn');
        if (submitBtn) {
            submitBtn.classList.add('slide-in-bottom');
            submitBtn.style.animationDelay = `${0.1 * (formGroups.length + 1)}s`;
        }
    }
    
    // Nearby drivers animation
    const nearbyDrivers = document.querySelectorAll('.nearby-driver');
    nearbyDrivers.forEach((driver, index) => {
        driver.classList.add('slide-in-right');
        driver.style.animationDelay = `${0.1 * (index + 1)}s`;
    });
    
    // Booking countdown animation
    const bookingCountdown = document.querySelector('.booking-countdown');
    if (bookingCountdown) {
        bookingCountdown.classList.add('pulse');
    }
    
    // Profile image animation
    const profileImage = document.querySelector('.profile-image');
    if (profileImage) {
        profileImage.classList.add('fade-in');
    }
    
    // Rating stars animation
    const ratingStars = document.querySelectorAll('.rating-star');
    ratingStars.forEach((star, index) => {
        star.classList.add('fade-in');
        star.style.animationDelay = `${0.1 * (index + 1)}s`;
    });
    
    // Notification items animation
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach((item, index) => {
        item.classList.add('slide-in-right');
        item.style.animationDelay = `${0.1 * (index + 1)}s`;
    });
    
    // Transaction items animation
    const transactionItems = document.querySelectorAll('.transaction-item');
    transactionItems.forEach((item, index) => {
        item.classList.add('slide-in-bottom');
        item.style.animationDelay = `${0.1 * (index + 1)}s`;
    });
    
    // Booking detail items animation
    const bookingDetailItems = document.querySelectorAll('.booking-detail-item');
    bookingDetailItems.forEach((item, index) => {
        item.classList.add('fade-in');
        item.style.animationDelay = `${0.1 * (index + 1)}s`;
    });
    
    // Map container animation
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.classList.add('fade-in');
    }
    
    // Action buttons animation
    const actionButtons = document.querySelectorAll('.action-button');
    actionButtons.forEach(button => {
        button.classList.add('ripple');
    });
    
    // Add floating animation to location markers
    const locationMarkers = document.querySelectorAll('.location-marker');
    locationMarkers.forEach(marker => {
        marker.classList.add('float');
    });
    
    // Add glow animation to active elements
    const activeElements = document.querySelectorAll('.active');
    activeElements.forEach(element => {
        element.classList.add('glow');
    });
    
    // Add pulse animation to notification badges
    const notificationBadges = document.querySelectorAll('.notification-badge');
    notificationBadges.forEach(badge => {
        badge.classList.add('notification-pulse');
    });
    
    // Add animation to driver cards
    const driverCards = document.querySelectorAll('.driver-card');
    driverCards.forEach(card => {
        card.classList.add('driver-card');
        
        // Add hover event for additional animation
        card.addEventListener('mouseenter', function() {
            this.classList.add('booking-pulse');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('booking-pulse');
        });
    });
    
    // Add typing animation to welcome messages
    const welcomeMessages = document.querySelectorAll('.welcome-message');
    welcomeMessages.forEach(message => {
        message.classList.add('typing');
    });
}

/**
 * Observe dynamic content and apply animations when new elements are added
 */
function observeDynamicContent() {
    // Create a mutation observer to watch for new elements
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // Check for new elements that need animations
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Apply animations based on class
                        if (node.classList.contains('dashboard-card')) {
                            node.classList.add('slide-in-bottom');
                        } else if (node.classList.contains('booking-list-item')) {
                            node.classList.add('slide-in-right');
                        } else if (node.classList.contains('nearby-driver')) {
                            node.classList.add('slide-in-right');
                        } else if (node.classList.contains('notification-item')) {
                            node.classList.add('slide-in-right');
                        } else if (node.classList.contains('transaction-item')) {
                            node.classList.add('slide-in-bottom');
                        } else if (node.classList.contains('alert')) {
                            node.classList.add('slide-in-right');
                        } else if (node.classList.contains('modal-content')) {
                            node.classList.add('slide-in-bottom');
                        }
                    }
                });
            }
        });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Add animation to an element
 * @param {HTMLElement} element - Element to animate
 * @param {string} animationClass - Animation class to add
 * @param {number} delay - Delay in seconds before animation starts
 */
function animateElement(element, animationClass, delay = 0) {
    if (!element) return;
    
    element.style.animationDelay = `${delay}s`;
    element.classList.add(animationClass);
    
    // Remove animation class after animation completes
    element.addEventListener('animationend', function() {
        element.classList.remove(animationClass);
        element.style.animationDelay = '';
    });
}

/**
 * Animate elements sequentially
 * @param {NodeList} elements - Elements to animate
 * @param {string} animationClass - Animation class to add
 * @param {number} delayBetween - Delay between each element animation
 */
function animateSequentially(elements, animationClass, delayBetween = 0.1) {
    if (!elements || elements.length === 0) return;
    
    elements.forEach((element, index) => {
        animateElement(element, animationClass, index * delayBetween);
    });
}

// Expose functions globally
window.RYDO = window.RYDO || {};
window.RYDO.animations = {
    animateElement,
    animateSequentially
};
