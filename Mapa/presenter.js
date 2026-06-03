const MapPresenter = (() => {
let initialized = false;
let currentDataMode = null;
let refreshMapData = null;
let clearMapData = null;

async function init() {
if (initialized) {
  const dataMode = window.AppSession?.isGuest ? "guest" : "authenticated";
  if (currentDataMode !== dataMode && refreshMapData) {
    await refreshMapData();
  }
  return;
}
initialized = true;

const info = document.getElementById("info");
const mapContainer = document.getElementById("mapContainer");
const mapContent = document.getElementById("mapContent");
const overlay = document.querySelector(".overlay");
const debugInfo = document.getElementById("debugInfo");
const menuToggle = document.getElementById("menuToggle");
const sideMenu = document.getElementById("sideMenu");
const menuContent = document.getElementById("menuContent");
const addLocationToggle = document.getElementById("addLocationToggle");
const regionsToggle = document.getElementById("regionsToggle");
const defaultLocationVisibilityToggle = document.getElementById("defaultLocationVisibilityToggle");
const addLocationDialog = document.getElementById("addLocationDialog");
const addLocationForm = document.getElementById("addLocationForm");
const closeLocationDialog = document.getElementById("closeLocationDialog");
const cancelLocationDialog = document.getElementById("cancelLocationDialog");
const locationType = document.getElementById("locationType");
const locationVisibility = document.getElementById("locationVisibility");
const guestLocationWarning = document.getElementById("guestLocationWarning");

const DEBUG = false;

const MAP_WIDTH = 4614;
const MAP_HEIGHT = 4606;
const DEFAULT_LOCATION_DISABLED_COLOR = "#8b949e";

let scale = 1;
let minScale = 1;
const maxScale = 12;
const zoomInFactor = 1.23;
const zoomOutFactor = 0.9;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;
let dragStartX = 0;
let dragStartY = 0;
let hasDragged = false;
let suppressNextClick = false;


let pinchStartDistance = null;
let pinchStartScale = scale;
let debugClickedCoordinates = [];
let isMenuOpen = false;
let isAddingLocation = false;
let areRegionsVisible = true;
let areDefaultLocationsColored = true;
let pendingLocationCoordinates = null;
let editingLocationId = null;
let isSavingLocation = false;

function setMenuOpen(open) {
  isMenuOpen = open;
  sideMenu.classList.toggle("open", open);
  sideMenu.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
}

menuToggle.addEventListener("click", () => {
  setMenuOpen(!isMenuOpen);
});

function setAddingLocation(enabled) {
  isAddingLocation = enabled;
  addLocationToggle.classList.toggle("active", enabled);
  addLocationToggle.setAttribute("aria-pressed", String(enabled));
  mapContainer.classList.toggle("adding-location", enabled);
}

function setRegionsVisible(visible) {
  areRegionsVisible = visible;
  overlay.classList.toggle("regions-hidden", !visible);
  regionsToggle.classList.toggle("active", visible);
  regionsToggle.setAttribute("aria-pressed", String(visible));
  regionsToggle.setAttribute("aria-label", visible ? "Ocultar regiones" : "Mostrar regiones");
  regionsToggle.setAttribute("title", visible ? "Ocultar regiones" : "Mostrar regiones");

  if (!visible && document.querySelector(".region.active")) {
    closeInfo();
  }
}

function getLocationDisplayColor(location) {
  if (!areDefaultLocationsColored && location.editable === false) {
    return DEFAULT_LOCATION_DISABLED_COLOR;
  }

  return location.color || "#6f42c1";
}

function setDefaultLocationsColored(visible) {
  areDefaultLocationsColored = visible;
  defaultLocationVisibilityToggle.classList.toggle("active", visible);
  defaultLocationVisibilityToggle.setAttribute("aria-pressed", String(visible));
  renderLocations(window.Locations?.locations ?? []);
  renderLocationsMenu(window.Locations?.locations ?? []);
}

function populateLocationTypes() {
  locationType.innerHTML = "";

  if (!window.AppSession?.isGuest) {
    const fixedType = window.Locations?.getAuthenticatedLocationType?.() ?? "Quests & Story";
    const option = document.createElement("option");
    option.value = fixedType;
    option.textContent = fixedType;
    option.dataset.typeId = window.Locations?.AUTHENTICATED_LOCATION_TYPE_ID ?? "1";
    locationType.appendChild(option);
    locationType.value = fixedType;
    locationType.disabled = true;
    return;
  }

  locationType.disabled = false;
  (window.Locations?.locationTypes ?? []).forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    locationType.appendChild(option);
  });
}

function populateLocationVisibility() {
  locationVisibility.innerHTML = "";

  (window.Locations?.LOCATION_VISIBILITY_OPTIONS ?? [
    { id: 1, label: "Todos" },
    { id: 2, label: "Solo t\u00fa" }
  ]).forEach((visibility) => {
    const option = document.createElement("option");
    option.value = String(visibility.id);
    option.textContent = visibility.label;
    locationVisibility.appendChild(option);
  });

  locationVisibility.value = String(window.Locations?.LOCATION_VISIBILITY_ALL ?? 1);
}

function updateLocationFormMode() {
  const isGuest = Boolean(window.AppSession?.isGuest);
  guestLocationWarning?.classList.toggle("hidden", !isGuest);
  populateLocationTypes();
  populateLocationVisibility();
}

function focusFirstEditableLocationField() {
  if (locationType.disabled) {
    addLocationForm.elements.title.focus();
    return;
  }

  locationType.focus();
}

function getSelectedLocationType() {
  if (!window.AppSession?.isGuest) {
    return window.Locations?.getAuthenticatedLocationType?.() ?? locationType.value;
  }

  return locationType.value;
}

function getSelectedLocationTypeId() {
  if (window.AppSession?.isGuest) return undefined;
  return window.Locations?.AUTHENTICATED_LOCATION_TYPE_ID ?? "1";
}

function getLocationById(id) {
  return window.Locations.locations.find((location) => location.id === id);
}

function cancelLocationDialogState() {
  pendingLocationCoordinates = null;
  editingLocationId = null;
  addLocationForm.reset();
  if (addLocationDialog.open) {
    addLocationDialog.close();
  }
}

function openAddLocationDialog(mapX, mapY) {
  pendingLocationCoordinates = {
    x: Math.round(mapX),
    y: Math.round(mapY)
  };
  editingLocationId = null;
  addLocationForm.reset();
  updateLocationFormMode();
  addLocationForm.querySelector("h2").textContent = "Nueva localización";
  addLocationDialog.showModal();
  focusFirstEditableLocationField();
}

function openEditLocationDialog(location) {
  pendingLocationCoordinates = null;
  editingLocationId = location.id;
  addLocationForm.reset();
  updateLocationFormMode();
  addLocationForm.querySelector("h2").textContent = "Editar localización";
  addLocationForm.elements.type.value = getSelectedLocationType();
  addLocationForm.elements.visibility.value = String(location.visibility ?? window.Locations?.LOCATION_VISIBILITY_ALL ?? 1);
  addLocationForm.elements.title.value = location.title;
  addLocationForm.elements.info.value = location.info;
  addLocationForm.elements.reference.value = location.reference;
  addLocationDialog.showModal();
  focusFirstEditableLocationField();
}

addLocationToggle.addEventListener("click", () => {
  setAddingLocation(!isAddingLocation);
  if (!isAddingLocation) {
    cancelLocationDialogState();
  }
});

regionsToggle.addEventListener("click", () => {
  setRegionsVisible(!areRegionsVisible);
});

defaultLocationVisibilityToggle.addEventListener("click", () => {
  setDefaultLocationsColored(!areDefaultLocationsColored);
});

closeLocationDialog.addEventListener("click", cancelLocationDialogState);
cancelLocationDialog.addEventListener("click", cancelLocationDialogState);

addLocationDialog.addEventListener("close", () => {
  if (isSavingLocation) return;
  pendingLocationCoordinates = null;
  editingLocationId = null;
  addLocationForm.reset();
});

addLocationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSavingLocation) return;
  if (!pendingLocationCoordinates && !editingLocationId) return;

  isSavingLocation = true;
  try {
    const locationData = {
      type: getSelectedLocationType(),
      type_id: getSelectedLocationTypeId(),
      visibility: Number(addLocationForm.elements.visibility.value),
      title: addLocationForm.elements.title.value.trim(),
      info: addLocationForm.elements.info.value.trim(),
      reference: addLocationForm.elements.reference.value.trim()
    };

    const savedLocation = editingLocationId
      ? await window.Locations.updateLocation(editingLocationId, locationData)
      : await window.Locations.createLocation({
        ...pendingLocationCoordinates,
        ...locationData
      });

    renderLocations(window.Locations.locations);
    renderLocationsMenu(window.Locations.locations);
    pendingLocationCoordinates = null;
    editingLocationId = null;
    addLocationForm.reset();
    addLocationDialog.close();

    if (savedLocation) {
      const marker = document.querySelector(`.poi[data-location-id="${CSS.escape(savedLocation.id)}"]`);
      if (marker) {
        showFeatureInfo(marker);
      }
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "No se pudo guardar la localizacion.");
  } finally {
    isSavingLocation = false;
  }
});

function getMapCoordinates(clientX, clientY) {
  const rect = mapContainer.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;

  return {
    mapX: (localX - translateX) / scale,
    mapY: (localY - translateY) / scale
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateDebugVisibility() {
  debugInfo.classList.toggle("hidden", !DEBUG);
}

function updateDebugCoordinates(clientX, clientY) {
  if (!DEBUG) return;

  const { mapX, mapY } = getMapCoordinates(clientX, clientY);

  const isInsideMap = mapX >= 0 && mapX <= MAP_WIDTH && mapY >= 0 && mapY <= MAP_HEIGHT;

  if (!isInsideMap) {
    debugInfo.innerHTML = "<strong>Ratón fuera del mapa</strong>";
    return;
  }

  debugInfo.innerHTML = `
    <strong>Localización:</strong><br>
    X: ${mapX.toFixed(2)}<br>
    Y: ${mapY.toFixed(2)}
  `;
}

function clampTranslation() {
  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;
  const scaledWidth = MAP_WIDTH * scale;
  const scaledHeight = MAP_HEIGHT * scale;

  const minTranslateX = Math.min(0, containerWidth - scaledWidth);
  const minTranslateY = Math.min(0, containerHeight - scaledHeight);
  const maxTranslateX = scaledWidth <= containerWidth ? (containerWidth - scaledWidth) / 2 : 0;
  const maxTranslateY = scaledHeight <= containerHeight ? (containerHeight - scaledHeight) / 2 : 0;

  translateX = clamp(translateX, minTranslateX, maxTranslateX);
  translateY = clamp(translateY, minTranslateY, maxTranslateY);
}

function applyTransform() {
  clampTranslation();
  mapContent.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function calculateFitScale() {
  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;
  return Math.min(containerWidth / MAP_WIDTH, containerHeight / MAP_HEIGHT);
}

function fitMapToView() {
  minScale = calculateFitScale();
  scale = minScale;
  const scaledWidth = MAP_WIDTH * scale;
  const scaledHeight = MAP_HEIGHT * scale;
  translateX = (mapContainer.clientWidth - scaledWidth) / 2;
  translateY = (mapContainer.clientHeight - scaledHeight) / 2;
  applyTransform();
}

function zoomAt(clientX, clientY, deltaScale) {
  const rect = mapContainer.getBoundingClientRect();
  const pointX = clientX - rect.left;
  const pointY = clientY - rect.top;

  const prevScale = scale;
  scale = clamp(scale * deltaScale, minScale, maxScale);
  const ratio = scale / prevScale;

  translateX = pointX - (pointX - translateX) * ratio;
  translateY = pointY - (pointY - translateY) * ratio;

  applyTransform();
}

mapContainer.addEventListener("wheel", (event) => {
  event.preventDefault();
  const deltaScale = event.deltaY > 0 ? zoomOutFactor : zoomInFactor;
  zoomAt(event.clientX, event.clientY, deltaScale);
}, { passive: false });

mapContainer.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  isDragging = true;
  hasDragged = false;
  mapContainer.classList.add("dragging");
  lastX = event.clientX;
  lastY = event.clientY;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
});

window.addEventListener("mousemove", (event) => {
  updateDebugCoordinates(event.clientX, event.clientY);

  if (!isDragging) return;
  if (!hasDragged) {
    const dragDistance = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY);
    if (dragDistance > 3) {
      hasDragged = true;
    }
  }
  translateX += event.clientX - lastX;
  translateY += event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  applyTransform();
});

window.addEventListener("mouseup", () => {
  suppressNextClick = hasDragged;
  hasDragged = false;
  isDragging = false;
  mapContainer.classList.remove("dragging");
});

mapContainer.addEventListener("click", (event) => {
  if (DEBUG) {
    const { mapX, mapY } = getMapCoordinates(event.clientX, event.clientY);
    const isInsideMap = mapX >= 0 && mapX <= MAP_WIDTH && mapY >= 0 && mapY <= MAP_HEIGHT;

    if (isInsideMap) {
      debugClickedCoordinates.push(`${mapX.toFixed(2)},${mapY.toFixed(2)}`);
      console.log(debugClickedCoordinates.join(" "));
    }
  }

  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }

  if (isAddingLocation) {
    setAddingLocation(false);
    const { mapX, mapY } = getMapCoordinates(event.clientX, event.clientY);
    const isInsideMap = mapX >= 0 && mapX <= MAP_WIDTH && mapY >= 0 && mapY <= MAP_HEIGHT;

    if (isInsideMap && !addLocationDialog.open) {
      openAddLocationDialog(mapX, mapY);
    }
    return;
  }

  const clickedFeature = event.target.closest(".region, .poi");
  if (!clickedFeature) {
    closeInfo();
  }
});

mapContainer.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  if (DEBUG) {
    debugClickedCoordinates = [];
  }
});

mapContainer.addEventListener("touchstart", (event) => {
  if (event.touches.length === 1) {
    isDragging = true;
    lastX = event.touches[0].clientX;
    lastY = event.touches[0].clientY;
  }

  if (event.touches.length === 2) {
    pinchStartDistance = Math.hypot(
      event.touches[0].clientX - event.touches[1].clientX,
      event.touches[0].clientY - event.touches[1].clientY
    );
    pinchStartScale = scale;
  }
}, { passive: true });

mapContainer.addEventListener("touchmove", (event) => {
  if (event.touches.length === 1 && isDragging) {
    const touch = event.touches[0];
    translateX += touch.clientX - lastX;
    translateY += touch.clientY - lastY;
    lastX = touch.clientX;
    lastY = touch.clientY;
    applyTransform();
  }

  if (event.touches.length === 2 && pinchStartDistance) {
    const distance = Math.hypot(
      event.touches[0].clientX - event.touches[1].clientX,
      event.touches[0].clientY - event.touches[1].clientY
    );

    const midpointX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    const midpointY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

    const targetScale = clamp((distance / pinchStartDistance) * pinchStartScale, minScale, maxScale);
    const deltaScale = targetScale / scale;
    zoomAt(midpointX, midpointY, deltaScale);
  }
}, { passive: true });

mapContainer.addEventListener("touchend", (event) => {
  if (event.touches.length < 2) {
    pinchStartDistance = null;
  }
  if (event.touches.length === 0) {
    isDragging = false;
  }
});

window.addEventListener("resize", () => {
  const prevMinScale = minScale;
  minScale = calculateFitScale();

  if (scale < minScale || Math.abs(scale - prevMinScale) < 0.0001) {
    fitMapToView();
    return;
  }

  applyTransform();
});

function clearActiveFeatures() {
  document.querySelectorAll(".region").forEach((region) => region.classList.remove("active"));
  document.querySelectorAll(".poi").forEach((poi) => poi.classList.remove("active"));
}

function showFeatureInfo(feature) {
  clearActiveFeatures();
  feature.classList.add("active");
  const location = feature.classList.contains("poi") ? getLocationById(feature.dataset.locationId) : null;
  const canEditLocation = Boolean(location?.editable);
  const editableLocationActions = canEditLocation
    ? `
          <button type="button" class="info-icon-button info-edit" data-location-id="${location.id}" aria-label="Editar localizacion" title="Editar localizacion">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button type="button" class="info-icon-button info-delete" data-location-id="${location.id}" aria-label="Eliminar localizacion" title="Eliminar localizacion">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="m19 6-1 14H6L5 6" />
              <path d="M10 11v5" />
              <path d="M14 11v5" />
            </svg>
          </button>
        `
    : "";
  info.innerHTML = `
      <div class="info-header">
        <h2>${feature.dataset.title}</h2>
        <div class="info-actions">
          ${editableLocationActions}
          <button type="button" class="info-close" aria-label="Cerrar información">×</button>
        </div>
      </div>
      <div class="info-content">
        <p>${feature.dataset.info}</p>
      </div>
    `;
}

function centerMapOn(mapX, mapY) {
  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;
  translateX = (containerWidth / 2) - (mapX * scale);
  translateY = (containerHeight / 2) - (mapY * scale);
  applyTransform();
}

function closeInfo() {
  clearActiveFeatures();
  info.innerHTML = "Selecciona una región del mapa.";
}

info.addEventListener("click", (event) => {
  const editButton = event.target.closest(".info-edit");
  if (editButton) {
    const location = getLocationById(editButton.dataset.locationId);
    if (location?.editable) {
      openEditLocationDialog(location);
    }
    return;
  }

  const deleteButton = event.target.closest(".info-delete");
  if (deleteButton) {
    const location = getLocationById(deleteButton.dataset.locationId);
    if (!location?.editable) return;

    if (!confirm(`Eliminar la localización "${location.title}"?`)) return;

    window.Locations.deleteLocation(location.id)
      .then(() => {
        renderLocations(window.Locations.locations);
        renderLocationsMenu(window.Locations.locations);
        closeInfo();
      })
      .catch((error) => {
        console.error(error);
        alert(error.message || "No se pudo eliminar la localización.");
      });
    return;
  }

  const closeButton = event.target.closest(".info-close");
  if (!closeButton) return;
  closeInfo();
});

function renderRegions(regionList = []) {
  document.querySelectorAll(".region").forEach((region) => region.remove());

  regionList.forEach((regionData) => {
    const region = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    region.setAttribute("class", "region");
    region.setAttribute("points", regionData.points);
    region.dataset.title = regionData.title;
    region.dataset.info = regionData.info;

    region.addEventListener("click", () => {
      showFeatureInfo(region);
    });

    overlay.appendChild(region);
  });
}

function renderLocations(points = []) {
  document.querySelectorAll(".poi").forEach((poi) => poi.remove());

  points.forEach((location) => {
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
    marker.setAttribute("class", "poi");
    marker.setAttribute("transform", `translate(${location.x} ${location.y})`);
    marker.dataset.title = location.title;
    marker.dataset.info = location.info.replace(/<[^>]*>/g, "");
    marker.dataset.reference = location.reference;
    marker.dataset.type = location.type;
    marker.dataset.x = String(location.x);
    marker.dataset.y = String(location.y);
    marker.dataset.locationId = location.id;
    marker.dataset.editable = String(location.editable);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", "18");
    circle.setAttribute("fill", getLocationDisplayColor(location));

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "poi-label poi-label-light");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = location.reference;

    marker.append(circle, label);
    marker.addEventListener("click", () => {
      showFeatureInfo(marker);
    });

    overlay.appendChild(marker);
  });
}

function renderLocationsMenu(points = []) {
  menuContent.innerHTML = "";

  const grouped = points.reduce((acc, location) => {
    if (!acc[location.type]) {
      acc[location.type] = [];
    }
    acc[location.type].push(location);
    return acc;
  }, {});

  (window.Locations?.locationTypes ?? []).forEach((type) => {
    const items = grouped[type] ?? [];
    if (items.length === 0) return;

    items.sort((a, b) => Number(a.reference) - Number(b.reference));

    const group = document.createElement("section");
    group.className = "menu-group";
    const title = document.createElement("h3");
    title.textContent = type;
    const list = document.createElement("div");
    list.className = "menu-list";

    items.forEach((location) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "menu-item";
      button.innerHTML = `
        <span class="menu-item-label">
          <span class="menu-color-dot" style="background:${getLocationDisplayColor(location)}">${location.reference}</span>
          <span>${location.title}</span>
        </span>
      `;

      button.addEventListener("click", () => {
        const selector = `.poi[data-location-id="${CSS.escape(location.id)}"]`;
        const marker = document.querySelector(selector);
        if (!marker) return;
        showFeatureInfo(marker);
        centerMapOn(location.x, location.y);
      });

      list.appendChild(button);
    });

    group.append(title, list);
    menuContent.appendChild(group);
  });
}

refreshMapData = async () => {
  await window.Locations.load();
  if (!window.AppSession) {
    currentDataMode = null;
    return;
  }

  updateLocationFormMode();
  renderLocations(window.Locations?.locations ?? []);
  renderLocationsMenu(window.Locations?.locations ?? []);
  currentDataMode = window.AppSession?.isGuest ? "guest" : "authenticated";
};

clearMapData = () => {
  cancelLocationDialogState();
  setAddingLocation(false);
  setRegionsVisible(true);
  setDefaultLocationsColored(true);
  setMenuOpen(false);
  renderLocations([]);
  renderLocationsMenu([]);
  closeInfo();
  debugClickedCoordinates = [];
  isDragging = false;
  pinchStartDistance = null;
  currentDataMode = null;
};

mapContent.style.width = `${MAP_WIDTH}px`;
mapContent.style.height = `${MAP_HEIGHT}px`;
renderRegions(window.Regions?.regions ?? []);
setRegionsVisible(areRegionsVisible);
setDefaultLocationsColored(areDefaultLocationsColored);

try {
  await refreshMapData();
} catch (error) {
  console.error(error);
  info.textContent = window.AppSession?.isGuest
    ? "No se pudieron cargar las localizaciones por defecto."
    : "No se pudieron cargar las localizaciones del servidor.";
  return;
}

updateDebugVisibility();
fitMapToView();

}

return {
  init,
  clearData() {
    currentDataMode = null;
    clearMapData?.();
  },
};
})();

window.MapPresenter = MapPresenter;
