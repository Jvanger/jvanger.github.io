// Strava Mule - Main Application File

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    const map = MapManager.initialize();
    
    // Initialize route manager with map
    RouteManager.initialize(map);
    
    // Initialize event listeners
    UIManager.initializeEventListeners();
    
    // Set default date/time
    UIManager.setDefaultDateTime();
    
    // Load saved routes
    StorageManager.loadSavedRoutes();
    
    // Initialize GPX generator
    Utils.initializeGPXGenerator();
    
    // Add map click handler
    map.on('click', onMapClick);
    
    // Request user location after everything is initialized
    // Small delay to ensure map is fully ready
    setTimeout(() => {
        MapManager.requestUserLocation();
    }, 100);
});

// Handle map click events
function onMapClick(e) {
    // Check if we should close the route
    if (RouteManager.waypoints.length >= 3 && !RouteManager.routeClosed) {
        const firstPoint = L.latLng(RouteManager.waypoints[0].lat, RouteManager.waypoints[0].lng);
        const clickedPoint = e.latlng;
        const distance = MapManager.map.distance(firstPoint, clickedPoint);
        
        // If click is within 30 meters of start point, close the route
        if (distance < 30) {
            RouteManager.closeRoute();
            return;
        }
    }
    
    if (!RouteManager.routeClosed) {
        RouteManager.addWaypoint(e.latlng.lat, e.latlng.lng);
    }
}

// Global reference for debugging
window.StravaMule = {
    MapManager,
    RouteManager,
    StorageManager,
    UIManager,
    Utils
};