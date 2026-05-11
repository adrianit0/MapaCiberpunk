const TurnosLancerPresenter = (() => {
  const selectors = {
    page: "turnosLancerPage",
    addButton: "addTurnoCard",
    advanceButton: "advanceTurno",
    clearButton: "clearTurnos",
    rosterList: "turnosRosterList",
    sequenceList: "turnosSequenceList",
    status: "turnosStatus",
    dialog: "turnoCardDialog",
    form: "turnoCardForm",
    nameInput: "turnoCardName",
    saveButton: "saveTurnoCard",
    closeDialog: "closeTurnoCardDialog",
    cancelDialog: "cancelTurnoCardDialog",
  };

  const state = {
    boundPage: null,
    cards: [],
    sequence: [],
    activeIndex: 0,
    draggedCardId: null,
    editingCardId: null,
    openMenuCardId: null,
    documentClickBound: false,
  };

  function getElement(id) {
    return document.getElementById(id);
  }

  function getCard(cardId) {
    return state.cards.find((card) => card.id === cardId);
  }

  function createCardElement(card, zone) {
    const cardElement = document.createElement("div");
    cardElement.className = `turno-card turno-card-${card.type}`;
    cardElement.draggable = true;
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.zone = zone;
    cardElement.setAttribute("role", "group");
    cardElement.setAttribute("aria-label", `${card.name}, ${card.type === "ally" ? "aliado" : "enemigo"}`);

    const name = document.createElement("span");
    name.className = "turno-card-name";
    name.textContent = `${card.isDead ? "\u2620 " : ""}${card.name}`;

    if (zone === "roster" && state.sequence.includes(card.id)) {
      cardElement.classList.add("turno-card-muted");
    }

    const actions = document.createElement("div");
    actions.className = "turno-card-actions";

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "turno-card-menu-button";
    menuButton.setAttribute("aria-label", `Opciones de ${card.name}`);
    menuButton.setAttribute("aria-expanded", String(state.openMenuCardId === card.id));
    menuButton.textContent = "...";
    menuButton.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    const menu = document.createElement("div");
    menu.className = "turno-card-menu";
    menu.classList.toggle("hidden", state.openMenuCardId !== card.id);

    menu.append(
      createMenuAction("Editar", () => openEditDialog(card.id)),
      createMenuAction("Eliminar", () => deleteCard(card.id))
    );

    if (!card.isDead) {
      menu.append(createMenuAction("Matar", () => killCard(card.id)));
    } else {
      menu.append(createMenuAction("Revivir", () => reviveCard(card.id)));
    }

    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      state.openMenuCardId = state.openMenuCardId === card.id ? null : card.id;
      render();
    });

    actions.append(menuButton, menu);
    cardElement.append(name, actions);

    cardElement.addEventListener("dragstart", (event) => {
      state.draggedCardId = card.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", card.id);
      state.openMenuCardId = null;
      cardElement.classList.add("dragging");
    });

    cardElement.addEventListener("dragend", () => {
      state.draggedCardId = null;
      cardElement.classList.remove("dragging");
      clearDropTargets();
    });

    return cardElement;
  }

  function createMenuAction(label, handler) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "turno-card-menu-action";
    action.textContent = label;
    action.addEventListener("click", (event) => {
      event.stopPropagation();
      state.openMenuCardId = null;
      handler();
    });
    return action;
  }

  function renderRoster() {
    const rosterList = getElement(selectors.rosterList);
    if (!rosterList) return;

    rosterList.innerHTML = "";
    state.cards.forEach((card) => {
      rosterList.appendChild(createCardElement(card, "roster"));
    });
  }

  function renderSequence() {
    const sequenceList = getElement(selectors.sequenceList);
    if (!sequenceList) return;

    sequenceList.innerHTML = "";
    state.sequence.forEach((cardId, index) => {
      const card = getCard(cardId);
      if (!card) return;

      const cardElement = createCardElement(card, "sequence");
      cardElement.classList.toggle("active-turn", index === state.activeIndex);
      sequenceList.appendChild(cardElement);
    });
  }

  function updateStatus() {
    const status = getElement(selectors.status);
    if (!status) return;

    if (state.sequence.length === 0) {
      status.textContent = "Arrastra una tarjeta aqui para iniciar la ronda.";
      return;
    }

    const activeCard = getCard(state.sequence[state.activeIndex]);
    status.textContent = activeCard
      ? `Turno actual: ${activeCard.name} (${activeCard.type === "ally" ? "Aliado" : "Enemigo"})`
      : "Selecciona el siguiente turno.";
  }

  function render() {
    if (!getElement(selectors.page)) return;
    state.activeIndex = Math.min(state.activeIndex, Math.max(state.sequence.length - 1, 0));
    renderRoster();
    renderSequence();
    updateStatus();
  }

  function openDialog() {
    const dialog = getElement(selectors.dialog);
    const form = getElement(selectors.form);
    const nameInput = getElement(selectors.nameInput);
    if (!dialog || !form || !nameInput) return;

    state.editingCardId = null;
    form.reset();
    form.elements.type.value = "ally";
    getElement("turnoCardDialogTitle").textContent = "Nueva tarjeta";
    getElement(selectors.saveButton).textContent = "Crear";
    dialog.showModal();
    nameInput.focus();
  }

  function openEditDialog(cardId) {
    const card = getCard(cardId);
    const dialog = getElement(selectors.dialog);
    const form = getElement(selectors.form);
    const nameInput = getElement(selectors.nameInput);
    if (!card || !dialog || !form || !nameInput) return;

    state.editingCardId = cardId;
    form.reset();
    form.elements.name.value = card.name;
    form.elements.type.value = card.type;
    getElement("turnoCardDialogTitle").textContent = "Editar tarjeta";
    getElement(selectors.saveButton).textContent = "Guardar";
    dialog.showModal();
    nameInput.focus();
  }

  function closeDialog() {
    const dialog = getElement(selectors.dialog);
    const form = getElement(selectors.form);
    state.editingCardId = null;
    form?.reset();
    if (dialog?.open) {
      dialog.close();
    }
  }

  function saveCard(form) {
    const name = form.elements.name.value.trim();
    if (!name) return;

    if (state.editingCardId) {
      const card = getCard(state.editingCardId);
      if (card) {
        card.name = name;
        card.type = form.elements.type.value;
      }
      closeDialog();
      render();
      return;
    }

    state.cards.push({
      id: crypto.randomUUID(),
      name,
      type: form.elements.type.value,
      isDead: false,
    });

    closeDialog();
    render();
  }

  function deleteCard(cardId) {
    const card = getCard(cardId);
    if (!card) return;
    if (!confirm(`Eliminar "${card.name}"?`)) return;

    state.cards = state.cards.filter((item) => item.id !== cardId);
    state.sequence = state.sequence.filter((id) => id !== cardId);
    state.activeIndex = Math.min(state.activeIndex, Math.max(state.sequence.length - 1, 0));
    render();
  }

  function killCard(cardId) {
    const card = getCard(cardId);
    if (!card || card.isDead) return;
    card.isDead = true;
    render();
  }

  function reviveCard(cardId) {
    const card = getCard(cardId);
    if (!card || !card.isDead) return;
    card.isDead = false;
    render();
  }

  function clearDropTargets() {
    document.querySelectorAll(".turnos-card-list.drag-over").forEach((zone) => {
      zone.classList.remove("drag-over");
    });
  }

  function getDraggedCardId(event) {
    return event.dataTransfer.getData("text/plain") || state.draggedCardId;
  }

  function getDropIndex(list, clientX, clientY) {
    const cards = Array.from(list.querySelectorAll(".turno-card:not(.dragging)"));
    const target = cards.find((card) => {
      const rect = card.getBoundingClientRect();
      const isAboveRowCenter = clientY < rect.top + rect.height / 2;
      const isInsideRow = clientY >= rect.top && clientY <= rect.bottom;
      const isBeforeColumnCenter = clientX < rect.left + rect.width / 2;
      return isAboveRowCenter || (isInsideRow && isBeforeColumnCenter);
    });
    return target ? cards.indexOf(target) : cards.length;
  }

  function moveCardToSequence(cardId, index) {
    state.sequence = state.sequence.filter((id) => id !== cardId);
    state.sequence.splice(index, 0, cardId);
    state.activeIndex = Math.min(state.activeIndex, Math.max(state.sequence.length - 1, 0));
  }

  function removeCardFromSequence(cardId) {
    state.sequence = state.sequence.filter((id) => id !== cardId);
    state.activeIndex = Math.min(state.activeIndex, Math.max(state.sequence.length - 1, 0));
  }

  function bindDropZone(list) {
    list.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      list.classList.add("drag-over");
    });

    list.addEventListener("dragleave", (event) => {
      if (!list.contains(event.relatedTarget)) {
        list.classList.remove("drag-over");
      }
    });

    list.addEventListener("drop", (event) => {
      event.preventDefault();
      const cardId = getDraggedCardId(event);
      if (!cardId || !getCard(cardId)) return;

      if (list.dataset.zone === "sequence") {
        moveCardToSequence(cardId, getDropIndex(list, event.clientX, event.clientY));
      } else {
        removeCardFromSequence(cardId);
      }

      clearDropTargets();
      render();
    });
  }

  function bindEvents() {
    getElement(selectors.addButton)?.addEventListener("click", openDialog);
    getElement(selectors.closeDialog)?.addEventListener("click", closeDialog);
    getElement(selectors.cancelDialog)?.addEventListener("click", closeDialog);

    getElement(selectors.form)?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveCard(event.currentTarget);
    });

    getElement(selectors.advanceButton)?.addEventListener("click", () => {
      if (state.sequence.length === 0) return;
      state.activeIndex = (state.activeIndex + 1) % state.sequence.length;
      render();
    });

    getElement(selectors.clearButton)?.addEventListener("click", () => {
      state.sequence = [];
      state.activeIndex = 0;
      state.openMenuCardId = null;
      render();
    });

    [getElement(selectors.rosterList), getElement(selectors.sequenceList)]
      .filter(Boolean)
      .forEach(bindDropZone);

    if (!state.documentClickBound) {
      document.addEventListener("click", () => {
        if (!state.openMenuCardId) return;
        state.openMenuCardId = null;
        render();
      });
      state.documentClickBound = true;
    }
  }

  function init() {
    const page = getElement(selectors.page);
    if (!page) return;

    if (state.boundPage !== page) {
      bindEvents();
      state.boundPage = page;
    }

    render();
  }

  return {
    init,
    clearData() {
      state.cards = [];
      state.sequence = [];
      state.activeIndex = 0;
      state.draggedCardId = null;
      state.editingCardId = null;
      state.openMenuCardId = null;
      clearDropTargets();
      closeDialog();
      render();
    },
  };
})();

window.TurnosLancerPresenter = TurnosLancerPresenter;
