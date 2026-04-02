/**
 * UPC RideConnect — Carte Leaflet (généré pour index.html)
 * Données trajets : window.TRIPS_DATA (défini dans index.html)
 */
(function () {
  'use strict';

  var CAMPUS = { lat: -4.3222, lon: 15.3125 };
  var PRICE_PER_KM = 300;

  var NEIGHBORHOODS = [
    { name: 'Lingwala', lat: -4.3167, lon: 15.3 },
    { name: 'Barumbu', lat: -4.32, lon: 15.31 },
    { name: 'Kinshasa (commune)', lat: -4.325, lon: 15.315 },
    { name: 'Gombe', lat: -4.31, lon: 15.29 },
    { name: 'Ngaliema', lat: -4.325, lon: 15.25 },
    { name: 'Kalamu', lat: -4.335, lon: 15.315 },
    { name: 'Lemba', lat: -4.35, lon: 15.33 },
    { name: 'Limete', lat: -4.34, lon: 15.335 },
    { name: 'Makala', lat: -4.36, lon: 15.3 },
    { name: 'Ndjili', lat: -4.375, lon: 15.37 },
    { name: 'Masina', lat: -4.36, lon: 15.38 },
    { name: 'Kimbanseke', lat: -4.39, lon: 15.35 },
  ];

  var map = null;
  var routes = null;
  var markers = null;
  var driverMarker = null;
  var trackTimer = null;
  var mapInitStarted = false;

  function trips() {
    return window.TRIPS_DATA && Array.isArray(window.TRIPS_DATA) ? window.TRIPS_DATA : [];
  }

  function toRad(x) {
    return (x * Math.PI) / 180;
  }

  function distanceKm(a, b) {
    var R = 6371;
    var dLat = toRad(b.lat - a.lat);
    var dLon = toRad(b.lon - a.lon);
    var x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
  }

  function pricing(fromName) {
    var hood = NEIGHBORHOODS.find(function (n) {
      return (
        n.name.toLowerCase().includes(String(fromName).toLowerCase()) ||
        String(fromName).toLowerCase().includes(n.name.toLowerCase())
      );
    });
    if (!hood) return { km: 0, fc: 0 };
    var km = distanceKm({ lat: hood.lat, lon: hood.lon }, { lat: CAMPUS.lat, lon: CAMPUS.lon });
    return { km: km, fc: Math.round(km * PRICE_PER_KM) };
  }

  function hoodForTrip(trip) {
    return NEIGHBORHOODS.find(function (n) {
      return (
        n.name.toLowerCase().includes(String(trip.from).toLowerCase()) ||
        String(trip.from).toLowerCase().includes(n.name.toLowerCase())
      );
    });
  }

  function divIcon(color, size) {
    return L.divIcon({
      className: 'upc-mkr',
      html:
        '<div style="width:' +
        size +
        'px;height:' +
        size +
        'px;background:' +
        color +
        ';border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function stopTrack() {
    if (trackTimer) {
      clearInterval(trackTimer);
      trackTimer = null;
    }
    if (driverMarker && map) {
      map.removeLayer(driverMarker);
      driverMarker = null;
    }
  }

  function showAllTrips() {
    if (!map || !routes || !markers) return;
    stopTrack();

    markers.clearLayers();
    routes.clearLayers();

    var mti = document.getElementById('map-trip-info');
    if (mti) mti.classList.add('hidden');

    NEIGHBORHOODS.forEach(function (n) {
      L.marker([n.lat, n.lon], { icon: divIcon('#7c3aed', 14) })
        .bindPopup('<strong style="color:#5b21b6">' + n.name + '</strong><br><span style="font-size:11px">Zone départ</span>')
        .addTo(markers);
    });

    L.marker([CAMPUS.lat, CAMPUS.lon], { icon: divIcon('#10b981', 18) })
      .bindPopup('<strong style="color:#047857">Campus UPC</strong>')
      .addTo(markers);

    trips().forEach(function (trip) {
      var h = hoodForTrip(trip);
      if (!h) return;
      L.polyline(
        [
          [h.lat, h.lon],
          [CAMPUS.lat, CAMPUS.lon],
        ],
        { color: '#7c3aed', weight: 2, opacity: 0.45, dashArray: '6,8' }
      ).addTo(routes);

      var p = pricing(trip.from);
      var popup =
        '<div style="min-width:150px;font-family:inherit">' +
        '<strong style="color:#5b21b6">' +
        trip.driver +
        '</strong><br>' +
        trip.from +
        ' → Campus<br>' +
        '<span style="font-size:11px">' +
        trip.time +
        ' · ' +
        trip.seats +
        ' pl.</span><br>' +
        '<span style="font-size:11px;color:#6b7280">' +
        p.km.toFixed(1) +
        ' km · ' +
        p.fc.toLocaleString() +
        ' FC</span><br>' +
        '<button type="button" onclick="window.selectTripOnMap(' +
        trip.id +
        ')" style="margin-top:6px;background:#7c3aed;color:#fff;border:none;padding:4px 10px;border-radius:8px;font-size:11px;cursor:pointer">Voir</button>' +
        '</div>';

      L.circleMarker([h.lat, h.lon], {
        radius: 9,
        fillColor: '#7c3aed',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.85,
      })
        .bindPopup(popup)
        .addTo(markers);
    });

    var bounds = NEIGHBORHOODS.map(function (n) {
      return [n.lat, n.lon];
    });
    bounds.push([CAMPUS.lat, CAMPUS.lon]);
    map.fitBounds(bounds, { padding: [28, 28] });
  }

  function selectTripOnMap(tripId) {
    var id = Number(tripId);
    var trip = trips().find(function (t) {
      return Number(t.id) === id;
    });
    if (!trip || !map || !routes) return;

    var h = hoodForTrip(trip);
    if (!h) return;

    var p = pricing(trip.from);
    var info = document.getElementById('map-trip-info');
    if (info) info.classList.remove('hidden');
    var el;
    el = document.getElementById('map-trip-driver');
    if (el) el.textContent = 'Conducteur : ' + trip.driver;
    el = document.getElementById('map-trip-from');
    if (el) el.textContent = trip.from + ' → Campus UPC · ' + trip.time;
    el = document.getElementById('map-trip-eta');
    if (el)
      el.textContent =
        p.fc.toLocaleString() + ' FC · ' + p.km.toFixed(1) + ' km · ' + trip.seats + ' place(s)';
    el = document.getElementById('btn-map-track');
    if (el) el.setAttribute('data-trip-id', String(id));

    el = document.getElementById('map-price-line');
    if (el)
      el.innerHTML =
        p.fc.toLocaleString() + ' <span style="font-size:0.85rem;font-weight:500">FC</span>';
    el = document.getElementById('map-price-detail');
    if (el) el.textContent = p.km.toFixed(1) + ' km × ' + PRICE_PER_KM + ' FC/km';

    routes.clearLayers();
    L.polyline(
      [
        [h.lat, h.lon],
        [CAMPUS.lat, CAMPUS.lon],
      ],
      { color: '#6d28d9', weight: 4, opacity: 0.85, dashArray: '8,10' }
    ).addTo(routes);
    map.fitBounds(
      [
        [h.lat, h.lon],
        [CAMPUS.lat, CAMPUS.lon],
      ],
      { padding: [48, 48] }
    );
  }

  function simulateTrack(tripId) {
    stopTrack();
    var id = Number(tripId);
    var trip = trips().find(function (t) {
      return Number(t.id) === id;
    });
    var h = trip ? hoodForTrip(trip) : null;
    if (!trip || !h) return;

    var t = 0;
    function step() {
      t += 0.04;
      if (t > 1) t = 0;
      var lat = h.lat + (CAMPUS.lat - h.lat) * t;
      var lon = h.lon + (CAMPUS.lon - h.lon) * t;
      if (driverMarker) map.removeLayer(driverMarker);
      driverMarker = L.marker([lat, lon], { icon: divIcon('#ef4444', 16) })
        .bindPopup('<strong>Conducteur</strong><br>' + trip.driver)
        .addTo(map);
      var eta = document.getElementById('map-trip-eta');
      if (eta) eta.textContent = 'Démo · ~' + Math.ceil((1 - t) * 25) + ' min';
      map.panTo([lat, lon]);
    }
    step();
    trackTimer = setInterval(step, 2500);
  }

  function init() {
    if (mapInitStarted || map || typeof L === 'undefined' || !L.map) return;
    var el = document.getElementById('map');
    if (!el) return;
    mapInitStarted = true;

    try {
      map = L.map('map', { zoomControl: true }).setView([CAMPUS.lat, CAMPUS.lon], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      routes = L.layerGroup().addTo(map);
      markers = L.layerGroup().addTo(map);

      showAllTrips();
    } catch (e) {
      console.error('Carte UPC:', e);
      map = null;
      mapInitStarted = false;
      return;
    }

    function invalidate() {
      if (map) map.invalidateSize();
    }
    [0, 200, 600].forEach(function (ms) {
      setTimeout(invalidate, ms);
    });
    window.addEventListener('load', invalidate);

    var b1 = document.getElementById('btn-map-all');
    var b2 = document.getElementById('btn-map-campus');
    var b3 = document.getElementById('btn-map-track');
    if (b1) b1.addEventListener('click', showAllTrips);
    if (b2)
      b2.addEventListener('click', function () {
        if (map) map.flyTo([CAMPUS.lat, CAMPUS.lon], 15);
      });
    if (b3)
      b3.addEventListener('click', function () {
        var tid = this.getAttribute('data-trip-id');
        if (tid) simulateTrack(parseInt(tid, 10));
      });
  }

  window.selectTripOnMap = selectTripOnMap;
  window.refreshMapTrips = showAllTrips;

  function boot() {
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', boot);
})();
