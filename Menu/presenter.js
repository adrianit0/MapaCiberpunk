const MenuPresenter = (() => {
  const selectors = {
    appContent: "appContent",
    appHeaderTabs: "appHeaderTabs",
    mapButton: "openMapApp",
    turnosLancerButton: "openTurnosLancerApp",
    dadosButton: "openDadosApp",
    glosarioButton: "openGlosarioApp",
    miniRolCyberpunkButton: "openMiniRolCyberpunkApp",
    adminButton: "openAdminApp",
    menuPage: "menuPage",
    mapPage: "mapPage",
    turnosLancerPage: "turnosLancerPage",
    dadosPage: "dadosPage",
    glosarioPage: "glosarioPage",
    adminPage: "adminPage",
  };

  const appIcons = {
    [selectors.mapButton]: {
      src: "Resources/MapIcon.png",
      alt: "",
    },
    [selectors.turnosLancerButton]: {
      src: "Resources/TurnIcon.png",
      alt: "",
    },
    [selectors.dadosButton]: {
      src: "Resources/DiceIcon.png",
      alt: "",
    },
    [selectors.glosarioButton]: {
      src: "Resources/GlossaryIcon.png",
      alt: "",
    },
    [selectors.miniRolCyberpunkButton]: {
      src: "Resources/RoleIcon.png",
      alt: "",
    },
    [selectors.adminButton]: {
      src: "Resources/AdminIcon.png",
      alt: "",
    },
  };

  const applications = [
    {
      buttonId: selectors.mapButton,
      pageId: selectors.mapPage,
      tabLabel: "Mapa",
      open: openMap,
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      buttonId: selectors.turnosLancerButton,
      pageId: selectors.turnosLancerPage,
      tabLabel: "Turnos de Lancer",
      open: openTurnosLancer,
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      buttonId: selectors.dadosButton,
      pageId: selectors.dadosPage,
      tabLabel: "Dados",
      open: openDados,
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      buttonId: selectors.glosarioButton,
      pageId: selectors.glosarioPage,
      tabLabel: "Glosario",
      open: openGlosario,
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      buttonId: selectors.miniRolCyberpunkButton,
      open: openMiniRolCyberpunk,
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      buttonId: selectors.adminButton,
      pageId: selectors.adminPage,
      tabLabel: "Admin",
      open: openAdmin,
      access: {
        guest: false,
        authenticated: true,
        roles: ["admin"],
      },
    },
  ];

  const tabs = new Map();
  let menuLoaded = false;
  let mapLoaded = false;
  let turnosLancerLoaded = false;
  let dadosLoaded = false;
  let glosarioLoaded = false;
  let adminLoaded = false;

  function getElement(id) {
    return document.getElementById(id);
  }

  function normalizeRoleName(roleName) {
    return String(roleName ?? "")
        .trim()
        .toLowerCase();
  }

  function getSessionRoleNames() {
    return new Set((window.AppSession?.profile?.roles ?? [])
      .map((role) => normalizeRoleName(role?.name ?? role))
      .filter(Boolean));
  }

  function userHasAnyRole(requiredRoles = []) {
    if (!requiredRoles.length) {
      return true;
    }

    const sessionRoles = getSessionRoleNames();
    return requiredRoles
      .map(normalizeRoleName)
      .some((role) => sessionRoles.has(role));
  }

  function canOpenApplication(application) {
    const access = application.access ?? {};

    if (window.AppSession?.isGuest) {
      return access.guest !== false;
    }

    if (!window.AppSession) {
      return false;
    }

    if (access.authenticated === false) {
      return false;
    }

    return userHasAnyRole(access.roles);
  }

  function closeApplication(application) {
    if (application.pageId) {
      getElement(application.pageId)?.remove();
      tabs.get(application.pageId)?.remove();
      tabs.delete(application.pageId);
    }

    if (application.pageId === selectors.mapPage) mapLoaded = false;
    if (application.pageId === selectors.turnosLancerPage) turnosLancerLoaded = false;
    if (application.pageId === selectors.dadosPage) dadosLoaded = false;
    if (application.pageId === selectors.glosarioPage) glosarioLoaded = false;
    if (application.pageId === selectors.adminPage) adminLoaded = false;
  }

  function applyApplicationAccess() {
    applications.forEach((application) => {
      const isAllowed = canOpenApplication(application);
      getElement(application.buttonId)?.classList.toggle("hidden", !isAllowed);

      if (!isAllowed) {
        closeApplication(application);
      }
    });
  }

  function loadStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
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

    loadStylesheet("Mapa/styles.css");

    if (!mapLoaded || !getElement(selectors.mapPage)) {
      appContent.insertAdjacentHTML("beforeend", await fetchHtml("Mapa/view.html"));
      mapLoaded = true;
    }

    createTab(selectors.mapPage, "Mapa");
    showPage(selectors.mapPage);
    await window.MapPresenter?.init?.();
  }

  async function openTurnosLancer() {
    const appContent = getElement(selectors.appContent);
    if (!appContent) return;

    loadStylesheet("TurnosLancer/styles.css");

    if (!turnosLancerLoaded || !getElement(selectors.turnosLancerPage)) {
      appContent.insertAdjacentHTML("beforeend", await fetchHtml("TurnosLancer/view.html"));
      turnosLancerLoaded = true;
    }

    createTab(selectors.turnosLancerPage, "Turnos de Lancer");
    showPage(selectors.turnosLancerPage);
    window.TurnosLancerPresenter?.init?.();
  }

  async function openDados() {
    const appContent = getElement(selectors.appContent);
    if (!appContent) return;

    loadStylesheet("Dados/styles.css");

    if (!dadosLoaded || !getElement(selectors.dadosPage)) {
      appContent.insertAdjacentHTML("beforeend", await fetchHtml("Dados/view.html"));
      dadosLoaded = true;
    }

    createTab(selectors.dadosPage, "Dados");
    showPage(selectors.dadosPage);
    window.DadosPresenter?.init?.();
  }

  async function openGlosario() {
    const appContent = getElement(selectors.appContent);
    if (!appContent) return;

    loadStylesheet("Glosario/styles.css");

    if (!glosarioLoaded || !getElement(selectors.glosarioPage)) {
      appContent.insertAdjacentHTML("beforeend", await fetchHtml("Glosario/view.html"));
      glosarioLoaded = true;
    }

    createTab(selectors.glosarioPage, "Glosario");
    showPage(selectors.glosarioPage);
    window.GlosarioPresenter?.init?.();
  }

  function openMiniRolCyberpunk() {
    window.open("https://adrianit0.github.io/MiniRolCyberpunk/", "_blank", "noopener,noreferrer");
  }

  async function openAdmin() {
    const appContent = getElement(selectors.appContent);
    if (!appContent) return;

    loadStylesheet("Admin/styles.css");

    if (!adminLoaded || !getElement(selectors.adminPage)) {
      appContent.insertAdjacentHTML("beforeend", await fetchHtml("Admin/view.html"));
      adminLoaded = true;
    }

    createTab(selectors.adminPage, "Admin");
    showPage(selectors.adminPage);
    await window.AdminPresenter?.init?.();
  }

  function bindMenuEvents() {
    applications.forEach((application) => {
      getElement(application.buttonId)?.addEventListener("click", () => {
        if (canOpenApplication(application)) {
          application.open();
        }
      });
    });
  }

  function addMenuAppIcons() {
    Object.entries(appIcons).forEach(([buttonId, icon]) => {
      const button = getElement(buttonId);
      if (!button || button.querySelector(".main-menu-app-icon")) {
        return;
      }

      const image = document.createElement("img");
      image.className = "main-menu-app-icon";
      image.src = icon.src;
      image.alt = icon.alt;
      image.setAttribute("aria-hidden", "true");

      button.prepend(image);
    });
  }

  async function init(options = {}) {
    const appContent = getElement(selectors.appContent);
    const appHeaderTabs = getElement(selectors.appHeaderTabs);
    if (!appContent || !appHeaderTabs) return;
    const activePageId = appContent.querySelector(".app-page:not(.hidden)")?.id;

    if (!menuLoaded || !getElement(selectors.menuPage)) {
      appContent.innerHTML = await fetchHtml("Menu/view.html");
      appHeaderTabs.innerHTML = "";
      tabs.clear();
      menuLoaded = true;
      mapLoaded = false;
      turnosLancerLoaded = false;
      dadosLoaded = false;
      glosarioLoaded = false;
      adminLoaded = false;
      createTab(selectors.menuPage, "Menu");
      addMenuAppIcons();
      bindMenuEvents();
    }

    applyApplicationAccess();
    const pageToShow = options.preserveActivePage && getElement(activePageId)
      ? activePageId
      : selectors.menuPage;
    showPage(pageToShow);
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
