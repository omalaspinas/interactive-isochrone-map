// Geneva coordinates:
const centerLat = 46.20180915690188;
const centerLng = 6.144409565708289;

const map = L.map('map').setView([centerLat, centerLng], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const legendContainerEl = document.getElementById("legend-container");
const legendEl = document.getElementById("legend");
const isochronesLayer = L.layerGroup();

const showIsochrones = async () => {
    const response = await fetch("http://localhost:8100/isochrones");
    const isochrones = await response.json();

    const coor = isochrones.departure_stop_coordinates;
    map.setView([coor.x, coor.y]);
    L.marker([coor.x, coor.y]).addTo(map);

    const colors = [
        [41, 80, 181],
        [45, 127, 185],
        [65, 183, 197],
        [127, 206, 187],
        [199, 234, 180],
        [255, 255, 203],
    ];

    for (const [i, isochrone] of isochrones.items.reverse().entries()) {
        // const aaa = (isochrones.items.length - i) / isochrones.items.length;
        let color = colors[i];
        color = "rgb(" + color.join(",") + ")";

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
            <div class="legend-entry" style="background-color: ${color}; color: ${i < 3 ? 'white' : 'black'}">
                ${isochrone.time_limit} min.
            </div>
            ` + legendEl.innerHTML;
    }

    legendContainerEl.style.display = 'block';

    isochronesLayer.addTo(map);
    isochronesLayer.getPane().style.opacity = 0.6;
};
showIsochrones();
