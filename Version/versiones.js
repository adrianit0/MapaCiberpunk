const Versiones = (() => {
  const versiones = [
    {
      version: "0.1.0",
      fecha: new Date(2026, 4, 10, 1, 0, 0),
      cambios:  [
          "Se añade el historial de versiones de la aplicación.",
          "Incluido botón para mostrar u ocultar las capas.",
          "Añadido campo Visibilidad a las localizaciones.",
          "Corregido error en el que provocaba que no limpiara los datos al cambiar de usuario"
      ]
    },
    {
      version: "0.1.1",
      fecha: new Date(2026, 4, 11, 1, 0, 0),
      cambios:  [
          "Incluido soporte para multi-app",
          "Se ha creado un menú para las diferentes aplicaciones",
          "Se ha modificado el nombre de la APP para que sea multi-app"
      ]
    },
    {
      version: "0.2.0",
      fecha: new Date(2026, 4, 11, 5, 0, 0),
      cambios:  [
        "Nueva APP: Turnos de Lancer"
      ]
    },
    {
      version: "0.3.0",
      fecha: new Date(2026, 4, 12, 5, 0, 0),
      cambios:  [
        "Nueva APP: Dados"
      ]
    },
    {
      version: "0.3.1",
      fecha: new Date(2026, 4, 13, 5, 0, 0),
      cambios:  [
        "Incluido Preset con las tiradas según las reglas de Cyberpunk RED y Lancer",
        "Corregido el Drag & Drop de Turnos de Lancer para moviles"
      ]
    },
    {
      version: "0.3.2",
      fecha: new Date(2026, 4, 15, 5, 0, 0),
      cambios:  [
        "Mejorado sistema de almacenamiento de dados",
        "Ahora, si estás logeado, se guardan las tiradas",
        "Incluido el minijuego de cyberpunk hecho hace tiempo"
      ]
    },
    {
      version: "0.4.0",
      fecha: new Date(2026, 4, 15, 6, 0, 0),
      cambios:  [
        "Nueva APP: Admin. Permite añadir o eliminar roles a los usuarios. Solo usable por el admin",
        "Ajustes de seguridad de los usuarios",
        "Ahora un usuario puede modificar sus datos pulsando 'Perfil'",
        "Posibilidad del Admin o master de eliminar el histórico de una tirada",
        "Se limita el histórico de tiradas a las últimas 20"
      ]
    },
    {
      version: "0.5.0",
      fecha: new Date(2026, 4, 18, 5, 0, 0),
      cambios:  [
        "Nueva APP: Glosario. Permite incluir información del manual de Lancer y poder acceder rapidamente a ellos",
        "Corregido error que volvía al menu principal cuando volvías a la aplicación",
        "Se ha mejorado la aplicación de Turnos Lancer",
        "Se ha incluido persistencia local en Turnos Lancer, si cambias de navegador o se limpia caché se pierde la info",
        "Se ha mejorado la tirada de dados provocando que no haya tiempos muertos entre tiradas"
      ]
    },
    {
      version: "0.5.1",
      fecha: new Date(2026, 5, 3, 5, 0, 0),
      cambios:  [
        "Se ha ordenado las apps del menú",
        "Incluido sistema de APPs favoritas en el menú",
        "Incluido opción para quitar el color de las localizaciones por defecto"
      ]
    },
    {
      version: "0.5.2",
      fecha: new Date(2026, 5, 5, 5, 0, 0),
      cambios:  [
        "Minor bugs fixed"
      ]
    },
    {
      version: "0.6.0",
      fecha: new Date(2026, 5, 6, 5, 0, 0),
      cambios:  [
        "Incluido APPs de Mapa Lancer y Admin Mapa Lancer"
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
