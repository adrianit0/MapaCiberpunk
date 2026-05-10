const MenuPresenter = (() => {
  const selectors = {
    appContent: "appContent",
    mapButton: "openMapApp",
    outlet: "menuAppOutlet",
  };

  let menuLoaded = false;
  let mapLoaded = false;

  function getElement(id) {
    return document.getElementById(id);
  }

  async function fetchHtml(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${path}.`);
    }
    return response.text();
  }

  async function loadMap() {
    const outlet = getElement(selectors.outlet);
    const button = getElement(selectors.mapButton);
    if (!outlet) return;

    button?.classList.add("active");
    button?.setAttribute("aria-pressed", "true");

    if (!mapLoaded || !document.getElementById("mapContainer")) {
      outlet.innerHTML = await fetchHtml("Mapa/view.html");
      mapLoaded = true;
      window.Versiones?.init?.();
    }

    await window.MapApp?.init?.();
  }

  function bindEvents() {
    getElement(selectors.mapButton)?.addEventListener("click", loadMap);
  }

  async function init() {
    const appContent = getElement(selectors.appContent);
    if (!appContent) return;

    if (!menuLoaded || !getElement(selectors.outlet)) {
      appContent.innerHTML = await fetchHtml("Menu/view.html");
      menuLoaded = true;
      mapLoaded = false;
      bindEvents();
    }

    await loadMap();
  }

  function clear() {
    mapLoaded = Boolean(document.getElementById("mapContainer"));
  }

  return {
    init,
    clear,
  };
})();

window.MenuPresenter = MenuPresenter;
