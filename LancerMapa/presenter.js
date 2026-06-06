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
  let isDraggingNewToken = false;
  let dragNewCharacter = null;
  let dragGhost = null;
  let measureMode = false;
  let measureStart = null;
  let isMeasuring = false;
  let measureLine = null;
  let measureLabel = null;
  let lastPointer = { x: 0, y: 0 };
  let elements = {};
  const tokenSaveRequests = new Map();

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

  function getHexFromClientPoint(clientX, clientY) {
    const point = getMapCoordinates(clientX, clientY);
    return pixelToHex(point.x, point.y);
  }

  function isCellInsideMap(cell) {
    if (!state.map) return false;
    const center = hexToPixel(cell.q, cell.r);
    return center.x >= 0
      && center.y >= 0
      && center.x <= Number(state.map.image_width)
      && center.y <= Number(state.map.image_height);
  }

  function isClientPointInsideViewport(clientX, clientY) {
    const rect = elements.viewport.getBoundingClientRect();
    return clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom;
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

  function clearMeasureOverlay() {
    measureLine?.remove();
    measureLabel?.remove();
    measureLine = null;
    measureLabel = null;
    elements.overlay?.querySelectorAll(".lancer-hex.measure-selected").forEach((hex) => {
      hex.classList.remove("measure-selected");
    });
  }

  function updateMeasureOverlay(targetCell) {
    if (!measureStart || !state.map) return;
    clearMeasureOverlay();
    const startHex = elements.overlay.querySelector(`.lancer-hex[data-q="${measureStart.q}"][data-r="${measureStart.r}"]`);
    startHex?.classList.add("measure-selected");

    const start = hexToPixel(measureStart.q, measureStart.r);
    const end = hexToPixel(targetCell.q, targetCell.r);
    const distance = getHexDistance(measureStart, targetCell);

    measureLine = document.createElementNS(SVG_NS, "line");
    measureLine.setAttribute("class", "lancer-measure-line");
    measureLine.setAttribute("x1", start.x);
    measureLine.setAttribute("y1", start.y);
    measureLine.setAttribute("x2", end.x);
    measureLine.setAttribute("y2", end.y);

    measureLabel = document.createElementNS(SVG_NS, "text");
    measureLabel.setAttribute("class", "lancer-measure-text");
    measureLabel.setAttribute("x", String((start.x + end.x) / 2));
    measureLabel.setAttribute("y", String((start.y + end.y) / 2 - 10));
    measureLabel.textContent = `${distance}m`;

    elements.overlay.append(measureLine, measureLabel);
    setStatus(`${distance}m`);
  }

  function getHexPoints(cx, cy, size, rotation = 0) {
    return Array.from({ length: 6 }, (_, index) => {
      const angle = Math.PI / 180 * (60 * index - 30 + rotation);
      return `${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`;
    }).join(" ");
  }

  function createTokenGhost(character, x, y) {
    if (!state.map || !character) return null;
    const radius = Number(state.map.hex_size) * 0.62;
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "lancer-token lancer-token-ghost dragging");
    group.setAttribute("transform", `translate(${x} ${y})`);

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

    group.append(ring, image);
    elements.overlay.appendChild(group);
    return group;
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

  function getTokenByCharacterId(characterId) {
    return state.tokens.find((token) => token.character_id === characterId) ?? null;
  }

  function getTokenById(tokenId) {
    return state.tokens.find((token) => token.id === tokenId) ?? null;
  }

  function mergePendingTokenPositions(nextState) {
    const pendingByCharacterId = new Map(
      [...tokenSaveRequests.entries()].map(([characterId, request]) => [characterId, request.cell]),
    );

    return {
      ...nextState,
      tokens: (nextState.tokens ?? []).map((token) => {
        const pendingCell = pendingByCharacterId.get(token.character_id);
        return pendingCell ? { ...token, ...pendingCell } : token;
      }),
    };
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
    elements.tray.classList.toggle("measure-disabled", measureMode);
    if (!canEdit()) return;

    state.characters.forEach((character) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lancer-character-card";
      button.dataset.characterId = character.id;
      button.innerHTML = `<img src="${getCharacterImageUrl(character)}" alt=""><span>${character.name}</span>`;
      button.addEventListener("pointerdown", (event) => {
        if (measureMode) return;
        if (!state.map || event.button !== 0) return;
        event.preventDefault();
        isDraggingNewToken = true;
        dragNewCharacter = character;
        const point = getMapCoordinates(event.clientX, event.clientY);
        dragGhost = createTokenGhost(character, point.x, point.y);
        button.classList.add("dragging");
        setStatus("Arrastra el personaje al mapa y suelta en una casilla valida.");
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
    state = mergePendingTokenPositions(await window.LancerMapaAjax.getState(options));
    renderAll();
    if (options.fit !== false) fitMap();
    setStatus(`Actualizado ${new Date().toLocaleTimeString()}`);
  }

  function setTokenVisualPosition(tokenId, cell) {
    const tokenElement = elements.overlay.querySelector(`.lancer-token[data-token-id="${CSS.escape(tokenId)}"]`);
    const center = hexToPixel(cell.q, cell.r);
    tokenElement?.setAttribute("transform", `translate(${center.x} ${center.y})`);
  }

  function updateLocalTokenPosition(characterId, cell) {
    state = {
      ...state,
      tokens: state.tokens.map((token) => (
        token.character_id === characterId
          ? { ...token, q: cell.q, r: cell.r }
          : token
      )),
    };
  }

  async function placeToken(characterId, q, r, options = {}) {
    if (!state.map || !canEdit()) return;
    const nextState = await window.LancerMapaAjax.upsertToken(
      { map_id: state.map.id, character_id: characterId, q, r },
      { signal: options.signal },
    );

    if (options.apply !== false) {
      state = mergePendingTokenPositions(nextState);
      renderAll();
      setStatus("Pieza actualizada.");
    }

    return nextState;
  }

  function saveTokenPositionOptimistically(characterId, cell, options = {}) {
    if (!state.map || !canEdit()) return Promise.resolve();

    const previousRequest = tokenSaveRequests.get(characterId);
    previousRequest?.controller.abort();

    const operationId = crypto.randomUUID();
    const controller = new AbortController();
    const currentToken = getTokenByCharacterId(characterId);
    const previousToken = currentToken ? { ...currentToken } : null;

    tokenSaveRequests.set(characterId, {
      operationId,
      controller,
      previousToken,
      cell,
    });

    if (currentToken) {
      updateLocalTokenPosition(characterId, cell);
      setTokenVisualPosition(currentToken.id, cell);
    }

    return placeToken(characterId, cell.q, cell.r, { signal: controller.signal, apply: false })
      .then((nextState) => {
        const activeRequest = tokenSaveRequests.get(characterId);
        if (!activeRequest || activeRequest.operationId !== operationId) {
          return null;
        }

        tokenSaveRequests.delete(characterId);
        state = mergePendingTokenPositions(nextState);
        renderAll();
        setStatus(options.successMessage ?? "Pieza actualizada.");
        return nextState;
      })
      .catch((error) => {
        const activeRequest = tokenSaveRequests.get(characterId);
        if (!activeRequest || activeRequest.operationId !== operationId) {
          return null;
        }

        tokenSaveRequests.delete(characterId);

        if (error?.name === "AbortError") {
          return null;
        }

        if (previousToken) {
          updateLocalTokenPosition(characterId, { q: Number(previousToken.q), r: Number(previousToken.r) });
          setTokenVisualPosition(previousToken.id, { q: Number(previousToken.q), r: Number(previousToken.r) });
        } else {
          renderTokens();
        }

        throw error;
      });
  }

  function handleHexClick(hex) {
    if (measureMode || !hex) return;

  }

  function bindEvents() {
    elements.measureToggle.addEventListener("click", () => {
      measureMode = !measureMode;
      measureStart = null;
      isMeasuring = false;
      clearMeasureOverlay();
      renderTray();
      elements.measureToggle.setAttribute("aria-pressed", String(measureMode));
      setStatus(measureMode ? "Manten pulsada una casilla y arrastra para medir." : "");
    });

    elements.refresh.addEventListener("click", () => refresh({ showLoading: true, fit: false }));

    elements.viewport.addEventListener("wheel", (event) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY > 0 ? 0.9 : 1.15);
    }, { passive: false });

    elements.viewport.addEventListener("pointerdown", (event) => {
      if (measureMode && event.button === 0) {
        const hex = event.target.closest?.(".lancer-hex");
        if (!hex) return;
        event.preventDefault();
        measureStart = { q: Number(hex.dataset.q), r: Number(hex.dataset.r) };
        isMeasuring = true;
        hex.classList.add("measure-selected");
        updateMeasureOverlay(measureStart);
        elements.viewport.setPointerCapture(event.pointerId);
        return;
      }

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
      if (isMeasuring && measureStart) {
        const cell = getHexFromClientPoint(event.clientX, event.clientY);
        if (isCellInsideMap(cell)) {
          updateMeasureOverlay(cell);
        }
        return;
      }

      if (isDraggingToken && dragToken) {
        const point = getMapCoordinates(event.clientX, event.clientY);
        dragToken.setAttribute("transform", `translate(${point.x} ${point.y})`);
        return;
      }

      if (isDraggingNewToken && dragGhost) {
        const point = getMapCoordinates(event.clientX, event.clientY);
        dragGhost.setAttribute("transform", `translate(${point.x} ${point.y})`);
        return;
      }

      if (!isDraggingViewport) return;
      translateX += event.clientX - lastPointer.x;
      translateY += event.clientY - lastPointer.y;
      lastPointer = { x: event.clientX, y: event.clientY };
      applyTransform();
    });

    elements.viewport.addEventListener("pointerup", (event) => {
      if (isMeasuring) {
        event.preventDefault();
        isMeasuring = false;
        const cell = getHexFromClientPoint(event.clientX, event.clientY);
        if (isClientPointInsideViewport(event.clientX, event.clientY) && isCellInsideMap(cell)) {
          updateMeasureOverlay(cell);
        }
        return;
      }

      if (isDraggingToken && dragToken) {
        const point = getMapCoordinates(event.clientX, event.clientY);
        const cell = pixelToHex(point.x, point.y);
        const characterId = dragToken.dataset.characterId;
        const tokenId = dragToken.dataset.tokenId;
        const originalTransform = dragTokenOrigin?.transform ?? "";
        dragToken.classList.remove("dragging");
        isDraggingToken = false;
        dragToken = null;

        if (!isClientPointInsideViewport(event.clientX, event.clientY) || !canDropTokenAt(cell, tokenId)) {
          event.preventDefault();
          const token = elements.overlay.querySelector(`.lancer-token[data-token-id="${CSS.escape(tokenId)}"]`);
          token?.setAttribute("transform", originalTransform);
          dragTokenOrigin = null;
          setStatus("Movimiento cancelado: casilla fuera del mapa u ocupada.");
          return;
        }

        dragTokenOrigin = null;
        saveTokenPositionOptimistically(characterId, cell).catch((error) => {
          console.error(error);
          setStatus(error.message || "No se pudo mover la ficha.");
        });
      }

      if (isDraggingNewToken && dragNewCharacter) {
        const point = getMapCoordinates(event.clientX, event.clientY);
        const cell = pixelToHex(point.x, point.y);
        const characterId = dragNewCharacter.id;

        isDraggingNewToken = false;
        dragNewCharacter = null;
        dragGhost?.remove();
        dragGhost = null;
        document.querySelectorAll(".lancer-character-card.dragging").forEach((card) => card.classList.remove("dragging"));

        if (!isClientPointInsideViewport(event.clientX, event.clientY) || !canDropTokenAt(cell)) {
          event.preventDefault();
          setStatus("Movimiento cancelado: casilla fuera del mapa u ocupada.");
          return;
        }

        placeToken(characterId, cell.q, cell.r).catch((error) => {
          console.error(error);
          renderTokens();
          setStatus(error.message || "No se pudo anadir la ficha.");
        });
      }

      isDraggingViewport = false;
      elements.viewport.classList.remove("dragging");
    });

    elements.overlay.addEventListener("click", (event) => {
      const hex = event.target.closest?.(".lancer-hex");
      if (hex) handleHexClick(hex);
    });

    window.addEventListener("pointermove", (event) => {
      if (!isDraggingNewToken || !dragGhost) return;
      const point = getMapCoordinates(event.clientX, event.clientY);
      dragGhost.setAttribute("transform", `translate(${point.x} ${point.y})`);
    });

    window.addEventListener("pointerup", (event) => {
      if (!isDraggingNewToken || !dragNewCharacter) return;
      const point = getMapCoordinates(event.clientX, event.clientY);
      const cell = pixelToHex(point.x, point.y);
      const characterId = dragNewCharacter.id;

      isDraggingNewToken = false;
      dragNewCharacter = null;
      dragGhost?.remove();
      dragGhost = null;
      document.querySelectorAll(".lancer-character-card.dragging").forEach((card) => card.classList.remove("dragging"));

      if (!isClientPointInsideViewport(event.clientX, event.clientY) || !canDropTokenAt(cell)) {
        event.preventDefault();
        setStatus("Movimiento cancelado: casilla fuera del mapa u ocupada.");
        return;
      }

      placeToken(characterId, cell.q, cell.r).catch((error) => {
        console.error(error);
        renderTokens();
        setStatus(error.message || "No se pudo anadir la ficha.");
      });
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
    tokenSaveRequests.forEach((request) => request.controller.abort());
    tokenSaveRequests.clear();
    clearInterval(refreshTimer);
    refreshTimer = null;
    state = { map: null, characters: [], tokens: [] };
    isDraggingNewToken = false;
    dragNewCharacter = null;
    dragGhost?.remove();
    dragGhost = null;
    measureMode = false;
    measureStart = null;
    isMeasuring = false;
    clearMeasureOverlay();
  }

  return { init, clearData };
})();

window.LancerMapaPresenter = LancerMapaPresenter;
