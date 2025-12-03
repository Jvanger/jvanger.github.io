class GPXGenerator {
    constructor() {
        this.route = [];
        this.config = {};
        // Research-based constants
        this.gpsUpdateInterval = 1; // 1 Hz sampling rate (1 second) per research
        this.gpsAccuracy = 3.5; // 3-5m accuracy in good conditions
        this.segmentLength = 100; // Shorter segments for more natural variations
        this.daviesConstant = 3.3; // 3.3% pace reduction per 1% grade
        this.downhillEfficiency = 0.55; // Downhill benefit is 55% of uphill penalty
        this.minDistanceForElevationAdjustment = 30; // Reduced for more responsive adjustments
    }

    /**
     * Set the route data (array of lat/lng points)
     * IMPORTANT: Route points should follow actual roads/paths for realistic results
     * Points will be smoothly interpolated at 1Hz GPS sampling rate
     */
    setRoute(routePoints) {
        this.route = routePoints;
    }

    /**
     * Set the configuration for GPX generation
     */
    setConfig(config) {
        this.config = {
            activityName: config.activityName || 'Running Activity',
            runnerName: config.runnerName || 'Runner',
            activityType: config.activityType || 'run',
            paceMinutes: config.paceMinutes || 6,
            paceSeconds: config.paceSeconds || 0,
            paceUnit: config.paceUnit || 'min/km',
            startDateTime: config.startDateTime || new Date().toISOString(),
            paceVariance: config.paceVariance || 5,
            runnerLevel: config.runnerLevel || 'recreational', // 'elite', 'trained', 'recreational'
            includeGPSDrift: config.includeGPSDrift === true // Default false, must explicitly enable
        };
    }

    /**
     * Get pace variation coefficient based on runner level
     */
    getPaceVariationCoefficient() {
        const levels = {
            'elite': 0.03,        // 2-4% variation
            'trained': 0.065,     // 5-8% variation
            'recreational': 0.16  // 12-20% variation
        };
        return levels[this.config.runnerLevel] || levels.recreational;
    }

    /**
     * Convert pace to speed in m/s
     */
    paceToSpeed() {
        const totalPaceSeconds = (this.config.paceMinutes * 60) + this.config.paceSeconds;
        
        if (this.config.paceUnit === 'min/km') {
            return 1000 / totalPaceSeconds;
        } else {
            return 1609.34 / totalPaceSeconds;
        }
    }

    /**
     * Calculate distance between two lat/lng points using Haversine formula
     */
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

        return R * c;
    }

    /**
     * Add subtle GPS drift to simulate realistic phone GPS behavior
     */
    addGPSDrift(lat, lng, previousDrift = null) {
        if (!this.config.includeGPSDrift) return { lat, lng };
        
        // Much more subtle drift - only 0.5-2m variation
        const maxDrift = 0.000015; // ~1.5m in degrees at equator
        
        // If we have previous drift, create smooth continuation
        if (previousDrift) {
            // Smooth transition from previous drift (90% previous, 10% new)
            const newLatDrift = previousDrift.latDrift * 0.9 + (Math.random() - 0.5) * maxDrift * 0.1;
            const newLngDrift = previousDrift.lngDrift * 0.9 + (Math.random() - 0.5) * maxDrift * 0.1;
            
            return {
                lat: lat + newLatDrift,
                lng: lng + newLngDrift,
                drift: { latDrift: newLatDrift, lngDrift: newLngDrift }
            };
        }
        
        // Initial small drift
        const latDrift = (Math.random() - 0.5) * maxDrift * 0.5;
        const lngDrift = (Math.random() - 0.5) * maxDrift * 0.5;
        
        return {
            lat: lat + latDrift,
            lng: lng + lngDrift,
            drift: { latDrift, lngDrift }
        };
    }

    /**
     * Fetch elevation data for route points
     */
    async fetchElevationData(points) {
        try {
            const chunks = [];
            for (let i = 0; i < points.length; i += 50) {
                chunks.push(points.slice(i, i + 50));
            }
            
            let allElevations = [];
            
            for (const chunk of chunks) {
                const locations = chunk.map(p => ({ latitude: p.lat, longitude: p.lng }));
                
                const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        locations: locations
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Elevation API error: ${response.status}`);
                }
                
                const data = await response.json();
                allElevations = allElevations.concat(data.results.map(r => r.elevation));
                
                if (chunks.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            return allElevations;
        } catch (error) {
            console.warn('Could not fetch elevation data:', error);
            return points.map(() => 0);
        }
    }

    /**
     * Research-based elevation speed adjustment using Davies formula
     */
    adjustSpeedForElevation(baseSpeed, elevationChange, distance) {
        if (distance < this.minDistanceForElevationAdjustment) return baseSpeed;
        
        const grade = (elevationChange / distance) * 100; // Convert to percentage
        let speedMultiplier = 1.0;
        
        if (Math.abs(grade) < 0.5) {
            // Flat terrain - no adjustment
            return baseSpeed;
        }
        
        if (grade > 0) {
            // Uphill: Davies 3.3% rule
            const paceReduction = grade * (this.daviesConstant / 100);
            speedMultiplier = 1 / (1 + paceReduction);
            
            // Apply biomechanical thresholds
            if (grade > 20) {
                // Transition to hiking mechanics
                speedMultiplier *= 0.6;
            } else if (grade > 15) {
                // Severe grade penalty
                speedMultiplier *= 0.8;
            }
        } else {
            // Downhill: 55% of uphill benefit
            const paceBenefit = Math.abs(grade) * (this.daviesConstant * this.downhillEfficiency / 100);
            speedMultiplier = 1 + paceBenefit;
            
            // Peak efficiency at -10% grade
            if (grade < -10) {
                // Braking mechanics reduce benefit
                const brakingPenalty = (Math.abs(grade) - 10) * 0.01;
                speedMultiplier = Math.max(1.05, speedMultiplier - brakingPenalty);
            }
            
            // Cap maximum downhill speed increase
            speedMultiplier = Math.min(1.15, speedMultiplier);
        }
        
        return baseSpeed * speedMultiplier;
    }

    /**
     * Generate realistic pace variations using multiple overlapping patterns
     */
    generateRealisticVariations(totalDistance) {
        const variations = [];
        const numSegments = Math.ceil(totalDistance / this.segmentLength);
        const baseVariation = this.getPaceVariationCoefficient();
        
        // Generate base rhythm (longer wavelength)
        const rhythmPeriod = numSegments / (2 + Math.random() * 2);
        
        for (let i = 0; i < numSegments; i++) {
            // Multiple wave components for natural variation
            const longWave = Math.sin((i / rhythmPeriod) * Math.PI * 2) * 0.4;
            const mediumWave = Math.sin((i / (rhythmPeriod * 0.3)) * Math.PI * 2) * 0.3;
            const shortWave = Math.sin((i / (rhythmPeriod * 0.1)) * Math.PI * 2) * 0.2;
            
            // Add micro-variations (breath-by-breath changes)
            const microVariation = (Math.random() - 0.5) * 0.1;
            
            const combinedWave = (longWave + mediumWave + shortWave + microVariation) / 2;
            const variation = 1 + (combinedWave * baseVariation);
            
            // Keep within realistic bounds
            const maxVar = 1 + baseVariation;
            const minVar = 1 - baseVariation;
            variations.push(Math.max(minVar, Math.min(maxVar, variation)));
        }
        
        // Apply smoothing
        return this.smoothVariations(variations, 5);
    }

    /**
     * Smooth variations with weighted moving average
     */
    smoothVariations(variations, windowSize) {
        const smoothed = [];
        const weights = this.generateGaussianWeights(windowSize);
        
        for (let i = 0; i < variations.length; i++) {
            let weightedSum = 0;
            let weightSum = 0;
            
            for (let j = -Math.floor(windowSize/2); j <= Math.floor(windowSize/2); j++) {
                const idx = Math.max(0, Math.min(variations.length - 1, i + j));
                const weightIdx = j + Math.floor(windowSize/2);
                weightedSum += variations[idx] * weights[weightIdx];
                weightSum += weights[weightIdx];
            }
            
            smoothed.push(weightedSum / weightSum);
        }
        
        return smoothed;
    }

    /**
     * Generate Gaussian weights for smoothing
     */
    generateGaussianWeights(size) {
        const weights = [];
        const sigma = size / 4;
        const center = Math.floor(size / 2);
        
        for (let i = 0; i < size; i++) {
            const x = i - center;
            const weight = Math.exp(-(x * x) / (2 * sigma * sigma));
            weights.push(weight);
        }
        
        return weights;
    }

    /**
     * Apply progressive fatigue model based on research
     */
    applyFatigueModel(baseSpeed, distanceCovered, totalDistance, currentTime, startTime) {
        const progressPercent = distanceCovered / totalDistance;
        const elapsedMinutes = (currentTime - startTime) / 60000;
        
        let fatigueMultiplier = 1.0;
        
        // Distance-based fatigue (hitting the wall effect)
        if (totalDistance > 20000) { // Long runs > 20km
            if (progressPercent > 0.65) { // After 65% distance
                const wallProgress = (progressPercent - 0.65) / 0.35;
                // Exponential fatigue increase
                fatigueMultiplier *= (1 - 0.17 * Math.pow(wallProgress, 2));
            }
        }
        
        // Time-based fatigue (0.1-0.15% per minute)
        const timeFatigue = Math.min(0.15, elapsedMinutes * 0.0012);
        fatigueMultiplier *= (1 - timeFatigue);
        
        // Heart rate drift simulation (affects perceived effort)
        if (elapsedMinutes > 30) {
            const driftMinutes = elapsedMinutes - 30;
            const hrDriftEffect = Math.min(0.05, driftMinutes * 0.001);
            fatigueMultiplier *= (1 - hrDriftEffect);
        }
        
        // Ensure reasonable bounds
        return baseSpeed * Math.max(0.75, fatigueMultiplier);
    }

    /**
     * Generate realistic GPS track points with 1 Hz sampling
     */
    async generateTimePoints() {
        if (this.route.length < 2) {
            throw new Error('Route must have at least 2 points');
        }

        const baseSpeed = this.paceToSpeed();
        const timePoints = [];
        let currentTime = new Date(this.config.startDateTime);
        const startTime = new Date(currentTime);

        // Calculate total distance and generate variations
        const totalDistance = this.calculateTotalDistance();
        const paceVariations = this.generateRealisticVariations(totalDistance);

        // Fetch elevation data
        console.log('Fetching elevation data...');
        const elevations = await this.fetchElevationData(this.route);
        console.log('Elevation data received');

        // Track position along route
        let currentSegmentIndex = 0;
        let segmentProgress = 0; // 0 to 1 within current segment
        let cumulativeDistance = 0;
        let previousDrift = null;

        // Generate GPS points at 1 Hz
        while (currentSegmentIndex < this.route.length - 1) {
            const segmentStart = this.route[currentSegmentIndex];
            const segmentEnd = this.route[currentSegmentIndex + 1];
            
            // Interpolate position along segment
            const lat = segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * segmentProgress;
            const lng = segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * segmentProgress;
            
            // Interpolate elevation
            const elevStart = elevations[currentSegmentIndex] || 0;
            const elevEnd = elevations[currentSegmentIndex + 1] || 0;
            const elevation = elevStart + (elevEnd - elevStart) * segmentProgress;
            
            // Add subtle GPS drift with continuity
            const driftedPoint = this.addGPSDrift(lat, lng, previousDrift);
            previousDrift = driftedPoint.drift;
            
            // Calculate current speed with adjustments
            let adjustedSpeed = baseSpeed;
            
            // Apply pace variation
            const variationIndex = Math.floor(cumulativeDistance / this.segmentLength);
            const variation = paceVariations[Math.min(variationIndex, paceVariations.length - 1)];
            adjustedSpeed *= variation;
            
            // Apply elevation adjustment
            const elevationChange = elevEnd - elevStart;
            const segmentDistance = this.calculateDistance(
                segmentStart.lat, segmentStart.lng,
                segmentEnd.lat, segmentEnd.lng
            );
            adjustedSpeed = this.adjustSpeedForElevation(adjustedSpeed, elevationChange, segmentDistance);
            
            // Apply fatigue model
            adjustedSpeed = this.applyFatigueModel(
                adjustedSpeed,
                cumulativeDistance,
                totalDistance,
                currentTime,
                startTime
            );
            
            // Record GPS point
            timePoints.push({
                lat: driftedPoint.lat,
                lng: driftedPoint.lng,
                time: new Date(currentTime),
                elevation: elevation
            });
            
            // Calculate distance traveled in 1 second
            const distanceInOneSecond = adjustedSpeed * this.gpsUpdateInterval;
            
            // Update position along route
            const remainingSegmentDistance = segmentDistance * (1 - segmentProgress);
            
            if (distanceInOneSecond >= remainingSegmentDistance) {
                // Move to next segment
                cumulativeDistance += remainingSegmentDistance;
                currentSegmentIndex++;
                
                // Calculate how far into the next segment we are
                const overflowDistance = distanceInOneSecond - remainingSegmentDistance;
                if (currentSegmentIndex < this.route.length - 1) {
                    const nextSegmentDistance = this.calculateDistance(
                        this.route[currentSegmentIndex].lat, this.route[currentSegmentIndex].lng,
                        this.route[currentSegmentIndex + 1].lat, this.route[currentSegmentIndex + 1].lng
                    );
                    segmentProgress = overflowDistance / nextSegmentDistance;
                } else {
                    // Reached end of route
                    segmentProgress = 1;
                }
            } else {
                // Continue along current segment
                cumulativeDistance += distanceInOneSecond;
                segmentProgress += distanceInOneSecond / segmentDistance;
            }
            
            // Advance time by 1 second
            currentTime = new Date(currentTime.getTime() + this.gpsUpdateInterval * 1000);
        }

        // Add final point if needed
        const lastPoint = this.route[this.route.length - 1];
        const lastDrifted = this.addGPSDrift(lastPoint.lat, lastPoint.lng, previousDrift);
        timePoints.push({
            lat: lastDrifted.lat,
            lng: lastDrifted.lng,
            time: new Date(currentTime),
            elevation: elevations[elevations.length - 1] || 0
        });

        return timePoints;
    }

    /**
     * Format time for GPX format
     */
    formatGPXTime(date) {
        return date.toISOString();
    }

    /**
     * Generate GPX XML content
     */
    async generateGPX() {
        if (this.route.length === 0) {
            throw new Error('No route data available');
        }

        const timePoints = await this.generateTimePoints();
        const totalDistance = this.calculateTotalDistance();
        const duration = timePoints[timePoints.length - 1].time - timePoints[0].time;
        const avgSpeed = totalDistance / (duration / 1000);

        let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Enhanced GPX Generator" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${this.config.activityName}</name>
    <desc>Generated route for ${this.config.runnerName} - Distance: ${(totalDistance/1000).toFixed(2)}km, Avg Speed: ${(avgSpeed * 3.6).toFixed(1)}km/h</desc>
    <time>${this.formatGPXTime(timePoints[0].time)}</time>
  </metadata>
  <trk>
    <name>${this.config.activityName}</name>
    <type>${this.config.activityType}</type>
    <trkseg>`;

        // Add track points
        timePoints.forEach(point => {
            gpxContent += `
      <trkpt lat="${point.lat.toFixed(6)}" lon="${point.lng.toFixed(6)}">
        <ele>${point.elevation.toFixed(1)}</ele>
        <time>${this.formatGPXTime(point.time)}</time>
      </trkpt>`;
        });

        gpxContent += `
    </trkseg>
  </trk>
</gpx>`;

        return gpxContent;
    }

    /**
     * Calculate total distance of the route
     */
    calculateTotalDistance() {
        let totalDistance = 0;
        
        for (let i = 1; i < this.route.length; i++) {
            const prevPoint = this.route[i - 1];
            const currentPoint = this.route[i];
            
            totalDistance += this.calculateDistance(
                prevPoint.lat, prevPoint.lng,
                currentPoint.lat, currentPoint.lng
            );
        }

        return totalDistance;
    }

    /**
     * Download GPX file
     */
    async downloadGPX() {
        try {
            console.log('Generating GPX with research-based realistic patterns...');
            const gpxContent = await this.generateGPX();
            const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.config.activityName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.gpx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Error generating GPX:', error);
            throw error;
        }
    }

    /**
     * Get route statistics
     */
    async getRouteStats() {
        if (this.route.length === 0) {
            return {
                distance: 0,
                estimatedDuration: 0,
                averagePace: 0
            };
        }

        const timePoints = await this.generateTimePoints();
        const totalDistance = this.calculateTotalDistance();
        const duration = timePoints[timePoints.length - 1].time - timePoints[0].time;
        
        return {
            distance: totalDistance,
            estimatedDuration: duration,
            averagePace: this.paceToSpeed(),
            startTime: timePoints[0].time,
            endTime: timePoints[timePoints.length - 1].time,
            elevationGain: this.calculateElevationGain(timePoints),
            elevationLoss: this.calculateElevationLoss(timePoints),
            runnerLevel: this.config.runnerLevel,
            gpsAccuracy: this.gpsAccuracy
        };
    }

    /**
     * Calculate total elevation gain
     */
    calculateElevationGain(timePoints) {
        let gain = 0;
        for (let i = 1; i < timePoints.length; i++) {
            const diff = timePoints[i].elevation - timePoints[i-1].elevation;
            if (diff > 0) gain += diff;
        }
        return gain;
    }

    /**
     * Calculate total elevation loss
     */
    calculateElevationLoss(timePoints) {
        let loss = 0;
        for (let i = 1; i < timePoints.length; i++) {
            const diff = timePoints[i].elevation - timePoints[i-1].elevation;
            if (diff < 0) loss += Math.abs(diff);
        }
        return loss;
    }
}

// Export for use in other files
window.GPXGenerator = GPXGenerator;