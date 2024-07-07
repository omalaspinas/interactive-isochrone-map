const legendContainer = document.getElementById("legend-container");
const legend = document.getElementById("legend");
const chooseOriginPoint = document.getElementById("choose-origin-point");
const originPointCoordElem = document.getElementById('origin-point-coord');

let isChoosingOriginPoint = false;
let originPointMarker = null;

// Form:
let originPointCoord = null;
const departureAtInput = document.getElementById("departure-at");
const timeLimitInput = document.getElementById("time-limit");
const isochroneIntervalInput = document.getElementById("isochrone-interval");
const displayModeCirclesInput = document.getElementById("display-mode-circles");
const displayModeContourLineInput = document.getElementById("display-mode-contour-line");
const submitButton = document.getElementById('submit-button');

// Geneva coordinates:
const centerLat = 46.204519704052466;
const centerLng = 6.138575100420967;

var customIcon = L.icon({
    iconUrl: './assets/images/marker.png',
    iconSize: [32, 38],
    iconAnchor: [16, 38],
});

const map = L.map('map').setView([centerLat, centerLng], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let isochronesLayer = null;

const getDisplayMode = () => {
    if (displayModeCirclesInput.checked) {
        return 'circles';
    }

    if (displayModeContourLineInput.checked) {
        return 'contour_line';
    }

    return '';
};

const computeIsochrones = async () => {
    clearPreviousIsochroneMap();

    const departureDate = departureAtInput.value.split('T')[0];
    const departureTime = departureAtInput.value.split('T')[1];
    const timeLimit = timeLimitInput.value;
    const isochroneInterval = isochroneIntervalInput.value;
    const displayMode = getDisplayMode();

    const params = {
        origin_point_latitude: originPointCoord[0],
        origin_point_longitude: originPointCoord[1],
        departure_date: departureDate,
        departure_time: departureTime,
        time_limit: timeLimit,
        isochrone_interval: isochroneInterval,
        display_mode: displayMode,
    };

    const response = await fetch('http://localhost:8100/isochrones?' + new URLSearchParams(params).toString());
    const isochrones = await response.json();

    map.setView([isochrones.departure_stop_coord.x, isochrones.departure_stop_coord.y], 11);

    const colors = [
        '#36AB68',
        '#91CF60',
        '#D7FF67',
        '#FFD767',
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

const clearPreviousIsochroneMap = () => {
    legend.innerHTML = '';
    legendContainer.style.display = 'none';

    if (isochronesLayer !== null) {
        isochronesLayer.remove();
    }

    isochronesLayer = L.layerGroup();
};

const formContainerOuter = document.getElementById("form-container-outer");
const toggleFormDisplay = document.getElementById("toggle-form-display");

toggleFormDisplay.addEventListener("click", () => {
    if (formContainerOuter.classList.contains("hide-form")) {
        formContainerOuter.classList.remove("hide-form");
    } else {
        formContainerOuter.classList.add("hide-form");
    }
});

chooseOriginPoint.addEventListener("click", () => {
    if (chooseOriginPoint.classList.contains("choosing-origin-point")) {
        chooseOriginPoint.classList.remove("choosing-origin-point");
        chooseOriginPoint.innerHTML = `<img src="./assets/images/origin-point.png" width="15"> Changer de point d'origine`;
        isChoosingOriginPoint = false;
    } else {
        chooseOriginPoint.classList.add("choosing-origin-point");
        chooseOriginPoint.innerHTML = `Annuler`;
        isChoosingOriginPoint = true;
    }
});

map.on('click', (e) => {
    if (!isChoosingOriginPoint) {
        return;
    }

    if (originPointMarker !== null) {
        originPointMarker.remove();
        originPointMarker = null;
    }

    originPointCoord = [e.latlng.lat, e.latlng.lng]
    originPointMarker = L.marker([originPointCoord[0], originPointCoord[1]], { icon: customIcon }).addTo(map);

    chooseOriginPoint.classList.remove("choosing-origin-point");
    chooseOriginPoint.innerHTML = `<img src="./assets/images/origin-point.png" width="15"> Changer de point d'origine`;
    originPointCoordElem.innerHTML = `${originPointCoord[0].toFixed(8)} ${originPointCoord[1].toFixed(8)}`;
    isChoosingOriginPoint = false;
});

const updateIsochroneIntervalOptions = () => {
    isochroneIntervalInput.innerHTML = '';

    for (let i = 0; i < 6; i++) {
        if (timeLimitInput.value % (i + 1) == 0) {
            const value = timeLimitInput.value / (i + 1);
            isochroneIntervalInput.innerHTML += `
                <option value="${value}">${value} minutes, ${i + 1} isochrone${i + 1 > 1 ? 's' : ''}</option>
            `;
            isochroneIntervalInput.value = value;
        }
    }
};

timeLimitInput.addEventListener('change', () => {
    if (timeLimitInput.value < 10) {
        timeLimitInput.value = 10;
    } else if (timeLimitInput.value > 480) {
        timeLimitInput.value = 480;
    }

    updateIsochroneIntervalOptions();
});

submitButton.addEventListener('click', () => {
    submitButton.disabled = true;
    computeIsochrones();
    submitButton.disabled = false;
});

updateIsochroneIntervalOptions();
