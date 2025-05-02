document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');
    const formSuccess = document.getElementById('form-success');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };
            
            // In a real application, you would send this data to your server
            console.log('Form data submitted:', formData);
            
            // Simulate form submission (remove this in production)
            setTimeout(() => {
                // Show success message
                formSuccess.classList.add('show');
                
                // Reset form
                contactForm.reset();
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    formSuccess.classList.remove('show');
                }, 5000);
            }, 1500);
        });
    }
    
    // Initialize Google Maps (this is a placeholder, you'll need to add your API key)
    function initMap() {
        // Check if Google Maps API is loaded
        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
            const mapElement = document.getElementById('map');
            
            if (mapElement) {
                const mapOptions = {
                    center: { lat: 12.9716, lng: 77.5946 }, // Bangalore coordinates
                    zoom: 15
                };
                
                const map = new google.maps.Map(mapElement, mapOptions);
                
                // Add marker for RYDO headquarters
                const marker = new google.maps.Marker({
                    position: { lat: 12.9716, lng: 77.5946 },
                    map: map,
                    title: 'RYDO Headquarters'
                });
            }
        }
    }
    
    // Load Google Maps API (uncomment and add your API key when ready)
    /*
    function loadGoogleMapsAPI() {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap`;
        script.defer = true;
        script.async = true;
        document.head.appendChild(script);
        
        // Make initMap globally available
        window.initMap = initMap;
    }
    
    loadGoogleMapsAPI();
    */
});
