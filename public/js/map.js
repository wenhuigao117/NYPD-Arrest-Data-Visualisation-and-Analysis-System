(function () {
    // Check if map element exists first
    var mapElement = document.getElementById("map");
    
    if (!mapElement) {
        // No map element on this page, exit silently
        return;
    }
    
    var lat = parseFloat(mapElement.dataset.lat);
    var lon = parseFloat(mapElement.dataset.lon);

    if (!isNaN(lat) && !isNaN(lon)) {
        var map = L.map("map").setView([lat, lon], 14);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19
        }).addTo(map);

        L.marker([lat, lon]).addTo(map)
            .bindPopup("Arrest Location")
            .openPopup();
    } else {
        mapElement.innerHTML =
            "<p>No location data available for this arrest.</p>";
    }
})();