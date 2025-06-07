// Storage Management Module
const StorageManager = {
    currentLoadedRouteIndex: null,
    
    // Generate unique route name
    generateUniqueName(baseName) {
        const routes = JSON.parse(localStorage.getItem('stravaMuleRoutes') || '[]');
        const existingNames = routes.map(r => r.name);
        
        let finalName = baseName;
        let counter = 2;
        
        while (existingNames.includes(finalName)) {
            finalName = `${baseName} ${counter}`;
            counter++;
        }
        
        return finalName;
    },
    
    // Save route to localStorage
    async saveRoute() {
        // Add safety check to prevent saving empty routes
        if (window.RouteManager.waypoints.length === 0) {
            alert('Cannot save route with no waypoints.');
            return;
        }
        
        // Process open route to follow roads if needed
        if (!window.RouteManager.routeClosed && window.RouteManager.waypoints.length >= 2) {
            await window.RouteManager.processOpenRoute();
        }
        
        let routeName;
        const activityName = document.getElementById('activity-name').value.trim();
        
        // Use the activity name from the config, no prompting
        if (this.currentLoadedRouteIndex !== null) {
            // If we're editing an existing route, use the activity name from config
            routeName = activityName || 'Unnamed Route';
        } else {
            // For new routes, generate unique name based on activity name
            const baseName = activityName || 'New Route';
            routeName = this.generateUniqueName(baseName);
        }

        // Get existing routes to preserve creation time
        const routes = JSON.parse(localStorage.getItem('stravaMuleRoutes') || '[]');
        const now = new Date().toISOString();
        
        const route = {
            name: routeName,
            waypoints: window.RouteManager.waypoints,
            distance: window.RouteManager.totalDistance,
            routeClosed: window.RouteManager.routeClosed,
            roadPolyline: window.RouteManager.roadPolyline ? 
                window.RouteManager.roadPolyline.getLatLngs() : null,
            hasRoadRoute: window.RouteManager.hasRoadRoute || window.RouteManager.routeClosed,
            timestamp: this.currentLoadedRouteIndex !== null ? 
                routes[this.currentLoadedRouteIndex].timestamp : now,
            lastModified: now,
            // Save profile data
            activityType: document.getElementById('activity-type').value,
            runnerName: document.getElementById('runner-name').value,
            paceMinutes: parseInt(document.getElementById('pace-minutes').value) || 6,
            paceSeconds: parseInt(document.getElementById('pace-seconds').value) || 0,
            paceUnit: document.getElementById('pace-unit').value,
            paceVariance: parseInt(document.getElementById('pace-variance').value) || 5,
            startDateTime: document.getElementById('start-datetime').value
        };
        
        if (this.currentLoadedRouteIndex !== null) {
            // Update existing route
            routes[this.currentLoadedRouteIndex] = route;
        } else {
            // Add new route
            routes.push(route);
            // Set the current loaded route index to the new route
            this.currentLoadedRouteIndex = routes.length - 1;
        }
        
        // Save to localStorage
        localStorage.setItem('stravaMuleRoutes', JSON.stringify(routes));
        
        // Reset hasChanges flag
        window.RouteManager.setHasChanges(false);
        
        // Update activity name field if it was changed during unique name generation
        document.getElementById('activity-name').value = routeName;
        
        // Refresh saved routes list
        this.loadSavedRoutes();
        
        // Update current route display
        window.UIManager.updateCurrentRouteDisplay();
        
        console.log('Route saved:', routeName);
    },
    
    // Load a specific route by index
    loadRouteByIndex(index) {
        const routes = JSON.parse(localStorage.getItem('stravaMuleRoutes') || '[]');
        
        if (index >= routes.length) return;
        
        const route = routes[index];
        
        // Set the current loaded route index
        this.currentLoadedRouteIndex = index;
        
        // Clear existing route
        window.RouteManager.clear();
        
        // Load basic route data
        document.getElementById('activity-name').value = route.name;
        
        // Load profile data if it exists (for backwards compatibility)
        if (route.activityType) {
            document.getElementById('activity-type').value = route.activityType;
        }
        if (route.runnerName) {
            document.getElementById('runner-name').value = route.runnerName;
        }
        if (route.paceMinutes !== undefined) {
            document.getElementById('pace-minutes').value = route.paceMinutes;
        }
        if (route.paceSeconds !== undefined) {
            document.getElementById('pace-seconds').value = route.paceSeconds;
        }
        if (route.paceUnit) {
            document.getElementById('pace-unit').value = route.paceUnit;
        }
        if (route.paceVariance !== undefined) {
            document.getElementById('pace-variance').value = route.paceVariance;
            document.getElementById('variance-display').textContent = route.paceVariance + '%';
        }
        if (route.startDateTime) {
            document.getElementById('start-datetime').value = route.startDateTime;
        }
        
        // Load waypoints
        route.waypoints.forEach((wp, i) => {
            window.RouteManager.addWaypoint(wp.lat, wp.lng);
        });
        
        // Load closed route state
        if (route.routeClosed) {
            window.RouteManager.routeClosed = true;
            
            // Update start marker appearance
            if (window.RouteManager.startMarker) {
                window.RouteManager.startMarker.setIcon(L.divIcon({
                    className: 'custom-marker-icon closed',
                    html: '<div class="inner"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                }));
            }
            
            // Hide straight line polyline
            window.RouteManager.polyline.setStyle({ opacity: 0 });
            
            // Use saved distance instead of recalculating
            window.RouteManager.totalDistance = route.distance;
            window.UIManager.updateRouteInfo();
            
            // If we have saved road polyline data, use it
            if (route.roadPolyline) {
                window.RouteManager.roadPolyline = L.polyline(route.roadPolyline, {
                    color: '#fc4c02',
                    weight: 4,
                    opacity: 0.8
                }).addTo(window.MapManager.map);
            } else {
                // Otherwise fetch it again
                window.RouteManager.fetchRoadRoute();
            }
        } else {
            // For open routes, check if we have road routing data
            window.RouteManager.totalDistance = route.distance;
            
            if (route.hasRoadRoute && route.roadPolyline) {
                // Load saved road polyline for open route
                window.RouteManager.roadPolyline = L.polyline(route.roadPolyline, {
                    color: '#fc4c02',
                    weight: 4,
                    opacity: 0.8
                }).addTo(window.MapManager.map);
                
                // Hide straight line polyline
                window.RouteManager.polyline.setStyle({ opacity: 0 });
                window.RouteManager.hasRoadRoute = true;
            }
            
            window.UIManager.updateRouteInfo();
        }
        
        // Reset hasChanges flag since we just loaded
        window.RouteManager.setHasChanges(false);
        
        // Fit map to route
        window.MapManager.fitBounds(window.RouteManager.waypoints);
        
        // Refresh the route list to show highlighting
        this.loadSavedRoutes();
        
        // Switch to config tab to show the loaded route
        window.UIManager.switchTab('config');
    },
    
    // Load and display saved routes
    loadSavedRoutes() {
        const routes = JSON.parse(localStorage.getItem('stravaMuleRoutes') || '[]');
        const routesList = document.getElementById('routes-list');
        const routesEmpty = document.getElementById('routes-empty');
        const distanceUnit = window.UIManager.distanceUnit;
        
        routesList.innerHTML = '';
        
        if (routes.length === 0) {
            routesEmpty.style.display = 'block';
            return;
        }
        
        routesEmpty.style.display = 'none';
        
        // Sort routes by most recent first (using lastModified or timestamp)
        const sortedRoutes = routes.map((route, index) => ({ route, originalIndex: index }))
            .sort((a, b) => {
                const aTime = new Date(a.route.lastModified || a.route.timestamp);
                const bTime = new Date(b.route.lastModified || b.route.timestamp);
                return bTime - aTime; // Most recent first
            });
        
        sortedRoutes.forEach(({ route, originalIndex }) => {
            const li = document.createElement('li');
            const displayDistance = distanceUnit === 'km' ? 
                route.distance : route.distance * 0.621371;
            
            // Use lastModified if available, otherwise fall back to timestamp
            const modifiedTime = route.lastModified || route.timestamp;
            const savedDate = new Date(modifiedTime);
            const dateStr = savedDate.toLocaleDateString();
            const timeStr = savedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Show "Modified" or "Created" based on whether it has been modified
            const timeLabel = route.lastModified && route.lastModified !== route.timestamp ? 'Modified' : 'Created';
            
            li.innerHTML = `
                <div class="route-info">
                    <span class="route-name">${route.name}</span>
                    <div class="route-meta">
                        <span class="route-distance">${displayDistance.toFixed(2)} ${distanceUnit}</span>
                        <span class="route-date">${timeLabel} ${dateStr} ${timeStr}</span>
                    </div>
                </div>
                <span class="delete-route" data-index="${originalIndex}">×</span>
            `;
            
            // Add selected class if this is the currently loaded route
            if (this.currentLoadedRouteIndex === originalIndex) {
                li.classList.add('selected');
            }
            
            // Click to load route
            li.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-route')) {
                    // Check if clicking the already selected route
                    if (this.currentLoadedRouteIndex === originalIndex) {
                        // Deselect
                        this.currentLoadedRouteIndex = null;
                        window.RouteManager.clear();
                        document.getElementById('activity-name').value = '';
                        this.loadSavedRoutes(); // Refresh to remove highlighting
                        window.UIManager.updateCurrentRouteDisplay();
                    } else {
                        // Load new route
                        this.loadRouteByIndex(originalIndex);
                    }
                }
            });
            
            // Delete route  
            li.querySelector('.delete-route').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteRoute(originalIndex);
            });
            
            routesList.appendChild(li);
        });
    },
    
    // Delete a saved route
    deleteRoute(index) {
        if (!confirm('Delete this route?')) return;
        
        const routes = JSON.parse(localStorage.getItem('stravaMuleRoutes') || '[]');
        routes.splice(index, 1);
        localStorage.setItem('stravaMuleRoutes', JSON.stringify(routes));
        
        // If we deleted the currently loaded route, clear the selection
        if (this.currentLoadedRouteIndex === index) {
            this.currentLoadedRouteIndex = null;
            window.RouteManager.clear();
            window.UIManager.updateCurrentRouteDisplay();
        } else if (this.currentLoadedRouteIndex > index) {
            // Adjust index if needed
            this.currentLoadedRouteIndex--;
        }
        
        this.loadSavedRoutes();
    }
};

// Export for use in other modules
window.StorageManager = StorageManager;