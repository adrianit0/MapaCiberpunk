const AdminMapaLancerPresenter = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SQRT3 = Math.sqrt(3);

  let initialized = false;
  let payload = { maps: [], characters: [] };
  let selectedMapId = null;
  let elements = {};

  function setStatus(message) {
    if (elements.status) elements.status.textContent = message;
  }

  function getSelectedMap() {
    return payload.maps.find((map) => map.id === selectedMapId) ?? payload.maps.find((map) => map.is_active) ?? payload.maps[0] ?? null;
  }

  function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: image.naturalWidth || 1600, height: image.naturalHeight || 1000 });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo leer la imagen."));
      };
      image.src = url;
    });
  }

  function hexToPixel(q, r, map) {
    const size = Number(map.hex_size ?? 52);
    const originX = Number(map.grid_origin_x ?? 0);
    const originY = Number(map.grid_origin_y ?? 0);
    const radians = Number(map.grid_rotation ?? 0) * Math.PI / 180;
    const baseX = size * SQRT3 * (q + r / 2);
    const baseY = size * 1.5 * r;

    return {
      x: originX + baseX * Math.cos(radians) - baseY * Math.sin(radians),
      y: originY + baseX * Math.sin(radians) + baseY * Math.cos(radians),
    };
  }

  function getHexPoints(cx, cy, size, rotation = 0) {
    return Array.from({ length: 6 }, (_, index) => {
      const angle = Math.PI / 180 * (60 * index - 30 + rotation);
      return `${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`;
    }).join(" ");
  }

  function getMapImageUrl(map) {
    if (!map) return "";
    if (map.image_url) return map.image_url;
    return window.Auth.getClient().storage.from("lancer-mapa").getPublicUrl(map.image_path).data.publicUrl;
  }

  function getCharacterImageUrl(character) {
    if (!character) return "";
    if (character.image_url) return character.image_url;
    return window.Auth.getClient().storage.from("lancer-mapa").getPublicUrl(character.image_path).data.publicUrl;
  }

  function renderGrid(map) {
    elements.previewOverlay.replaceChildren();
    if (!map) return;

    const width = Number(map.image_width);
    const height = Number(map.image_height);
    const size = Number(map.hex_size);
    const colWidth = size * SQRT3;
    const rowHeight = size * 1.5;
    const maxRadius = Math.hypot(width, height) + Math.hypot(
      Number(map.grid_origin_x ?? 0),
      Number(map.grid_origin_y ?? 0),
    );
    const qMin = Math.floor(-maxRadius / colWidth) - 6;
    const qMax = Math.ceil(maxRadius / colWidth) + 6;
    const rMin = Math.floor(-maxRadius / rowHeight) - 6;
    const rMax = Math.ceil(maxRadius / rowHeight) + 6;

    for (let r = rMin; r <= rMax; r += 1) {
      for (let q = qMin; q <= qMax; q += 1) {
        const center = hexToPixel(q, r, map);
        if (center.x < -size || center.y < -size || center.x > width + size || center.y > height + size) continue;
        const hex = document.createElementNS(SVG_NS, "polygon");
        hex.setAttribute("class", "admin-lancer-hex");
        hex.setAttribute("points", getHexPoints(center.x, center.y, size, Number(map.grid_rotation ?? 0)));
        elements.previewOverlay.appendChild(hex);
      }
    }
  }

  function fillGridControls(map) {
    elements.originX.value = map ? Math.round(Number(map.grid_origin_x)) : "";
    elements.originY.value = map ? Math.round(Number(map.grid_origin_y)) : "";
    elements.hexSize.value = map ? Math.round(Number(map.hex_size)) : "";
    elements.gridRotation.value = map ? Math.round(Number(map.grid_rotation ?? 0)) : "";
  }

  function renderPreview() {
    const map = getSelectedMap();
    if (!map) {
      elements.previewImage.removeAttribute("src");
      elements.previewContent.style.width = "";
      elements.previewContent.style.height = "";
      elements.previewOverlay.replaceChildren();
      fillGridControls(null);
      return;
    }

    selectedMapId = map.id;
    elements.previewContent.style.width = `${map.image_width}px`;
    elements.previewContent.style.height = `${map.image_height}px`;
    elements.previewOverlay.setAttribute("viewBox", `0 0 ${map.image_width} ${map.image_height}`);
    elements.previewImage.src = getMapImageUrl(map);
    fillGridControls(map);
    renderGrid(map);
  }

  function renderMaps() {
    elements.mapList.replaceChildren();
    payload.maps.forEach((map) => {
      const item = document.createElement("article");
      item.className = "admin-lancer-list-item";
      item.classList.toggle("active", map.id === selectedMapId || (!selectedMapId && map.is_active));
      item.innerHTML = `
        <img src="${getMapImageUrl(map)}" alt="">
        <div><strong>${map.name}</strong><span>${map.is_active ? "Activo" : "Inactivo"}</span></div>
        <div class="admin-lancer-list-actions">
          <button type="button" data-select-map="${map.id}">Editar</button>
          <button type="button" data-active-map="${map.id}">Activar</button>
          <button type="button" data-delete-map="${map.id}">Borrar</button>
        </div>`;
      elements.mapList.appendChild(item);
    });
  }

  function renderCharacters() {
    elements.characterList.replaceChildren();
    payload.characters.forEach((character) => {
      const item = document.createElement("article");
      item.className = "admin-lancer-list-item";
      item.innerHTML = `
        <img src="${getCharacterImageUrl(character)}" alt="">
        <strong>${character.name}</strong>
        <div class="admin-lancer-list-actions">
          <button type="button" data-delete-character="${character.id}">Borrar</button>
        </div>`;
      elements.characterList.appendChild(item);
    });
  }

  function renderAll() {
    renderMaps();
    renderCharacters();
    renderPreview();
  }

  async function load() {
    payload = await window.AdminMapaLancerAjax.getPayload();
    if (!selectedMapId && payload.maps.length) selectedMapId = getSelectedMap()?.id ?? null;
    renderAll();
  }

  async function handleMapSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.file.files[0];
    if (!file) return;

    setStatus("Subiendo mapa...");
    const dimensions = await getImageDimensions(file);
    const uploaded = await window.AdminMapaLancerAjax.uploadFile(file, "maps");
    payload = await window.AdminMapaLancerAjax.createMap({
      name: form.elements.name.value.trim(),
      ...uploaded,
      image_width: dimensions.width,
      image_height: dimensions.height,
      hex_size: 52,
      grid_rotation: 0,
      is_active: form.elements.is_active.checked,
    });
    selectedMapId = payload.maps.find((map) => map.image_path === uploaded.image_path)?.id ?? selectedMapId;
    form.reset();
    elements.mapActive.checked = true;
    renderAll();
    setStatus("Mapa guardado.");
  }

  async function handleCharacterSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.file.files[0];
    if (!file) return;

    setStatus("Subiendo personaje...");
    const uploaded = await window.AdminMapaLancerAjax.uploadFile(file, "characters");
    payload = await window.AdminMapaLancerAjax.createCharacter({
      name: form.elements.name.value.trim(),
      ...uploaded,
    });
    form.reset();
    renderAll();
    setStatus("Personaje guardado.");
  }

  async function saveGrid() {
    const map = getSelectedMap();
    if (!map) return;

    payload = await window.AdminMapaLancerAjax.updateMap({
      id: map.id,
      name: map.name,
      grid_origin_x: Number(elements.originX.value),
      grid_origin_y: Number(elements.originY.value),
      hex_size: Number(elements.hexSize.value),
      grid_rotation: Number(elements.gridRotation.value),
      image_width: Number(map.image_width),
      image_height: Number(map.image_height),
      is_active: Boolean(map.is_active),
    });
    renderAll();
    setStatus("Rejilla guardada.");
  }

  function previewDraftGrid() {
    const map = getSelectedMap();
    if (!map) return;
    renderGrid({
      ...map,
      grid_origin_x: Number(elements.originX.value),
      grid_origin_y: Number(elements.originY.value),
      hex_size: Number(elements.hexSize.value),
      grid_rotation: Number(elements.gridRotation.value),
    });
  }

  function bindEvents() {
    elements.mapForm.addEventListener("submit", (event) => {
      handleMapSubmit(event).catch((error) => {
        console.error(error);
        setStatus(error.message || "No se pudo crear el mapa.");
      });
    });

    elements.characterForm.addEventListener("submit", (event) => {
      handleCharacterSubmit(event).catch((error) => {
        console.error(error);
        setStatus(error.message || "No se pudo crear el personaje.");
      });
    });

    elements.saveGrid.addEventListener("click", () => {
      saveGrid().catch((error) => {
        console.error(error);
        setStatus(error.message || "No se pudo guardar la rejilla.");
      });
    });

    [elements.originX, elements.originY, elements.hexSize, elements.gridRotation].forEach((input) => {
      input.addEventListener("input", previewDraftGrid);
    });

    elements.mapList.addEventListener("click", async (event) => {
      const select = event.target.closest("[data-select-map]");
      const active = event.target.closest("[data-active-map]");
      const remove = event.target.closest("[data-delete-map]");

      if (select) {
        selectedMapId = select.dataset.selectMap;
        renderAll();
        return;
      }

      if (active) {
        const map = payload.maps.find((item) => item.id === active.dataset.activeMap);
        if (!map) return;
        payload = await window.AdminMapaLancerAjax.updateMap({
          id: map.id,
          name: map.name,
          grid_origin_x: map.grid_origin_x,
          grid_origin_y: map.grid_origin_y,
          hex_size: map.hex_size,
          grid_rotation: map.grid_rotation ?? 0,
          image_width: map.image_width,
          image_height: map.image_height,
          is_active: true,
        });
        selectedMapId = map.id;
        renderAll();
        setStatus("Mapa activo actualizado.");
        return;
      }

      if (remove && confirm("Borrar este mapa?")) {
        payload = await window.AdminMapaLancerAjax.deleteMap(remove.dataset.deleteMap);
        selectedMapId = null;
        renderAll();
      }
    });

    elements.characterList.addEventListener("click", async (event) => {
      const remove = event.target.closest("[data-delete-character]");
      if (!remove || !confirm("Borrar este personaje?")) return;
      payload = await window.AdminMapaLancerAjax.deleteCharacter(remove.dataset.deleteCharacter);
      renderAll();
    });
  }

  async function init() {
    elements = {
      mapForm: document.getElementById("adminLancerMapForm"),
      characterForm: document.getElementById("adminLancerCharacterForm"),
      mapActive: document.getElementById("adminLancerMapActive"),
      mapList: document.getElementById("adminLancerMapList"),
      characterList: document.getElementById("adminLancerCharacterList"),
      previewContent: document.getElementById("adminLancerPreviewContent"),
      previewImage: document.getElementById("adminLancerPreviewImage"),
      previewOverlay: document.getElementById("adminLancerPreviewOverlay"),
      originX: document.getElementById("adminLancerOriginX"),
      originY: document.getElementById("adminLancerOriginY"),
      hexSize: document.getElementById("adminLancerHexSize"),
      gridRotation: document.getElementById("adminLancerGridRotation"),
      saveGrid: document.getElementById("adminLancerSaveGrid"),
      status: document.getElementById("adminLancerStatus"),
    };

    if (!initialized) {
      initialized = true;
      bindEvents();
    }

    await load();
  }

  function clearData() {
    payload = { maps: [], characters: [] };
    selectedMapId = null;
  }

  return { init, clearData };
})();

window.AdminMapaLancerPresenter = AdminMapaLancerPresenter;
