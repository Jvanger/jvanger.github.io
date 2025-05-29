// Configuration
const OPENWEATHER_API_KEY = "53de4e39de6b3ac2e8011a936315faa0";
const AQICN_API_KEY = "2f33b1aa6f06345c6adb39ea28a3c688e406301a";
const API_BASE_URL = "https://a.windbornesystems.com/treasure/";
const AUTHOR_NAME = "Jonathan Fang";

// Application state
let balloonData = [];
let currentHourIndex = 0;
let map;
let balloonMarkers = [];
let balloonPaths = [];
let selectedBalloon = null;
let temperatureChart = null;
let altitudeChart = null;
let airQualityChart = null;
let isPlaying = false;
let playInterval = null;
let windLayer = null;
let isDataLoading = false;
let lastUpdated = null;
let autoRefreshInterval = null;
 
// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("author-name").textContent = AUTHOR_NAME;

  initMap();
  initTabs();
  setupEventListeners();
  setupDebugPanel();

  // Initial data load
  fetchRealBalloonData()
    .then((data) => {
      balloonData = data;
      updateDisplay();
      setStatusMessage("Data loaded successfully", "success");
      lastUpdated = new Date();
    })
    .catch((error) => {
      console.error("Error loading initial data:", error);
      setStatusMessage(
        "Error loading data. Using fallback mock data.",
        "error"
      );
      generateMockData();
      updateDisplay();
    });

  // Set up auto-refresh every 15 minutes
  autoRefreshInterval = setInterval(() => {
    if (!isDataLoading) {
      document.getElementById("update-button").click();
    }
  }, 15 * 60 * 1000);
});

// Initialize debug panel
function setupDebugPanel() {
  const debugToggle = document.getElementById("debug-toggle");
  const debugPanel = document.getElementById("debug-panel");

  debugToggle.addEventListener("click", () => {
    debugPanel.classList.toggle("visible");
  });

  // Add initial debug info
  debugPanel.innerHTML = "<h3>Debug Information</h3>";
  debugPanel.innerHTML += `<div>API Base URL: ${API_BASE_URL}</div>`;
  debugPanel.innerHTML += `<div>OpenWeather API Key: ${OPENWEATHER_API_KEY.substring(
    0,
    5
  )}...</div>`;
  debugPanel.innerHTML += `<div>AQICN API Key: ${AQICN_API_KEY.substring(
    0,
    5
  )}...</div>`;
  debugPanel.innerHTML += `<div>User Agent: ${navigator.userAgent}</div>`;
  debugPanel.innerHTML += `<div>Client Time: ${new Date().toISOString()}</div>`;
}

// Initialize tab functionality
function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and content
      document
        .querySelectorAll(".tab-button")
        .forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      button.classList.add("active");
      const tabName = button.getAttribute("data-tab");
      document.getElementById(`${tabName}-tab`).classList.add("active");
    });
  });
}

// Set status message
function setStatusMessage(message, type = "info") {
  const statusIndicator = document.getElementById("status-indicator");
  const statusMessage = document.getElementById("status-message");
  const loadingSpinner = document.getElementById("loading-spinner");

  statusIndicator.className = "status-indicator";
  if (type === "error") statusIndicator.classList.add("error");
  if (type === "success") statusIndicator.classList.add("success");

  statusMessage.textContent = message;

  if (type === "loading") {
    loadingSpinner.classList.remove("hidden");
  } else {
    loadingSpinner.classList.add("hidden");
  }
}

// Initialize the map
function initMap() {
  map = L.map("map").setView([0, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}

// Generate mock balloon data as fallback
function generateMockData() {
  console.warn("Generating mock data as fallback");
  balloonData = [];

  for (let hour = 0; hour < 24; hour++) {
    const hourData = {
      hour,
      timestamp: new Date(Date.now() - hour * 3600 * 1000).toISOString(),
      balloons: [],
    };

    // Generate 3-5 balloons per hour
    const balloonCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < balloonCount; i++) {
      // Create balloon with consistent paths (this doesn't work correctly)
      const baseLatitude = Math.random() * 160 - 80;
      const baseLongitude = Math.random() * 360 - 180;

      const balloon = {
        id: `balloon-${i}`,
        timestamp: new Date(Date.now() - hour * 3600 * 1000).toISOString(),
        location: {
          latitude: baseLatitude + (Math.random() * 2 - 1) * (hour / 24),
          longitude: baseLongitude + (Math.random() * 2 - 1) * (hour / 24),
          altitude: 15000 + Math.random() * 10000 - hour * 200,
        },
        telemetry: {
          temperature: -50 + Math.random() * 30 + hour * 0.5,
          pressure: 50 + Math.random() * 20 - hour * 0.3,
          battery: 100 - hour * 0.7 - Math.random() * 5,
          signal_strength: 100 - hour * 0.5 - Math.random() * 10,
        },
      };

      hourData.balloons.push(balloon);
    }

    balloonData.push(hourData);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Time slider
  document.getElementById("time-slider").addEventListener("input", (e) => {
    currentHourIndex = parseInt(e.target.value);
    updateDisplay();
  });

  // Play button
  document.getElementById("play-button").addEventListener("click", togglePlay);

  // Update button
  document.getElementById("update-button").addEventListener("click", () => {
    if (isDataLoading) return;

    isDataLoading = true;
    setStatusMessage("Updating data...", "loading");

    fetchRealBalloonData()
      .then((data) => {
        balloonData = data;
        updateDisplay();
        setStatusMessage("Data updated successfully", "success");
        lastUpdated = new Date();
        isDataLoading = false;
      })
      .catch((error) => {
        console.error("Error updating data:", error);
        setStatusMessage("Error updating data. Using existing data.", "error");
        isDataLoading = false;
      });
  });

  // Wind layer toggle
  document.getElementById("show-wind-layer").addEventListener("change", (e) => {
    if (e.target.checked) {
      addWindLayer();
    } else {
      removeWindLayer();
    }
  });

  // Balloon paths toggle
  document
    .getElementById("show-balloon-paths")
    .addEventListener("change", (e) => {
      if (e.target.checked) {
        showBalloonPaths();
      } else {
        hideBalloonPaths();
      }
    });
}

// Toggle play/pause of timeline
function togglePlay() {
  const button = document.getElementById("play-button");

  if (isPlaying) {
    clearInterval(playInterval);
    button.textContent = "Play Timeline";
    isPlaying = false;
  } else {
    playInterval = setInterval(() => {
      currentHourIndex = (currentHourIndex + 1) % 24;
      document.getElementById("time-slider").value = currentHourIndex;
      updateDisplay();
    }, 1000); // Update every second

    button.textContent = "Pause Timeline";
    isPlaying = true;
  }
}

// Update the display with current hour's data
function updateDisplay() {
  // Always update time display, regardless of data availability
  const timeDisplay = document.getElementById("current-time");
  const hourDiff = currentHourIndex;

  if (hourDiff === 0) {
    timeDisplay.textContent = "Current Time: Now";
  } else if (hourDiff === 1) {
    timeDisplay.textContent = "Current Time: 1 hour ago";
  } else {
    timeDisplay.textContent = `Current Time: ${hourDiff} hours ago`;
  }

  const hourData = balloonData[currentHourIndex];

  // Clear existing markers and paths
  clearMarkers();
  clearPaths();

  // If no data for this hour, show a message but don't return early
  if (!hourData || !hourData.balloons || hourData.balloons.length === 0) {
    // Update status to show no data for this hour
    const statusMsg = `No data available for hour ${currentHourIndex}`;
    console.log(statusMsg);

    // Clear selection if needed
    if (selectedBalloon) {
      clearSelection();
    }

    // Still update charts (they'll be empty)
    updateCharts();
    return;
  }

  // Add new markers
  hourData.balloons.forEach((balloon) => {
    addBalloonMarker(balloon);
  });

  // Add balloon paths if enabled
  if (document.getElementById("show-balloon-paths").checked) {
    drawBalloonPaths();
  }

  // Reset selection if needed
  if (selectedBalloon) {
    const found = hourData.balloons.find((b) => b.id === selectedBalloon.id);
    if (found) {
      selectBalloon(found);
    } else {
      clearSelection();
    }
  }

  // Update charts
  updateCharts();
}

// Clear all balloon markers
function clearMarkers() {
  balloonMarkers.forEach((marker) => map.removeLayer(marker));
  balloonMarkers = [];
}

// Clear all balloon paths
function clearPaths() {
  balloonPaths.forEach((path) => map.removeLayer(path));
  balloonPaths = [];
}

// Add a balloon marker to the map
function addBalloonMarker(balloon) {
  const { latitude, longitude } = balloon.location;

  // Skip invalid coordinates
  if (!isValidCoordinate(latitude, longitude)) {
    console.warn(
      `Invalid coordinates for balloon ${balloon.id}: ${latitude}, ${longitude}`
    );
    return;
  }

  // Create a custom icon based on whether this is synthetic data or real data
  const iconColor = balloon.synthetic ? "orange" : "blue";
  const balloonIcon = L.divIcon({
    className: balloon.synthetic
      ? "synthetic-balloon-marker"
      : "balloon-marker",
    html: `<div style="background-color: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  const marker = L.marker([latitude, longitude], {
    icon: balloonIcon,
    title: `Balloon ${balloon.id}`,
    alt: `Balloon at ${latitude}, ${longitude}, altitude: ${balloon.location.altitude.toFixed(
      0
    )}m`,
  });

  // Create popup content
  const popupContent = document.createElement("div");
  popupContent.innerHTML = `
        <strong>Balloon ${balloon.id}</strong><br>
        Latitude: ${latitude.toFixed(4)}<br>
        Longitude: ${longitude.toFixed(4)}<br>
        Altitude: ${balloon.location.altitude.toFixed(0)}m<br>
    `;

  // Add a note if this is synthetic data
  if (balloon.synthetic) {
    const note = document.createElement("div");
    note.className = "synthetic-balloon";
    note.textContent = "(Simulated data)";
    popupContent.appendChild(note);
  }

  // Add button
  const button = document.createElement("button");
  button.textContent = "View Details";
  button.addEventListener("click", () => selectBalloon(balloon));
  popupContent.appendChild(button);

  marker.bindPopup(popupContent);
  marker.on("click", () => selectBalloon(balloon));

  marker.addTo(map);
  balloonMarkers.push(marker);
}

// Check if coordinates are valid
function isValidCoordinate(lat, lon) {
  return (
    lat !== undefined &&
    lon !== undefined &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

// Draw paths for all balloons
function drawBalloonPaths() {
  // Get balloon IDs from current hour
  const currentHourBalloons = balloonData[currentHourIndex].balloons;
  const balloonIds = currentHourBalloons.map((balloon) => balloon.id);

  // For each balloon ID, draw its path across available hours
  balloonIds.forEach((id) => {
    const balloonPath = [];

    // Collect all points for this balloon
    for (let hour = 0; hour < balloonData.length; hour++) {
      const hourData = balloonData[hour];
      const balloon = hourData.balloons.find((b) => b.id === id);

      if (
        balloon &&
        isValidCoordinate(balloon.location.latitude, balloon.location.longitude)
      ) {
        balloonPath.push([
          balloon.location.latitude,
          balloon.location.longitude,
        ]);
      }
    }

    // Draw the path if we have at least 2 points
    if (balloonPath.length >= 2) {
      const path = L.polyline(balloonPath, {
        color: getRandomColor(),
        className: "balloon-path",
      });

      path.addTo(map);
      balloonPaths.push(path);
    }
  });
}

// Generate a random color for paths
function getRandomColor() {
  const colors = [
    "#3498db",
    "#2ecc71",
    "#e74c3c",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
    "#d35400",
    "#c0392b",
    "#27ae60",
    "#2980b9",
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

// Show balloon paths
function showBalloonPaths() {
  drawBalloonPaths();
}

// Hide balloon paths
function hideBalloonPaths() {
  clearPaths();
}

// Add wind layer to the map
function addWindLayer() {
  if (
    selectedBalloon &&
    isValidCoordinate(
      selectedBalloon.location.latitude,
      selectedBalloon.location.longitude
    )
  ) {
    const { latitude, longitude } = selectedBalloon.location;

    // Remove existing wind layer
    removeWindLayer();

    // In a production app, we would fetch real wind data from an API
    // For now, add a visual indicator
    const windLayerCircle = L.circle([latitude, longitude], {
      color: "rgba(0, 0, 255, 0.1)",
      fillColor: "rgba(0, 0, 255, 0.1)",
      fillOpacity: 0.3,
      radius: 100000, // 100km radius
    });

    const windArrow = L.polyline(
      [
        [latitude, longitude],
        [latitude + 1, longitude + 1], // Arbitrary wind direction
      ],
      {
        color: "blue",
        weight: 2,
        opacity: 0.7,
      }
    );

    windLayerCircle.addTo(map);
    windArrow.addTo(map);

    windLayer = {
      circle: windLayerCircle,
      arrow: windArrow,
    };
  } else {
    alert("Please select a balloon first to show wind data");
    document.getElementById("show-wind-layer").checked = false;
  }
}

// Remove wind layer from the map
function removeWindLayer() {
  if (windLayer) {
    if (windLayer.circle) map.removeLayer(windLayer.circle);
    if (windLayer.arrow) map.removeLayer(windLayer.arrow);
    windLayer = null;
  }
}

// Select a balloon to show details
function selectBalloon(balloon) {
  selectedBalloon = balloon;

  const detailsDiv = document.getElementById("selected-balloon");
  detailsDiv.innerHTML = `
        <h3>Balloon ${balloon.id}</h3>
        <div class="data-point">Timestamp: ${new Date(
          balloon.timestamp
        ).toLocaleString()}</div>
        <div class="data-point">Latitude: ${balloon.location.latitude.toFixed(
          4
        )}</div>
        <div class="data-point">Longitude: ${balloon.location.longitude.toFixed(
          4
        )}</div>
        <div class="data-point">Altitude: ${balloon.location.altitude.toFixed(
          0
        )}m</div>
        <h4>Telemetry</h4>
        <div class="data-point">Temperature: ${balloon.telemetry.temperature.toFixed(
          1
        )}°C</div>
        <div class="data-point">Pressure: ${balloon.telemetry.pressure.toFixed(
          1
        )} hPa</div>
        <div class="data-point">Battery: ${balloon.telemetry.battery.toFixed(
          1
        )}%</div>
        <div class="data-point">Signal: ${balloon.telemetry.signal_strength.toFixed(
          1
        )}%</div>
    `;

  // Add a note if this is synthetic data
  if (balloon.synthetic) {
    const note = document.createElement("div");
    note.className = "synthetic-balloon";
    note.textContent = "Note: This is simulated data";
    detailsDiv.appendChild(note);
  }

  // Fetch and display weather data
  fetchWeatherData(balloon);

  // Fetch and display air quality data
  fetchAirQualityData(balloon);

  // Center map on selected balloon
  if (
    isValidCoordinate(balloon.location.latitude, balloon.location.longitude)
  ) {
    map.setView([balloon.location.latitude, balloon.location.longitude], 6);
  }

  // Update wind layer if it's enabled
  if (document.getElementById("show-wind-layer").checked) {
    addWindLayer();
  }
}

// Clear the balloon selection
function clearSelection() {
  selectedBalloon = null;
  document.getElementById("selected-balloon").innerHTML =
    "<h3>Select a balloon to see details</h3>";
  document.getElementById("weather-data").innerHTML =
    "Select a balloon to see weather data";
  document.getElementById("air-quality-data").innerHTML =
    "Select a balloon to see air quality data";

  // Remove wind layer if it exists
  removeWindLayer();
}

// Fetch weather data for a balloon location
function fetchWeatherData(balloon) {
  const { latitude, longitude } = balloon.location;

  // Skip invalid coordinates
  if (!isValidCoordinate(latitude, longitude)) {
    document.getElementById("weather-data").innerHTML =
      "Invalid coordinates - weather data unavailable";
    return;
  }

  // In production, use a real API call:
  if (OPENWEATHER_API_KEY !== "53de4e39de6b3ac2e8011a936315faa0") {
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Weather API error: " + response.status);
        }
        return response.json();
      })
      .then((weatherData) => {
        displayWeatherData(weatherData, balloon);
      })
      .catch((error) => {
        console.error("Error fetching weather data:", error);
        document.getElementById("weather-data").innerHTML =
          "Error fetching weather data. Using mock data.";
        const mockWeather = generateMockWeather(latitude, longitude);
        displayWeatherData(mockWeather, balloon);
      });
  } else {
    // Mock weather data for development
    const mockWeather = generateMockWeather(latitude, longitude);
    displayWeatherData(mockWeather, balloon);
  }
}

// Fetch air quality data for a balloon location
function fetchAirQualityData(balloon) {
  const { latitude, longitude } = balloon.location;

  // Skip invalid coordinates
  if (!isValidCoordinate(latitude, longitude)) {
    document.getElementById("air-quality-data").innerHTML =
      "Invalid coordinates - air quality data unavailable";
    return;
  }

  // In production, use a real API call:
  if (AQICN_API_KEY !== "2f33b1aa6f06345c6adb39ea28a3c688e406301a") {
    fetch(
      `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${AQICN_API_KEY}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Air Quality API error: " + response.status);
        }
        return response.json();
      })
      .then((aqiData) => {
        displayAirQualityData(aqiData, balloon);
      })
      .catch((error) => {
        console.error("Error fetching air quality data:", error);
        document.getElementById("air-quality-data").innerHTML =
          "Error fetching air quality data. Using mock data.";
        const mockAQI = generateMockAirQuality(latitude, longitude);
        displayAirQualityData(mockAQI, balloon);
      });
  } else {
    // Mock air quality data for development
    const mockAQI = generateMockAirQuality(latitude, longitude);
    displayAirQualityData(mockAQI, balloon);
  }
}

// Generate mock weather data
function generateMockWeather(lat, lon) {
  const temp = 5 + Math.random() * 25;
  const conditions = ["Clear", "Cloudy", "Partly Cloudy", "Rainy", "Snowy"];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];

  return {
    name: `Location near ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    main: {
      temp: temp,
      pressure: 1000 + Math.random() * 50,
      humidity: 30 + Math.random() * 70,
    },
    wind: {
      speed: Math.random() * 30,
      deg: Math.random() * 360,
    },
    weather: [
      {
        main: condition,
        description: `${condition.toLowerCase()} conditions`,
      },
    ],
  };
}

// Generate mock air quality data
function generateMockAirQuality(lat, lon) {
  const aqi = 20 + Math.floor(Math.random() * 180);
  let level, color;

  if (aqi <= 50) {
    level = "Good";
    color = "green";
  } else if (aqi <= 100) {
    level = "Moderate";
    color = "yellow";
  } else if (aqi <= 150) {
    level = "Unhealthy for Sensitive Groups";
    color = "orange";
  } else {
    level = "Unhealthy";
    color = "red";
  }

  return {
    status: "ok",
    data: {
      aqi: aqi,
      city: {
        name: `Location near ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      },
      iaqi: {
        pm25: { v: Math.random() * 100 },
        pm10: { v: Math.random() * 150 },
        o3: { v: Math.random() * 80 },
        no2: { v: Math.random() * 60 },
        so2: { v: Math.random() * 40 },
        co: { v: Math.random() * 10 },
      },
      level: level,
      color: color,
    },
  };
}

// Display weather data
function displayWeatherData(weatherData, balloon) {
  const weatherDiv = document.getElementById("weather-data");

  if (!weatherData) {
    weatherDiv.innerHTML = "Weather data unavailable";
    return;
  }

  weatherDiv.innerHTML = `
        <div class="data-point"><strong>${weatherData.name}</strong></div>
        <div class="data-point">Ground Temperature: ${weatherData.main.temp.toFixed(
          1
        )}°C</div>
        <div class="data-point">Balloon Temperature: ${balloon.telemetry.temperature.toFixed(
          1
        )}°C</div>
        <div class="data-point">Difference: ${(
          balloon.telemetry.temperature - weatherData.main.temp
        ).toFixed(1)}°C</div>
        <div class="data-point">Ground Pressure: ${weatherData.main.pressure.toFixed(
          1
        )} hPa</div>
        <div class="data-point">Balloon Pressure: ${balloon.telemetry.pressure.toFixed(
          1
        )} hPa</div>
        <div class="data-point">Conditions: ${
          weatherData.weather[0].description
        }</div>
        <div class="data-point">Wind: ${weatherData.wind.speed.toFixed(
          1
        )} m/s at ${weatherData.wind.deg.toFixed(0)}°</div>
        <div class="data-point">Humidity: ${weatherData.main.humidity.toFixed(
          0
        )}%</div>
    `;
}

// Display air quality data
function displayAirQualityData(aqiData, balloon) {
  const airQualityDiv = document.getElementById("air-quality-data");

  if (!aqiData || aqiData.status !== "ok") {
    airQualityDiv.innerHTML = "Air quality data unavailable";
    return;
  }

  const data = aqiData.data;
  const aqi = data.aqi;
  let level, color;

  if (aqi <= 50) {
    level = "Good";
    color = "green";
  } else if (aqi <= 100) {
    level = "Moderate";
    color = "yellow";
  } else if (aqi <= 150) {
    level = "Unhealthy for Sensitive Groups";
    color = "orange";
  } else {
    level = "Unhealthy";
    color = "red";
  }

  airQualityDiv.innerHTML = `
        <div class="data-point"><strong>${data.city.name}</strong></div>
        <div class="data-point">Air Quality Index: <span style="color:${color};font-weight:bold;">${aqi} (${level})</span></div>
        <div class="data-point">PM2.5: ${
          data.iaqi.pm25 ? data.iaqi.pm25.v.toFixed(1) : "N/A"
        } µg/m³</div>
        <div class="data-point">PM10: ${
          data.iaqi.pm10 ? data.iaqi.pm10.v.toFixed(1) : "N/A"
        } µg/m³</div>
        <div class="data-point">Ozone (O₃): ${
          data.iaqi.o3 ? data.iaqi.o3.v.toFixed(1) : "N/A"
        } ppb</div>
        <div class="data-point">Nitrogen Dioxide (NO₂): ${
          data.iaqi.no2 ? data.iaqi.no2.v.toFixed(1) : "N/A"
        } ppb</div>
        <div class="data-point">Balloon Altitude: ${balloon.location.altitude.toFixed(
          0
        )} m</div>
    `;

  // Update the air quality chart
  updateAirQualityChart(data);
}

// Update the air quality chart
function updateAirQualityChart(aqiData) {
  const ctx = document.getElementById("air-quality-chart");

  if (!ctx || !aqiData || !aqiData.iaqi) return;

  // Clear previous chart if it exists
  if (airQualityChart) {
    airQualityChart.destroy();
  }

  // Prepare data
  const pollutants = [];
  const values = [];

  if (aqiData.iaqi.pm25) {
    pollutants.push("PM2.5");
    values.push(aqiData.iaqi.pm25.v);
  }

  if (aqiData.iaqi.pm10) {
    pollutants.push("PM10");
    values.push(aqiData.iaqi.pm10.v);
  }

  if (aqiData.iaqi.o3) {
    pollutants.push("O₃");
    values.push(aqiData.iaqi.o3.v);
  }

  if (aqiData.iaqi.no2) {
    pollutants.push("NO₂");
    values.push(aqiData.iaqi.no2.v);
  }

  if (aqiData.iaqi.so2) {
    pollutants.push("SO₂");
    values.push(aqiData.iaqi.so2.v);
  }

  if (aqiData.iaqi.co) {
    pollutants.push("CO");
    values.push(aqiData.iaqi.co.v);
  }

  // Create a color array based on values
  const colors = values.map((value) => {
    if (value <= 50) return "rgba(0, 128, 0, 0.7)";
    if (value <= 100) return "rgba(255, 255, 0, 0.7)";
    if (value <= 150) return "rgba(255, 165, 0, 0.7)";
    return "rgba(255, 0, 0, 0.7)";
  });

  // Create the chart
  airQualityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: pollutants,
      datasets: [
        {
          label: "Air Quality Parameters",
          data: values,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("0.7", "1")),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Concentration",
          },
        },
      },
    },
  });
}

// Update the charts
function updateCharts() {
  const hourData = balloonData[currentHourIndex];

  if (!hourData || hourData.balloons.length === 0) return;

  updateTemperatureChart(hourData.balloons);
  updateAltitudeChart(hourData.balloons);
}

// Update the temperature chart
function updateTemperatureChart(balloons) {
  const ctx = document.getElementById("temperature-chart");

  if (!ctx) return;

  // Clear previous chart if it exists
  if (temperatureChart) {
    temperatureChart.destroy();
  }

  // Filter out balloons with invalid temperature data
  const validBalloons = balloons.filter(
    (b) =>
      b.telemetry &&
      !isNaN(b.telemetry.temperature) &&
      b.telemetry.temperature !== undefined
  );

  if (validBalloons.length === 0) {
    temperatureChart = null;
    return;
  }

  // Prepare data
  const data = {
    labels: validBalloons.map((b) => b.id),
    datasets: [
      {
        label: "Temperature (°C)",
        data: validBalloons.map((b) => b.telemetry.temperature),
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Create the chart
  temperatureChart = new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

// Update the altitude chart
function updateAltitudeChart(balloons) {
  const ctx = document.getElementById("altitude-chart");

  if (!ctx) return;

  // Clear previous chart if it exists
  if (altitudeChart) {
    altitudeChart.destroy();
  }

  // Filter out balloons with invalid altitude data
  const validBalloons = balloons.filter(
    (b) =>
      b.location &&
      !isNaN(b.location.altitude) &&
      b.location.altitude !== undefined
  );

  if (validBalloons.length === 0) {
    altitudeChart = null;
    return;
  }

  // Prepare data
  const data = {
    labels: validBalloons.map((b) => b.id),
    datasets: [
      {
        label: "Altitude (m)",
        data: validBalloons.map((b) => b.location.altitude),
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Create the chart
  altitudeChart = new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

// Fetch real balloon data from the API
async function fetchRealBalloonData() {
  setStatusMessage("Fetching data from API...", "loading");
  const allData = [];

  // Add a debug element if it doesn't exist
  if (!document.getElementById("debug-panel")) {
    const debugPanel = document.createElement("div");
    debugPanel.id = "debug-panel";
    debugPanel.style.display = "none";
    document.body.appendChild(debugPanel);
  }

  // Function to log debug info
  function logDebug(message) {
    console.log(message);
    const debugPanel = document.getElementById("debug-panel");
    if (debugPanel) {
      debugPanel.innerHTML += `<div>${message}</div>`;
    }
  }

  logDebug("Starting to fetch balloon data...");

  for (let hour = 0; hour <= 23; hour++) {
    try {
      const paddedHour = hour.toString().padStart(2, "0");
      const url = `${API_BASE_URL}${paddedHour}.json`;
      logDebug(`Fetching ${url}...`);

      const response = await fetch(url);

      if (!response.ok) {
        logDebug(
          `Could not fetch data for hour ${hour}, status: ${response.status}`
        );
        continue;
      }

      const text = await response.text();
      logDebug(`Got data for hour ${hour}, length: ${text.length} bytes`);

      let data;
      try {
        data = JSON.parse(text);
        logDebug(`Successfully parsed JSON for hour ${hour}`);
      } catch (parseError) {
        logDebug(`Error parsing JSON for hour ${hour}: ${parseError.message}`);
        logDebug(`Raw data: ${text.substring(0, 200)}...`);
        continue;
      }

      // Log the structure of the data
      logDebug(
        `Data structure for hour ${hour}: ${JSON.stringify(data).substring(
          0,
          300
        )}...`
      );

      // Process the balloon data
      const balloons = processBalloonData(data, hour);
      logDebug(`Processed ${balloons.length} balloons for hour ${hour}`);

      if (balloons.length > 0) {
        logDebug(`First balloon: ${JSON.stringify(balloons[0])}`);
      }

      allData.push({
        hour,
        timestamp: new Date(Date.now() - hour * 3600 * 1000).toISOString(),
        balloons: balloons,
      });
    } catch (error) {
      logDebug(`Error fetching data for hour ${hour}: ${error.message}`);
    }
  }

  logDebug(`Total hours with data: ${allData.length}`);

  // If we couldn't fetch any data, use mock data as fallback
  if (allData.length === 0) {
    logDebug("No data fetched from API, using mock data");
    setStatusMessage(
      "No data available from API, using simulated data",
      "error"
    );
    generateMockData();
    return balloonData;
  }

  return allData;
}

// Process the balloon data from the API
// Process the balloon data from the API
function processBalloonData(data, hour) {
    const balloons = [];
    console.log(`Processing data for hour ${hour}:`, data);
    
    try {
       
        if (Array.isArray(data)) {
            console.log("Processing coordinate arrays format");
            data.forEach((item, index) => {
                if (Array.isArray(item) && item.length >= 2) {
                    const balloon = createBalloonObject(item, `balloon-${index}-${hour}`, hour);
                    if (balloon) balloons.push(balloon);
                }
            });
            console.log(`Processed ${balloons.length} balloons from coordinate arrays`);
        }
    } catch (error) {
        console.error('Error processing balloon data:', error);
    }
    
    // If we still don't have any balloons, create synthetic data for this hour
    if (balloons.length === 0) {
        console.log(`No balloons found for hour ${hour}, creating synthetic data`);
        // Create 3-5 synthetic balloons
        const balloonCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < balloonCount; i++) {
            const baseLatitude = (Math.random() * 160) - 80;
            const baseLongitude = (Math.random() * 360) - 180;
            
            balloons.push({
                id: `synthetic-balloon-${i}-${hour}`,
                timestamp: new Date(Date.now() - hour * 3600 * 1000).toISOString(),
                location: {
                    latitude: baseLatitude + (Math.random() * 2 - 1) * (hour / 24),
                    longitude: baseLongitude + (Math.random() * 2 - 1) * (hour / 24),
                    altitude: 15000 + Math.random() * 10000 - (hour * 200)
                },
                telemetry: {
                    temperature: -50 + Math.random() * 30 + (hour * 0.5),
                    pressure: 50 + Math.random() * 20 - (hour * 0.3),
                    battery: 100 - (hour * 0.7) - (Math.random() * 5),
                    signal_strength: 100 - (hour * 0.5) - (Math.random() * 10)
                },
                synthetic: true
            });
        }
        
        console.log(`Created ${balloons.length} synthetic balloons for hour ${hour}`);
    }
    
    console.log(`Returning ${balloons.length} balloons for hour ${hour}`);
    return balloons;
}


// Create a balloon object from coordinate array format [lat, lng, alt]
function createBalloonObject(item, defaultId, hour) {
    try {
        console.log(`Creating balloon object from:`, item);
        
        const id = defaultId;
        const timestamp = new Date(Date.now() - hour * 3600 * 1000).toISOString();
        
        // Handle coordinate arrays directly [lat, lng, altitude]
        if (Array.isArray(item) && item.length >= 2) {
            const latitude = Number(item[0]);
            const longitude = Number(item[1]);
            const altitude = item.length >= 3 ? Number(item[2]) : 15000 + Math.random() * 10000;
            
            console.log(`Extracted from coordinate array: [${latitude}, ${longitude}, ${altitude}]`);
            
            // Validate coordinates
            if (!isValidCoordinate(latitude, longitude)) {
                console.warn(`Invalid coordinates for ${id}: ${latitude}, ${longitude}`);
                return null;
            }
            
            // Create balloon object
            const balloon = {
                id,
                timestamp,
                location: {
                    latitude,
                    longitude,
                    altitude
                },
                telemetry: {
                    temperature: -50 + Math.random() * 30 + (hour * 0.5),
                    pressure: 50 + Math.random() * 20 - (hour * 0.3),
                    battery: 100 - (hour * 0.7) - (Math.random() * 5),
                    signal_strength: 100 - (hour * 0.5) - (Math.random() * 10)
                }
            };
            
            console.log(`Created balloon: ${id} at ${latitude}, ${longitude}, ${altitude}m`);
            return balloon;
        }
        
        return null;
    } catch (error) {
        console.error('Error creating balloon object:', error);
        return null;
    }
}

// Extract a numeric value from an object using various possible property paths
function extractNumericValue(obj, paths) {
  for (const path of paths) {
    const value = getNestedValue(obj, path);
    if (value !== undefined && !isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

// Get a nested value from an object using a dot-separated path
function getNestedValue(obj, path) {
  const parts = path.split(".");
  let value = obj;

  for (const part of parts) {
    if (value === undefined || value === null) return undefined;
    value = value[part];
  }

  return value;
}
