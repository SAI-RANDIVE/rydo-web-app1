/**
 * Rating Component for RYDO Web App
 * Allows users to rate and review their bookings
 */
class RatingComponent {
  constructor(options = {}) {
    this.containerId = options.containerId || 'rating-container';
    this.bookingId = options.bookingId || null;
    this.bookingType = options.bookingType || null;
    this.onRatingSubmit = options.onRatingSubmit || null;
    
    // Initialize
    this.init();
  }
  
  init() {
    this.createRatingContainer();
    this.addEventListeners();
  }
  
  createRatingContainer() {
    const container = document.getElementById(this.containerId);
    
    if (!container) {
      console.error(`Rating container with ID '${this.containerId}' not found`);
      return;
    }
    
    container.innerHTML = `
      <div class="rating-component">
        <h3>Rate Your Experience</h3>
        <div class="rating-stars">
          <i class="far fa-star" data-rating="1"></i>
          <i class="far fa-star" data-rating="2"></i>
          <i class="far fa-star" data-rating="3"></i>
          <i class="far fa-star" data-rating="4"></i>
          <i class="far fa-star" data-rating="5"></i>
        </div>
        <div class="rating-value">0/5</div>
        <div class="form-group mt-3">
          <textarea class="form-control" id="review-text" rows="3" placeholder="Write your review (optional)"></textarea>
        </div>
        <button class="btn btn-primary mt-2" id="submit-rating" disabled>Submit Rating</button>
      </div>
    `;
  }
  
  addEventListeners() {
    const container = document.getElementById(this.containerId);
    
    if (!container) {
      return;
    }
    
    const stars = container.querySelectorAll('.rating-stars i');
    const ratingValue = container.querySelector('.rating-value');
    const submitButton = container.querySelector('#submit-rating');
    const reviewText = container.querySelector('#review-text');
    
    let selectedRating = 0;
    
    // Star hover and click events
    stars.forEach(star => {
      // Hover effect
      star.addEventListener('mouseover', () => {
        const rating = parseInt(star.dataset.rating);
        
        stars.forEach(s => {
          const starRating = parseInt(s.dataset.rating);
          
          if (starRating <= rating) {
            s.classList.remove('far');
            s.classList.add('fas');
          } else {
            s.classList.remove('fas');
            s.classList.add('far');
          }
        });
        
        ratingValue.textContent = `${rating}/5`;
      });
      
      // Mouse leave effect
      star.addEventListener('mouseleave', () => {
        stars.forEach(s => {
          const starRating = parseInt(s.dataset.rating);
          
          if (starRating <= selectedRating) {
            s.classList.remove('far');
            s.classList.add('fas');
          } else {
            s.classList.remove('fas');
            s.classList.add('far');
          }
        });
        
        ratingValue.textContent = `${selectedRating}/5`;
      });
      
      // Click event
      star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.rating);
        
        stars.forEach(s => {
          const starRating = parseInt(s.dataset.rating);
          
          if (starRating <= selectedRating) {
            s.classList.remove('far');
            s.classList.add('fas');
          } else {
            s.classList.remove('fas');
            s.classList.add('far');
          }
        });
        
        ratingValue.textContent = `${selectedRating}/5`;
        submitButton.disabled = false;
      });
    });
    
    // Submit button click event
    submitButton.addEventListener('click', () => {
      if (selectedRating === 0) {
        alert('Please select a rating');
        return;
      }
      
      this.submitRating(selectedRating, reviewText.value);
    });
  }
  
  async submitRating(rating, review) {
    if (!this.bookingId || !this.bookingType) {
      console.error('Booking ID and type are required');
      return;
    }
    
    try {
      const response = await fetch('/rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking_id: this.bookingId,
          booking_type: this.bookingType,
          rating,
          review
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }
      
      const data = await response.json();
      
      // Show success message
      const container = document.getElementById(this.containerId);
      
      if (container) {
        container.innerHTML = `
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i> Thank you for your rating!
          </div>
        `;
      }
      
      // Call callback if provided
      if (this.onRatingSubmit) {
        this.onRatingSubmit(rating, review);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    }
  }
  
  // Display existing ratings for a user
  static async displayUserRatings(containerId, userId) {
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.error(`Container with ID '${containerId}' not found`);
      return;
    }
    
    try {
      const response = await fetch(`/rating/user/${userId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to get ratings');
      }
      
      const ratings = await response.json();
      
      if (ratings.length === 0) {
        container.innerHTML = `
          <div class="alert alert-info">
            No ratings yet.
          </div>
        `;
        return;
      }
      
      let html = `
        <div class="ratings-list">
          <h3>Ratings & Reviews</h3>
      `;
      
      ratings.forEach(rating => {
        const stars = Array(5).fill('').map((_, i) => {
          return i < rating.rating ? 
            '<i class="fas fa-star text-warning"></i>' : 
            '<i class="far fa-star"></i>';
        }).join('');
        
        const date = new Date(rating.rating_time).toLocaleDateString();
        
        html += `
          <div class="rating-item card mb-3">
            <div class="card-body">
              <div class="d-flex justify-content-between">
                <div class="user-info">
                  <img src="${rating.profile_image || '/img/default-avatar.png'}" class="avatar" alt="User">
                  <span class="user-name">${rating.first_name} ${rating.last_name}</span>
                </div>
                <div class="rating-date">${date}</div>
              </div>
              <div class="rating-stars my-2">
                ${stars} <span class="rating-value">${rating.rating}/5</span>
              </div>
              <div class="booking-details text-muted small">
                <i class="fas fa-route"></i> ${rating.booking_details || 'Booking'}
              </div>
              ${rating.review ? `<div class="review-text mt-2">${rating.review}</div>` : ''}
            </div>
          </div>
        `;
      });
      
      html += `</div>`;
      container.innerHTML = html;
    } catch (error) {
      console.error('Error getting ratings:', error);
      container.innerHTML = `
        <div class="alert alert-danger">
          Failed to load ratings. Please try again.
        </div>
      `;
    }
  }
  
  setBooking(bookingId, bookingType) {
    this.bookingId = bookingId;
    this.bookingType = bookingType;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RatingComponent;
} else {
  window.RatingComponent = RatingComponent;
}
