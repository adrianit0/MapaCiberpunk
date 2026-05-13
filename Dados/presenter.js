const DadosPresenter = (() => {
  const presets = {
    free: {
      label: "Libre",
      dice: [
        { id: "d4", sides: 4, label: "Dado de 4" },
        { id: "d6", sides: 6, label: "Dado de 6" },
        { id: "d8", sides: 8, label: "Dado de 8" },
        { id: "d10", sides: 10, label: "Dado de 10" },
        { id: "d12", sides: 12, label: "Dado de 12" },
        { id: "d20", sides: 20, label: "Dado de 20", defaultCount: 1 },
        { id: "d100", sides: 100, label: "Dado de 100" },
      ],
      rollMode: "standard",
    },
    "cyberpunk-red": {
      label: "Cyberpunk RED",
      dice: [
        { id: "d10", sides: 10, label: "Dado de 10", defaultCount: 1, max: 1, cyberpunkCritical: true },
        { id: "d6", sides: 6, label: "Dado de 6" },
      ],
      rollMode: "cyberpunk-red",
    },
    lancer: {
      label: "Lancer",
      dice: [
        { id: "d20", sides: 20, label: "Dado de 20", defaultCount: 1, max: 1 },
        { id: "accuracy", sides: 6, label: "Dado de 6 (Accuracy)", formulaLabel: "d6 Accuracy", highestOnly: true, modifier: 1 },
        { id: "difficulty", sides: 6, label: "Dado de 6 (Desventaja)", formulaLabel: "d6 Desventaja", highestOnly: true, modifier: -1 },
      ],
      rollMode: "lancer",
    },
  };

  const selectors = {
    page: "dadosPage",
    preset: "dicePreset",
    diceControls: "diceControls",
    bonus: "diceBonus",
    formula: "diceFormula",
    roll: "rollDice",
    clear: "clearDados",
    total: "diceTotal",
    detail: "diceDetail",
    history: "diceHistory",
  };

  const state = {
    boundPage: null,
    preset: "free",
    counts: createDefaultCounts("free"),
    bonus: 0,
    history: [],
    isRolling: false,
    rollInterval: null,
    rollTimeout: null,
  };

  function getElement(id) {
    return document.getElementById(id);
  }

  function getPreset() {
    return presets[state.preset] || presets.free;
  }

  function getDiceOptions() {
    return getPreset().dice;
  }

  function createDefaultCounts(presetId) {
    const preset = presets[presetId] || presets.free;
    return Object.fromEntries(preset.dice.map((die) => [die.id, die.defaultCount || 0]));
  }

  function clampNumber(value, min, max) {
    const number = Number.parseInt(value, 10);
    if (Number.isNaN(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function getDiceParts() {
    return getDiceOptions()
      .filter((die) => state.counts[die.id] > 0)
      .map((die) => `${state.counts[die.id]}${die.formulaLabel || `d${die.sides}`}`);
  }

  function getFormula() {
    const parts = getDiceParts();
    if (state.bonus > 0) {
      parts.push(`+${state.bonus}`);
    } else if (state.bonus < 0) {
      parts.push(`${state.bonus}`);
    }

    return parts.length > 0 ? parts.join(" + ").replace("+ -", "- ") : "Sin dados";
  }

  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function createRoll(counts, bonus, presetId = state.preset) {
    const preset = presets[presetId] || presets.free;
    const groups = preset.dice
      .filter((die) => counts[die.id] > 0)
      .map((die) => createGroupRoll(die, counts[die.id], preset.rollMode));

    const diceTotal = groups.reduce((sum, group) => sum + group.total, 0);

    return {
      groups,
      total: diceTotal + bonus,
      breakdown: formatBreakdown(groups, bonus),
      resultType: getResultType(groups),
    };
  }

  function createGroupRoll(die, count, rollMode) {
    if (rollMode === "cyberpunk-red" && die.cyberpunkCritical) {
      return createCyberpunkD10Group(die, count);
    }

    if (rollMode === "lancer" && die.highestOnly) {
      return createHighestOnlyGroup(die, count);
    }

    return createStandardGroup(die, count);
  }

  function createStandardGroup(die, count) {
    const rolls = Array.from({ length: count }, () => rollDie(die.sides));
    const total = rolls.reduce((sum, rollValue) => sum + rollValue, 0) * (die.modifier || 1);

    return {
      die,
      count,
      rolls,
      total,
      line: `${count}d${die.sides} -> ${rolls.join(", ")}`,
    };
  }

  function createCyberpunkD10Group(die, count) {
    const rolls = [];
    const entries = [];
    let total = 0;

    for (let index = 0; index < count; index += 1) {
      const baseRoll = rollDie(die.sides);
      rolls.push(baseRoll);
      total += baseRoll;

      if (baseRoll === die.sides) {
        const criticalRoll = rollDie(die.sides);
        rolls.push(criticalRoll);
        total += criticalRoll;
        entries.push(`${baseRoll} + critico ${criticalRoll}`);
      } else if (baseRoll === 1) {
        const fumbleRoll = rollDie(die.sides);
        rolls.push(fumbleRoll);
        total -= fumbleRoll;
        entries.push(`${baseRoll} - pifia ${fumbleRoll}`);
      } else {
        entries.push(String(baseRoll));
      }
    }

    return {
      die,
      count,
      rolls,
      total,
      line: `${count}d${die.sides} -> ${entries.join(", ")}`,
    };
  }

  function createHighestOnlyGroup(die, count) {
    const rolls = Array.from({ length: count }, () => rollDie(die.sides));
    const highest = Math.max(...rolls);
    const modifier = die.modifier || 1;
    const sign = modifier > 0 ? "+" : "-";

    return {
      die,
      count,
      rolls,
      total: highest * modifier,
      line: `${count}d${die.sides} ${die.label.replace(/^Dado de 6 /, "")} -> ${rolls.join(", ")} (mayor ${sign}${highest})`,
    };
  }

  function getResultType(groups) {
    const rolls = groups.flatMap((group) => (
      group.rolls.map((value) => ({ value, sides: group.die.sides }))
    ));

    if (rolls.length === 0) return "";

    const allMax = rolls.every((roll) => roll.value === roll.sides);
    const allMin = rolls.every((roll) => roll.value === 1);
    const hasMax = rolls.some((roll) => roll.value === roll.sides);
    const hasMin = rolls.some((roll) => roll.value === 1);

    if (allMax) return "max-all";
    if (allMin) return "min-all";
    if (hasMax) return "max-some";
    if (hasMin) return "min-some";
    return "";
  }

  function createDiceRow(die) {
    const row = document.createElement("div");
    row.className = "dice-row";

    const label = document.createElement("span");
    label.className = "dice-label";
    label.textContent = die.label;

    const counter = document.createElement("div");
    counter.className = "counter";

    const decrement = document.createElement("button");
    decrement.type = "button";
    decrement.textContent = "-";
    decrement.setAttribute("aria-label", `Quitar ${die.label.toLowerCase()}`);

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(die.max || 99);
    input.step = "1";
    input.value = String(state.counts[die.id] || 0);
    input.setAttribute("aria-label", `Cantidad de ${die.label.toLowerCase()}`);
    input.dataset.dieId = die.id;

    const increment = document.createElement("button");
    increment.type = "button";
    increment.textContent = "+";
    increment.setAttribute("aria-label", `Anadir ${die.label.toLowerCase()}`);

    decrement.addEventListener("click", () => updateCount(die.id, (state.counts[die.id] || 0) - 1));
    increment.addEventListener("click", () => updateCount(die.id, (state.counts[die.id] || 0) + 1));
    input.addEventListener("input", () => updateCount(die.id, input.value));

    counter.append(decrement, input, increment);
    row.append(label, counter);
    return row;
  }

  function renderControls() {
    const container = getElement(selectors.diceControls);
    if (!container) return;

    container.innerHTML = "";
    getDiceOptions().forEach((die) => {
      container.appendChild(createDiceRow(die));
    });
  }

  function syncControlValues() {
    const preset = getElement(selectors.preset);
    if (preset) preset.value = state.preset;

    getDiceOptions().forEach((die) => {
      const input = document.querySelector(`#${selectors.diceControls} input[data-die-id="${die.id}"]`);
      if (input) input.value = String(state.counts[die.id] || 0);
    });

    const bonus = getElement(selectors.bonus);
    if (bonus) bonus.value = String(state.bonus);
    renderActiveControls();
  }

  function renderActiveControls() {
    getDiceOptions().forEach((die) => {
      const input = document.querySelector(`#${selectors.diceControls} input[data-die-id="${die.id}"]`);
      input?.closest(".dice-row")?.classList.toggle("active", (state.counts[die.id] || 0) > 0);
    });

    getElement(selectors.bonus)?.closest(".bonus-control")?.classList.toggle("active", state.bonus !== 0);
  }

  function updateCount(dieId, value) {
    const die = getDiceOptions().find((diceOption) => diceOption.id === dieId);
    if (!die) return;

    state.counts[dieId] = clampNumber(value, 0, die.max || 99);
    const input = document.querySelector(`#${selectors.diceControls} input[data-die-id="${dieId}"]`);
    if (input) input.value = String(state.counts[dieId]);
    renderActiveControls();
    renderFormula();
  }

  function updateBonus(value) {
    state.bonus = clampNumber(value, -999, 999);
    const bonus = getElement(selectors.bonus);
    if (bonus) bonus.value = String(state.bonus);
    renderActiveControls();
    renderFormula();
  }

  function updatePreset(value) {
    if (!presets[value] || value === state.preset) return;

    stopRollAnimation();
    state.preset = value;
    state.counts = createDefaultCounts(value);
    state.bonus = 0;
    renderControls();
    syncControlValues();
    renderFormula();
    renderResult("", "Pulsa Lanzar para tirar los dados.", true);
  }

  function renderFormula() {
    const formula = getElement(selectors.formula);
    if (formula) {
      formula.textContent = `Tirada: ${getFormula()}`;
    }
  }

  function formatBreakdown(groups, bonus) {
    const lines = groups.map((group) => group.line);

    if (bonus !== 0) {
      lines.push(`Bonus -> ${bonus > 0 ? "+" : ""}${bonus}`);
    }

    return lines.join("\n");
  }

  function renderResult(total, breakdown, showBreakdown) {
    const totalElement = getElement(selectors.total);
    const detail = getElement(selectors.detail);

    if (totalElement) totalElement.textContent = String(total);
    if (detail) detail.textContent = breakdown || (showBreakdown ? "Sin dados en la tirada." : "");
  }

  function renderHistory() {
    const container = getElement(selectors.history);
    if (!container) return;

    container.innerHTML = "";
    if (state.history.length === 0) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "Aun no hay tiradas registradas.";
      container.appendChild(empty);
      return;
    }

    state.history.forEach((entry) => {
      const item = document.createElement("article");
      item.className = "history-item";
      if (entry.resultType) {
        item.classList.add(`history-item-${entry.resultType}`);
      }
      item.setAttribute("aria-label", getHistoryAriaLabel(entry));

      const topLine = document.createElement("div");
      topLine.className = "history-topline";

      const time = document.createElement("span");
      time.className = "history-time";
      time.textContent = entry.time;

      const total = document.createElement("span");
      total.className = "history-total";
      total.textContent = String(entry.total);

      const preset = document.createElement("div");
      preset.className = "history-preset";
      preset.textContent = entry.preset;

      const formula = document.createElement("div");
      formula.className = "history-formula";
      formula.textContent = entry.formula;

      const breakdown = document.createElement("div");
      breakdown.className = "history-breakdown";
      breakdown.textContent = entry.breakdown || "Sin dados";

      const user = document.createElement("div");
      user.className = "history-user";
      user.textContent = `Lanzador: ${entry.user}`;

      topLine.append(time, total);
      item.append(topLine, preset, formula, breakdown, user);
      container.appendChild(item);
    });
  }

  function getHistoryAriaLabel(entry) {
    const labels = {
      "max-all": "todos los dados han sacado el maximo",
      "max-some": "al menos un dado ha sacado el maximo",
      "min-all": "todos los dados han sacado pifia",
      "min-some": "al menos un dado ha sacado pifia",
    };
    const resultLabel = labels[entry.resultType] ? `, ${labels[entry.resultType]}` : "";
    return `${entry.time}, ${entry.preset}, ${entry.formula}, resultado ${entry.total}${resultLabel}, lanzador ${entry.user}`;
  }

  function setRolling(isRolling) {
    state.isRolling = isRolling;
    const button = getElement(selectors.roll);
    if (!button) return;

    button.disabled = isRolling;
    button.classList.toggle("rolling", isRolling);
    button.textContent = isRolling ? "Lanzando..." : "Lanzar";
    button.setAttribute("aria-busy", String(isRolling));
  }

  function stopRollAnimation() {
    if (state.rollInterval) {
      window.clearInterval(state.rollInterval);
      state.rollInterval = null;
    }

    if (state.rollTimeout) {
      window.clearTimeout(state.rollTimeout);
      state.rollTimeout = null;
    }

    setRolling(false);
  }

  function roll() {
    if (state.isRolling) return;

    const presetSnapshot = state.preset;
    const countsSnapshot = { ...state.counts };
    const bonusSnapshot = state.bonus;
    const formula = getFormula();
    const finalRoll = createRoll(countsSnapshot, bonusSnapshot, presetSnapshot);

    setRolling(true);

    state.rollInterval = window.setInterval(() => {
      const previewRoll = createRoll(countsSnapshot, bonusSnapshot, presetSnapshot);
      renderResult(previewRoll.total, null, false);
    }, 40);

    state.rollTimeout = window.setTimeout(() => {
      window.clearInterval(state.rollInterval);
      state.rollInterval = null;
      state.rollTimeout = null;
      renderResult(finalRoll.total, finalRoll.breakdown, true);

      state.history.unshift({
        time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        preset: presets[presetSnapshot].label,
        formula,
        total: finalRoll.total,
        breakdown: finalRoll.breakdown,
        resultType: finalRoll.resultType,
        user: "Guest",
      });
      renderHistory();
      setRolling(false);
    }, 500);
  }

  function clearRoll() {
    stopRollAnimation();
    state.counts = createDefaultCounts(state.preset);
    state.bonus = 0;
    renderControls();
    syncControlValues();
    renderFormula();
    renderResult("", "Pulsa Lanzar para tirar los dados.", true);
  }

  function bindEvents() {
    getElement(selectors.preset)?.addEventListener("change", (event) => updatePreset(event.currentTarget.value));
    getElement(selectors.bonus)?.addEventListener("input", (event) => updateBonus(event.currentTarget.value));
    getElement(selectors.roll)?.addEventListener("click", roll);
    getElement(selectors.clear)?.addEventListener("click", clearRoll);
  }

  function init() {
    const page = getElement(selectors.page);
    if (!page) return;

    renderControls();

    if (state.boundPage !== page) {
      bindEvents();
      state.boundPage = page;
    }

    syncControlValues();
    renderFormula();
    renderHistory();
  }

  return {
    init,
    clearData() {
      stopRollAnimation();
      state.preset = "free";
      state.counts = createDefaultCounts("free");
      state.bonus = 0;
      state.history = [];
      state.boundPage = null;
      state.isRolling = false;
      renderControls();
      syncControlValues();
      renderFormula();
      renderResult("", "Pulsa Lanzar para tirar los dados.", true);
      renderHistory();
    },
  };
})();

window.DadosPresenter = DadosPresenter;
