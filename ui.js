// UI Management Module
const UIManager = {
    distanceUnit: 'km',
    
    // Activity pace defaults (in min/km)
    activityPaceDefaults: {
        run: { minutes: 6, seconds: 0 },
        walk: { minutes: 12, seconds: 0 },
        bike: { minutes: 3, seconds: 0 }
    },
    
    // Generate time-based activity name
    generateTimeBasedActivityName() {
        const now = new Date();
        const hour = now.getHours();
        const activityType = document.getElementById('activity-type').value;
        
        let timeOfDay;
        if (hour >= 0 && hour < 7) {
            timeOfDay = 'Early Morning';
        } else if (hour >= 7 && hour < 12) {
            timeOfDay = 'Morning';
        } else if (hour >= 12 && hour < 19) {
            timeOfDay = 'Afternoon';
        } else {
            timeOfDay = 'Evening';
        }
        
        // Capitalize activity type for display
        const activityName = activityType.charAt(0).toUpperCase() + activityType.slice(1);
        
        return `${timeOfDay} ${activityName}`;
    },
    
    // Update activity name if it's still the default
    updateActivityNameIfDefault() {
        const activityNameInput = document.getElementById('activity-name');
        const currentName = activityNameInput.value.trim();
        
        // Check if current name follows our time-based pattern
        const timePatterns = ['Early Morning', 'Morning', 'Afternoon', 'Evening'];
        const activityTypes = ['Run', 'Walk', 'Bike'];
        
        const isTimeBasedName = timePatterns.some(time => 
            activityTypes.some(activity => 
                currentName === `${time} ${activity}`
            )
        );
        
        // Only update if it's a time-based name or empty
        if (isTimeBasedName || currentName === '') {
            activityNameInput.value = this.generateTimeBasedActivityName();
        }
    },
    
    // Initialize all event listeners
    initializeEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Clear route button
        document.getElementById('clear-route').addEventListener('click', () => {
            // Check if a saved route is currently loaded
            if (window.StorageManager.currentLoadedRouteIndex !== null) {
                if (confirm('Are you sure you want to clear the current route?')) {
                    window.RouteManager.clear();
                    window.StorageManager.currentLoadedRouteIndex = null;
                    window.StorageManager.loadSavedRoutes();
                    this.updateCurrentRouteDisplay();
                    document.getElementById('activity-name').value = this.generateTimeBasedActivityName();
                }
            } else {
                // Just creating a new route, clear without confirmation
                window.RouteManager.clear();
                document.getElementById('activity-name').value = this.generateTimeBasedActivityName();
            }
        });
        
        // Save route button
        document.getElementById('save-route').addEventListener('click', () => {
            window.StorageManager.saveRoute();
        });
        
        // Generate GPX button
        document.getElementById('generate-gpx').addEventListener('click', () => {
            window.Utils.generateGPX();
        });
        
        // Distance unit toggle
        document.getElementById('distance-toggle').addEventListener('click', function() {
            UIManager.distanceUnit = UIManager.distanceUnit === 'km' ? 'miles' : 'km';
            this.textContent = UIManager.distanceUnit;
            UIManager.updateRouteInfo();
            window.StorageManager.loadSavedRoutes();
        });
        
        // Instructions toggle
        document.getElementById('toggle-instructions').addEventListener('click', function() {
            const content = document.getElementById('instructions-content');
            const btn = this;
            
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                btn.textContent = '−';
            } else {
                content.classList.add('collapsed');
                btn.textContent = '+';
            }
        });
        
        // Pace variance slider
        document.getElementById('pace-variance').addEventListener('input', function(e) {
            document.getElementById('variance-display').textContent = e.target.value + '%';
            window.RouteManager.setHasChanges(true);
        });
        
        // Pace inputs - update duration when changed and add validation
        document.getElementById('pace-minutes').addEventListener('input', function(e) {
            // Allow any positive integer for minutes
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 0) {
                e.target.value = '';
            } else if (value > 99) {
                e.target.value = 99; // Cap at 99 minutes
            }
            window.RouteManager.setHasChanges(true);
            UIManager.updateRouteInfo();
        });
        
        document.getElementById('pace-seconds').addEventListener('input', function(e) {
            // Restrict seconds to 0-59
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 0) {
                e.target.value = '';
            } else if (value > 59) {
                e.target.value = 59;
            }
            window.RouteManager.setHasChanges(true);
            UIManager.updateRouteInfo();
        });
        
        // Add blur event to ensure valid values when user leaves the field
        document.getElementById('pace-minutes').addEventListener('blur', function(e) {
            if (e.target.value === '' || parseInt(e.target.value) < 1) {
                e.target.value = 1; // Default to 1 minute minimum
            }
        });
        
        document.getElementById('pace-seconds').addEventListener('blur', function(e) {
            if (e.target.value === '') {
                e.target.value = 0; // Default to 0 seconds
            }
            // Pad with leading zero if needed
            const value = parseInt(e.target.value);
            if (value >= 0 && value <= 9) {
                e.target.value = value.toString().padStart(2, '0');
            }
        });
        
        // Pace unit change - convert pace values
        document.getElementById('pace-unit').addEventListener('change', function(e) {
            const paceMinutes = document.getElementById('pace-minutes');
            const paceSeconds = document.getElementById('pace-seconds');
            
            const currentMinutes = parseInt(paceMinutes.value) || 6;
            const currentSeconds = parseInt(paceSeconds.value) || 0;
            const totalSeconds = currentMinutes * 60 + currentSeconds;
            
            let newTotalSeconds;
            if (e.target.value === 'min/mile') {
                // Convert from min/km to min/mile (multiply by 1.60934)
                newTotalSeconds = totalSeconds * 1.60934;
            } else {
                // Convert from min/mile to min/km (divide by 1.60934)
                newTotalSeconds = totalSeconds / 1.60934;
            }
            
            const newMinutes = Math.floor(newTotalSeconds / 60);
            const newSeconds = Math.round(newTotalSeconds % 60);
            
            paceMinutes.value = newMinutes;
            paceSeconds.value = newSeconds;
            
            window.RouteManager.setHasChanges(true);
            UIManager.updateRouteInfo();
        });
        
        // Activity type change
        document.getElementById('activity-type').addEventListener('change', function(e) {
            UIManager.updatePaceForActivity(e.target.value);
            UIManager.updateActivityNameIfDefault(); // Update name based on new activity type
            window.RouteManager.setHasChanges(true);
            UIManager.updateRouteInfo();
            
            // Re-fetch road route if route is closed
            if (window.RouteManager.routeClosed) {
                window.RouteManager.fetchRoadRoute();
            }
        });
        
        // Activity name change
        document.getElementById('activity-name').addEventListener('input', () => {
            window.RouteManager.setHasChanges(true);
        });
        
        // Start datetime change
        document.getElementById('start-datetime').addEventListener('change', () => {
            window.RouteManager.setHasChanges(true);
        });
        
        // GPX Modal event listeners
        document.getElementById('modal-cancel').addEventListener('click', () => {
            window.Utils.closeGPXModal();
        });
        
        document.getElementById('modal-generate').addEventListener('click', () => {
            window.Utils.executeGPXGeneration();
        });
        
        document.querySelector('.close-modal').addEventListener('click', () => {
            window.Utils.closeGPXModal();
        });
        
        // Close modal when clicking outside
        document.getElementById('gpx-modal').addEventListener('click', (e) => {
            if (e.target.id === 'gpx-modal') {
                window.Utils.closeGPXModal();
            }
        });
    },

    // Switch between tabs
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    },

    // Update current route display
    updateCurrentRouteDisplay() {
        const currentRouteInfo = document.getElementById('current-route-info');
        const currentRouteName = document.getElementById('current-route-name');
        
        if (window.StorageManager.currentLoadedRouteIndex !== null) {
            const routes = JSON.parse(localStorage.getItem('stravaMuleRoutes') || '[]');
            const currentRoute = routes[window.StorageManager.currentLoadedRouteIndex];
            
            if (currentRoute) {
                currentRouteName.textContent = currentRoute.name;
                currentRouteInfo.style.display = 'flex';
                return;
            }
        }
        
        currentRouteInfo.style.display = 'none';
    },
    
    // Update pace based on activity type
    updatePaceForActivity(activityType) {
        const paceMinutes = document.getElementById('pace-minutes');
        const paceSeconds = document.getElementById('pace-seconds');
        const paceUnit = document.getElementById('pace-unit').value;
        
        const defaultPace = this.activityPaceDefaults[activityType] || this.activityPaceDefaults.run;
        let minutes = defaultPace.minutes;
        let seconds = defaultPace.seconds;
        
        // Convert to current pace unit if needed
        if (paceUnit === 'min/mile') {
            const totalSeconds = minutes * 60 + seconds;
            const convertedSeconds = totalSeconds * 1.60934;
            minutes = Math.floor(convertedSeconds / 60);
            seconds = Math.round(convertedSeconds % 60);
        }
        
        paceMinutes.value = minutes;
        paceSeconds.value = seconds;
    },
    
    // Update route information display
    updateRouteInfo() {
        const displayDistance = this.distanceUnit === 'km' ? 
            window.RouteManager.totalDistance : 
            window.RouteManager.totalDistance * 0.621371;
        
        document.getElementById('total-distance').textContent = 
            displayDistance.toFixed(2) + ' ' + this.distanceUnit;
        document.getElementById('waypoint-count').textContent = 
            window.RouteManager.waypoints.length;
        
        const routeStatusElement = document.getElementById('route-status');
        routeStatusElement.textContent = window.RouteManager.routeClosed ? 'Closed Loop' : 'Open';
        
        if (window.RouteManager.routeClosed) {
            routeStatusElement.classList.add('closed');
        } else {
            routeStatusElement.classList.remove('closed');
        }
        
        // Calculate estimated duration
        const pace = window.Utils.getPaceInMinutesPerKm();
        const durationMinutes = window.RouteManager.totalDistance * pace;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = Math.floor(durationMinutes % 60);
        const seconds = Math.floor((durationMinutes % 1) * 60);
        
        document.getElementById('estimated-duration').textContent = 
            `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update current route display
        this.updateCurrentRouteDisplay();
    },
    
    // Update save button state based on changes
    updateSaveButtonState() {
        // Delegate to RouteManager's method to avoid duplication
        if (window.RouteManager && window.RouteManager.updateSaveButtonState) {
            window.RouteManager.updateSaveButtonState();
        }
    },
    
    // Set default start date/time to current time (future dates only)
    setDefaultDateTime() {
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        
        const datetimeInput = document.getElementById('start-datetime');
        datetimeInput.value = localDateTime;
        datetimeInput.min = localDateTime; // Set minimum to current time
        
        // Set initial activity name based on current time
        const activityNameInput = document.getElementById('activity-name');
        if (!activityNameInput.value || activityNameInput.value === '') {
            activityNameInput.value = this.generateTimeBasedActivityName();
        }
        
        // Update activity name every minute to keep it current
        setInterval(() => {
            this.updateActivityNameIfDefault();
        }, 60000); // Check every minute
    }
};

// Export for use in other modules
window.UIManager = UIManager;