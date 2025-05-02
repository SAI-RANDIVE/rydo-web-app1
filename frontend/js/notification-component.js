/**
 * Notification Component
 * Provides real-time notifications for users across the application
 */

class NotificationComponent {
  constructor(options = {}) {
    this.notificationContainerId = options.containerId || 'notification-container';
    this.notificationCountId = options.countId || 'notification-count';
    this.notificationListId = options.listId || 'notification-list';
    this.notificationDropdownId = options.dropdownId || 'notification-dropdown';
    this.maxNotifications = options.maxNotifications || 5;
    this.refreshInterval = options.refreshInterval || 30000; // 30 seconds
    this.onNotificationClick = options.onNotificationClick || null;
    
    this.notifications = [];
    this.unreadCount = 0;
    this.intervalId = null;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize notification component
   */
  init() {
    // Create notification container if it doesn't exist
    this.createNotificationContainer();
    
    // Fetch notifications
    this.fetchNotifications();
    
    // Set up refresh interval
    this.intervalId = setInterval(() => {
      this.fetchNotifications();
    }, this.refreshInterval);
    
    // Add event listeners
    this.addEventListeners();
  }
  
  /**
   * Create notification container
   */
  createNotificationContainer() {
    if (document.getElementById(this.notificationContainerId)) {
      return;
    }
    
    const container = document.createElement('div');
    container.id = this.notificationContainerId;
    container.className = 'notification-container';
    container.innerHTML = `
      <div class="dropdown">
        <a href="#" class="notification-bell" id="${this.notificationDropdownId}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          <i class="fas fa-bell"></i>
          <span class="badge badge-danger" id="${this.notificationCountId}">0</span>
        </a>
        <div class="dropdown-menu dropdown-menu-right notification-dropdown" aria-labelledby="${this.notificationDropdownId}">
          <div class="notification-header">
            <h6 class="dropdown-header">Notifications</h6>
            <a href="#" class="mark-all-read">Mark all as read</a>
          </div>
          <div class="notification-list" id="${this.notificationListId}">
            <div class="empty-notifications">No notifications</div>
          </div>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item text-center view-all" href="#">View all notifications</a>
        </div>
      </div>
    `;
    
    // Append to body or specified container
    document.body.appendChild(container);
    
    // Add styles
    this.addStyles();
  }
  
  /**
   * Add styles
   */
  addStyles() {
    const styleId = 'notification-component-styles';
    
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .notification-container {
        position: relative;
        display: inline-block;
      }
      
      .notification-bell {
        position: relative;
        display: inline-block;
        color: #333;
        font-size: 1.25rem;
        padding: 0.5rem;
        text-decoration: none;
      }
      
      .notification-bell:hover {
        color: #5B6EF5;
      }
      
      .notification-bell .badge {
        position: absolute;
        top: 0;
        right: 0;
        font-size: 0.7rem;
        padding: 0.25rem 0.4rem;
        border-radius: 50%;
        background-color: #dc3545;
        color: white;
      }
      
      .notification-dropdown {
        width: 320px;
        padding: 0;
        max-height: 400px;
        overflow-y: auto;
      }
      
      .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
      }
      
      .notification-header h6 {
        margin: 0;
      }
      
      .notification-header .mark-all-read {
        font-size: 0.8rem;
        color: #5B6EF5;
        text-decoration: none;
      }
      
      .notification-list {
        max-height: 300px;
        overflow-y: auto;
      }
      
      .notification-item {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f1f1f1;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .notification-item:hover {
        background-color: #f8f9fa;
      }
      
      .notification-item.unread {
        background-color: #f0f4ff;
      }
      
      .notification-item.unread:hover {
        background-color: #e6edff;
      }
      
      .notification-item .notification-title {
        font-weight: bold;
        margin-bottom: 0.25rem;
        color: #333;
      }
      
      .notification-item .notification-message {
        font-size: 0.9rem;
        color: #666;
        margin-bottom: 0.25rem;
      }
      
      .notification-item .notification-time {
        font-size: 0.75rem;
        color: #999;
      }
      
      .empty-notifications {
        padding: 1rem;
        text-align: center;
        color: #999;
      }
      
      .view-all {
        font-size: 0.9rem;
        color: #5B6EF5 !important;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Add event listeners
   */
  addEventListeners() {
    // Mark all as read
    const markAllReadBtn = document.querySelector('.mark-all-read');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.markAllAsRead();
      });
    }
    
    // View all notifications
    const viewAllBtn = document.querySelector('.view-all');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Redirect to notifications page or show modal
        // This can be customized based on the application
      });
    }
  }
  
  /**
   * Fetch notifications
   */
  async fetchNotifications() {
    try {
      const response = await fetch('/notification?limit=' + this.maxNotifications, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      
      this.notifications = data.notifications;
      this.renderNotifications();
      
      // Fetch unread count
      this.fetchUnreadCount();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }
  
  /**
   * Fetch unread notification count
   */
  async fetchUnreadCount() {
    try {
      const response = await fetch('/notification/count', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }
      
      const data = await response.json();
      
      this.unreadCount = data.count;
      this.updateUnreadCount();
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }
  
  /**
   * Render notifications
   */
  renderNotifications() {
    const notificationList = document.getElementById(this.notificationListId);
    
    if (!notificationList) {
      return;
    }
    
    if (this.notifications.length === 0) {
      notificationList.innerHTML = '<div class="empty-notifications">No notifications</div>';
      return;
    }
    
    notificationList.innerHTML = '';
    
    this.notifications.forEach(notification => {
      const notificationItem = document.createElement('div');
      notificationItem.className = `notification-item${notification.is_read ? '' : ' unread'}`;
      notificationItem.dataset.id = notification.id;
      
      // Format time
      const notificationTime = new Date(notification.created_at);
      const timeAgo = this.getTimeAgo(notificationTime);
      
      notificationItem.innerHTML = `
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${timeAgo}</div>
      `;
      
      // Add click event
      notificationItem.addEventListener('click', () => {
        this.handleNotificationClick(notification);
      });
      
      notificationList.appendChild(notificationItem);
    });
  }
  
  /**
   * Update unread count
   */
  updateUnreadCount() {
    const countElement = document.getElementById(this.notificationCountId);
    
    if (!countElement) {
      return;
    }
    
    countElement.textContent = this.unreadCount;
    countElement.style.display = this.unreadCount > 0 ? 'inline-block' : 'none';
  }
  
  /**
   * Handle notification click
   */
  async handleNotificationClick(notification) {
    // Mark as read if unread
    if (!notification.is_read) {
      await this.markAsRead(notification.id);
    }
    
    // Handle action URL if present
    if (notification.action_url) {
      window.location.href = notification.action_url;
      return;
    }
    
    // Call custom click handler if provided
    if (this.onNotificationClick) {
      this.onNotificationClick(notification);
    }
  }
  
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const response = await fetch(`/notification/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update local state
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.is_read = true;
      }
      
      // Update UI
      const notificationItem = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
      if (notificationItem) {
        notificationItem.classList.remove('unread');
      }
      
      // Update unread count
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.updateUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await fetch('/notification/read-all', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      // Update local state
      this.notifications.forEach(notification => {
        notification.is_read = true;
      });
      
      // Update UI
      const notificationItems = document.querySelectorAll('.notification-item');
      notificationItems.forEach(item => {
        item.classList.remove('unread');
      });
      
      // Update unread count
      this.unreadCount = 0;
      this.updateUnreadCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
  
  /**
   * Get time ago string
   */
  getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    // Format date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  /**
   * Show notification toast
   */
  showNotificationToast(notification) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
      
      // Add toast container styles
      const style = document.createElement('style');
      style.textContent = `
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
        }
        
        .notification-toast {
          background-color: white;
          border-left: 4px solid #5B6EF5;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 10px;
          min-width: 300px;
          max-width: 350px;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .notification-toast .toast-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }
        
        .notification-toast .toast-title {
          font-weight: bold;
          color: #333;
        }
        
        .notification-toast .toast-close {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0;
          line-height: 1;
        }
        
        .notification-toast .toast-body {
          color: #666;
          font-size: 0.9rem;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-title">${notification.title}</span>
        <button class="toast-close">&times;</button>
      </div>
      <div class="toast-body">${notification.message}</div>
    `;
    
    // Add close button event
    const closeButton = toast.querySelector('.toast-close');
    closeButton.addEventListener('click', () => {
      toast.remove();
    });
    
    // Add click event to navigate to action URL
    if (notification.action_url) {
      toast.addEventListener('click', (e) => {
        if (e.target !== closeButton) {
          window.location.href = notification.action_url;
        }
      });
      toast.style.cursor = 'pointer';
    }
    
    // Append toast to container
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 5000);
  }
  
  /**
   * Add new notification
   */
  addNotification(notification) {
    // Add to local state
    this.notifications.unshift(notification);
    
    // Keep only max number of notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.pop();
    }
    
    // Update UI
    this.renderNotifications();
    
    // Update unread count
    this.unreadCount++;
    this.updateUnreadCount();
    
    // Show toast notification
    this.showNotificationToast(notification);
  }
  
  /**
   * Destroy notification component
   */
  destroy() {
    // Clear interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Remove container
    const container = document.getElementById(this.notificationContainerId);
    if (container) {
      container.remove();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationComponent;
} else {
  window.NotificationComponent = NotificationComponent;
}
