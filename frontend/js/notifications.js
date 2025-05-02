/**
 * Notifications System
 * 
 * This script handles real-time notifications for the RYDO Web App.
 * It includes functionality for displaying, managing, and interacting with notifications.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize notifications
    initNotifications();
    
    // Setup notification click handlers
    setupNotificationHandlers();
    
    // Setup notification badge
    updateNotificationBadge();
    
    // Setup notification polling
    startNotificationPolling();
});

// Store notifications in memory
let notifications = [];
let unreadCount = 0;

/**
 * Initialize notifications system
 */
function initNotifications() {
    // Create notifications container if it doesn't exist
    if (!document.querySelector('.notifications-container')) {
        const container = document.createElement('div');
        container.className = 'notifications-container';
        container.innerHTML = `
            <div class="notifications-header">
                <h3>Notifications</h3>
                <button class="mark-all-read">Mark all as read</button>
            </div>
            <div class="notifications-list"></div>
            <div class="notifications-footer">
                <a href="/notifications">View all notifications</a>
            </div>
        `;
        document.body.appendChild(container);
        
        // Add notification bell to header if it doesn't exist
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && !document.querySelector('.notification-bell')) {
            const bell = document.createElement('div');
            bell.className = 'notification-bell';
            bell.innerHTML = `
                <i class="fas fa-bell"></i>
                <span class="notification-badge">0</span>
            `;
            headerActions.prepend(bell);
            
            // Toggle notifications panel on bell click
            bell.addEventListener('click', function(e) {
                e.stopPropagation();
                const container = document.querySelector('.notifications-container');
                container.classList.toggle('show');
                
                // Mark notifications as read when panel is opened
                if (container.classList.contains('show')) {
                    markNotificationsAsRead();
                }
            });
            
            // Close notifications panel when clicking outside
            document.addEventListener('click', function(e) {
                const container = document.querySelector('.notifications-container');
                const bell = document.querySelector('.notification-bell');
                
                if (container.classList.contains('show') && 
                    !container.contains(e.target) && 
                    !bell.contains(e.target)) {
                    container.classList.remove('show');
                }
            });
        }
        
        // Add mark all as read functionality
        const markAllReadBtn = document.querySelector('.mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', function() {
                markAllNotificationsAsRead();
            });
        }
    }
}

/**
 * Setup notification click handlers
 */
function setupNotificationHandlers() {
    document.addEventListener('click', function(e) {
        // Handle notification item click
        if (e.target.closest('.notification-item')) {
            const notificationItem = e.target.closest('.notification-item');
            const notificationId = notificationItem.dataset.id;
            
            // Mark notification as read
            markNotificationAsRead(notificationId);
            
            // Handle notification action based on type
            handleNotificationAction(notificationItem.dataset.type, notificationItem.dataset.data);
        }
    });
}

/**
 * Handle notification action based on type
 * 
 * @param {string} type - Notification type
 * @param {string} data - JSON string containing notification data
 */
function handleNotificationAction(type, dataStr) {
    try {
        const data = JSON.parse(dataStr);
        
        switch (type) {
            case 'booking':
                // Navigate to booking details
                window.location.href = `/booking-details?id=${data.bookingId}`;
                break;
            case 'message':
                // Navigate to messages
                window.location.href = `/messages?conversation=${data.conversationId}`;
                break;
            case 'payment':
                // Navigate to payment details
                window.location.href = `/payment-details?id=${data.paymentId}`;
                break;
            case 'account':
                // Navigate to account settings
                window.location.href = '/edit-profile';
                break;
            case 'system':
                // No action for system notifications
                break;
            default:
                console.warn('Unknown notification type:', type);
        }
    } catch (error) {
        console.error('Error handling notification action:', error);
    }
}

/**
 * Start polling for new notifications
 */
function startNotificationPolling() {
    // Fetch notifications immediately
    fetchNotifications();
    
    // Then poll every 30 seconds
    setInterval(fetchNotifications, 30000);
}

/**
 * Fetch notifications from server
 */
async function fetchNotifications() {
    try {
        const response = await fetch('/notification/list', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            notifications = data.notifications || [];
            
            // Update UI
            renderNotifications();
            updateNotificationBadge();
        } else {
            console.error('Failed to fetch notifications:', await response.text());
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

/**
 * Render notifications in the panel
 */
function renderNotifications() {
    const notificationsList = document.querySelector('.notifications-list');
    if (!notificationsList) return;
    
    // Clear current notifications
    notificationsList.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="no-notifications">No notifications</div>';
        return;
    }
    
    // Sort notifications by date (newest first)
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Display only the 5 most recent notifications
    const recentNotifications = notifications.slice(0, 5);
    
    recentNotifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.is_read ? 'read' : 'unread'}`;
        notificationItem.dataset.id = notification.id;
        notificationItem.dataset.type = notification.type;
        notificationItem.dataset.data = JSON.stringify(notification.data);
        
        // Format time
        const notificationTime = formatNotificationTime(notification.created_at);
        
        // Get icon based on notification type
        const icon = getNotificationIcon(notification.type);
        
        notificationItem.innerHTML = `
            <div class="notification-icon">
                <i class="${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${notificationTime}</div>
            </div>
            ${!notification.is_read ? '<div class="unread-indicator"></div>' : ''}
        `;
        
        notificationsList.appendChild(notificationItem);
    });
}

/**
 * Get icon class based on notification type
 * 
 * @param {string} type - Notification type
 * @returns {string} Icon class
 */
function getNotificationIcon(type) {
    switch (type) {
        case 'booking':
            return 'fas fa-calendar-check';
        case 'message':
            return 'fas fa-envelope';
        case 'payment':
            return 'fas fa-credit-card';
        case 'account':
            return 'fas fa-user-circle';
        case 'system':
            return 'fas fa-cog';
        default:
            return 'fas fa-bell';
    }
}

/**
 * Format notification time relative to current time
 * 
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time string
 */
function formatNotificationTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return 'Just now';
    } else if (diffMin < 60) {
        return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
        return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffDay < 7) {
        return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * Update notification badge count
 */
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (!badge) return;
    
    // Count unread notifications
    unreadCount = notifications.filter(notification => !notification.is_read).length;
    
    // Update badge
    badge.textContent = unreadCount;
    
    // Show/hide badge
    if (unreadCount > 0) {
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Mark a notification as read
 * 
 * @param {string} notificationId - Notification ID
 */
async function markNotificationAsRead(notificationId) {
    try {
        // Update UI immediately for better UX
        const notification = notifications.find(n => n.id == notificationId);
        if (notification) {
            notification.is_read = true;
            
            // Update UI
            renderNotifications();
            updateNotificationBadge();
        }
        
        // Send request to server
        const response = await fetch(`/notification/read/${notificationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('Failed to mark notification as read:', await response.text());
            
            // Revert UI change if server request failed
            if (notification) {
                notification.is_read = false;
                renderNotifications();
                updateNotificationBadge();
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsAsRead() {
    try {
        // Update UI immediately for better UX
        notifications.forEach(notification => {
            notification.is_read = true;
        });
        
        // Update UI
        renderNotifications();
        updateNotificationBadge();
        
        // Send request to server
        const response = await fetch('/notification/read-all', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('Failed to mark all notifications as read:', await response.text());
            
            // Revert UI change if server request failed
            await fetchNotifications();
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

/**
 * Mark notifications as read when panel is opened
 */
function markNotificationsAsRead() {
    // Get visible unread notifications
    const unreadItems = document.querySelectorAll('.notification-item.unread');
    
    // Mark each as read
    unreadItems.forEach(item => {
        const notificationId = item.dataset.id;
        markNotificationAsRead(notificationId);
    });
}

/**
 * Add a new notification (for testing purposes)
 * 
 * @param {Object} notification - Notification object
 */
function addNotification(notification) {
    notifications.unshift({
        id: Date.now().toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        data: notification.data,
        is_read: false,
        created_at: new Date().toISOString()
    });
    
    // Update UI
    renderNotifications();
    updateNotificationBadge();
    
    // Show notification toast
    showNotificationToast(notification.title, notification.message);
}

/**
 * Show notification toast
 * 
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
function showNotificationToast(title, message) {
    // Create toast container if it doesn't exist
    if (!document.querySelector('.toast-container')) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-bell"></i>
            <span>${title}</span>
            <button class="close-toast">&times;</button>
        </div>
        <div class="toast-body">${message}</div>
    `;
    
    // Add to container
    document.querySelector('.toast-container').appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
    
    // Close button
    toast.querySelector('.close-toast').addEventListener('click', function() {
        toast.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
}

// Export functions for testing
window.notificationSystem = {
    addNotification,
    fetchNotifications,
    markAllNotificationsAsRead
};
