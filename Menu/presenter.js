const MenuPresenter = (() => {
  const selectors = {
    appContent: "appContent",
    appHeaderTabs: "appHeaderTabs",
    mapButton: "openMapApp",
    menuPage: "menuPage",
    mapPage: "mapPage",
  };

  const tabs = new Map();
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

  function getPages() {
    return Array.from(document.querySelectorAll("#appContent > .app-page"));
  }

  function setActiveTab(pageId) {
    tabs.forEach((tab, tabPageId) => {
      const isActive = tabPageId === pageId;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
  }

  function showPage(pageId) {
    getPages().forEach((page) => {
      const isActive = page.id === pageId;
      page.classList.toggle("hidden", !isActive);
      page.setAttribute("aria-hidden", String(!isActive));
    });
    setActiveTab(pageId);
  }

  function createTab(pageId, label) {
    const appHeaderTabs = getElement(selectors.appHeaderTabs);
    if (!appHeaderTabs || tabs.has(pageId)) {
      return tabs.get(pageId);
    }

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "app-header-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", pageId);
    tab.textContent = label;
    tab.addEventListener("click", () => showPage(pageId));

    appHeaderTabs.appendChild(tab);
    tabs.set(pageId, tab);
    return tab;
  }

  async function openMap() {
    const appContent = getElement(selectors.appContent);
    if (!appContent) return;

    if (!mapLoaded || !getElement(selectors.mapPage)) {
      appContent.insertAdjacentHTML("beforeend", await fetchHtml("Mapa/view.html"));
      mapLoaded = true;
    }

    createTab(selectors.mapPage, "Mapa");
    showPage(selectors.mapPage);
    await window.MapApp?.init?.();
  }

  function bindMenuEvents() {
    getElement(selectors.mapButton)?.addEventListener("click", openMap);
  }

  async function init() {
    const appContent = getElement(selectors.appContent);
    const appHeaderTabs = getElement(selectors.appHeaderTabs);
    if (!appContent || !appHeaderTabs) return;

    if (!menuLoaded || !getElement(selectors.menuPage)) {
      appContent.innerHTML = await fetchHtml("Menu/view.html");
      appHeaderTabs.innerHTML = "";
      tabs.clear();
      menuLoaded = true;
      mapLoaded = false;
      createTab(selectors.menuPage, "Menu");
      bindMenuEvents();
    }

    showPage(selectors.menuPage);
  }

  function clear() {
    showPage(selectors.menuPage);
  }

  return {
    init,
    clear,
  };
})();

window.MenuPresenter = MenuPresenter;
