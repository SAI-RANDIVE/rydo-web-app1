/**
 * RYDO Web App Animation Includer
 * This script automatically adds animation CSS and JS files to all pages
 */

(function() {
    // Check if animations are already included
    if (document.querySelector('link[href*="animations.css"]') || 
        document.querySelector('script[src*="animations.js"]')) {
        return;
    }
    
    // Add animations.css
    const animationsCss = document.createElement('link');
    animationsCss.rel = 'stylesheet';
    animationsCss.href = '/css/animations.css';
    document.head.appendChild(animationsCss);
    
    // Add animations.js
    const animationsJs = document.createElement('script');
    animationsJs.src = '/js/animations.js';
    animationsJs.defer = true;
    document.body.appendChild(animationsJs);
    
    console.log('RYDO animations included successfully');
})();
