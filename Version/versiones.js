const Versiones = (() => {
  const versiones = [
    {
      version: "0.1.0",
      fecha: new Date(2026, 4, 10),
      cambios:  [
          "Se añade el historial de versiones de la aplicación.",
          "Incluido botón para mostrar u ocultar las capas.",
          "Añadido campo Visibilidad a las localizaciones.",
          "Corregido error en el que provocaba que no limpiara los datos al cambiar de usuario"
      ]
    },
    {
      version: "0.1.1",
      fecha: new Date(2026, 4, 11),
      cambios:  [
          "Incluido soporte para multi-app",
          "Se ha creado un menú para las diferentes aplicaciones",
          "Se ha modificado el nombre de la APP para que sea multi-app"
      ]
    },
    {
      version: "0.2.0",
      fecha: new Date(2026, 4, 11),
      cambios:  [
        "Nueva APP: Turnos de Lancer"
      ]
    }
  ];

  const selectors = {
    button: "versionsButton",
    dialog: "versionsDialog",
    closeButton: "closeVersionsDialog",
    list: "versionsList"
  };

  let boundButton = null;
  let boundDialog = null;

  function getElement(id) {
    return document.getElementById(id);
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function renderVersion(versionData) {
    const item = document.createElement("article");
    item.className = "version-item";

    const title = document.createElement("h3");
    title.textContent = `Versión ${versionData.version}`;

    const date = document.createElement("time");
    date.dateTime = formatDateTime(versionData.fecha);
    date.textContent = formatDate(versionData.fecha);

    const changes = document.createElement("ul");
    changes.className = "version-changes";

    versionData.cambios.forEach((cambio) => {
      const change = document.createElement("li");
      change.textContent = cambio;
      changes.appendChild(change);
    });

    item.append(title, date, changes);
    return item;
  }

  function renderVersions() {
    const list = getElement(selectors.list);
    if (!list) return;
    list.innerHTML = "";

    versiones
      .slice()
      .sort((first, second) => second.fecha - first.fecha)
      .forEach((versionData) => {
        list.appendChild(renderVersion(versionData));
      });
  }

  function openDialog() {
    const dialog = getElement(selectors.dialog);
    if (!dialog) return;
    renderVersions();
    dialog.showModal();
  }

  function closeDialog() {
    const dialog = getElement(selectors.dialog);
    if (dialog.open) {
      dialog.close();
    }
  }

  function bindEvents() {
    const button = getElement(selectors.button);
    const dialog = getElement(selectors.dialog);
    const closeButton = getElement(selectors.closeButton);

    if (button && boundButton !== button) {
      button.addEventListener("click", openDialog);
      boundButton = button;
    }

    if (dialog && closeButton && boundDialog !== dialog) {
      closeButton.addEventListener("click", closeDialog);
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
          closeDialog();
        }
      });
      boundDialog = dialog;
    }
  }

  function init() {
    bindEvents();
  }

  return {
    init,
    versiones
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  Versiones.init();
});

window.Versiones = Versiones;
