// // Berne coordinates:
// const centerLat = 46.94376850207415;
// const centerLng = 7.448744419286967;

// Geneva coordinates:
const centerLat = 46.204519704052466;
const centerLng = 6.138575100420967;

const map = L.map('map').setView([centerLat, centerLng], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const legendContainer = document.getElementById("legend-container");
const legend = document.getElementById("legend");
const isochronesLayer = L.layerGroup();

const computeIsochrones = async () => {
    const displayMode = 'contour_line';
    const params = 'departure_stop_id=8587418&departure_date=2024-02-03&departure_time=13:25&time_limit=240&isochrone_interval=40&display_mode=' + displayMode;
    const response = await fetch('http://localhost:8100/isochrones?' + params);
    const isochrones = await response.json();

    const coord = isochrones.departure_stop_coord;
    map.setView([coord.x, coord.y], 11);
    L.marker([coord.x, coord.y]).addTo(map);

    const colors = [
        '#36AB68',
        '#91CF60',
        '#D9EF8B',
        '#FEE08B',
        '#FC8D59',
        '#E2453C',
    ].slice(0, isochrones.items.length).reverse();

    for (const [i, isochrone] of isochrones.items.reverse().entries()) {
        const color = colors[i];

        for (const polygon of isochrone.polygons) {
            let latlngs = [];

            for (const point of polygon) {
                latlngs.push([point.x, point.y]);
            }

            L.polygon(latlngs, {
                color: displayMode === 'contour_line' ? 'black' : 'transparent',
                weight: 1.0,
                fillColor: color,
                fillOpacity: 1.0,
            }).addTo(isochronesLayer);
        }

        legend.innerHTML = `
            <div class="legend-entry" style="background-color: ${color};">
                ${isochrone.time_limit} min.
            </div>
            ` + legend.innerHTML;
    }

    legendContainer.style.display = 'block';

    isochronesLayer.addTo(map);
    isochronesLayer.getPane().style.opacity = 0.6;
};
setTimeout(() => {
    computeIsochrones();
}, 500);

const formContainerOuter = document.getElementById("form-container-outer");
const toggleFormDisplay = document.getElementById("toggle-form-display");

toggleFormDisplay.addEventListener("click", () => {
    if (formContainerOuter.classList.contains("hide-form")) {
        formContainerOuter.classList.remove("hide-form");
    } else {
        formContainerOuter.classList.add("hide-form");
    }
});
