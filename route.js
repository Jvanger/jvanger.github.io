// Route Management Module
const RouteManager = {
    waypoints: [],
    markers: [],
    polyline: null,
    roadPolyline: null,
    totalDistance: 0,
    routeClosed: false,
    startMarker: null,
    hasChanges: false, // This should start as false
    
    // Add the missing setHasChanges method
    setHasChanges(value) {
        this.hasChanges = value;
        if (window.UIManager && window.UIManager.updateSaveButtonState) {
            window.UIManager.updateSaveButtonState();
        }
    },
    
    // Initialize route components
    initialize(map) {
        this.map = map;
        
        // Initialize polyline
        this.polyline = L.polyline([], {
            color: '#fc4c02',
            weight: 4,
            opacity: 0.8
        }).addTo(map);
        
        // Initialize save button state on startup
        this.updateSaveButtonState();
        
        // Initialize GPX button state on startup
        this.updateRoute();
    },
    
    // Add a waypoint
    addWaypoint(lat, lng) {
        if (this.routeClosed) return;
        
        const waypoint = { lat, lng };
        this.waypoints.push(waypoint);
        this.setHasChanges(true);
        
        // Create marker
        let markerOptions = {
            draggable: true
        };
        
        // Special styling for first marker
        if (this.waypoints.length === 1) {
            markerOptions.icon = L.divIcon({
                className: 'custom-marker-icon start',
                html: '<div class="inner"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
        } else {
            markerOptions.icon = L.divIcon({
                className: 'custom-marker-icon',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
        }
        
        const marker = L.marker([lat, lng], markerOptions).addTo(this.map);
        
        // Store reference to start marker
        if (this.waypoints.length === 1) {
            this.startMarker = marker;
            marker.bindTooltip('Start - Click here to close route', {
                permanent: false,
                direction: 'top',
                offset: [0, -10]
            });
            
            // Add click handler to start marker for closing route
            marker.on('click', (e) => {
                if (this.waypoints.length >= 3 && !this.routeClosed) {
                    e.originalEvent.stopPropagation(); // Prevent map click
                    this.closeRoute();
                }
            });
        } else {
            // Add marker number
            marker.bindTooltip((this.waypoints.length).toString(), {
                permanent: true,
                direction: 'top',
                offset: [0, -10]
            });
        }
        
        // Marker events
        marker.on('dragend', (e) => {
            const index = this.markers.indexOf(marker);
            this.waypoints[index] = {
                lat: e.target.getLatLng().lat,
                lng: e.target.getLatLng().lng
            };
            this.setHasChanges(true);
            this.updateRoute();
            
            // Re-fetch road route if closed
            if (this.routeClosed) {
                this.fetchRoadRoute();
            }
        });
        
        marker.on('contextmenu', (e) => {
            if (!this.routeClosed) {
                this.removeWaypoint(this.markers.indexOf(marker));
            }
        });
        
        this.markers.push(marker);
        this.updateRoute();
        
        // Add hover effect near start point when we have 3+ waypoints
        if (this.waypoints.length >= 3 && !this.routeClosed) {
            this.map.on('mousemove', this.onMouseMove.bind(this));
        }
    },
    
    // Remove a waypoint
    removeWaypoint(index) {
        if (index === -1 || this.routeClosed) return;
        
        // Remove from arrays
        this.waypoints.splice(index, 1);
        this.map.removeLayer(this.markers[index]);
        this.markers.splice(index, 1);
        this.setHasChanges(true); // Use the method instead of direct assignment
        
        // Update marker tooltips
        this.markers.forEach((marker, i) => {
            if (i > 0) { // Skip start marker
                marker.setTooltipContent((i + 1).toString());
            }
        });
        
        // Update start marker reference if needed
        if (index === 0 && this.markers.length > 0) {
            this.startMarker = this.markers[0];
            this.startMarker.setIcon(L.divIcon({
                className: 'custom-marker-icon start',
                html: '<div class="inner"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            }));
            this.startMarker.bindTooltip('Start - Click here to close route', {
                permanent: false,
                direction: 'top',
                offset: [0, -10]
            });
        }
        
        // Remove mouse move listener if less than 3 waypoints
        if (this.waypoints.length < 3) {
            this.map.off('mousemove', this.onMouseMove.bind(this));
        }
        
        this.updateRoute();
    },
    
    // Handle mouse movement to show when near start point
    onMouseMove(e) {
        if (this.waypoints.length >= 3 && !this.routeClosed && this.startMarker) {
            const firstPoint = L.latLng(this.waypoints[0].lat, this.waypoints[0].lng);
            const distance = this.map.distance(firstPoint, e.latlng);
            
            if (distance < 30) {
                this.startMarker.openTooltip();
                this.map.getContainer().style.cursor = 'pointer';
            } else {
                this.startMarker.closeTooltip();
                this.map.getContainer().style.cursor = '';
            }
        }
    },
    
    // Close the route (connect back to start)
    closeRoute() {
        if (this.waypoints.length < 3) return;
        
        this.routeClosed = true;
        this.setHasChanges(true); // Use the method instead of direct assignment
        
        // Add visual feedback
        if (this.startMarker) {
            this.startMarker.setIcon(L.divIcon({
                className: 'custom-marker-icon closed',
                html: '<div class="inner"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            }));
        }
        
        // Get road-following route
        this.fetchRoadRoute();
    },
    
    // Fetch road-following route using OSRM
    async fetchRoadRoute(forceOpen = false) {
        const coordinates = this.waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
        
        // For closed routes or when forcing open route processing, handle accordingly
        let routeCoordinates = coordinates;
        if (this.routeClosed && !forceOpen) {
            // Add first point at the end to close the loop
            routeCoordinates = coordinates + ';' + `${this.waypoints[0].lng},${this.waypoints[0].lat}`;
        }
        
        // Determine routing profile based on activity type
        const activityType = document.getElementById('activity-type').value;
        let profile = 'foot'; // default for walk/run
        if (activityType === 'bike') {
            profile = 'bike';
        }
        
        // Using OSRM demo server
        const url = `https://router.project-osrm.org/route/v1/${profile}/${routeCoordinates}?overview=full&geometries=geojson`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                
                // Remove old polyline
                if (this.roadPolyline) {
                    this.map.removeLayer(this.roadPolyline);
                }
                
                // Create new polyline following roads
                const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                this.roadPolyline = L.polyline(coordinates, {
                    color: '#fc4c02',
                    weight: 4,
                    opacity: 0.8
                }).addTo(this.map);
                
                // Update distance with actual road distance
                this.totalDistance = route.distance / 1000; // Convert to km
                window.UIManager.updateRouteInfo();
                
                // Hide the straight-line polyline
                this.polyline.setStyle({ opacity: 0 });
                
                return true; // Success
            }
        } catch (error) {
            console.error('Error fetching road route:', error);
            alert('Could not fetch road route. Using straight lines.');
            return false; // Failed
        }
    },
    
    // Process open route to follow roads (called when saving)
    async processOpenRoute() {
        if (this.routeClosed || this.waypoints.length < 2) return;
        
        // Fetch road route for open route
        const success = await this.fetchRoadRoute(true);
        
        if (success) {
            // Mark that we now have a road-following route
            this.hasRoadRoute = true;
        }
    },
    
    // Update route display
    updateRoute() {
        // Update polyline
        const latlngs = this.waypoints.map(wp => [wp.lat, wp.lng]);
        this.polyline.setLatLngs(latlngs);
        
        // Calculate total distance
        this.totalDistance = this.calculateTotalDistance();
        
        // Update UI
        window.UIManager.updateRouteInfo();
        window.UIManager.updateSaveButtonState();
        
        // Enable/disable generate button based on waypoints
        const generateButton = document.getElementById('generate-gpx');
        if (this.waypoints.length < 2) {
            generateButton.disabled = true;
            generateButton.classList.remove('btn-primary');
            generateButton.classList.add('btn-disabled');
            generateButton.textContent = 'Generate GPX (Need 2+ waypoints)';
        } else {
            generateButton.disabled = false;
            generateButton.classList.remove('btn-disabled');
            generateButton.classList.add('btn-primary');
            generateButton.textContent = 'Generate GPX';
        }
        
        // Update button text based on route status - check routeClosed FIRST

    },
    
    // Calculate total distance
    calculateTotalDistance() {
        if (this.waypoints.length < 2) return 0;
        
        let distance = 0;
        for (let i = 0; i < this.waypoints.length - 1; i++) {
            const from = turf.point([this.waypoints[i].lng, this.waypoints[i].lat]);
            const to = turf.point([this.waypoints[i + 1].lng, this.waypoints[i + 1].lat]);
            distance += turf.distance(from, to, { units: 'kilometers' });
        }
        
        return distance;
    },
    
    // Clear all waypoints
    clear() {
        this.waypoints = [];
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        this.polyline.setLatLngs([]);
        
        // Reset route closed state
        this.routeClosed = false;
        this.startMarker = null;
        this.hasRoadRoute = false; // Reset road route flag
        this.setHasChanges(false);
        
        // Remove road polyline if exists
        if (this.roadPolyline) {
            this.map.removeLayer(this.roadPolyline);
            this.roadPolyline = null;
        }
        
        // Remove mouse move listener
        this.map.off('mousemove', this.onMouseMove.bind(this));
        
        // Reset polyline opacity
        this.polyline.setStyle({ opacity: 0.8 });
        
        this.updateRoute();
    },
    
    // Update save button state based on changes
    updateSaveButtonState() {
        const saveButton = document.getElementById('save-route');
        
        // Check if we have waypoints to save
        const hasWaypoints = this.waypoints.length > 0;
        const canSave = hasWaypoints && this.hasChanges;
        
        saveButton.disabled = !canSave;
        
        if (!hasWaypoints) {
            saveButton.classList.remove('btn-primary');
            saveButton.classList.add('btn-disabled');
            saveButton.textContent = 'Save Route (No Waypoints)';
        } else if (!this.hasChanges) {
            saveButton.classList.remove('btn-primary');
            saveButton.classList.add('btn-disabled');
            saveButton.textContent = 'Save Route (No Changes)';
        } else {
            saveButton.classList.remove('btn-disabled');
            saveButton.classList.add('btn-primary');
            saveButton.textContent = 'Save Route';
        }
    },
};

// Export for use in other modules
window.RouteManager = RouteManager;