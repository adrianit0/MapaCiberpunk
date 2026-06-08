const MenuPresenter = (() => {
  const selectors = {
    appContent: "appContent",
    appHeaderTabs: "appHeaderTabs",
    menuFavorites: "mainMenuFavorites",
    menuCategories: "mainMenuCategories",
    menuPage: "menuPage",
    mapPage: "mapPage",
    turnosLancerPage: "turnosLancerPage",
    dadosPage: "dadosPage",
    glosarioPage: "glosarioPage",
    adminPage: "adminPage",
    lancerMapaPage: "lancerMapaPage",
    adminMapaLancerPage: "adminMapaLancerPage",
  };

  const categories = ["Cyberpunk", "Lancer", "Admin"];
  const favoriteScale = 1.2;
  const favoritesUrl = `${window.AppConfig?.supabase?.rootUrl ?? "https://wtkumfcjqqmgokgrbxxr.supabase.co"}/functions/v1/menu-favorites`;

  const applications = [
    {
      id: "mapa",
      pageId: selectors.mapPage,
      tabLabel: "Mapa",
      title: "Mapa",
      description: "Mapa interactivo de Night City 2045",
      icon: {
        src: "Resources/MapIcon.png",
        alt: "Icono de Mapa",
      },
      Categories: ["Cyberpunk"],
      open: openMap, 
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      id: "turnos-lancer",
      pageId: selectors.turnosLancerPage,
      tabLabel: "Turnos de Lancer",
      title: "Turnos de Lancer",
      description: "Control de activaciones alternas para aliados y enemigos",
      icon: {
        src: "Resources/TurnIcon.png",
        alt: "Icono de Turnos de Lancer",
      },
      Categories: ["Lancer"],
      open: openTurnosLancer,
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      id: "dados",
      pageId: selectors.dadosPage,
      tabLabel: "Dados",
      title: "Dados",
      description: "Lanzador de dados con historial entre jugadores",
      icon: {
        src: "Resources/DiceIcon.png",
        alt: "Icono de Dados",
      },
      Categories: ["Cyberpunk", "Lancer"],
      open: openDados,
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      id: "glosario",
      pageId: selectors.glosarioPage,
      tabLabel: "Glosario",
      title: "Glosario",
      description: "Tarjetas de referencia para el glosario de Lancer",
      icon: {
        src: "Resources/GlossaryIcon.png",
        alt: "Icono de Glosario",
      },
      Categories: ["Lancer"],
      open: openGlosario,
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      id: "lancer-mapa",
      pageId: selectors.lancerMapaPage,
      tabLabel: "Mapa Lancer",
      title: "Mapa Lancer",
      description: "Mapa táctico Lancer con cuadrícula hexagonal y personajes",
      icon: {
        src: "Resources/MapIcon.png",
        alt: "Icono de Mapa Lancer",
      },
      Categories: ["Lancer"],
      open: openLancerMapa,
      access: {
        guest: false,
        authenticated: true,
      },
    },
    {
      id: "admin-mapa-lancer",
      pageId: selectors.adminMapaLancerPage,
      tabLabel: "Admin Mapa Lancer",
      title: "Admin Mapa Lancer",
      description: "Configura mapas, rejillas hexagonales y personajes de Lancer",
      icon: {
        src: "Resources/AdminIcon.png",
        alt: "Icono de Admin Mapa Lancer",
      },
      Categories: ["Admin", "Lancer"],
      open: openAdminMapaLancer,
      access: {
        guest: false,
        authenticated: true,
        roles: ["admin", "master"],
      },
    },
    {
      id: "mini-rol-cyberpunk",
      title: "MiniRol Cyberpunk",
      description: "Un minijuego de decisiones dentro del mundo de Cyberpunk RED",
      icon: {
        src: "Resources/RoleIcon.png",
        alt: "Icono de MiniRol Cyberpunk",
      },
      Categories: ["Cyberpunk"],
      open: openMiniRolCyberpunk,
      access: {
        guest: true,
        authenticated: true,
      },
    },
    {
      id: "admin",
      pageId: selectors.adminPage,
      tabLabel: "Admin",
      title: "Admin",
      description: "Gestion de usuarios y roles",
      icon: {
        src: "Resources/AdminIcon.png",
        alt: "Icono de Admin",
      },
      Categories: ["Admin"],
      open: openAdmin,
      access: {
        guest: false,
        authenticated: true,
        roles: ["admin"],
      },
    },
  ];

  const tabs = new Map();
  const favoriteAppIds = new Set();
  let menuLoaded = false;
  let menuEventsBound = false;
  let favoritesLoadedForUserId = null;
  let mapLoaded = false;
  let turnosLancerLoaded = false;
  let dadosLoaded = false;
  let glosarioLoaded = false;
  let adminLoaded = false;
  let lancerMapaLoaded = false;
  let adminMapaLancerLoaded = false;

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

  function getAccessibleApplications() {
    return applications.filter(canOpenApplication);
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
    if (application.pageId === selectors.lancerMapaPage) lancerMapaLoaded = false;
    if (application.pageId === selectors.adminMapaLancerPage) adminMapaLancerLoaded = false;
  }

  function applyApplicationAccess() {
    applications.forEach((application) => {
      if (!canOpenApplication(application)) {
        closeApplication(application);
      }
    });

    renderMenuApplications();
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

  function createApplicationButton(application, options = {}) {
    const button = document.createElement("div");
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.className = options.favorite ? "main-menu-app main-menu-app-favorite" : "main-menu-app";
    button.dataset.appId = application.id;
    button.style.setProperty("--app-icon-scale", options.favorite ? String(favoriteScale) : "1");

    const favoriteButton = document.createElement("span");
    favoriteButton.className = "main-menu-favorite-toggle";
    favoriteButton.dataset.favoriteToggle = application.id;
    favoriteButton.setAttribute("role", "button");
    favoriteButton.setAttribute("tabindex", "0");
    favoriteButton.setAttribute("aria-pressed", String(favoriteAppIds.has(application.id)));
    favoriteButton.setAttribute("aria-disabled", String(Boolean(window.AppSession?.isGuest)));
    favoriteButton.setAttribute("aria-label", window.AppSession?.isGuest
      ? "Inicia sesion para guardar favoritos"
      : favoriteAppIds.has(application.id)
        ? `Quitar ${application.title} de favoritos`
        : `Anadir ${application.title} a favoritos`);
    favoriteButton.title = window.AppSession?.isGuest
      ? "Inicia sesion para guardar favoritos"
      : favoriteButton.getAttribute("aria-label");
    favoriteButton.textContent = favoriteAppIds.has(application.id) ? "\u2605" : "\u2606";

    const image = document.createElement("img");
    image.className = "main-menu-app-icon";
    image.src = application.icon.src;
    image.alt = application.icon.alt;

    const title = document.createElement("span");
    title.className = "main-menu-app-title";
    title.textContent = application.title;

    const description = document.createElement("span");
    description.className = "main-menu-app-description";
    description.textContent = application.description;

    button.append(favoriteButton, image, title, description);
    return button;
  }

  function renderFavorites(accessibleApplications) {
    const favoritesContainer = getElement(selectors.menuFavorites);
    if (!favoritesContainer) return;

    const favoriteApplications = accessibleApplications.filter((application) => favoriteAppIds.has(application.id));
    favoritesContainer.replaceChildren();
    favoritesContainer.classList.toggle("hidden", favoriteApplications.length === 0);

    if (!favoriteApplications.length) {
      return;
    }

    const title = document.createElement("h3");
    title.id = "mainMenuFavoritesTitle";
    title.textContent = "Favoritos";

    const list = document.createElement("div");
    list.className = "main-menu-apps main-menu-favorite-apps";
    list.setAttribute("aria-label", "Aplicaciones favoritas");

    favoriteApplications.forEach((application) => {
      list.appendChild(createApplicationButton(application, { favorite: true }));
    });

    favoritesContainer.append(title, list);
  }

  function renderCategories(accessibleApplications) {
    const categoriesContainer = getElement(selectors.menuCategories);
    if (!categoriesContainer) return;

    categoriesContainer.replaceChildren();

    categories.forEach((category) => {
      const categoryApplications = accessibleApplications
        .filter((application) => application.Categories.includes(category));

      if (!categoryApplications.length) {
        return;
      }

      const details = document.createElement("details");
      details.className = "main-menu-category";

      const summary = document.createElement("summary");
      summary.className = "main-menu-category-summary";
      summary.textContent = category;

      const list = document.createElement("div");
      list.className = "main-menu-apps";
      list.setAttribute("aria-label", `Aplicaciones de ${category}`);

      categoryApplications.forEach((application) => {
        list.appendChild(createApplicationButton(application));
      });

      details.append(summary, list);
      categoriesContainer.appendChild(details);
    });
  }

  function renderMenuApplications() {
    const accessibleApplications = getAccessibleApplications();
    renderFavorites(accessibleApplications);
    renderCategories(accessibleApplications);
  }

  async function loadFavoriteApplications() {
    const sessionUserId = window.AppSession?.user?.id ?? null;

    if (!window.AppSession || window.AppSession.isGuest || !sessionUserId) {
      favoriteAppIds.clear();
      favoritesLoadedForUserId = null;
      return;
    }

    if (favoritesLoadedForUserId === sessionUserId) {
      return;
    }

    const favorites = await window.AjaxController.ajaxRequest(favoritesUrl, {
      method: "GET",
      showLoading: false,
    });

    favoriteAppIds.clear();
    (favorites ?? [])
      .map((favorite) => favorite.app_id ?? favorite.appId ?? favorite)
      .filter(Boolean)
      .forEach((appId) => favoriteAppIds.add(String(appId)));
    favoritesLoadedForUserId = sessionUserId;
  }

  async function setFavoriteApplication(applicationId, isFavorite) {
    if (!window.AppSession || window.AppSession.isGuest) {
      return;
    }

    if (isFavorite) {
      favoriteAppIds.add(applicationId);
    } else {
      favoriteAppIds.delete(applicationId);
    }

    renderMenuApplications();

    try {
      await window.AjaxController.ajaxRequest(favoritesUrl, {
        method: "PUT",
        body: JSON.stringify({
          app_id: applicationId,
          is_favorite: isFavorite,
        }),
        showLoading: false,
      });
    } catch (error) {
      if (isFavorite) {
        favoriteAppIds.delete(applicationId);
      } else {
        favoriteAppIds.add(applicationId);
      }

      renderMenuApplications();
      console.warn("No se pudo guardar el favorito del menu.", error);
    }
  }

  function getApplicationById(applicationId) {
    return applications.find((application) => application.id === applicationId) ?? null;
  }

  function handleFavoriteToggle(applicationId) {
    const application = getApplicationById(applicationId);
    if (!application || !canOpenApplication(application)) {
      return;
    }

    const isFavorite = !favoriteAppIds.has(applicationId);
    setFavoriteApplication(applicationId, isFavorite);
  }

  function bindMenuEvents() {
    const menuPage = getElement(selectors.menuPage);
    if (!menuPage || menuEventsBound) {
      return;
    }

    menuPage.addEventListener("click", (event) => {
      const favoriteToggle = event.target.closest("[data-favorite-toggle]");
      if (favoriteToggle) {
        event.preventDefault();
        event.stopPropagation();
        handleFavoriteToggle(favoriteToggle.dataset.favoriteToggle);
        return;
      }

      const appButton = event.target.closest("[data-app-id]");
      const application = appButton ? getApplicationById(appButton.dataset.appId) : null;
      if (application && canOpenApplication(application)) {
        application.open();
      }
    });

    menuPage.addEventListener("keydown", (event) => {
      const favoriteToggle = event.target.closest("[data-favorite-toggle]");
      const isActionKey = ["Enter", " "].includes(event.key);

      if (!isActionKey) {
        return;
      }

      if (favoriteToggle) {
        event.preventDefault();
        event.stopPropagation();
        handleFavoriteToggle(favoriteToggle.dataset.favoriteToggle);
        return;
      }

      const appButton = event.target.closest("[data-app-id]");
      const application = appButton ? getApplicationById(appButton.dataset.appId) : null;
      if (application && canOpenApplication(application)) {
        event.preventDefault();
        application.open();
      }
    });

    menuEventsBound = true;
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

  async function openLancerMapa() {
    const appContent = getElement(selectors.appContent);
    if (!appContent) return;

    loadStylesheet("LancerMapa/styles.css");

    if (!lancerMapaLoaded || !getElement(selectors.lancerMapaPage)) {
      appContent.insertAdjacentHTML("beforeend", await fetchHtml("LancerMapa/view.html"));
      lancerMapaLoaded = true;
    }

    createTab(selectors.lancerMapaPage, "Mapa Lancer");
    showPage(selectors.lancerMapaPage);
    await window.LancerMapaPresenter?.init?.();
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

  async function openAdminMapaLancer() {
    const appContent = getElement(selectors.appContent);
    if (!appContent) return;

    loadStylesheet("AdminMapaLancer/styles.css");

    if (!adminMapaLancerLoaded || !getElement(selectors.adminMapaLancerPage)) {
      appContent.insertAdjacentHTML("beforeend", await fetchHtml("AdminMapaLancer/view.html"));
      adminMapaLancerLoaded = true;
    }

    createTab(selectors.adminMapaLancerPage, "Admin Mapa Lancer");
    showPage(selectors.adminMapaLancerPage);
    await window.AdminMapaLancerPresenter?.init?.();
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
      menuEventsBound = false;
      mapLoaded = false;
      turnosLancerLoaded = false;
      dadosLoaded = false;
      glosarioLoaded = false;
      adminLoaded = false;
      lancerMapaLoaded = false;
      adminMapaLancerLoaded = false;
      createTab(selectors.menuPage, "Menu");
      bindMenuEvents();
    }

    await loadFavoriteApplications().catch((error) => {
      favoriteAppIds.clear();
      favoritesLoadedForUserId = null;
      console.warn("No se pudieron cargar los favoritos del menu.", error);
    });

    applyApplicationAccess();
    const pageToShow = options.preserveActivePage && getElement(activePageId)
      ? activePageId
      : selectors.menuPage;
    showPage(pageToShow);
  }

  function clear() {
    favoriteAppIds.clear();
    favoritesLoadedForUserId = null;
    showPage(selectors.menuPage);
  }

  return {
    init,
    clear,
  };
})();

window.MenuPresenter = MenuPresenter;
