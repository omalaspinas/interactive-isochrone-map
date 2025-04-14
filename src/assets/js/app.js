const mapElem = document.getElementById("map");
// const HRDF_SERVER_URL = "https://iso.hepiapp.ch/api/";
const HRDF_SERVER_URL = "http://localhost:8100/";

/** Pretty Palettes ! */
const palette1 = [
    "#36AB68", // Nearest.
    "#91CF60", //
    "#D7FF67", //
    "#FFD767", //
    "#FC8D59", //
    "#E2453C", // Furthest.
];
const palette2 = [
    "#00ffef",
    "#00aeeb",
    "#3982d1",
    "#6b62b7",
    "#a24eaa",
    "#cd2f88",
];

const legendContainer = document.getElementById("legend-container");
const legend = document.getElementById("legend");
const legend2 = document.getElementById("legend-2");
// Form.
const formContainerOuter = document.getElementById("form-container-outer");
const toggleFormDisplay = document.getElementById("toggle-form-display");
const formElem = document.getElementById("form");
const selectOriginPointElem1 = document.getElementById("select-origin-point-1");
const selectOriginPointElem2 = document.getElementById("select-origin-point-2");

const toggleMaxDistanceCbx = document.getElementById(
    "legend-show-max-distance",
);

const originPointCoordValueMobileElem = document.getElementById(
    "origin-point-coord-value-mobile",
);
const departureAtInput = document.getElementById("departure-at");
const timeLimitInput = document.getElementById("time-limit");
const isochroneIntervalInput = document.getElementById("isochrone-interval");

const btnAimMode1 = document.getElementById("lock-origin-point-1");
const btnAimMode2 = document.getElementById("lock-origin-point-2");
const btnValidateAim = document.getElementById("validate-aim");
const findOptimalInput = document.getElementById("find-optimal");
const submitButton = document.getElementById("submit-button");

/* Second point controls */

const ctrlsPointTwo = document.getElementById("ctrls-point-2");
const ctrlsPointTwoHidden = document.getElementById("ctrls-point-2-hidden");
const ctrlsPointTwoInner = document.getElementById("ctrls-point-2-inner");
const closeOriginPoint2 = document.getElementById("close-origin-point-2");
let isAiming = false;
// let originPointOffset = [0, 0];
// let originPointOffset2 = [0, 0];
let originPointOffsets = [
    [0, 0],
    [0, 0],
];
let isSelectingOriginPoint = false;
let isSelectingOriginPoint_markerIndex = 0;

let markers = [null, null];
let furthestMarkers = [null, null];
let furthestMarkersLayerGroup = null;
let workers = [];

let selectOriginPointElems = [selectOriginPointElem1, selectOriginPointElem2];
let originPointCoordValueElem1 = document.getElementById(
    "origin-point-coord-value-1",
);
let originPointCoordValueElem2 = document.getElementById(
    "origin-point-coord-value-2",
);
let originPointCoordValueElems = [
    originPointCoordValueElem1,
    originPointCoordValueElem2,
];

let originPointMarker = null;
let isochronesLayer = null;
// let originPointCoord = null;
// let originPointCoord2 = null;
let originPointCoords = [null, null];
let isFormSubmitted = false;
let isWorkersRunning = false;
let abortController = new AbortController();
let workerAbortController = new AbortController();
let legendControls_opacitySliders = document.querySelectorAll(
    '.legend-controls input[type="range"]',
);

let isMapMoving = false;

let onMarkerPlacementEndCallback = null;

const spinner = `<div class="lds-dual-ring"></div>`;

const customMarker = L.icon({
    iconUrl: "./assets/images/marker.png",
    iconSize: [32, 38],
    iconAnchor: [16, 38],
});

const customMarker2 = L.icon({
    iconUrl: "./assets/images/marker_red.png",
    iconSize: [32, 38],
    iconAnchor: [16, 38],
});

const pin = L.icon({
    iconUrl: "./assets/images/pin.svg",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
});

const pin2 = L.icon({
    iconUrl: "./assets/images/pin_red.svg",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
});

/** Callbacks */

let onStartComputeIsochrone = () => {
    console.log("onStartComputeIsochrone trig");
    findOptimalInput.disabled = true;
};
let onFinishComputeIsochrone = () => {
    console.log("onFinishComputeIsochrone trig");
    findOptimalInput.disabled = false;
};

// Different openstreetmap tiles
var OpenStreetMap_Mapnik = L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
);
var Stadia_AlidadeSmooth = L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}",
    {
        attribution:
            '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        ext: "png",
    },
);
var Stadia_StamenTonerLite = L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.{ext}",
    {
        attribution:
            '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        ext: "png",
    },
);
var Esri_WorldGrayCanvas = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    {
        attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
        maxZoom: 16,
    },
);
var CartoDB_Positron = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
    },
);

// Hepia coordinates:
const centerLat = 46.20956654;
const centerLng = 6.13536;

const map = L.map("map").setView([centerLat, centerLng], 11);

// Functions.
const init = () => {
    setMinMaxDepartureAt();
    departureAtInput.value = getCurrentDateTime();
    // departureAtInput.value = departureAtInput.max;
    updateIsochroneIntervalOptions();

    var baseMap = CartoDB_Positron;
    baseMap.addTo(map);
    map.createPane("isochrones0");
    map.getPane("isochrones0").style.opacity = 0.6;
    map.createPane("isochrones1");
    map.getPane("isochrones1").style.opacity = 0.6;

    furthestMarkersLayerGroup = L.layerGroup();
};

const setMinMaxDepartureAt = async () => {
    try {
        const response = await fetch(HRDF_SERVER_URL + "metadata");
        const metadata = await response.json();

        departureAtInput.min = metadata.start_date + " 00:00";
        departureAtInput.max = metadata.end_date + " 23:59";
    } catch (err) {
        // alert("Une erreur inconnue s'est produite lors du chargement des métadonnées.");
        return;
    }
};

const displayIsochroneMap = async (idx, clear = true) => {
    if (originPointCoords[idx] === null) {
        alert("Vous devez d'abord choisir un point d'origine.");
        return;
    }

    if (clear) {
        clearPreviousIsochroneMap();
    }
    let isochroneMap;
    const params = new URLSearchParams(getRequestParams(idx));
    try {
        const response = await fetch(
            HRDF_SERVER_URL +
                "isochrones?" +
                params.toString(),
            {
                signal: abortController.signal,
            },
        );
        isochroneMap = await response.json();
    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }

        alert("Une erreur inconnue s'est produite. Veuillez réessayer.");
        return;
    }

    if (isochroneMap.isochrones.length === 0) {
        alert(
            "La carte isochrone n'a pas pu être calculée, car aucun arrêt n'est atteignable dans le temps imparti.",
        );
        return;
    }

    // // Centers on the origin point and sets the appropriate zoom level.
    // map.fitBounds([isochroneMap.bounding_box[0], isochroneMap.bounding_box[1]], { animate: false });
    // map.setView([originPointCoord[0], originPointCoord[1]], undefined, { animate: false });

    displayIsochrones(isochroneMap, idx);
    if (params.get("find_optimal") === "true") {
        setOptimalDepartInLegend(isochroneMap.departure_at, idx);
        document.getElementById(`optimal-legend-${idx + 1}`).classList.remove("hidden");
    }
    
    legendContainer.classList.remove("hidden");

    isochronesLayer.addTo(map);
};

const clearPreviousIsochroneMap = () => {
    legend.innerHTML = "";
    legend2.innerHTML = "";
    document
        .querySelectorAll(".legend-controls")
        .forEach((elem) => elem.classList.add("hidden"));

    document
        .querySelectorAll(".optimal-container")
        .forEach((elem) => elem.classList.add("hidden"));
    // Remove the furthest point markers if they're present
    removeFurthestMarker(0);
    removeFurthestMarker(1);
    if (isochronesLayer !== null) {
        isochronesLayer.remove();
    }
    isochronesLayer = L.layerGroup();
};

const getRequestParams = (idx = 0) => {
    const departureDate = departureAtInput.value.split("T")[0];
    const departureTime = departureAtInput.value.split("T")[1];
    const timeLimit = timeLimitInput.value;
    const isochroneInterval = isochroneIntervalInput.value;
    const findOptimal = findOptimalInput.checked;
    const params = {
        origin_point_latitude: originPointCoords[idx][0],
        origin_point_longitude: originPointCoords[idx][1],
        departure_date: departureDate,
        departure_time: departureTime,
        time_limit: timeLimit,
        isochrone_interval: isochroneInterval,
        display_mode: "circles",
        //Find optimal param
        find_optimal: findOptimal,
    };

    return params;
};

const displayIsochrones = async (isochroneMap, index = 0) => {
    let legend_div = index === 0 ? legend : legend2;
    let pane = index === 0 ? "isochrones0" : "isochrones1";
    let palette = index === 0 ? palette1 : palette2;
    // Use the appropriate colors depending on the number of isochrones to be displayed.
    const colors = [
        [0],
        [0, 5],
        [0, 4, 5],
        [0, 3, 4, 5],
        [0, 1, 3, 4, 5],
        [0, 1, 2, 3, 4, 5],
    ][isochroneMap.isochrones.length - 1]
        .map((index) => palette[index])
        .reverse();

    let all_polygons = [];
    // Displays isochrones by layer from largest to smallest.
    for (const [i, isochrone] of isochroneMap.isochrones.reverse().entries()) {
        let iso_polygons = [];
        const color = colors[i];
        for (const polygon of isochrone.polygons) {
            let latlngs = [];
            for (const point of polygon) {
                latlngs.push([point.x, point.y]);
            }
            // Build the polygon
            let poly = L.polygon(latlngs, {
                color: "black",
                weight: 1.0,
                fillColor: color,
                fillOpacity: 1.0,
                pane: pane,
            });
            // Draw the polygon on the layer
            poly.addTo(isochronesLayer);
            // Add it to the polygon list
            iso_polygons.push(poly.toGeoJSON());
        }
        // Append the legend entry
        legend_div.appendChild(
            createLegend(color, isochrone.time_limit, i, index),
        );
        // Add the sublist to the list of all polygons
        all_polygons.push(iso_polygons);
    }

    // Show the opacity slider for the current isochrone map
    let slider = document.querySelector(`#legend-controls-${index + 1}`);
    slider.classList.remove("hidden");

    // Merge the polygons
    let aborted = false;
    // Iterate backwards, compute smallest area first
    for (let i = all_polygons.length - 1; i >= 0; i--) {
        if (aborted) {
            //The work has been aborted, report.
            setAreaInLegend("ABORTED", index, i);
            continue;
        }
        console.log(
            `Merging the polygons for isochrone ${i + 1}, time limit ${i}. Merging ${all_polygons[i].length} polygons`,
        );
        // Show a spinner while the worker is running
        setAreaInLegend(spinner, index, i);
        try {
            fused = await mergePolys(all_polygons[i]);
            setAreaInLegend(toKm2(turf.area(fused)) + " km²", index, i);
        } catch (err) {
            // The worker has been aborted
            console.log(err);
            aborted = true;
            setAreaInLegend("ABORTED", index, i);
        }
        if (i === 0) {
            //We're processing the largest area, use it to find the furthest point
            findFurthest(fused, index);
        }
    }
};

/**
 * Convert a value to kilometers squared.
 * @param {number} val The value to convert
 * @param {number} [fix=2] The number of decimal places
 * @returns The converted value
 */
const toKm2 = (val, fix = 2) => {
    return (val / 1000000).toFixed(fix);
};

const findFurthest = (polygons, index = 0) => {
    //All coordinates of the polygons
    let coords;
    //Longest recorded distance
    let longest = 0;
    //Coordinate of the furthest point
    let coord_longest = [0, 0];

    //Get the coordinates
    if (polygons.geometry.type === "MultiPolygon") {
        // We've got a multipolygon, flatten the coordinates
        coords = polygons.geometry.coordinates.flat(2);
    } else {
        // We've got a single polygon, take the first (and only) coordinate list
        coords = polygons.geometry.coordinates[0];
    }

    //Compute distance to origin point for each coordinate, and keep the longest
    for (c of coords) {
        let dist = getDistance(c, originPointCoords[index]);
        if (longest < dist) {
            longest = dist;
            coord_longest = c;
        }
    }
    //We should have found the longest distance, place the pin, and populate legend
    placePin(coord_longest, longest, index);
    // setMaxDistanceInLegend(longest, index);
};

const getDistance = (coordinate, origin) => {
    //Swap the order of the origin to get lng,lat
    let orig = [origin[1], origin[0]];
    return turf.distance(coordinate, orig, { units: "kilometers" });
};

/**
 *
 * @param {Array} coord The coordinate to place the pin at, as [lng, lat]
 * @param {number} distance The distance from the origin, in km
 * @param {number} index The index of the isochrone map (0 for first, 1 for second)
 * @param {number} fix The number of decimal places to show in the marker popup
 */
const placePin = (coord, distance, index = 0, fix = 2) => {
    let lat = coord[1];
    let lng = coord[0];
    let mkr = L.marker([lat, lng], {
        icon: index === 0 ? pin : pin2,
        zIndexOffset: 1600,
        opacity: 1,
    });
    furthestMarkersLayerGroup.addLayer(mkr);
    mkr.bindPopup(
        "<p>Distance depuis l'origine : " + distance.toFixed(fix) + " km</p>",
    );
    furthestMarkers[index] = mkr;
};

/**
 * Merges a list of polygons into a single polygon, or a multipolygon if it is disjoint.
 * @param {Array} polys The list of polygons to merge.
 * @returns A promise that resolves to a single polygon representing the union of the input polygons.
 */
async function mergePolys(polys) {
    function work({ data }) {
        importScripts("https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js");
        if (data.length === 0) {
            throw new Error("Cannot compute union of empty polygon list");
        } else if (data.length === 1) {
            postMessage(data[0]);
        } else {
            let turfpolys = [];
            for (let p = 0; p < data.length; p++) {
                turfpoly = turf.polygon(data[p].geometry.coordinates);
                turfpolys.push(turfpoly);
            }
            union = turf.union(turf.featureCollection(turfpolys));
            postMessage(union);
        }
    }

    let blob = new Blob(["onmessage =" + work.toString()], {
        type: "application/javascript",
    });
    let worker = new Worker(URL.createObjectURL(blob));
    workers.push(worker);
    worker.postMessage(polys);

    return await new Promise((resolve, reject) => {
        workerAbortController.signal.addEventListener("abort", () => {
            reject("Worker aborted");
        });
        worker.onmessage = (e) => {
            resolve(e.data);
        };
    });
}

/**
 *
 * @param {string} value The value to write in the legend
 * @param {number} iso_index The isochrone index (0 for first, 1 for second)
 * @param {number} time_limit_index The time limit index for the current valuess
 */
const setAreaInLegend = (value, iso_index, time_limit_index) => {
    // Search for the element
    let n = `area-value-${iso_index + 1}-${time_limit_index}`;
    let areaLabelElement = document.getElementById(n);
    if (areaLabelElement === null) {
        throw new Error("Area label not found: " + n);
    }
    // Write the value
    areaLabelElement.innerHTML = value;
};

const setMaxDistanceInLegend = (value, iso_index, fix = 2) => {
    // Search for the element
    let n = `legend-max-distance-${iso_index + 1}`;
    let distanceLabelElement = document.getElementById(n);
    if (distanceLabelElement === null) {
        throw new Error("Distance label not found: " + n);
    }
    // Write the value
    distanceLabelElement.innerHTML = value.toFixed(fix);
};

const setOptimalDepartInLegend = (value, iso_idx) => {
    // Search for the element
    let n = `#optimal-legend-${iso_idx + 1}`;
    let optimalDepartLabelElement = document.querySelector(n);
    let dateSpan = optimalDepartLabelElement.querySelector("span.optimal-date");
    let timeSpan = optimalDepartLabelElement.querySelector("span.optimal-time");
    // Split the value between date and time
    let [date, time] = value.split("T");
    // Write the values
    dateSpan.innerHTML = date;
    timeSpan.innerHTML = time;
};

/**
/**
 * Create a legend entry
 * @param {*} color The color to use
 * @param {*} time_limit The time limit value
 * @param {*} time_limit_index The index of the time limit value
 * @param {*} isoIndex The index of the isochrone map (0 for first, 1 for second)
 * @returns
 */
const createLegend = (color, time_limit, time_limit_index, isoIndex = 0) => {
    // Create a new legend entry element
    const legendElement = document.createElement("div");
    legendElement.className = "legend-entry";
    legendElement.id = `legend-entry-${isoIndex + 1}-${time_limit_index}`;
    // Set legend color
    legendElement.style.backgroundColor = color;
    // Create time limit label
    const timeLimitElement = document.createElement("p");
    timeLimitElement.className = "timelimit";
    timeLimitElement.textContent = `${time_limit} min.`;
    // Create area label
    const areaLabelElement = document.createElement("p");
    areaLabelElement.className = "area";
    areaLabelElement.id = `area-value-${isoIndex + 1}-${time_limit_index}`;
    // Append elements to legend entry
    legendElement.appendChild(timeLimitElement);
    legendElement.appendChild(areaLabelElement);
    return legendElement;
};

/**
 * Updates the isochrone interval options and sets the default to the maximum number of isochrones possible.
 */
const updateIsochroneIntervalOptions = () => {
    isochroneIntervalInput.innerHTML = "";

    for (let i = 0; i < 6; i++) {
        if (timeLimitInput.value % (i + 1) == 0) {
            const value = timeLimitInput.value / (i + 1);
            isochroneIntervalInput.innerHTML += `
                <option value="${value}">${value} minutes, ${i + 1} isochrone${i + 1 > 1 ? "s" : ""}</option>
            `;
            isochroneIntervalInput.value = value;
        }
    }
};

// Helper functions.

/**
 * Build a date string in the format YYYY-MM-DD HH:MM
 * @returns {string} The current date and time in the format YYYY-MM-DD HH:MM
 */
const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hour = now.getHours().toString().padStart(2, "0");
    const minute = now.getMinutes().toString().padStart(2, "0");

    return year + "-" + month + "-" + day + " " + hour + ":" + minute;
};

/**
 * Creates a marker on the map.
 * @param {number} lat - The latitude of the marker.
 * @param {number} lng - The longitude of the marker.
 * @param {number} index - Which marker to create. (0 for first isochrone or 1 for second isochrone)
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
    return L.marker([lat, lng], { icon: marker, zIndexOffset: 1600 }).addTo(
        map,
    );
};

/**
 * Removes a marker from the map.
 * @param {number} index - Which marker to remove. (0 for first isochrone or 1 for second isochrone)
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

const removeFurthestMarker = (index = 0) => {
    if (index < 0 || index > 1) {
        //Abort
        return;
    }
    if (furthestMarkers[index] !== null) {
        furthestMarkersLayerGroup.removeLayer(furthestMarkers[index]);
        furthestMarkers[index].remove();
        furthestMarkers[index] = null;
    }
};

/**
 * Display the coordinates of the origin point of a specific isochrone.
 * @param {number} index The isochrone index (0 for first, 1 for second)
 * @param {number} lat The latitude of the origin point
 * @param {number} lng The longitude of the origin point
 * @returns
 */
const setCoordValue = (index, lat, lng) => {
    if (originPointCoords[index] === null || lat === null || lng === null) {
        return;
    }
    if (index < 0 || index > 1) {
        //Abort
        return;
    }
    if (lat === null || lng === null) {
        originPointCoordValueElems[index].innerHTML = "-";
    }
    originPointCoordValueElems[index].innerHTML =
        `${lat.toFixed(8)} ${lng.toFixed(8)}`;
    if (originPointCoordValueMobileElem !== null) {
        originPointCoordValueMobileElem.innerHTML = `${lat.toFixed(8)} ${lng.toFixed(8)}`;
    }
};

/**
 * Ends the marker placement mode.
 * @param {number} markerIndex The index of the marker (0 for first, 1 for second)
 */
const EndMarkerPlacement = function (markerIndex) {
    if (isTabletResolution()) {
        showForm();
    }
    mapElem.classList.remove(`cursor-marker-${markerIndex}`);
    selectOriginPointElems[markerIndex].classList.remove(
        "selecting-origin-point",
    );
    selectOriginPointElems[markerIndex].innerHTML =
        `<img src="./assets/images/origin-point.png" width="15"> Changer de point d'origine`;
    // originPointCoordValueElems[markerIndex].innerHTML = `${originPointCoords[markerIndex][0].toFixed(8)} ${originPointCoords[markerIndex][1].toFixed(8)}`;
    setCoordValue(
        markerIndex,
        originPointCoords[markerIndex][0],
        originPointCoords[markerIndex][1],
    );
    isSelectingOriginPoint = false;
    if (onMarkerPlacementEndCallback !== null) {
        onMarkerPlacementEndCallback();
    }
};

/**
 * Starts the marker placement mode.
 * @param {number} markerIndex The index of the marker (0 for first, 1 for second)
 */
const StartMarkerPlacement = (markerIndex) => {
    mapElem.classList.add(`cursor-marker-${markerIndex}`);
    selectOriginPointElems[markerIndex].classList.add("selecting-origin-point");
    selectOriginPointElems[markerIndex].innerHTML = `Annuler`;
    isSelectingOriginPoint_markerIndex = markerIndex;
    isSelectingOriginPoint = true;
};

/**
 * Returns true if the resolution is mobile, false otherwise.
 * @returns {boolean} True if the resolution is mobile, false otherwise.
 */
const isMobileResolution = () => {
    if (screen.width < 768) {
        return true;
    }
    return false;
};

/**
 * Returns true if the resolution is tablet, false otherwise.
 * @returns {boolean} True if the resolution is tablet, false otherwise.
 */
const isTabletResolution = () => {
    if (screen.width < 960) {
        return true;
    }
    return false;
};

/**
 * Move the map view to a given coordinate.
 * @param {number} lat The latitude of the new center.
 * @param {number} lng The longitude of the new center.
 * @param {boolean} animate Should the move be animated.
 */
const MoveMapToPoint = (lat, lng, animate = true) => {
    isMapMoving = true;
    map.setView([lat, lng], undefined, { animate: animate });
};

/**
 * Toggle the display of the form.
 */
const ToggleFormDisplay = () => {
    if (formContainerOuter.classList.contains("hide-form")) {
        showForm();
    } else {
        hideForm();
    }
};

/**
 * Reset the coordinates of a marker.
 * @param {number} markerIndex The index of the marker to reset.
 */
const resetCoordinates = (markerIndex) => {
    originPointCoords[markerIndex] = [null, null];
    setCoordValue(
        markerIndex,
        originPointCoords[markerIndex][0],
        originPointCoords[markerIndex][1],
    );
};

/**
 * Validate the marker placement when using aim mode.
 */
const ValidateAim = () => {
    if (isAiming) {
        //Disable aiming mode.
        isAiming = false;
        btnAimMode1.classList.remove("active");
        btnAimMode2.classList.remove("active");
        // isAiming = false;
        if (isTabletResolution()) {
            showForm();
        }
    }
};

/**
 * Hide the form.
 */
const hideForm = () => {
    formContainerOuter.classList.add("hide-form");
    if (isAiming) {
        formContainerOuter.classList.add("aiming");
    }
};

/**
 * Show the form.
 */
const showForm = () => {
    formContainerOuter.classList.remove("hide-form");
    formContainerOuter.classList.remove("aiming");
};

/**
 * Brings an isochrone map to front.
 * @param {number} isoIndex The index of the isochrone map to bring to front (0 for largest, 1 for smallest).
 */
const bringToFront = (isoIndex) => {
    if (isoIndex < 0 || isoIndex > 1) {
        throw new Error("Invalid Index when trying to bring to front.");
    }

    if (isoIndex === 0) {
        map.getPane("isochrones0").style.zIndex = 1000;
        map.getPane("isochrones1").style.zIndex = 700;
    } else {
        map.getPane("isochrones0").style.zIndex = 700;
        map.getPane("isochrones1").style.zIndex = 1000;
    }
    let markerPane = document.getElementsByClassName(
        "leaflet-pane leaflet-marker-pane",
    )[0];
    if (markerPane !== undefined || markerPane !== null) {
        markerPane.style.zIndex = 2000;
    }
};

// About modal

const openAboutModal = () => {
    document.getElementById("about-modal").classList.remove("hidden");
};

const closeAboutModal = () => {
    document.getElementById("about-modal").classList.add("hidden");
};

// Event listeners.

// Displays or hides the form.
toggleFormDisplay.addEventListener("click", () => {
    ToggleFormDisplay();
});

// Ensures that min and max values cannot be bypassed.
timeLimitInput.addEventListener("change", () => {
    if (timeLimitInput.value < 10) {
        timeLimitInput.value = 10;
    } else if (timeLimitInput.value > 480) {
        timeLimitInput.value = 480;
    }

    updateIsochroneIntervalOptions();
});

// Handles the application's behavior when a point of origin is being selected.
// 1st isochrone
selectOriginPointElem1.addEventListener("click", () => {
    if (isAiming) {
        //Disable aiming mode.
        isAiming = false;
        btnAimMode1.classList.remove("active");
        btnAimMode2.classList.remove("active");
    }
    if (selectOriginPointElem1.classList.contains("selecting-origin-point")) {
        EndMarkerPlacement(0);
        if (isTabletResolution()) {
            showForm();
        }
    } else {
        StartMarkerPlacement(0);
        if (isTabletResolution()) {
            hideForm();
        }
    }
});

// 2nd isochrone
selectOriginPointElem2.addEventListener("click", () => {
    if (isAiming) {
        //Disable aiming mode.
        isAiming = false;
        btnAimMode1.classList.remove("active");
        btnAimMode2.classList.remove("active");
    }
    if (selectOriginPointElem2.classList.contains("selecting-origin-point")) {
        EndMarkerPlacement(1);
        if (isTabletResolution()) {
            showForm();
        }
    } else {
        StartMarkerPlacement(1);
        if (isTabletResolution()) {
            hideForm();
        }
    }
});

/** Triggered when the map is being dragged around
 */
map.on("dragstart", (e) => {
    if (!isAiming) {
        return;
    }
    let index = isSelectingOriginPoint_markerIndex;
    if (markers[index] !== null) {
        originPointOffsets[index][0] =
            markers[index].getLatLng().lat - map.getCenter().lat;
        originPointOffsets[index][1] =
            markers[index].getLatLng().lng - map.getCenter().lng;
    } else {
        originPointOffsets[index][0] = 0;
        originPointOffsets[index][1] = 0;
    }
});

/**
 * Triggered when the map is moved.
 */
map.on("move", (e) => {
    if (!isAiming) {
        return;
    }
    if (isMapMoving) {
        return;
    }
    let index = isSelectingOriginPoint_markerIndex;
    //Remove current marker
    removeMarker(index);

    //Compute offset of marker from map center
    originPointCoords[index] = [
        map.getCenter().lat + originPointOffsets[index][0],
        map.getCenter().lng + originPointOffsets[index][1],
    ];
    markers[index] = createMarker(
        originPointCoords[index][0],
        originPointCoords[index][1],
        index,
    );

    mapElem.classList.remove("cursor-marker");
    selectOriginPointElem1.classList.remove("selecting-origin-point");
    selectOriginPointElem1.innerHTML = `<img src="./assets/images/origin-point.png" width="15"> Changer de point d'origine`;
    setCoordValue(
        index,
        originPointCoords[index][0],
        originPointCoords[index][1],
    );
    isSelectingOriginPoint = false;
});

map.on("moveend", (e) => {
    if (isMapMoving) {
        isMapMoving = false;
    }
});

map.on("click", (e) => {
    if (!isSelectingOriginPoint) {
        return;
    }
    let index = isSelectingOriginPoint_markerIndex;
    // A point of origin has been selected.

    //Remove current marker if exist
    removeMarker(index);

    // Retrieve position of click
    originPointCoords[index] = [e.latlng.lat, e.latlng.lng];
    //Create new marker at position
    markers[index] = createMarker(
        originPointCoords[index][0],
        originPointCoords[index][1],
        index,
    );
    //Clean up
    EndMarkerPlacement(index);
});

btnAimMode1.addEventListener("click", () => {
    //Disable aim mode of other marker if enabled
    btnAimMode2.classList.remove("active");

    if (isAiming && isSelectingOriginPoint_markerIndex === 0) {
        btnAimMode1.classList.remove("active");
        isAiming = false;
        if (isTabletResolution()) {
            showForm();
        }
    } else {
        //Enable aim mode
        btnAimMode1.classList.add("active");
        isAiming = true;
        isSelectingOriginPoint_markerIndex = 0;
        if (markers[0] === null) {
            //Marker isn't on map, place it at the current center.
            originPointCoords[0] = [map.getCenter().lat, map.getCenter().lng];
            markers[0] = createMarker(
                originPointCoords[0][0],
                originPointCoords[0][1],
                0,
            );
        }
        MoveMapToPoint(originPointCoords[0][0], originPointCoords[0][1], true);
        EndMarkerPlacement(0);
        if (isTabletResolution()) {
            hideForm();
        }
    }
});

btnAimMode2.addEventListener("click", () => {
    //Disable aim mode of other marker if enabled
    btnAimMode1.classList.remove("active");
    if (isAiming && isSelectingOriginPoint_markerIndex === 1) {
        //Disable aim mode
        btnAimMode2.classList.remove("active");
        isAiming = false;
        if (isTabletResolution()) {
            showForm();
        }
    } else {
        //Enable aim mode
        btnAimMode2.classList.add("active");
        isAiming = true;
        isSelectingOriginPoint_markerIndex = 1;
        if (markers[1] === null) {
            //Marker isn't on map, place it at the current center.
            originPointCoords[1] = [map.getCenter().lat, map.getCenter().lng];
            markers[1] = createMarker(
                originPointCoords[1][0],
                originPointCoords[1][1],
                1,
            );
        }
        MoveMapToPoint(originPointCoords[1][0], originPointCoords[1][1], true);
        EndMarkerPlacement(1);
        if (isTabletResolution()) {
            hideForm();
        }
    }
});

btnValidateAim.addEventListener("click", () => {
    ValidateAim();
});

ctrlsPointTwoHidden.addEventListener("click", () => {
    ctrlsPointTwoHidden.classList.toggle("hidden");
    ctrlsPointTwoInner.classList.toggle("hidden");
});

closeOriginPoint2.addEventListener("click", () => {
    ctrlsPointTwoHidden.classList.toggle("hidden");
    ctrlsPointTwoInner.classList.toggle("hidden");
    originPointCoordValueElems[1].innerHTML = "-";
    removeMarker(1);
    resetCoordinates(1);
    originPointCoords[1] = null;
});

formElem.addEventListener("submit", async (e) => {
    e.preventDefault();
    onStartComputeIsochrone?.();
    if (isFormSubmitted) {
        abortController.abort();
        abortController = new AbortController();
        return;
    }
    // if (isWorkersRunning) {
    workerAbortController.abort();
    for (let w of workers) {
        w.terminate();
    }
    workers = [];
    // }
    isWorkersRunning = true;
    isFormSubmitted = true;
    submitButton.classList.add("btn-cancel-request");
    submitButton.innerHTML = `<img src="./assets/images/target.png" width="20" height="20"> Annuler`;

    await displayIsochroneMap(0);
    if (originPointCoords[1] !== null) {
        await displayIsochroneMap(1, false);
    }

    isFormSubmitted = false;
    submitButton.classList.remove("btn-cancel-request");
    submitButton.innerHTML = `<img src="./assets/images/target.png" width="20" height="20"> Calculer`;
    
    onFinishComputeIsochrone?.();
});

legendControls_opacitySliders.forEach((ctrl) => {
    ctrl.addEventListener("input", () => {
        map.getPane("isochrones" + ctrl.dataset.isoindex).style.opacity =
            ctrl.value / 100;
    });
});

legend.addEventListener("click", (e) => {
    bringToFront(0);
});

legend2.addEventListener("click", (e) => {
    bringToFront(1);
});

toggleMaxDistanceCbx.addEventListener("change", (e) => {
    if (e.target.checked) {
        furthestMarkersLayerGroup.addTo(map);
    } else {
        map.removeLayer(furthestMarkersLayerGroup);
    }
});

init();
