const regions = document.querySelectorAll(".region");
const pois = document.querySelectorAll(".poi");
const info = document.getElementById("info");
const mapContainer = document.getElementById("mapContainer");
const mapContent = document.getElementById("mapContent");

let scale = 1;
let translateX = 0;
let translateY = 0;
const minScale = 1;
const maxScale = 4;
let isDragging = false;
let lastX = 0;
let lastY = 0;

let pinchStartDistance = null;
let pinchStartScale = scale;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyTransform() {
  mapContent.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
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
  const deltaScale = event.deltaY > 0 ? 0.92 : 1.08;
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

function clearActiveFeatures() {
  regions.forEach((region) => region.classList.remove("active"));
  pois.forEach((poi) => poi.classList.remove("active"));
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

pois.forEach((poi) => {
  poi.addEventListener("click", () => {
    showFeatureInfo(poi);
  });
});

applyTransform();
