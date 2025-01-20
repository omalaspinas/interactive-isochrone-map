const mapElem = document.getElementById('map');

const legendContainer = document.getElementById("legend-container");
const legend = document.getElementById("legend");

// Form.
const formContainerOuter = document.getElementById("form-container-outer");
const toggleFormDisplay = document.getElementById("toggle-form-display");
const formElem = document.getElementById('form');
const selectOriginPointElem = document.getElementById("select-origin-point");
const selectOriginPointElem2 = document.getElementById("select-origin-point-2");
const originPointCoordValueElem = document.getElementById('origin-point-coord-value');
const originPointCoordValueElem2 = document.getElementById('origin-point-coord-value-2');
const originPointCoordValueMobileElem = document.getElementById('origin-point-coord-value-mobile');
const departureAtInput = document.getElementById("departure-at");
const timeLimitInput = document.getElementById("time-limit");
const isochroneIntervalInput = document.getElementById("isochrone-interval");
const displayModeCirclesInput = document.getElementById("display-mode-circles");
const displayModeContourLineInput = document.getElementById("display-mode-contour-line");
const btnAimMode = document.getElementById("lock-origin-point");
const btnAimMode2 = document.getElementById("lock-origin-point-2");
const btnValidateAim = document.getElementById("validate-aim");
const submitButton = document.getElementById('submit-button');

let isAiming = false;
let originPointOffset = [0, 0];
let originPointOffset2 = [0, 0];
let originPointOffsets = [originPointOffset, originPointOffset2];
let isSelectingOriginPoint = false;
let isSelectingOriginPoint_markerIndex = 0;

let markers = [null, null];

let selectOriginPointElems = [selectOriginPointElem, selectOriginPointElem2];
let originPointCoordValueElems = [originPointCoordValueElem, originPointCoordValueElem2];

let originPointMarker = null;
let isochronesLayer = null;
let originPointCoord = null;
let originPointCoord2 = null;
let originPointCoords = [originPointCoord, originPointCoord2];
let isFormSubmitted = false;
let abortController = new AbortController();

let isMapMoving = false;

let onMarkerPlacementEndCallback = null;

const customMarker = L.icon({
    iconUrl: './assets/images/marker.png',
    iconSize: [32, 38],
    iconAnchor: [16, 38],
});

const customMarker2 = L.icon({
    iconUrl: './assets/images/marker_red.png',
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
        // alert("Une erreur inconnue s'est produite lors du chargement des métadonnées.");
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

/**
 * Creates a marker on the map.
 * @param {number} lat - The latitude of the marker.
 * @param {number} lng - The longitude of the marker.
 * @param {number} index - Which marker to create. (0 or 1)
 */
const createMarker = (lat, lng, index = 0) => {
    if (index < 0 || index > 1) {
        //Abort if index
        return;
    }
    let marker = customMarker;
    if (index === 1) {
        marker = customMarker2;
    }
    console.log(marker);
    return L.marker([lat, lng], { icon: marker }).addTo(map);
};

/**
 * Removes a marker from the map.
 * @param {number} index - Which marker to remove. (0 or 1) 
 * @returns 
 */
const removeMarker = (index = 0) => {
    if (index < 0 || index > 1) {
        //Abort
        return;
    }
    if (markers[index] !== null) {
        markers[index].remove();
        markers[index] = null;
    }
};

const setCoordValue = (index, lat, lng) => {
    if (index < 0 || index > 1) {
        //Abort
        return;
    }
    originPointCoordValueElems[index].innerHTML = `${lat.toFixed(8)} ${lng.toFixed(8)}`;
    if (originPointCoordValueMobileElem !== null) {
        originPointCoordValueMobileElem.innerHTML = `${lat.toFixed(8)} ${lng.toFixed(8)}`;
    }
};

const EndMarkerPlacement = function (markerIndex) {
    if (isMobileResolution()) {
        showForm();
    }
    mapElem.classList.remove(`cursor-marker-${markerIndex}`);
    selectOriginPointElems[markerIndex].classList.remove("selecting-origin-point");
    selectOriginPointElems[markerIndex].innerHTML = `<img src="./assets/images/origin-point.png" width="15"> Changer de point d'origine`;
    // originPointCoordValueElems[markerIndex].innerHTML = `${originPointCoords[markerIndex][0].toFixed(8)} ${originPointCoords[markerIndex][1].toFixed(8)}`;
    setCoordValue(markerIndex, originPointCoords[markerIndex][0], originPointCoords[markerIndex][1]);
    isSelectingOriginPoint = false;
    if (onMarkerPlacementEndCallback !== null) { onMarkerPlacementEndCallback(); }
};

const StartMarkerPlacement = (markerIndex) => {

    mapElem.classList.add(`cursor-marker-${markerIndex}`);
    selectOriginPointElems[markerIndex].classList.add("selecting-origin-point");
    selectOriginPointElems[markerIndex].innerHTML = `Annuler`;
    isSelectingOriginPoint_markerIndex = markerIndex;
    isSelectingOriginPoint = true;
};

const isMobileResolution = () => {
    if (screen.width < 768) {
        return true;
    }
    return false;
}

const MoveMapToPoint = (lat, lng, animate = true) => {
    isMapMoving = true;
    map.setView([lat, lng], undefined, { animate: animate });
}

const ToggleFormDisplay = () => {
    if (formContainerOuter.classList.contains("hide-form")) {
        showForm();
    } else {
        hideForm();
    }
}

const ValidateAim = () => {
    if (isAiming) {
        //Disable aiming mode.
        isAiming = false;
        btnAimMode.classList.remove('active');
        btnAimMode2.classList.remove('active');
        // isAiming = false;
        if (isMobileResolution()) {
            showForm();
        }
    }
}

const hideForm = () => {
    formContainerOuter.classList.add("hide-form");
    if (isAiming) {
        formContainerOuter.classList.add("aiming");
    }
}

const showForm = () => {
    formContainerOuter.classList.remove("hide-form");
    formContainerOuter.classList.remove("aiming");
}

// Event listeners.

// Displays or hides the form.
toggleFormDisplay.addEventListener("click", () => {
    ToggleFormDisplay();
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
    if (isAiming) {
        //Disable aiming mode.
        isAiming = false;
        btnAimMode.classList.remove('active');
        btnAimMode2.classList.remove('active');
    }
    if (selectOriginPointElem.classList.contains("selecting-origin-point")) {
        EndMarkerPlacement(0);
        if (isMobileResolution()) {
            showForm();
        }
    } else {
        StartMarkerPlacement(0);
        if (isMobileResolution()) {
            hideForm();
        }
    }
});

selectOriginPointElem2.addEventListener("click", () => {
    if (isAiming) {
        //Disable aiming mode.
        isAiming = false;
        btnAimMode.classList.remove('active');
        btnAimMode2.classList.remove('active');
    }
    if (selectOriginPointElem2.classList.contains("selecting-origin-point")) {
        EndMarkerPlacement(1);
        if (isMobileResolution()) {
            showForm();
        }
    } else {
        StartMarkerPlacement(1);
        if (isMobileResolution()) {
            hideForm();
        }
    }
});





map.on('dragstart', (e) => {
    if (!isAiming) {
        return;
    }
    let index = isSelectingOriginPoint_markerIndex;
    if (markers[index] !== null) {
        originPointOffsets[index][0] = markers[index].getLatLng().lat - map.getCenter().lat;
        originPointOffsets[index][1] = markers[index].getLatLng().lng - map.getCenter().lng;
    } else {
        originPointOffsets[index][0] = 0;
        originPointOffsets[index][1] = 0;
    }
});

map.on('move', (e) => {
    if (!isAiming) {
        return;
    }
    if (isMapMoving) { return; }
    let index = isSelectingOriginPoint_markerIndex;
    //Remove current marker
    removeMarker(index);

    //Compute offset of marker from map center
    originPointCoords[index] = [map.getCenter().lat + originPointOffsets[index][0], map.getCenter().lng + originPointOffsets[index][1]]
    markers[index] = createMarker(originPointCoords[index][0], originPointCoords[index][1], index);

    mapElem.classList.remove('cursor-marker');
    selectOriginPointElem.classList.remove("selecting-origin-point");
    selectOriginPointElem.innerHTML = `<img src="./assets/images/origin-point.png" width="15"> Changer de point d'origine`;
    // originPointCoordValueElems[index].innerHTML = `${originPointCoords[index][0].toFixed(8)} ${originPointCoords[index][1].toFixed(8)}`;
    setCoordValue(index, originPointCoords[index][0], originPointCoords[index][1]);
    isSelectingOriginPoint = false;
})

map.on('moveend', (e) => {
    if (isMapMoving) {
        isMapMoving = false;
    }
});

map.on('click', (e) => {
    console.log(e);
    if (!isSelectingOriginPoint) {
        return;
    }
    let index = isSelectingOriginPoint_markerIndex;
    // A point of origin has been selected.

    //Remove current marker if exist
    removeMarker(index);

    // Retrieve position of click
    originPointCoords[index] = [e.latlng.lat, e.latlng.lng]
    //Create new marker at position
    markers[index] = createMarker(originPointCoords[index][0], originPointCoords[index][1], index);
    //Clean up
    EndMarkerPlacement(index);

});

btnAimMode.addEventListener('click', () => {
    //Disable aim mode of other marker if enabled
    btnAimMode2.classList.remove('active');

    if (isAiming && isSelectingOriginPoint_markerIndex === 0) {
        btnAimMode.classList.remove('active');
        isAiming = false;
        if (isMobileResolution()) {
            showForm();
        }
    } else {
        //Enable aim mode
        btnAimMode.classList.add('active');
        isAiming = true;
        isSelectingOriginPoint_markerIndex = 0;
        if (markers[0] === null) {
            //Marker isn't on map, place it at the current center.
            originPointCoords[0] = [map.getCenter().lat, map.getCenter().lng]
            markers[0] = createMarker(originPointCoords[0][0], originPointCoords[0][1], 0);
        }
        MoveMapToPoint(originPointCoords[0][0], originPointCoords[0][1], true);
        EndMarkerPlacement(0);
        if (isMobileResolution()) {
            hideForm();
        }
    }
});


btnAimMode2.addEventListener('click', () => {
    //Disable aim mode of other marker if enabled
    btnAimMode.classList.remove('active');
    if (isAiming && isSelectingOriginPoint_markerIndex === 1) {
        //Disable aim mode
        btnAimMode2.classList.remove('active');
        isAiming = false;
        if (isMobileResolution()) {
            showForm();
        }
    } else {
        //Enable aim mode
        btnAimMode2.classList.add('active');
        isAiming = true;
        isSelectingOriginPoint_markerIndex = 1;
        if (markers[1] === null) {
            //Marker isn't on map, place it at the current center.
            originPointCoords[1] = [map.getCenter().lat, map.getCenter().lng]
            markers[1] = createMarker(originPointCoords[1][0], originPointCoords[1][1], 1);
        }
        MoveMapToPoint(originPointCoords[1][0], originPointCoords[1][1], true);
        EndMarkerPlacement(1);
        if (isMobileResolution()) {
            hideForm();
        }
    }
});

btnValidateAim.addEventListener('click', () => {
    ValidateAim();
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
