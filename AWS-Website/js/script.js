// Simple interactive features
document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully from AWS S3 + CloudFront!');
    
    // Add loading animation for banner
    const banner = document.getElementById('banner');
    if (banner) {
        banner.addEventListener('load', function() {
            banner.style.opacity = '0';
            banner.style.transition = 'opacity 0.5s ease-in-out';
            setTimeout(() => {
                banner.style.opacity = '1';
            }, 100);
        });
    }
    
    // Add click analytics (for demo purposes)
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            console.log(`Link clicked: ${this.href}`);
            // In real world, you'd send this to analytics service
        });
    });
    
    // Performance monitoring
    window.addEventListener('load', function() {
        const loadTime = performance.now();
        console.log(`Page loaded in ${loadTime.toFixed(2)}ms via CloudFront!`);
    });
});