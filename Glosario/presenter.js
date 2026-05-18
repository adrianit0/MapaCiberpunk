const GlosarioPresenter = (() => {
  const selectors = {
    page: "glosarioPage",
    notice: "glossaryNotice",
    closeNotice: "closeGlossaryNotice",
    summary: "glossarySummary",
    message: "glossaryMessage",
    search: "glossarySearch",
    sections: "glossarySections",
    manageTypes: "manageGlossaryTypes",
    create: "createGlossaryEntry",
    detailDialog: "glossaryDetailDialog",
    detailTitle: "glossaryDetailTitle",
    detailContent: "glossaryDetailContent",
    edit: "editGlossaryEntry",
    delete: "deleteGlossaryEntry",
    closeDetail: "closeGlossaryDetail",
    formDialog: "glossaryFormDialog",
    form: "glossaryForm",
    formTitle: "glossaryFormTitle",
    closeForm: "closeGlossaryForm",
    type: "glossaryType",
    nameEs: "glossaryNameEs",
    nameEn: "glossaryNameEn",
    descriptionEs: "glossaryDescriptionEs",
    descriptionEn: "glossaryDescriptionEn",
    formMessage: "glossaryFormMessage",
    typesDialog: "glossaryTypesDialog",
    typesTableBody: "glossaryTypesTableBody",
    typesMessage: "glossaryTypesMessage",
    newType: "newGlossaryType",
    closeTypes: "closeGlossaryTypes",
    typeFormDialog: "glossaryTypeFormDialog",
    typeForm: "glossaryTypeForm",
    typeFormTitle: "glossaryTypeFormTitle",
    closeTypeForm: "closeGlossaryTypeForm",
    typeName: "glossaryTypeName",
    typeColor: "glossaryTypeColor",
    typeFormMessage: "glossaryTypeFormMessage",
  };

  const state = {
    boundPage: null,
    types: [],
    entries: [],
    search: "",
    selectedEntry: null,
    editingEntry: null,
    editingType: null,
  };

  const languageIds = {
    es: 1,
    en: 2,
  };

  const allowedHtmlTags = new Set(["B", "STRONG", "I", "EM", "U", "P", "BR", "UL", "OL", "LI", "A", "BLOCKQUOTE", "DIV"]);

  function getElement(id) {
    return document.getElementById(id);
  }

  function normalizeRoleName(roleName) {
    return String(roleName ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function isAdmin() {
    return (window.AppSession?.profile?.roles ?? [])
      .some((role) => normalizeRoleName(role?.name ?? role) === "admin");
  }

  function isAuthenticatedMode() {
    return Boolean(window.AppSession && !window.AppSession.isGuest && window.AppSession.user?.id);
  }

  function canManageEntry(entry) {
    if (!isAuthenticatedMode() || !entry) {
      return false;
    }

    return isAdmin() || String(entry.user_id) === String(window.AppSession.user.id);
  }

  function setMessage(message, type = "neutral") {
    const element = getElement(selectors.message);
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
  }

  function setFormMessage(message, type = "neutral") {
    const element = getElement(selectors.formMessage);
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
  }

  function setTypesMessage(message, type = "neutral") {
    const element = getElement(selectors.typesMessage);
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
  }

  function setTypeFormMessage(message, type = "neutral") {
    const element = getElement(selectors.typeFormMessage);
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
  }

  function sanitizeHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html || "";

    const cleanNode = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          return;
        }

        if (child.nodeType !== Node.ELEMENT_NODE || !allowedHtmlTags.has(child.tagName)) {
          child.replaceWith(document.createTextNode(child.textContent || ""));
          return;
        }

        Array.from(child.attributes).forEach((attribute) => {
          const keepHref = child.tagName === "A" && attribute.name === "href" && /^https?:\/\//i.test(attribute.value);
          if (!keepHref) {
            child.removeAttribute(attribute.name);
          }
        });

        if (child.tagName === "A") {
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }

        cleanNode(child);
      });
    };

    cleanNode(template.content);
    return template.innerHTML;
  }

  function htmlToText(html) {
    const template = document.createElement("template");
    template.innerHTML = sanitizeHtml(html);
    return (template.content.textContent || "").replace(/\s+/g, " ").trim();
  }

  function getTranslation(entry, languageId) {
    return (entry.translations ?? [])
      .find((translation) => Number(translation.language_id) === languageId) ?? {};
  }

  function normalizeEntry(entry) {
    const type = entry.lancer_glossary_tipo || entry.type || state.types.find((item) => Number(item.id) === Number(entry.type_id)) || {};

    return {
      ...entry,
      id: Number(entry.id),
      type_id: Number(entry.type_id),
      type,
      translations: Array.isArray(entry.translations) ? entry.translations : [],
    };
  }

  function lightenHex(hex, amount = 0.82) {
    const normalized = String(hex || "#dce8f5").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      return "#edf4fb";
    }

    const channels = [0, 2, 4].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16));
    const light = channels.map((channel) => Math.round(channel + (255 - channel) * amount));
    return `#${light.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  }

  function darkenHex(hex, amount = 0.45) {
    const normalized = String(hex || "#1f2937").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      return "#1f2937";
    }

    const channels = [0, 2, 4].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16));
    const dark = channels.map((channel) => Math.round(channel * (1 - amount)));
    return `#${dark.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  }

  function getTypeForEntry(entry) {
    return state.types.find((type) => Number(type.id) === Number(entry.type_id)) || entry.type || {
      id: 0,
      name: "Sin tipo",
      color: "#dce8f5",
    };
  }

  function getEntrySearchText(entry) {
    const type = getTypeForEntry(entry);
    const spanish = getTranslation(entry, languageIds.es);
    const english = getTranslation(entry, languageIds.en);

    return [
      type.name,
      spanish.name,
      english.name,
      htmlToText(spanish.description),
      htmlToText(english.description),
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function getFilteredEntries() {
    const search = state.search.trim().toLowerCase();
    if (!search) {
      return state.entries;
    }

    return state.entries.filter((entry) => getEntrySearchText(entry).includes(search));
  }

  function createCard(entry) {
    const type = getTypeForEntry(entry);
    const spanish = getTranslation(entry, languageIds.es);
    const english = getTranslation(entry, languageIds.en);
    const descriptionText = htmlToText(spanish.description || english.description || "");

    const card = document.createElement("button");
    card.type = "button";
    card.className = "glossary-card";
    card.style.setProperty("--glossary-color", darkenHex(type.color, 0.52));
    card.style.setProperty("--glossary-color-light", darkenHex(type.color, 0.28));
    card.addEventListener("click", () => openDetail(entry));

    const title = document.createElement("span");
    title.className = "glossary-card-title";
    title.textContent = [spanish.name, english.name].filter(Boolean).join(" / ") || "Sin nombre";

    const description = document.createElement("span");
    description.className = "glossary-card-description";
    description.textContent = descriptionText || "Sin descripcion.";

    card.append(title, description);
    return card;
  }

  function renderSections() {
    const container = getElement(selectors.sections);
    if (!container) return;

    container.innerHTML = "";

    const filteredEntries = getFilteredEntries();

    if (state.entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "glossary-empty";
      empty.textContent = "No hay glosarios disponibles.";
      container.appendChild(empty);
      return;
    }

    if (filteredEntries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "glossary-empty";
      empty.textContent = "No hay glosarios que coincidan con la busqueda.";
      container.appendChild(empty);
      return;
    }

    state.types.forEach((type) => {
      const entries = filteredEntries.filter((entry) => Number(entry.type_id) === Number(type.id));
      if (entries.length === 0) return;

      const section = document.createElement("section");
      section.className = "glossary-type-section";

      const heading = document.createElement("h3");
      heading.textContent = type.name;
      heading.style.setProperty("--glossary-type-color", type.color || "#79c0ff");

      const grid = document.createElement("div");
      grid.className = "glossary-grid";
      entries.forEach((entry) => grid.appendChild(createCard(entry)));

      section.append(heading, grid);
      container.appendChild(section);
    });

    const untypedEntries = filteredEntries.filter((entry) => !state.types.some((type) => Number(type.id) === Number(entry.type_id)));
    if (untypedEntries.length > 0) {
      const section = document.createElement("section");
      section.className = "glossary-type-section";

      const heading = document.createElement("h3");
      heading.textContent = "Sin tipo";

      const grid = document.createElement("div");
      grid.className = "glossary-grid";
      untypedEntries.forEach((entry) => grid.appendChild(createCard(entry)));

      section.append(heading, grid);
      container.appendChild(section);
    }
  }

  function renderTypeOptions() {
    const select = getElement(selectors.type);
    if (!select) return;

    select.innerHTML = "";
    state.types.forEach((type) => {
      const option = document.createElement("option");
      option.value = String(type.id);
      option.textContent = type.name;
      select.appendChild(option);
    });
  }

  function renderSummary() {
    const summary = getElement(selectors.summary);
    if (!summary) return;
    summary.textContent = `${state.entries.length} tarjetas disponibles`;
  }

  function renderCreateAccess() {
    const createButton = getElement(selectors.create);
    const manageTypesButton = getElement(selectors.manageTypes);

    createButton?.classList.toggle("hidden", !isAuthenticatedMode());
    manageTypesButton?.classList.toggle("hidden", !isAdmin());
  }

  function getTypeUsageCount(typeId) {
    return state.entries.filter((entry) => Number(entry.type_id) === Number(typeId)).length;
  }

  function createTypeActionButton(label, onClick, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button glossary-table-action";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderTypesTable() {
    const tbody = getElement(selectors.typesTableBody);
    if (!tbody) return;

    tbody.innerHTML = "";

    if (state.types.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = "No hay tipos disponibles.";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    state.types.forEach((type) => {
      const usageCount = getTypeUsageCount(type.id);
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = type.name;

      const colorCell = document.createElement("td");
      const swatch = document.createElement("span");
      swatch.className = "glossary-color-swatch";
      swatch.style.backgroundColor = type.color || "#79c0ff";
      const colorValue = document.createElement("span");
      colorValue.textContent = type.color || "";
      colorCell.append(swatch, colorValue);

      const countCell = document.createElement("td");
      countCell.textContent = String(usageCount);

      const actionsCell = document.createElement("td");
      actionsCell.className = "glossary-table-actions";
      actionsCell.append(
        createTypeActionButton("Editar", () => openTypeForm(type)),
        createTypeActionButton("Eliminar", () => deleteType(type), usageCount > 0),
      );

      row.append(nameCell, colorCell, countCell, actionsCell);
      tbody.appendChild(row);
    });
  }

  function render() {
    renderSummary();
    renderCreateAccess();
    renderTypeOptions();
    const search = getElement(selectors.search);
    if (search && search.value !== state.search) {
      search.value = state.search;
    }
    renderSections();
    renderTypesTable();
  }

  function createDetailLanguageBlock(label, translation) {
    const section = document.createElement("section");
    section.className = "glossary-detail-language";

    const heading = document.createElement("h3");
    heading.textContent = label;

    const title = document.createElement("h4");
    title.textContent = translation.name || "Sin nombre";

    const description = document.createElement("div");
    description.className = "glossary-rich-content";
    description.innerHTML = sanitizeHtml(translation.description || "<p>Sin descripcion.</p>");

    section.append(heading, title, description);
    return section;
  }

  function openDetail(entry) {
    state.selectedEntry = entry;

    const spanish = getTranslation(entry, languageIds.es);
    const english = getTranslation(entry, languageIds.en);
    const type = getTypeForEntry(entry);
    const title = getElement(selectors.detailTitle);
    const content = getElement(selectors.detailContent);
    const editButton = getElement(selectors.edit);
    const deleteButton = getElement(selectors.delete);

    if (title) {
      title.textContent = [spanish.name, english.name].filter(Boolean).join(" / ") || "Detalle";
    }

    if (content) {
      content.innerHTML = "";

      const badge = document.createElement("div");
      badge.className = "glossary-detail-type";
      badge.style.setProperty("--glossary-type-color", type.color || "#79c0ff");
      badge.textContent = type.name || "Sin tipo";

      content.append(
        badge,
        createDetailLanguageBlock("Español", spanish),
        createDetailLanguageBlock("English", english),
      );
    }

    editButton?.classList.toggle("hidden", !canManageEntry(entry));
    deleteButton?.classList.toggle("hidden", !canManageEntry(entry));
    getElement(selectors.detailDialog)?.showModal();
  }

  function setEditorValue(id, value) {
    const editor = getElement(id);
    if (editor) {
      editor.innerHTML = sanitizeHtml(value || "");
    }
  }

  function resetForm(entry = null) {
    state.editingEntry = entry;
    const spanish = entry ? getTranslation(entry, languageIds.es) : {};
    const english = entry ? getTranslation(entry, languageIds.en) : {};

    const formTitle = getElement(selectors.formTitle);
    const type = getElement(selectors.type);
    const nameEs = getElement(selectors.nameEs);
    const nameEn = getElement(selectors.nameEn);

    if (formTitle) formTitle.textContent = entry ? "Editar glosario" : "Crear glosario";
    if (type) type.value = String(entry?.type_id ?? state.types[0]?.id ?? "");
    if (nameEs) nameEs.value = spanish.name || "";
    if (nameEn) nameEn.value = english.name || "";
    setEditorValue(selectors.descriptionEs, spanish.description || "");
    setEditorValue(selectors.descriptionEn, english.description || "");
    setFormMessage("");
  }

  function openForm(entry = null) {
    if (!isAuthenticatedMode()) return;
    resetForm(entry);
    getElement(selectors.formDialog)?.showModal();
  }

  function openTypesDialog() {
    if (!isAdmin()) return;
    setTypesMessage("");
    renderTypesTable();
    getElement(selectors.typesDialog)?.showModal();
  }

  function resetTypeForm(type = null) {
    state.editingType = type;
    const title = getElement(selectors.typeFormTitle);
    const name = getElement(selectors.typeName);
    const color = getElement(selectors.typeColor);

    if (title) title.textContent = type ? "Editar tipo" : "Nuevo tipo";
    if (name) name.value = type?.name || "";
    if (color) color.value = /^#[0-9a-f]{6}$/i.test(type?.color || "") ? type.color : "#79c0ff";
    setTypeFormMessage("");
  }

  function openTypeForm(type = null) {
    if (!isAdmin()) return;
    resetTypeForm(type);
    getElement(selectors.typeFormDialog)?.showModal();
  }

  function getEditorHtml(id) {
    return sanitizeHtml(getElement(id)?.innerHTML || "");
  }

  function buildFormPayload() {
    const type = getElement(selectors.type);
    const nameEs = getElement(selectors.nameEs);
    const nameEn = getElement(selectors.nameEn);

    return {
      id: state.editingEntry?.id,
      type_id: Number(type?.value),
      translations: [
        {
          language_id: languageIds.es,
          name: (nameEs?.value || "").trim(),
          description: getEditorHtml(selectors.descriptionEs),
        },
        {
          language_id: languageIds.en,
          name: (nameEn?.value || "").trim(),
          description: getEditorHtml(selectors.descriptionEn),
        },
      ],
    };
  }

  async function loadData() {
    if (!window.GlosarioAjax) {
      setMessage("No se pudo cargar el modulo de datos.", "error");
      return;
    }

    setMessage("");

    try {
      const [types, entries] = await Promise.all([
        window.GlosarioAjax.getGlossaryTypes(),
        window.GlosarioAjax.getGlossaryEntries(),
      ]);

      state.types = Array.isArray(types) ? types : [];
      state.entries = Array.isArray(entries) ? entries.map(normalizeEntry) : [];
      render();
    } catch (error) {
      console.error("No se pudo cargar el glosario.", error);
      setMessage(error.message || "No se pudo cargar el glosario.", "error");
      render();
    }
  }

  async function saveEntry(event) {
    event.preventDefault();

    if (!isAuthenticatedMode()) {
      setFormMessage("Debes iniciar sesion para crear glosarios.", "error");
      return;
    }

    const payload = buildFormPayload();
    const hasMissingTranslation = payload.translations.some((translation) => !translation.name);
    if (!payload.type_id || hasMissingTranslation) {
      setFormMessage("El tipo y ambos nombres son obligatorios.", "error");
      return;
    }

    try {
      const savedEntry = state.editingEntry
        ? await window.GlosarioAjax.putGlossaryEntry(payload)
        : await window.GlosarioAjax.postGlossaryEntry(payload);
      const normalized = normalizeEntry(savedEntry);
      const index = state.entries.findIndex((entry) => Number(entry.id) === Number(normalized.id));

      if (index === -1) {
        state.entries.unshift(normalized);
      } else {
        state.entries[index] = normalized;
      }

      getElement(selectors.formDialog)?.close();
      render();
      setMessage("Glosario guardado.", "success");
    } catch (error) {
      console.error("No se pudo guardar el glosario.", error);
      setFormMessage(error.message || "No se pudo guardar el glosario.", "error");
    }
  }

  async function saveType(event) {
    event.preventDefault();

    if (!isAdmin()) {
      setTypeFormMessage("Solo los administradores pueden guardar tipos.", "error");
      return;
    }

    const name = (getElement(selectors.typeName)?.value || "").trim();
    const color = getElement(selectors.typeColor)?.value || "";

    if (!name || !/^#[0-9a-f]{6}$/i.test(color)) {
      setTypeFormMessage("Nombre y color hexadecimal son obligatorios.", "error");
      return;
    }

    try {
      const payload = {
        id: state.editingType?.id,
        name,
        color,
      };
      const savedType = state.editingType
        ? await window.GlosarioAjax.putGlossaryType(payload)
        : await window.GlosarioAjax.postGlossaryType(payload);
      const normalizedType = {
        ...savedType,
        id: Number(savedType.id),
      };
      const index = state.types.findIndex((type) => Number(type.id) === Number(normalizedType.id));

      if (index === -1) {
        state.types.push(normalizedType);
      } else {
        state.types[index] = normalizedType;
      }

      state.types.sort((left, right) => Number(left.id) - Number(right.id));
      getElement(selectors.typeFormDialog)?.close();
      render();
      setTypesMessage("Tipo guardado.", "success");
    } catch (error) {
      console.error("No se pudo guardar el tipo de glosario.", error);
      setTypeFormMessage(error.message || "No se pudo guardar el tipo.", "error");
    }
  }

  async function deleteType(type) {
    if (!isAdmin() || !type) return;

    if (getTypeUsageCount(type.id) > 0) {
      setTypesMessage("No se puede eliminar un tipo con glosarios asignados.", "error");
      renderTypesTable();
      return;
    }

    const accepted = window.confirm("Vas a borrar permanentemente este tipo de glosario.");
    if (!accepted) return;

    try {
      await window.GlosarioAjax.deleteGlossaryType({ id: type.id });
      state.types = state.types.filter((item) => Number(item.id) !== Number(type.id));
      render();
      setTypesMessage("Tipo eliminado.", "success");
    } catch (error) {
      console.error("No se pudo eliminar el tipo de glosario.", error);
      setTypesMessage(error.message || "No se pudo eliminar el tipo.", "error");
    }
  }

  async function deleteSelectedEntry() {
    const entry = state.selectedEntry;
    if (!entry || !canManageEntry(entry)) return;

    const accepted = window.confirm("Vas a borrar permanentemente este contenido. Esta accion no se puede deshacer.");
    if (!accepted) return;

    try {
      await window.GlosarioAjax.deleteGlossaryEntry({ id: entry.id });
      state.entries = state.entries.filter((item) => Number(item.id) !== Number(entry.id));
      state.selectedEntry = null;
      getElement(selectors.detailDialog)?.close();
      render();
      setMessage("Glosario eliminado.", "success");
    } catch (error) {
      console.error("No se pudo eliminar el glosario.", error);
      setMessage(error.message || "No se pudo eliminar el glosario.", "error");
    }
  }

  function createToolbarButton(label, title, command) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      const editor = getElement(button.closest(".glossary-editor-toolbar")?.dataset.editorFor);
      editor?.focus();
      document.execCommand(command, false, null);
    });
    return button;
  }

  function bindEditorToolbars() {
    document.querySelectorAll(".glossary-editor-toolbar").forEach((toolbar) => {
      if (toolbar.dataset.bound === "true") return;
      toolbar.dataset.bound = "true";
      toolbar.append(
        createToolbarButton("B", "Negrita", "bold"),
        createToolbarButton("I", "Cursiva", "italic"),
        createToolbarButton("U", "Subrayado", "underline"),
        createToolbarButton("•", "Lista", "insertUnorderedList"),
      );
    });
  }

  function bindEvents() {
    getElement(selectors.closeNotice)?.addEventListener("click", () => {
      getElement(selectors.notice)?.classList.add("hidden");
    });
    getElement(selectors.manageTypes)?.addEventListener("click", openTypesDialog);
    getElement(selectors.search)?.addEventListener("input", (event) => {
      state.search = event.currentTarget.value;
      renderSections();
    });
    getElement(selectors.create)?.addEventListener("click", () => openForm());
    getElement(selectors.closeDetail)?.addEventListener("click", () => getElement(selectors.detailDialog)?.close());
    getElement(selectors.closeForm)?.addEventListener("click", () => getElement(selectors.formDialog)?.close());
    getElement(selectors.closeTypes)?.addEventListener("click", () => getElement(selectors.typesDialog)?.close());
    getElement(selectors.closeTypeForm)?.addEventListener("click", () => getElement(selectors.typeFormDialog)?.close());
    getElement(selectors.newType)?.addEventListener("click", () => openTypeForm());
    getElement(selectors.form)?.addEventListener("submit", saveEntry);
    getElement(selectors.typeForm)?.addEventListener("submit", saveType);
    getElement(selectors.edit)?.addEventListener("click", () => {
      getElement(selectors.detailDialog)?.close();
      openForm(state.selectedEntry);
    });
    getElement(selectors.delete)?.addEventListener("click", deleteSelectedEntry);
    bindEditorToolbars();
  }

  function init() {
    const page = getElement(selectors.page);
    if (!page) return;

    if (state.boundPage !== page) {
      bindEvents();
      state.boundPage = page;
    }

    renderCreateAccess();
    loadData();
  }

  return {
    init,
    clearData() {
      state.boundPage = null;
      state.types = [];
      state.entries = [];
      state.search = "";
      state.selectedEntry = null;
      state.editingEntry = null;
      state.editingType = null;
    },
  };
})();

window.GlosarioPresenter = GlosarioPresenter;
