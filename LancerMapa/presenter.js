const LancerMapaPresenter = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const REFRESH_INTERVAL_MS = 30000;
  const SQRT3 = Math.sqrt(3);

  let initialized = false;
  let refreshTimer = null;
  let state = { map: null, characters: [], tokens: [] };
  let scale = 1;
  let minScale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDraggingViewport = false;
  let isDraggingToken = false;
  let dragToken = null;
  let dragTokenOrigin = null;
  let selectedCharacterId = null;
  let measureMode = false;
  let measureStart = null;
  let lastPointer = { x: 0, y: 0 };
  let elements = {};

  function normalizeRoleName(roleName) {
    return String(roleName ?? "").trim().toLowerCase();
  }

  function canEdit() {
    return (window.AppSession?.profile?.roles ?? [])
      .map((role) => normalizeRoleName(role?.name ?? role))
      .some((role) => role === "admin" || role === "master");
  }

  function setStatus(message) {
    if (elements.status) elements.status.textContent = message;
  }

  function getMapImageUrl(map) {
    if (!map) return "";
    if (map.image_url) return map.image_url;
    return window.Auth.getClient().storage.from("lancer-mapa").getPublicUrl(map.image_path).data.publicUrl;
  }

  function hexToPixel(q, r, map = state.map) {
    const size = Number(map?.hex_size ?? 52);
    const originX = Number(map?.grid_origin_x ?? 0);
    const originY = Number(map?.grid_origin_y ?? 0);
    const radians = Number(map?.grid_rotation ?? 0) * Math.PI / 180;
    const baseX = size * SQRT3 * (q + r / 2);
    const baseY = size * 1.5 * r;

    return {
      x: originX + baseX * Math.cos(radians) - baseY * Math.sin(radians),
      y: originY + baseX * Math.sin(radians) + baseY * Math.cos(radians),
    };
  }

  function pixelToHex(x, y, map = state.map) {
    const size = Number(map?.hex_size ?? 52);
    const radians = -Number(map?.grid_rotation ?? 0) * Math.PI / 180;
    const dx = x - Number(map?.grid_origin_x ?? 0);
    const dy = y - Number(map?.grid_origin_y ?? 0);
    const px = dx * Math.cos(radians) - dy * Math.sin(radians);
    const py = dx * Math.sin(radians) + dy * Math.cos(radians);
    const q = (SQRT3 / 3 * px - 1 / 3 * py) / size;
    const r = (2 / 3 * py) / size;
    return roundAxial(q, r);
  }

  function roundAxial(q, r) {
    let x = q;
    let z = r;
    let y = -x - z;
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);
    const xDiff = Math.abs(rx - x);
    const yDiff = Math.abs(ry - y);
    const zDiff = Math.abs(rz - z);

    if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
    else if (yDiff > zDiff) ry = -rx - rz;
    else rz = -rx - ry;

    return { q: rx, r: rz };
  }

  function getHexDistance(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }

  function isCellInsideMap(cell) {
    if (!state.map) return false;
    const center = hexToPixel(cell.q, cell.r);
    return center.x >= 0
      && center.y >= 0
      && center.x <= Number(state.map.image_width)
      && center.y <= Number(state.map.image_height);
  }

  function isCellOccupied(cell, ignoredTokenId = null) {
    return state.tokens.some((token) => {
      if (ignoredTokenId && token.id === ignoredTokenId) return false;
      return Number(token.q) === cell.q && Number(token.r) === cell.r;
    });
  }

  function canDropTokenAt(cell, ignoredTokenId = null) {
    return isCellInsideMap(cell) && !isCellOccupied(cell, ignoredTokenId);
  }

  function getHexPoints(cx, cy, size, rotation = 0) {
    return Array.from({ length: 6 }, (_, index) => {
      const angle = Math.PI / 180 * (60 * index - 30 + rotation);
      return `${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`;
    }).join(" ");
  }

  function getMapCoordinates(clientX, clientY) {
    const rect = elements.viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - translateX) / scale,
      y: (clientY - rect.top - translateY) / scale,
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function applyTransform() {
    elements.content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  function fitMap() {
    if (!state.map) return;
    minScale = Math.min(
      elements.viewport.clientWidth / Number(state.map.image_width),
      elements.viewport.clientHeight / Number(state.map.image_height),
    );
    scale = Math.max(minScale, scale || minScale);
    translateX = (elements.viewport.clientWidth - Number(state.map.image_width) * scale) / 2;
    translateY = (elements.viewport.clientHeight - Number(state.map.image_height) * scale) / 2;
    applyTransform();
  }

  function zoomAt(clientX, clientY, factor) {
    if (!state.map) return;
    const rect = elements.viewport.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const previous = scale;
    scale = clamp(scale * factor, minScale, 5);
    const ratio = scale / previous;
    translateX = x - (x - translateX) * ratio;
    translateY = y - (y - translateY) * ratio;
    applyTransform();
  }

  function renderHexGrid() {
    [...elements.overlay.querySelectorAll(".lancer-hex,.lancer-measure-line,.lancer-measure-text")].forEach((node) => node.remove());
    if (!state.map) return;

    const width = Number(state.map.image_width);
    const height = Number(state.map.image_height);
    const size = Number(state.map.hex_size);
    const colWidth = size * SQRT3;
    const rowHeight = size * 1.5;
    const maxRadius = Math.hypot(width, height) + Math.hypot(
      Number(state.map.grid_origin_x ?? 0),
      Number(state.map.grid_origin_y ?? 0),
    );
    const qMin = Math.floor(-maxRadius / colWidth) - 6;
    const qMax = Math.ceil(maxRadius / colWidth) + 6;
    const rMin = Math.floor(-maxRadius / rowHeight) - 6;
    const rMax = Math.ceil(maxRadius / rowHeight) + 6;

    for (let r = rMin; r <= rMax; r += 1) {
      for (let q = qMin; q <= qMax; q += 1) {
        const center = hexToPixel(q, r);
        if (center.x < -size || center.y < -size || center.x > width + size || center.y > height + size) continue;
        const hex = document.createElementNS(SVG_NS, "polygon");
        hex.setAttribute("class", "lancer-hex");
        hex.setAttribute("points", getHexPoints(center.x, center.y, size, Number(state.map.grid_rotation ?? 0)));
        hex.dataset.q = String(q);
        hex.dataset.r = String(r);
        elements.overlay.appendChild(hex);
      }
    }
  }

  function getCharacter(characterId) {
    return state.characters.find((character) => character.id === characterId) ?? null;
  }

  function getCharacterImageUrl(character) {
    if (!character) return "";
    if (character.image_url) return character.image_url;
    return window.Auth.getClient().storage.from("lancer-mapa").getPublicUrl(character.image_path).data.publicUrl;
  }

  function renderTokens() {
    [...elements.overlay.querySelectorAll(".lancer-token")].forEach((node) => node.remove());
    if (!state.map) return;

    state.tokens.forEach((token) => {
      const character = getCharacter(token.character_id);
      if (!character) return;
      const center = hexToPixel(Number(token.q), Number(token.r));
      const radius = Number(state.map.hex_size) * 0.62;
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", "lancer-token");
      group.setAttribute("transform", `translate(${center.x} ${center.y})`);
      group.dataset.tokenId = token.id;
      group.dataset.characterId = character.id;

      const ring = document.createElementNS(SVG_NS, "circle");
      ring.setAttribute("class", "lancer-token-ring");
      ring.setAttribute("r", String(radius));

      const image = document.createElementNS(SVG_NS, "image");
      image.setAttribute("href", getCharacterImageUrl(character));
      image.setAttribute("x", String(-radius));
      image.setAttribute("y", String(-radius));
      image.setAttribute("width", String(radius * 2));
      image.setAttribute("height", String(radius * 2));
      image.setAttribute("preserveAspectRatio", "xMidYMid slice");

      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("class", "lancer-token-label");
      label.setAttribute("y", String(radius + 6));
      label.textContent = token.label || character.name;

      group.append(ring, image, label);
      elements.overlay.appendChild(group);
    });
  }

  function renderTray() {
    elements.tray.replaceChildren();
    elements.tray.classList.toggle("hidden", !canEdit());
    if (!canEdit()) return;

    state.characters.forEach((character) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lancer-character-card";
      button.dataset.characterId = character.id;
      button.classList.toggle("active", selectedCharacterId === character.id);
      button.innerHTML = `<img src="${getCharacterImageUrl(character)}" alt=""><span>${character.name}</span>`;
      button.addEventListener("click", () => {
        selectedCharacterId = selectedCharacterId === character.id ? null : character.id;
        renderTray();
        setStatus(selectedCharacterId ? "Selecciona una casilla para colocar el personaje." : "");
      });
      elements.tray.appendChild(button);
    });
  }

  function showTokenInfo(tokenId) {
    const token = state.tokens.find((item) => item.id === tokenId);
    const character = token ? getCharacter(token.character_id) : null;
    if (!token || !character) return;
    elements.info.innerHTML = `<h3>${character.name}</h3><p>Casilla: q ${token.q}, r ${token.r}</p><p>Distancia: cada separacion hexagonal equivale a 1m.</p>`;
  }

  function renderAll() {
    if (!state.map) {
      elements.image.removeAttribute("src");
      elements.info.textContent = "No hay ningun mapa Lancer activo.";
      elements.tray.replaceChildren();
      elements.overlay.replaceChildren();
      return;
    }

    elements.content.style.width = `${state.map.image_width}px`;
    elements.content.style.height = `${state.map.image_height}px`;
    elements.overlay.setAttribute("viewBox", `0 0 ${state.map.image_width} ${state.map.image_height}`);
    elements.image.src = getMapImageUrl(state.map);
    renderHexGrid();
    renderTokens();
    renderTray();
  }

  async function refresh(options = {}) {
    state = await window.LancerMapaAjax.getState(options);
    renderAll();
    if (options.fit !== false) fitMap();
    setStatus(`Actualizado ${new Date().toLocaleTimeString()}`);
  }

  async function placeToken(characterId, q, r) {
    if (!state.map || !canEdit()) return;
    state = await window.LancerMapaAjax.upsertToken({ map_id: state.map.id, character_id: characterId, q, r });
    renderAll();
    setStatus("Pieza actualizada.");
  }

  function handleHexClick(hex) {
    const cell = { q: Number(hex.dataset.q), r: Number(hex.dataset.r) };

    if (measureMode) {
      if (!measureStart) {
        measureStart = cell;
        hex.classList.add("measure-selected");
        setStatus("Selecciona la segunda casilla.");
        return;
      }
      const start = hexToPixel(measureStart.q, measureStart.r);
      const end = hexToPixel(cell.q, cell.r);
      const distance = getHexDistance(measureStart, cell);
      renderHexGrid();
      renderTokens();
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("class", "lancer-measure-line");
      line.setAttribute("x1", start.x);
      line.setAttribute("y1", start.y);
      line.setAttribute("x2", end.x);
      line.setAttribute("y2", end.y);
      elements.overlay.appendChild(line);
      setStatus(`${distance}m`);
      measureStart = null;
      return;
    }

    if (selectedCharacterId && canEdit()) {
      if (!canDropTokenAt(cell)) {
        setStatus("Casilla no permitida: fuera del mapa u ocupada.");
        return;
      }

      placeToken(selectedCharacterId, cell.q, cell.r);
      selectedCharacterId = null;
      renderTray();
    }
  }

  function bindEvents() {
    elements.measureToggle.addEventListener("click", () => {
      measureMode = !measureMode;
      measureStart = null;
      elements.measureToggle.setAttribute("aria-pressed", String(measureMode));
      setStatus(measureMode ? "Selecciona la primera casilla." : "");
      renderAll();
    });

    elements.refresh.addEventListener("click", () => refresh({ showLoading: true, fit: false }));

    elements.viewport.addEventListener("wheel", (event) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY > 0 ? 0.9 : 1.15);
    }, { passive: false });

    elements.viewport.addEventListener("pointerdown", (event) => {
      const token = event.target.closest?.(".lancer-token");
      if (token && canEdit() && event.button === 0) {
        isDraggingToken = true;
        dragToken = token;
        dragTokenOrigin = {
          tokenId: token.dataset.tokenId,
          characterId: token.dataset.characterId,
          transform: token.getAttribute("transform"),
        };
        token.classList.add("dragging");
        elements.viewport.setPointerCapture(event.pointerId);
        return;
      }

      if (event.button !== 0) return;
      isDraggingViewport = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      elements.viewport.classList.add("dragging");
      elements.viewport.setPointerCapture(event.pointerId);
    });

    elements.viewport.addEventListener("pointermove", (event) => {
      if (isDraggingToken && dragToken) {
        const point = getMapCoordinates(event.clientX, event.clientY);
        dragToken.setAttribute("transform", `translate(${point.x} ${point.y})`);
        return;
      }

      if (!isDraggingViewport) return;
      translateX += event.clientX - lastPointer.x;
      translateY += event.clientY - lastPointer.y;
      lastPointer = { x: event.clientX, y: event.clientY };
      applyTransform();
    });

    elements.viewport.addEventListener("pointerup", (event) => {
      if (isDraggingToken && dragToken) {
        const point = getMapCoordinates(event.clientX, event.clientY);
        const cell = pixelToHex(point.x, point.y);
        const characterId = dragToken.dataset.characterId;
        const tokenId = dragToken.dataset.tokenId;
        const originalTransform = dragTokenOrigin?.transform ?? "";
        dragToken.classList.remove("dragging");
        isDraggingToken = false;
        dragToken = null;

        if (!canDropTokenAt(cell, tokenId)) {
          event.preventDefault();
          const token = elements.overlay.querySelector(`.lancer-token[data-token-id="${CSS.escape(tokenId)}"]`);
          token?.setAttribute("transform", originalTransform);
          dragTokenOrigin = null;
          setStatus("Movimiento cancelado: casilla fuera del mapa u ocupada.");
          return;
        }

        dragTokenOrigin = null;
        placeToken(characterId, cell.q, cell.r).catch((error) => {
          console.error(error);
          renderTokens();
          setStatus(error.message || "No se pudo mover la ficha.");
        });
      }

      isDraggingViewport = false;
      elements.viewport.classList.remove("dragging");
    });

    elements.overlay.addEventListener("click", (event) => {
      const hex = event.target.closest?.(".lancer-hex");
      if (hex) handleHexClick(hex);
    });

    elements.overlay.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const token = event.target.closest?.(".lancer-token");
      if (token) showTokenInfo(token.dataset.tokenId);
    });

    window.addEventListener("resize", fitMap);
  }

  async function init() {
    elements = {
      viewport: document.getElementById("lancerMapViewport"),
      content: document.getElementById("lancerMapContent"),
      image: document.getElementById("lancerMapImage"),
      overlay: document.getElementById("lancerMapOverlay"),
      info: document.getElementById("lancerMapInfo"),
      tray: document.getElementById("lancerCharacterTray"),
      status: document.getElementById("lancerMapStatus"),
      measureToggle: document.getElementById("lancerMapMeasureToggle"),
      refresh: document.getElementById("lancerMapRefresh"),
    };

    if (!initialized) {
      initialized = true;
      bindEvents();
    }

    await refresh({ showLoading: true });
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => refresh({ fit: false }).catch(console.warn), REFRESH_INTERVAL_MS);
  }

  function clearData() {
    clearInterval(refreshTimer);
    refreshTimer = null;
    state = { map: null, characters: [], tokens: [] };
    selectedCharacterId = null;
    measureMode = false;
    measureStart = null;
  }

  return { init, clearData };
})();

window.LancerMapaPresenter = LancerMapaPresenter;
