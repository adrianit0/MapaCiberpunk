const TurnosLancerPresenter = (() => {
  const selectors = {
    page: "turnosLancerPage",
    addButton: "addTurnoCard",
    advanceButton: "advanceTurno",
    newCombatButton: "newCombat",
    previousRoundButton: "previousRound",
    nextRoundButton: "nextRound",
    currentRound: "currentRound",
    alliesList: "turnosAlliesList",
    enemiesList: "turnosEnemiesList",
    sequenceList: "turnosSequenceList",
    status: "turnosStatus",
    dialog: "turnoCardDialog",
    form: "turnoCardForm",
    nameInput: "turnoCardName",
    saveButton: "saveTurnoCard",
    createAnotherOption: "createAnotherCardOption",
    closeDialog: "closeTurnoCardDialog",
    cancelDialog: "cancelTurnoCardDialog",
  };

  const state = {
    boundPage: null,
    cards: [],
    rounds: [[]],
    currentRoundIndex: 0,
    draggedCardId: null,
    touchDrag: null,
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

  function getCurrentSequence() {
    if (!state.rounds[state.currentRoundIndex]) {
      state.rounds[state.currentRoundIndex] = [];
    }
    return state.rounds[state.currentRoundIndex];
  }

  function setCurrentSequence(sequence) {
    state.rounds[state.currentRoundIndex] = sequence;
  }

  function getLatestRoundIndex() {
    return Math.max(state.rounds.length - 1, 0);
  }

  function isViewingLatestRound() {
    return state.currentRoundIndex === getLatestRoundIndex();
  }

  function getAllCardIds() {
    return state.cards.map((card) => card.id);
  }

  function createCardElement(card, zone, options = {}) {
    const isReadOnly = Boolean(options.readOnly);
    const cardElement = document.createElement("div");
    cardElement.className = `turno-card turno-card-${card.type}`;
    cardElement.draggable = !isReadOnly;
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.zone = zone;
    cardElement.setAttribute("role", "group");
    cardElement.setAttribute("aria-label", `${card.name}, ${card.type === "ally" ? "aliado" : "enemigo"}`);

    const name = document.createElement("span");
    name.className = "turno-card-name";
    name.textContent = `${card.isDead ? "\u2620 " : ""}${card.name}`;

    if (zone === "roster" && getCurrentSequence().includes(card.id)) {
      cardElement.classList.add("turno-card-muted");
    }

    cardElement.append(name);

    if (!isReadOnly) {
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
        createMenuAction("Clonar", () => cloneCard(card.id)),
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
      cardElement.append(actions);

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

      cardElement.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" || event.button !== 0) return;
        if (event.target.closest("button, .turno-card-menu")) return;

        state.touchDrag = {
          cardId: card.id,
          element: cardElement,
          startX: event.clientX,
          startY: event.clientY,
          currentX: event.clientX,
          currentY: event.clientY,
          isDragging: false,
        };
        state.openMenuCardId = null;
        cardElement.setPointerCapture?.(event.pointerId);
      });

      cardElement.addEventListener("pointermove", (event) => {
        updateTouchDrag(event);
      });

      cardElement.addEventListener("pointerup", (event) => {
        finishTouchDrag(event);
      });

      cardElement.addEventListener("pointercancel", () => {
        cancelTouchDrag();
      });
    } else {
      cardElement.classList.add("turno-card-readonly");
    }

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
    const alliesList = getElement(selectors.alliesList);
    const enemiesList = getElement(selectors.enemiesList);
    if (!alliesList || !enemiesList) return;

    const isReadOnly = !isViewingLatestRound();
    alliesList.innerHTML = "";
    enemiesList.innerHTML = "";
    state.cards.forEach((card) => {
      const list = card.type === "ally" ? alliesList : enemiesList;
      list.appendChild(createCardElement(card, "roster", { readOnly: isReadOnly }));
    });
  }

  function renderSequence() {
    const sequenceList = getElement(selectors.sequenceList);
    if (!sequenceList) return;

    const isReadOnly = !isViewingLatestRound();
    sequenceList.innerHTML = "";
    sequenceList.classList.toggle("turnos-readonly-zone", isReadOnly);
    getCurrentSequence().forEach((cardId) => {
      const card = getCard(cardId);
      if (!card) return;

      const cardElement = createCardElement(card, "sequence", { readOnly: isReadOnly });
      sequenceList.appendChild(cardElement);
    });
  }

  function renderRoundControls() {
    const currentRound = getElement(selectors.currentRound);
    const previousButton = getElement(selectors.previousRoundButton);
    const nextButton = getElement(selectors.nextRoundButton);
    const addButton = getElement(selectors.addButton);
    const advanceButton = getElement(selectors.advanceButton);
    const isLatestRound = isViewingLatestRound();

    if (currentRound) {
      currentRound.textContent = String(state.currentRoundIndex + 1);
    }

    if (previousButton) {
      previousButton.disabled = state.currentRoundIndex === 0;
    }

    if (nextButton) {
      nextButton.disabled = state.currentRoundIndex >= getLatestRoundIndex();
    }

    if (addButton) {
      addButton.disabled = !isLatestRound;
    }

    if (advanceButton) {
      advanceButton.disabled = !isLatestRound || state.cards.length === 0;
    }
  }

  function updateStatus() {
    const status = getElement(selectors.status);
    if (!status) return;

    const sequence = getCurrentSequence();
    if (sequence.length === 0) {
      status.textContent = isViewingLatestRound()
        ? "Arrastra una tarjeta aqui para iniciar la ronda."
        : "Ronda anterior vacia de solo lectura.";
      return;
    }

    status.textContent = isViewingLatestRound()
      ? "Ronda editable."
      : "Ronda anterior de solo lectura.";
  }

  function render() {
    if (!getElement(selectors.page)) return;
    state.currentRoundIndex = Math.min(state.currentRoundIndex, getLatestRoundIndex());
    renderRoster();
    renderSequence();
    renderRoundControls();
    updateStatus();
  }

  function openDialog() {
    const dialog = getElement(selectors.dialog);
    const form = getElement(selectors.form);
    const nameInput = getElement(selectors.nameInput);
    const createAnotherOption = getElement(selectors.createAnotherOption);
    if (!dialog || !form || !nameInput) return;

    state.editingCardId = null;
    form.reset();
    form.elements.type.value = "ally";
    createAnotherOption?.classList.remove("hidden");
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
    const createAnotherOption = getElement(selectors.createAnotherOption);
    if (!card || !dialog || !form || !nameInput) return;

    state.editingCardId = cardId;
    form.reset();
    form.elements.name.value = card.name;
    form.elements.type.value = card.type;
    form.elements.createAnother.checked = false;
    createAnotherOption?.classList.add("hidden");
    getElement("turnoCardDialogTitle").textContent = "Editar tarjeta";
    getElement(selectors.saveButton).textContent = "Guardar";
    dialog.showModal();
    nameInput.focus();
  }

  function closeDialog() {
    const dialog = getElement(selectors.dialog);
    const form = getElement(selectors.form);
    const createAnotherOption = getElement(selectors.createAnotherOption);
    state.editingCardId = null;
    form?.reset();
    createAnotherOption?.classList.remove("hidden");
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

    const selectedType = form.elements.type.value;
    const shouldCreateAnother = Boolean(form.elements.createAnother?.checked);

    state.cards.push({
      id: crypto.randomUUID(),
      name,
      type: selectedType,
      isDead: false,
    });

    if (shouldCreateAnother) {
      form.elements.name.value = "";
      form.elements.type.value = selectedType;
      getElement(selectors.nameInput)?.focus();
      render();
      return;
    }

    closeDialog();
    render();
  }

  function getCloneBaseName(name) {
    return name.replace(/\s\(\d+\)$/, "");
  }

  function getCloneName(name) {
    const baseName = getCloneBaseName(name);
    const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const clonePattern = new RegExp(`^${escapedBaseName} \\((\\d+)\\)$`);
    const usedIndexes = state.cards
      .map((card) => card.name.match(clonePattern))
      .filter(Boolean)
      .map((match) => Number(match[1]));

    const nextIndex = usedIndexes.length > 0 ? Math.max(...usedIndexes) + 1 : 1;
    return `${baseName} (${nextIndex})`;
  }

  function cloneCard(cardId) {
    const card = getCard(cardId);
    if (!card) return;

    const cardIndex = state.cards.findIndex((item) => item.id === cardId);
    const clonedCard = {
      ...card,
      id: crypto.randomUUID(),
      name: getCloneName(card.name),
    };

    state.cards.splice(cardIndex + 1, 0, clonedCard);
    render();
  }

  function deleteCard(cardId) {
    const card = getCard(cardId);
    if (!card) return;
    if (!confirm(`Eliminar "${card.name}"?`)) return;

    state.cards = state.cards.filter((item) => item.id !== cardId);
    state.rounds = state.rounds.map((round) => round.filter((id) => id !== cardId));
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

  function resetCombat() {
    if (!confirm("Iniciar un nuevo combate? Se eliminaran las rondas actuales, pero se conservaran los participantes.")) {
      return;
    }

    state.rounds = [[]];
    state.currentRoundIndex = 0;
    state.draggedCardId = null;
    state.editingCardId = null;
    state.openMenuCardId = null;
    cancelTouchDrag();
    clearDropTargets();
    closeDialog();
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
    const sequence = getCurrentSequence().filter((id) => id !== cardId);
    sequence.splice(index, 0, cardId);
    setCurrentSequence(sequence);
  }

  function removeCardFromSequence(cardId) {
    setCurrentSequence(getCurrentSequence().filter((id) => id !== cardId));
  }

  function getDropZoneAtPoint(clientX, clientY) {
    return document.elementFromPoint(clientX, clientY)?.closest(".turnos-card-list") || null;
  }

  function updateTouchDropTarget(clientX, clientY) {
    clearDropTargets();
    const dropZone = getDropZoneAtPoint(clientX, clientY);
    if (!isViewingLatestRound()) return null;
    dropZone?.classList.add("drag-over");
    return dropZone;
  }

  function startTouchDrag(event, touchDrag) {
    state.draggedCardId = touchDrag.cardId;
    touchDrag.isDragging = true;
    touchDrag.element.classList.add("dragging", "touch-dragging");
    touchDrag.element.style.width = `${touchDrag.element.offsetWidth}px`;
    touchDrag.element.style.height = `${touchDrag.element.offsetHeight}px`;
    touchDrag.element.style.transform = "translate3d(0, 0, 0)";
    touchDrag.element.style.zIndex = "20";
    event.preventDefault();
  }

  function updateTouchDrag(event) {
    const touchDrag = state.touchDrag;
    if (!touchDrag || touchDrag.element !== event.currentTarget) return;

    touchDrag.currentX = event.clientX;
    touchDrag.currentY = event.clientY;

    const deltaX = event.clientX - touchDrag.startX;
    const deltaY = event.clientY - touchDrag.startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (!touchDrag.isDragging && distance < 8) return;
    if (!touchDrag.isDragging) {
      if (!isViewingLatestRound()) return;
      startTouchDrag(event, touchDrag);
    }

    touchDrag.element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    updateTouchDropTarget(event.clientX, event.clientY);
    event.preventDefault();
  }

  function resetTouchDragElement(touchDrag) {
    touchDrag.element.classList.remove("dragging", "touch-dragging");
    touchDrag.element.style.removeProperty("width");
    touchDrag.element.style.removeProperty("height");
    touchDrag.element.style.removeProperty("transform");
    touchDrag.element.style.removeProperty("z-index");
  }

  function finishTouchDrag(event) {
    const touchDrag = state.touchDrag;
    if (!touchDrag || touchDrag.element !== event.currentTarget) return;

    state.touchDrag = null;

    if (!touchDrag.isDragging) {
      state.draggedCardId = null;
      return;
    }

    const dropZone = updateTouchDropTarget(touchDrag.currentX, touchDrag.currentY);
    if (dropZone && getCard(touchDrag.cardId) && isViewingLatestRound()) {
      if (dropZone.dataset.zone === "sequence") {
        moveCardToSequence(
          touchDrag.cardId,
          getDropIndex(dropZone, touchDrag.currentX, touchDrag.currentY)
        );
      } else {
        removeCardFromSequence(touchDrag.cardId);
      }
    }

    state.draggedCardId = null;
    resetTouchDragElement(touchDrag);
    clearDropTargets();
    render();
    event.preventDefault();
  }

  function cancelTouchDrag() {
    const touchDrag = state.touchDrag;
    if (!touchDrag) return;

    state.touchDrag = null;
    state.draggedCardId = null;
    resetTouchDragElement(touchDrag);
    clearDropTargets();
  }

  function bindDropZone(list) {
    list.addEventListener("dragover", (event) => {
      if (!isViewingLatestRound()) return;
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
      if (!isViewingLatestRound()) return;
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
      if (!isViewingLatestRound() || state.cards.length === 0) return;
      state.rounds.push(getAllCardIds());
      state.currentRoundIndex = getLatestRoundIndex();
      state.openMenuCardId = null;
      cancelTouchDrag();
      render();
    });

    getElement(selectors.newCombatButton)?.addEventListener("click", resetCombat);

    getElement(selectors.previousRoundButton)?.addEventListener("click", () => {
      if (state.currentRoundIndex === 0) return;
      state.currentRoundIndex -= 1;
      state.openMenuCardId = null;
      cancelTouchDrag();
      render();
    });

    getElement(selectors.nextRoundButton)?.addEventListener("click", () => {
      if (state.currentRoundIndex >= getLatestRoundIndex()) return;
      state.currentRoundIndex += 1;
      state.openMenuCardId = null;
      cancelTouchDrag();
      render();
    });

    [getElement(selectors.alliesList), getElement(selectors.enemiesList), getElement(selectors.sequenceList)]
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
      cancelTouchDrag();
      state.cards = [];
      state.rounds = [[]];
      state.currentRoundIndex = 0;
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
