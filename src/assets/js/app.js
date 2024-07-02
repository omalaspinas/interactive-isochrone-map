// Berne coordinates:
const centerLat = 46.94376850207415;
const centerLng = 7.448744419286967;

const map = L.map('map').setView([centerLat, centerLng], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const legendContainerEl = document.getElementById("legend-container");
const legendEl = document.getElementById("legend");
const isochronesLayer = L.layerGroup();

const computeIsochrones = async () => {
    const response = await fetch("http://localhost:8100/isochrones");
    const isochrones = await response.json();

    const coor = isochrones.departure_stop_coordinates;
    map.setView([coor.x, coor.y], 11);
    L.marker([coor.x, coor.y]).addTo(map);

    const colors = [
        '#199851',
        '#90CF5D',
        '#DAEF8A',
        '#FDE28B',
        '#FD8E59',
        '#D83025',
    ].slice(0, isochrones.items.length).reverse();

    for (const [i, isochrone] of isochrones.items.reverse().entries()) {
        const color = colors[i];

        for (const polygon of isochrone.polygons) {
            let latlngs = [];

            for (const point of polygon) {
                latlngs.push([point.x, point.y]);
            }

            L.polygon(latlngs, {
                color: 'transparent',
                fillColor: color,
                fillOpacity: 1.0,
            }).addTo(isochronesLayer);
        }

        legendEl.innerHTML = `
            <div class="legend-entry" style="background-color: ${color};">
                ${isochrone.time_limit} min.
            </div>
            ` + legendEl.innerHTML;
    }

    legendContainerEl.style.display = 'block';

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
        // toggleFormDisplay.innerHTML = "<<";
    } else {
        formContainerOuter.classList.add("hide-form");
        // toggleFormDisplay.innerHTML = ">>";
    }
});
