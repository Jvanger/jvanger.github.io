// Utilities Module
const Utils = {
    gpxGenerator: null,
    
    // Initialize GPX generator
    initializeGPXGenerator() {
        if (typeof GPXGenerator !== 'undefined') {
            this.gpxGenerator = new GPXGenerator();
            console.log('GPX Generator initialized successfully');
        } else {
            console.error('GPXGenerator class not found');
        }
    },
    
    // Ensure GPX generator is available
    ensureGPXGenerator() {
        if (!this.gpxGenerator && typeof GPXGenerator !== 'undefined') {
            this.gpxGenerator = new GPXGenerator();
            console.log('GPX Generator initialized (fallback)');
        }
        return this.gpxGenerator !== null;
    },
    
    // Get pace in minutes per kilometer
    getPaceInMinutesPerKm() {
        const minutes = parseInt(document.getElementById('pace-minutes').value) || 6;
        const seconds = parseInt(document.getElementById('pace-seconds').value) || 0;
        const unit = document.getElementById('pace-unit').value;
        
        let paceMinutes = minutes + seconds / 60;
        
        // Convert to min/km if needed
        if (unit === 'min/mile') {
            paceMinutes = paceMinutes / 1.60934; // Convert miles to km
        }
        
        return paceMinutes;
    },
    
    // Format pace for display
    formatPace(minutes, seconds, unit) {
        return `${minutes}:${seconds.toString().padStart(2, '0')} ${unit}`;
    },
    
    // Show GPX generation modal
    showGPXModal() {
        const modal = document.getElementById('gpx-modal');
        const loadingIndicator = document.getElementById('modal-loading');
        const generateBtn = document.getElementById('modal-generate');
        
        // Show modal
        modal.style.display = 'block';
        
        // Populate initial data
        document.getElementById('modal-activity-name').textContent = 
            document.getElementById('activity-name').value || 'Running Activity';
        document.getElementById('modal-runner-name').textContent = 
            document.getElementById('runner-name').value || 'Runner';
        document.getElementById('modal-activity-type').textContent = 
            document.getElementById('activity-type').value.charAt(0).toUpperCase() + 
            document.getElementById('activity-type').value.slice(1);
        
        // Update modal title and button text based on route status
        const routeStatus = window.RouteManager.routeClosed ? 'Closed' : 'Open';
        document.querySelector('.modal-header h2').textContent = 
            `🏃‍♂️ Generate GPX File (${routeStatus} Route)`;
        
        // Fix distance calculation - get the actual displayed distance from the UI
        const distanceElement = document.getElementById('total-distance');
        const distanceText = distanceElement.textContent.trim();
        
        // If we can't get it from the UI, calculate it directly
        if (distanceText === '0.00 km' || distanceText === '0.00 miles') {
            // Calculate distance manually from waypoints
            let totalDistance = 0;
            const waypoints = window.RouteManager.waypoints;
            
            if (waypoints.length >= 2) {
                for (let i = 1; i < waypoints.length; i++) {
                    const dist = this.calculateDistance(
                        waypoints[i-1].lat, waypoints[i-1].lng,
                        waypoints[i].lat, waypoints[i].lng
                    );
                    totalDistance += dist;
                }
                
                // If route is closed, add distance back to start
                if (window.RouteManager.routeClosed && waypoints.length > 2) {
                    const lastToFirst = this.calculateDistance(
                        waypoints[waypoints.length-1].lat, waypoints[waypoints.length-1].lng,
                        waypoints[0].lat, waypoints[0].lng
                    );
                    totalDistance += lastToFirst;
                }
            }
            
            // Convert to display units
            const distanceKm = totalDistance / 1000;
            const unit = window.UIManager.distanceUnit;
            document.getElementById('modal-distance').textContent = unit === 'km' ? 
                `${distanceKm.toFixed(2)} km` : 
                `${(distanceKm * 0.621371).toFixed(2)} miles`;
        } else {
            // Use the distance from the UI display
            document.getElementById('modal-distance').textContent = distanceText;
        }
        
        const paceMinutes = parseInt(document.getElementById('pace-minutes').value) || 6;
        const paceSeconds = parseInt(document.getElementById('pace-seconds').value) || 0;
        const paceUnit = document.getElementById('pace-unit').value;
        document.getElementById('modal-pace').textContent = 
            `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} ${paceUnit}`;
        
        document.getElementById('modal-variance').textContent = 
            `±${document.getElementById('pace-variance').value}%`;
        
        const startDateTime = document.getElementById('start-datetime').value ? 
            new Date(document.getElementById('start-datetime').value) : new Date();
        document.getElementById('modal-start-time').textContent = 
            startDateTime.toLocaleString();
        
        // Show loading and fetch route stats
        loadingIndicator.classList.add('active');
        generateBtn.disabled = true;
        
        this.loadRouteStats();
    },

    // Load route statistics for modal
    async loadRouteStats() {
        try {
            // Ensure GPX generator is initialized
            if (!this.ensureGPXGenerator()) {
                throw new Error('GPX Generator not available');
            }
            
            // Get configuration
            const config = {
                activityName: document.getElementById('activity-name').value || 'Running Activity',
                runnerName: document.getElementById('runner-name').value || 'Runner',
                activityType: document.getElementById('activity-type').value || 'run',
                paceMinutes: parseInt(document.getElementById('pace-minutes').value) || 6,
                paceSeconds: parseInt(document.getElementById('pace-seconds').value) || 0,
                paceUnit: document.getElementById('pace-unit').value || 'min/km',
                startDateTime: document.getElementById('start-datetime').value ? 
                    new Date(document.getElementById('start-datetime').value).toISOString() : 
                    new Date().toISOString(),
                paceVariance: parseInt(document.getElementById('pace-variance').value) || 5
            };
            
            // Prepare route data
            let routePoints;
            if (window.RouteManager.routeClosed && window.RouteManager.roadPolyline) {
                routePoints = window.RouteManager.roadPolyline.getLatLngs().map(latlng => ({
                    lat: latlng.lat,
                    lng: latlng.lng
                }));
            } else {
                routePoints = [...window.RouteManager.waypoints];
                if (window.RouteManager.routeClosed && window.RouteManager.waypoints.length > 0) {
                    routePoints.push(window.RouteManager.waypoints[0]);
                }
            }
            
            // Configure GPX generator
            this.gpxGenerator.setRoute(routePoints);
            this.gpxGenerator.setConfig(config);
            
            // Get route statistics
            const stats = await this.gpxGenerator.getRouteStats();
            
            // Update modal with statistics
            const hours = Math.floor(stats.estimatedDuration / (1000 * 60 * 60));
            const minutes = Math.floor((stats.estimatedDuration % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((stats.estimatedDuration % (1000 * 60)) / 1000);
            
            document.getElementById('modal-duration').textContent = 
                `${hours}h ${minutes}m ${seconds}s`;
            document.getElementById('modal-elevation-gain').textContent = 
                `${stats.elevationGain?.toFixed(0) || 0}m`;
            document.getElementById('modal-elevation-loss').textContent = 
                `${stats.elevationLoss?.toFixed(0) || 0}m`;
            
            // Hide loading and enable generate button
            document.getElementById('modal-loading').classList.remove('active');
            document.getElementById('modal-generate').disabled = false;
            
        } catch (error) {
            console.error('Error loading route stats:', error);
            document.getElementById('modal-loading').innerHTML = 
                '<p style="color: #dc3545;">Error loading route data. Please try again.</p>';
            document.getElementById('modal-generate').disabled = true;
        }
    },

    // Generate GPX file
    generateGPX() {
        // Add safety check to prevent generating GPX with insufficient waypoints
        if (window.RouteManager.waypoints.length < 2) {
            alert('Cannot generate GPX file. Need at least 2 waypoints to create a route.');
            return;
        }
        
        this.showGPXModal();
    },
    
    // Actually generate and download GPX
    async executeGPXGeneration() {
        const generateBtn = document.getElementById('modal-generate');
        
        try {
            // Show loading state
            generateBtn.classList.add('loading');
            
            // Download the GPX file
            await this.gpxGenerator.downloadGPX();
            
            // Close modal
            this.closeGPXModal();
            

            
        } catch (error) {
            console.error('Error generating GPX:', error);
            alert('Error generating GPX file: ' + error.message);
        } finally {
            generateBtn.classList.remove('loading');
        }
    },

    // Close GPX modal
    closeGPXModal() {
        const modal = document.getElementById('gpx-modal');
        modal.style.display = 'none';
        
        // Reset modal state
        document.getElementById('modal-loading').classList.remove('active');
        document.getElementById('modal-generate').classList.remove('loading');
        document.getElementById('modal-generate').disabled = false;
    },

    // Add helper method for distance calculation
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    },

    // Update GPX button text based on route status
    updateGPXButtonText() {
        const generateBtn = document.getElementById('generate-gpx');
        if (generateBtn) {
            const routeStatus = window.RouteManager.routeClosed ? 'Closed' : 'Open';
            generateBtn.textContent = `Generate GPX (${routeStatus} Route)`;
        }
    }
};

// Export for use in other modules
window.Utils = Utils;