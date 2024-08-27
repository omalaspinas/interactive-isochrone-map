const mapElem = document.getElementById('map');

const legendContainer = document.getElementById("legend-container");
const legend = document.getElementById("legend");

// Form.
const formContainerOuter = document.getElementById("form-container-outer");
const toggleFormDisplay = document.getElementById("toggle-form-display");
const formElem = document.getElementById('form');
const selectOriginPointElem = document.getElementById("select-origin-point");
const originPointCoordValueElem = document.getElementById('origin-point-coord-value');
const departureAtInput = document.getElementById("departure-at");
const timeLimitInput = document.getElementById("time-limit");
const isochroneIntervalInput = document.getElementById("isochrone-interval");
const displayModeCirclesInput = document.getElementById("display-mode-circles");
const displayModeContourLineInput = document.getElementById("display-mode-contour-line");
const submitButton = document.getElementById('submit-button');

let isSelectingOriginPoint = false;
let originPointMarker = null;
let isochronesLayer = null;
let originPointCoord = null;
let isFormSubmitted = false;
let abortController = new AbortController();

const customMarker = L.icon({
    iconUrl: './assets/images/marker.png',
    iconSize: [32, 38],
    iconAnchor: [16, 38],
});

// Geneva coordinates:
const centerLat = 46.204519704052466;
const centerLng = 6.138575100420967;

const map = L.map('map').setView([centerLat, centerLng], 11);

// Functions.

const init = () => {
    setMinMaxDepartureAt();
    departureAtInput.value = getCurrentDateTime();
    updateIsochroneIntervalOptions();

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
};

const setMinMaxDepartureAt = async () => {
    try {
        const response = await fetch('http://localhost:8100/metadata');
        const metadata = await response.json();

        departureAtInput.min = metadata.start_date + " 00:00";
        departureAtInput.max = metadata.end_date + " 23:59";
    } catch (err) {
        alert("Une erreur inconnue s'est produite lors du chargement des métadonnées.");
        return;
    }
};

const displayIsochroneMap = async () => {
    if (originPointCoord === null) {
        alert("Vous devez d'abord choisir un point d'origine.");
        return;
    }

    clearPreviousIsochroneMap();
    let isochroneMap;

    try {
        const response = await fetch('http://localhost:8100/isochrones?' + new URLSearchParams(getRequestParams()).toString(), {
            signal: abortController.signal,
        });
        isochroneMap = await response.json();
    } catch (err) {
        if (err.name === 'AbortError') {
            return;
        }

        alert("Une erreur inconnue s'est produite. Veuillez réessayer.");
        return;
    }

    if (isochroneMap.isochrones.length === 0) {
        alert("La carte isochrone n'a pas pu être calculée, car aucun arrêt n'est atteignable dans le temps imparti.");
        return;
    }

    // // Centers on the origin point and sets the appropriate zoom level.
    // map.fitBounds([isochroneMap.bounding_box[0], isochroneMap.bounding_box[1]], { animate: false });
    // map.setView([originPointCoord[0], originPointCoord[1]], undefined, { animate: false });

    displayIsochrones(isochroneMap);
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

const getRequestParams = () => {
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

    return params;
};

const displayIsochrones = (isochroneMap) => {
    const palette = [
        '#36AB68', // Green 1.
        '#91CF60', // Green 2.
        '#D7FF67', // Green 3.
        '#FFD767', // Yellow.
        '#FC8D59', // Orange.
        '#E2453C', // Red.
    ];

    // Use the appropriate colors depending on the number of isochrones to be displayed.
    const colors = [
        [0],
        [0, 5],
        [0, 4, 5],
        [0, 3, 4, 5],
        [0, 1, 3, 4, 5],
        [0, 1, 2, 3, 4, 5],
    ][isochroneMap.isochrones.length - 1].map(index => palette[index]).reverse();

    // Displays isochrones by layer from largest to smallest.
    for (const [i, isochrone] of isochroneMap.isochrones.reverse().entries()) {
        const color = colors[i];

        for (const polygon of isochrone.polygons) {
            let latlngs = [];

            for (const point of polygon) {
                latlngs.push([point.x, point.y]);
            }

            L.polygon(latlngs, {
                color: getDisplayMode() === 'contour_line' ? 'black' : 'transparent',
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
};

// Updates the isochrone interval options and sets the default to the maximum number of isochrones possible.
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

const getDisplayMode = () => {
    if (displayModeCirclesInput.checked) {
        return 'circles';
    }

    if (displayModeContourLineInput.checked) {
        return 'contour_line';
    }

    // This exception should never be thrown.
    throw new Error("Required");
};

// Helper functions.

const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');

    return year + "-" + month + "-" + day + " " + hour + ":" + minute;
};

// Event listeners.

// Displays or hides the form.
toggleFormDisplay.addEventListener("click", () => {
    if (formContainerOuter.classList.contains("hide-form")) {
        formContainerOuter.classList.remove("hide-form");
    } else {
        formContainerOuter.classList.add("hide-form");
    }
});

// Ensures that min and max values cannot be bypassed.
timeLimitInput.addEventListener('change', () => {
    if (timeLimitInput.value < 10) {
        timeLimitInput.value = 10;
    } else if (timeLimitInput.value > 480) {
        timeLimitInput.value = 480;
    }

    updateIsochroneIntervalOptions();
});

// Handles the application's behavior when a point of origin is being selected.
selectOriginPointElem.addEventListener("click", () => {
    if (selectOriginPointElem.classList.contains("selecting-origin-point")) {
        mapElem.classList.remove('cursor-marker');
        selectOriginPointElem.classList.remove("selecting-origin-point");
        selectOriginPointElem.innerHTML = `<img src="./assets/images/origin-point.png" width="15"> Changer de point d'origine`;
        isSelectingOriginPoint = false;
    } else {
        mapElem.classList.add('cursor-marker');
        selectOriginPointElem.classList.add("selecting-origin-point");
        selectOriginPointElem.innerHTML = `Annuler`;
        isSelectingOriginPoint = true;
    }
});

map.on('click', (e) => {
    if (!isSelectingOriginPoint) {
        return;
    }

    // A point of origin has been selected.

    if (originPointMarker !== null) {
        originPointMarker.remove();
        originPointMarker = null;
    }

    originPointCoord = [e.latlng.lat, e.latlng.lng]
    originPointMarker = L.marker([originPointCoord[0], originPointCoord[1]], { icon: customMarker }).addTo(map);

    mapElem.classList.remove('cursor-marker');
    selectOriginPointElem.classList.remove("selecting-origin-point");
    selectOriginPointElem.innerHTML = `<img src="./assets/images/origin-point.png" width="15"> Changer de point d'origine`;
    originPointCoordValueElem.innerHTML = `${originPointCoord[0].toFixed(8)} ${originPointCoord[1].toFixed(8)}`;
    isSelectingOriginPoint = false;
});

formElem.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isFormSubmitted) {
        abortController.abort();
        abortController = new AbortController();
        return;
    }

    isFormSubmitted = true;
    submitButton.classList.add('btn-cancel-request');
    submitButton.innerHTML = `<img src="./assets/images/target.png" width="20" height="20"> Annuler`;

    await displayIsochroneMap();

    console.log("here");

    isFormSubmitted = false;
    submitButton.classList.remove('btn-cancel-request');
    submitButton.innerHTML = `<img src="./assets/images/target.png" width="20" height="20"> Calculer`;
});

init();
