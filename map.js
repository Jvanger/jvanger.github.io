// Map Management Module
const MapManager = {
    map: null,
    defaultCenter: [40.7128, -74.0060], // NYC
    
    // Initialize Leaflet map
    initialize() {
        // Create map centered on default location
        this.map = L.map('map').setView(this.defaultCenter, 13);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        return this.map;
    },
    
    // Request user's current location
    requestUserLocation() {
        // Always ask for location on page refresh/load
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Make sure map is available before setting view
                    if (this.map) {
                        this.map.setView([lat, lng], 15);
                        
                        console.log('Location found:', lat, lng);
                        
                        // Add a marker for current location
                        L.marker([lat, lng], {
                            icon: L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41]
                            })
                        }).addTo(this.map).bindPopup('Your approximate location').openPopup();
                    }
                },
                (error) => {
                    console.log('Geolocation error:', error.message);
                    // Fallback to default location (NYC) if geolocation fails
                    if (this.map) {
                        this.map.setView(this.defaultCenter, 13);
                    }
                    
                    // Show user-friendly message based on error type
                    if (error.code === 1) { // Permission denied
                        console.log('Location access denied by user');
                    } else if (error.code === 2) { // Position unavailable
                        console.log('Location information unavailable');
                    } else if (error.code === 3) { // Timeout
                        console.log('Location request timed out');
                    }
                },
                {
                    timeout: 10000,
                    enableHighAccuracy: true,
                    maximumAge: 0 // Don't use cached location
                }
            );
        } else {
            console.log('Geolocation not supported by this browser');
            // Fallback to default location
            if (this.map) {
                this.map.setView(this.defaultCenter, 13);
            }
        }
    },
    
    // Fit map to bounds
    fitBounds(waypoints) {
        if (waypoints.length > 0) {
            const bounds = L.latLngBounds(waypoints.map(wp => [wp.lat, wp.lng]));
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
};

// Export for use in other modules
window.MapManager = MapManager;