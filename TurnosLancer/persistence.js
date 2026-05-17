const TurnosLancerPersistence = (() => {
  const storageKey = "turnosLancerState";

  function canUseStorage() {
    try {
      return typeof window !== "undefined" && Boolean(window.localStorage);
    } catch (error) {
      return false;
    }
  }

  function getValidCards(cards) {
    if (!Array.isArray(cards)) {
      return [];
    }

    return cards
      .filter((card) => {
        return card
          && typeof card.id === "string"
          && card.id.trim()
          && typeof card.name === "string"
          && card.name.trim()
          && (card.type === "ally" || card.type === "enemy");
      })
      .map((card) => ({
        id: card.id,
        name: card.name,
        type: card.type,
        isDead: Boolean(card.isDead),
      }));
  }

  function getValidRounds(rounds, validCardIds) {
    if (!Array.isArray(rounds)) {
      return [[]];
    }

    const validRounds = rounds.map((round) => {
      if (!Array.isArray(round)) {
        return [];
      }

      const usedIds = new Set();
      return round.filter((cardId) => {
        if (!validCardIds.has(cardId) || usedIds.has(cardId)) {
          return false;
        }

        usedIds.add(cardId);
        return true;
      });
    });

    return validRounds.length > 0 ? validRounds : [[]];
  }

  function normalizeState(savedState) {
    if (!savedState || typeof savedState !== "object") {
      return null;
    }

    const cards = getValidCards(savedState.cards);
    const cardIds = new Set(cards.map((card) => card.id));
    const rounds = getValidRounds(savedState.rounds, cardIds);
    const latestRoundIndex = Math.max(rounds.length - 1, 0);
    const currentRoundIndex = Number.isInteger(savedState.currentRoundIndex)
      ? Math.min(Math.max(savedState.currentRoundIndex, 0), latestRoundIndex)
      : latestRoundIndex;

    return {
      cards,
      rounds,
      currentRoundIndex,
    };
  }

  function load() {
    if (!canUseStorage()) {
      return null;
    }

    try {
      const rawState = window.localStorage.getItem(storageKey);
      return rawState ? normalizeState(JSON.parse(rawState)) : null;
    } catch (error) {
      console.warn("No se pudo cargar el estado local de Turnos Lancer.", error);
      return null;
    }
  }

  function save(state) {
    if (!canUseStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        cards: state.cards,
        rounds: state.rounds,
        currentRoundIndex: state.currentRoundIndex,
      }));
    } catch (error) {
      console.warn("No se pudo guardar el estado local de Turnos Lancer.", error);
    }
  }

  function clear() {
    if (!canUseStorage()) {
      return;
    }

    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn("No se pudo limpiar el estado local de Turnos Lancer.", error);
    }
  }

  return {
    load,
    save,
    clear,
  };
})();

window.TurnosLancerPersistence = TurnosLancerPersistence;
