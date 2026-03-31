/* ═══════════════════════════════════════════
   UPC RideConnect — Carte Leaflet.js
   ═══════════════════════════════════════════ */

// Campus UPC coordinates
var CAMPUS_LAT = -4.3222;
var CAMPUS_LON = 15.3125;

// Neighborhoods for demo markers
var NEIGHBORHOODS = [
  { name: 'Lingwala',           lat: -4.3167, lon: 15.3000 },
  { name: 'Barumbu',            lat: -4.3200, lon: 15.3100 },
  { name: 'Kinshasa (commune)', lat: -4.3250, lon: 15.3150 },
  { name: 'Gombe',              lat: -4.3100, lon: 15.2900 },
  { name: 'Ngaliema',           lat: -4.3250, lon: 15.2500 },
  { name: 'Kalamu',             lat: -4.3350, lon: 15.3150 },
  { name: 'Lemba',              lat: -4.3500, lon: 15.3300 },
  { name: 'Limete',             lat: -4.3400, lon: 15.3350 },
  { name: 'Makala',             lat: -4.3600, lon: 15.3000 },
  { name: 'Ndjili',             lat: -4.3750, lon: 15.3700 },
  { name: 'Masina',             lat: -4.3600, lon: 15.3800 },
  { name: 'Kimbanseke',         lat: -4.3900, lon: 15.3500 },
];

var map = null;
var markersLayer = null;
var routeLayer = null;
var driverMarker = null;
var trackingInterval = null;

// Custom icons
function createIcon(color, size) {
  return L.divIcon({
    className: 'custom-marker',
    html: '<div style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)]
  });
}

var iconDeparture = createIcon('#7c3aed', 16);
var iconMeeting = createIcon('#f59e0b', 14);
var iconCampus = createIcon('#10b981', 20);
var iconDriver = createIcon('#ef4444', 18);

// Initialize map
function initMap() {
  if (map) return;

  var mapEl = document.getElementById('map');
  if (!mapEl) return;

  map = L.map('map', {
    zoomControl: false
  }).setView([CAMPUS_LAT, CAMPUS_LON], 13);

  // Add zoom control to top-right
  L.control.zoom({ position: 'topright' }).addTo(map);

  // Tile layer — OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);

  // Add campus marker (always visible)
  L.marker([CAMPUS_LAT, CAMPUS_LON], { icon: iconCampus })
    .bindPopup(
      '<div style="text-align:center;font-family:DM Sans,sans-serif;">' +
      '<strong style="color:#10b981;">&#127891; Campus UPC</strong><br>' +
      '<span style="font-size:11px;color:#666;">Universite Protestante au Congo</span><br>' +
      '<span style="font-size:10px;color:#999;">-4.3222, 15.3125</span>' +
      '</div>'
    )
    .addTo(map);

  // Load all trips and neighborhoods on map
  showAllTrips();

  // Button events
  document.getElementById('btn-map-all').addEventListener('click', showAllTrips);
  document.getElementById('btn-map-campus').addEventListener('click', function() {
    map.flyTo([CAMPUS_LAT, CAMPUS_LON], 15, { duration: 1 });
  });
  document.getElementById('btn-map-track').addEventListener('click', function() {
    var tripId = this.getAttribute('data-trip-id');
    if (tripId) startTracking(parseInt(tripId));
  });
}

// Show all trips as markers on the map
async function showAllTrips() {
  stopTracking();
  markersLayer.clearLayers();
  routeLayer.clearLayers();
  document.getElementById('map-trip-info').classList.add('hidden');

  // Add neighborhood markers
  NEIGHBORHOODS.forEach(function(n) {
    var marker = L.marker([n.lat, n.lon], { icon: iconDeparture })
      .bindPopup(
        '<div style="font-family:DM Sans,sans-serif;">' +
        '<strong style="color:#7c3aed;">' + n.name + '</strong><br>' +
        '<span style="font-size:11px;color:#666;">Zone de depart</span>' +
        '</div>'
      );
    markersLayer.addLayer(marker);
  });

  // Try loading trips from API
  var res = await apiCall('GET', '/trips');
  var trips = (res && res.trips) ? res.trips : TRIPS_DATA;

  trips.forEach(function(trip) {
    var hood = NEIGHBORHOODS.find(function(n) {
      return n.name.toLowerCase().includes(trip.from.toLowerCase()) ||
             trip.from.toLowerCase().includes(n.name.toLowerCase());
    });
    if (!hood) return;

    // Draw dashed line from neighborhood to campus
    var line = L.polyline(
      [[hood.lat, hood.lon], [CAMPUS_LAT, CAMPUS_LON]],
      { color: '#7c3aed', weight: 2, dashArray: '6,8', opacity: 0.4 }
    );
    routeLayer.addLayer(line);

    // Clickable marker for each trip
    var popup = L.popup().setContent(
      '<div style="font-family:DM Sans,sans-serif;min-width:160px;">' +
      '<strong style="color:#7c3aed;">' + trip.driver + '</strong><br>' +
      '<span style="font-size:11px;">' + trip.from + ' &rarr; Campus UPC</span><br>' +
      '<span style="font-size:11px;">&#128337; ' + trip.time + ' &middot; ' + trip.seats + ' place(s)</span><br>' +
      '<span style="font-size:12px;font-weight:bold;color:#7c3aed;">' + trip.price.toLocaleString() + ' FC</span><br>' +
      '<button onclick="selectTripOnMap(' + trip.id + ')" style="margin-top:6px;background:#7c3aed;color:white;border:none;padding:4px 12px;border-radius:8px;font-size:11px;cursor:pointer;">Voir le trajet</button>' +
      '</div>'
    );

    var tripMarker = L.circleMarker([hood.lat, hood.lon], {
      radius: 8,
      fillColor: '#7c3aed',
      color: '#fff',
      weight: 2,
      fillOpacity: 0.8
    }).bindPopup(popup);

    markersLayer.addLayer(tripMarker);
  });

  // Fit bounds to show all markers
  var allCoords = NEIGHBORHOODS.map(function(n) { return [n.lat, n.lon]; });
  allCoords.push([CAMPUS_LAT, CAMPUS_LON]);
  map.fitBounds(allCoords, { padding: [30, 30] });
}

// Select a trip and show its info in sidebar
function selectTripOnMap(tripId) {
  var trips = TRIPS_DATA;
  var trip = trips.find(function(t) { return t.id === tripId; });
  if (!trip) return;

  var infoPanel = document.getElementById('map-trip-info');
  infoPanel.classList.remove('hidden');
  document.getElementById('map-trip-driver').textContent = '&#128100; ' + trip.driver;
  document.getElementById('map-trip-driver').innerHTML = '&#128100; ' + trip.driver;
  document.getElementById('map-trip-from').innerHTML = '&#128205; ' + trip.from + ' &rarr; Campus UPC &middot; ' + trip.time;
  document.getElementById('map-trip-eta').innerHTML = '&#128176; ' + trip.price.toLocaleString() + ' FC &middot; ' + trip.seats + ' place(s)';
  document.getElementById('btn-map-track').setAttribute('data-trip-id', tripId);

  // Highlight route
  routeLayer.clearLayers();
  var hood = NEIGHBORHOODS.find(function(n) {
    return n.name.toLowerCase().includes(trip.from.toLowerCase()) ||
           trip.from.toLowerCase().includes(n.name.toLowerCase());
  });
  if (hood) {
    var routeLine = L.polyline(
      [[hood.lat, hood.lon], [CAMPUS_LAT, CAMPUS_LON]],
      { color: '#7c3aed', weight: 4, dashArray: '8,10', opacity: 0.8 }
    );
    routeLayer.addLayer(routeLine);
    map.fitBounds([[hood.lat, hood.lon], [CAMPUS_LAT, CAMPUS_LON]], { padding: [50, 50] });
  }
}

// Start real-time tracking for a trip
async function startTracking(tripId) {
  stopTracking();

  // Try API first
  var res = await apiCall('GET', '/trips/' + tripId + '/location');

  if (res) {
    updateTrackingUI(res);
  } else {
    // Demo mode: simulate driver position
    simulateDemoTracking(tripId);
  }

  // Poll every 10 seconds
  trackingInterval = setInterval(async function() {
    var data = await apiCall('GET', '/trips/' + tripId + '/location');
    if (data) {
      updateTrackingUI(data);
    }
  }, 10000);
}

function updateTrackingUI(data) {
  // Remove old driver marker
  if (driverMarker) {
    map.removeLayer(driverMarker);
  }

  // Add driver marker
  driverMarker = L.marker(
    [data.current.latitude, data.current.longitude],
    { icon: iconDriver }
  ).bindPopup(
    '<div style="font-family:DM Sans,sans-serif;">' +
    '<strong style="color:#ef4444;">&#128663; ' + data.driver + '</strong><br>' +
    '<span style="font-size:11px;">' + data.current.eta + '</span><br>' +
    '<span style="font-size:10px;color:#666;">Progression: ' + Math.round(data.current.progress * 100) + '%</span>' +
    '</div>'
  ).addTo(map);

  // Update route line
  routeLayer.clearLayers();

  var coords = [[data.departure.latitude, data.departure.longitude]];
  if (data.meetingPoint) {
    coords.push([data.meetingPoint.latitude, data.meetingPoint.longitude]);

    // Add meeting point marker
    var mpMarker = L.marker([data.meetingPoint.latitude, data.meetingPoint.longitude], { icon: iconMeeting })
      .bindPopup('<strong style="color:#f59e0b;">&#128204; ' + data.meetingPoint.name + '</strong>');
    routeLayer.addLayer(mpMarker);
  }
  coords.push([data.destination.latitude, data.destination.longitude]);

  // Full planned route (dashed)
  var planned = L.polyline(coords, { color: '#7c3aed', weight: 3, dashArray: '6,8', opacity: 0.4 });
  routeLayer.addLayer(planned);

  // Completed route (solid)
  var completed = L.polyline(
    [coords[0], [data.current.latitude, data.current.longitude]],
    { color: '#7c3aed', weight: 4, opacity: 0.8 }
  );
  routeLayer.addLayer(completed);

  // Update sidebar
  document.getElementById('map-trip-eta').innerHTML = '&#9201; ' + data.current.eta;

  // Center on driver
  map.panTo([data.current.latitude, data.current.longitude]);
}

// Demo tracking simulation
function simulateDemoTracking(tripId) {
  var trip = TRIPS_DATA.find(function(t) { return t.id === tripId; });
  if (!trip) return;

  var hood = NEIGHBORHOODS.find(function(n) {
    return n.name.toLowerCase().includes(trip.from.toLowerCase()) ||
           trip.from.toLowerCase().includes(n.name.toLowerCase());
  });
  if (!hood) return;

  var progress = 0;
  var startLat = hood.lat;
  var startLon = hood.lon;

  function tick() {
    progress += 0.03;
    if (progress > 1) progress = 0;

    var lat = startLat + (CAMPUS_LAT - startLat) * progress;
    var lon = startLon + (CAMPUS_LON - startLon) * progress;
    lat += (Math.random() - 0.5) * 0.0004;
    lon += (Math.random() - 0.5) * 0.0004;

    var remaining = Math.ceil(30 * (1 - progress));

    updateTrackingUI({
      driver: trip.driver,
      departure: { name: trip.from, latitude: startLat, longitude: startLon },
      destination: { name: 'Campus UPC', latitude: CAMPUS_LAT, longitude: CAMPUS_LON },
      meetingPoint: null,
      current: {
        latitude: lat,
        longitude: lon,
        progress: progress,
        status: 'en_route',
        eta: remaining + ' min restantes'
      }
    });
  }

  tick();
  trackingInterval = setInterval(tick, 3000);
}

function stopTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  if (driverMarker) {
    map.removeLayer(driverMarker);
    driverMarker = null;
  }
}

// Make selectTripOnMap available globally (called from popup onclick)
window.selectTripOnMap = selectTripOnMap;

// Initialize map when section is visible (lazy load)
var mapObserver = new IntersectionObserver(function(entries) {
  if (entries[0].isIntersecting) {
    initMap();
    mapObserver.disconnect();
  }
}, { threshold: 0.1 });

var mapSection = document.getElementById('map-section');
if (mapSection) mapObserver.observe(mapSection);
