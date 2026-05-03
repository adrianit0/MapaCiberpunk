const regions = document.querySelectorAll(".region");
const info = document.getElementById("info");
const mapContainer = document.getElementById("mapContainer");
const mapContent = document.getElementById("mapContent");
const overlay = document.querySelector(".overlay");
const debugInfo = document.getElementById("debugInfo");

const DEBUG = true;

const MAP_WIDTH = 4614;
const MAP_HEIGHT = 4606;

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

let pinchStartDistance = null;
let pinchStartScale = scale;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateDebugVisibility() {
  debugInfo.classList.toggle("hidden", !DEBUG);
}

function updateDebugCoordinates(clientX, clientY) {
  if (!DEBUG) return;

  const rect = mapContainer.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const mapX = (localX - translateX) / scale;
  const mapY = (localY - translateY) / scale;

  const isInsideMap = mapX >= 0 && mapX <= MAP_WIDTH && mapY >= 0 && mapY <= MAP_HEIGHT;

  if (!isInsideMap) {
    debugInfo.innerHTML = "<strong>Ratón fuera del mapa</strong>";
    return;
  }

  debugInfo.innerHTML = `
    <strong>Debug</strong><br>
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
  mapContainer.classList.add("dragging");
  lastX = event.clientX;
  lastY = event.clientY;
});

window.addEventListener("mousemove", (event) => {
  updateDebugCoordinates(event.clientX, event.clientY);

  if (!isDragging) return;
  translateX += event.clientX - lastX;
  translateY += event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  applyTransform();
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.classList.remove("dragging");
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
  regions.forEach((region) => region.classList.remove("active"));
  document.querySelectorAll(".poi").forEach((poi) => poi.classList.remove("active"));
}

function showFeatureInfo(feature) {
  clearActiveFeatures();
  feature.classList.add("active");

  info.innerHTML = `
      <h2>${feature.dataset.title}</h2>
      <p>${feature.dataset.info}</p>
    `;
}

regions.forEach((region) => {
  region.addEventListener("click", () => {
    showFeatureInfo(region);
  });
});

function renderLocations(points = []) {
  document.querySelectorAll(".poi").forEach((poi) => poi.remove());

  points.forEach((location) => {
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
    marker.setAttribute("class", "poi");
    marker.setAttribute("transform", `translate(${location.x} ${location.y})`);
    marker.dataset.title = location.title;
    marker.dataset.info = location.info.replace(/<[^>]*>/g, "");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", "18");
    circle.setAttribute("fill", location.color || "#6f42c1");

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "poi-label poi-label-dark");
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

mapContent.style.width = `${MAP_WIDTH}px`;
mapContent.style.height = `${MAP_HEIGHT}px`;
renderLocations(window.Locations?.locations ?? []);
updateDebugVisibility();
fitMapToView();
