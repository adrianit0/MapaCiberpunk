const DadosPresenter = (() => {
  const diceTypes = [4, 6, 8, 10, 12, 20, 100];

  const selectors = {
    page: "dadosPage",
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
    counts: Object.fromEntries(diceTypes.map((sides) => [sides, sides === 20 ? 1 : 0])),
    bonus: 0,
    history: [],
    isRolling: false,
    rollInterval: null,
    rollTimeout: null,
  };

  function getElement(id) {
    return document.getElementById(id);
  }

  function clampNumber(value, min, max) {
    const number = Number.parseInt(value, 10);
    if (Number.isNaN(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function getDiceParts() {
    return diceTypes
      .filter((sides) => state.counts[sides] > 0)
      .map((sides) => `${state.counts[sides]}d${sides}`);
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

  function createRoll(counts, bonus) {
    const groups = diceTypes
      .filter((sides) => counts[sides] > 0)
      .map((sides) => ({
        sides,
        count: counts[sides],
        rolls: Array.from({ length: counts[sides] }, () => rollDie(sides)),
      }));

    const diceTotal = groups.reduce((sum, group) => (
      sum + group.rolls.reduce((groupSum, rollValue) => groupSum + rollValue, 0)
    ), 0);

    return {
      groups,
      total: diceTotal + bonus,
      breakdown: formatBreakdown(groups, bonus),
      resultType: getResultType(groups),
    };
  }

  function getResultType(groups) {
    const rolls = groups.flatMap((group) => (
      group.rolls.map((value) => ({ value, sides: group.sides }))
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

  function createDiceRow(sides) {
    const row = document.createElement("div");
    row.className = "dice-row";

    const label = document.createElement("span");
    label.className = "dice-label";
    label.textContent = `Dado de ${sides}`;

    const counter = document.createElement("div");
    counter.className = "counter";

    const decrement = document.createElement("button");
    decrement.type = "button";
    decrement.textContent = "-";
    decrement.setAttribute("aria-label", `Quitar dado de ${sides}`);

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "99";
    input.step = "1";
    input.value = String(state.counts[sides]);
    input.setAttribute("aria-label", `Cantidad de dados de ${sides}`);
    input.dataset.sides = String(sides);

    const increment = document.createElement("button");
    increment.type = "button";
    increment.textContent = "+";
    increment.setAttribute("aria-label", `Anadir dado de ${sides}`);

    decrement.addEventListener("click", () => updateCount(sides, state.counts[sides] - 1));
    increment.addEventListener("click", () => updateCount(sides, state.counts[sides] + 1));
    input.addEventListener("input", () => updateCount(sides, input.value));

    counter.append(decrement, input, increment);
    row.append(label, counter);
    return row;
  }

  function renderControls() {
    const container = getElement(selectors.diceControls);
    if (!container || container.children.length > 0) return;

    diceTypes.forEach((sides) => {
      container.appendChild(createDiceRow(sides));
    });
  }

  function syncControlValues() {
    diceTypes.forEach((sides) => {
      const input = document.querySelector(`#${selectors.diceControls} input[data-sides="${sides}"]`);
      if (input) input.value = String(state.counts[sides]);
    });

    const bonus = getElement(selectors.bonus);
    if (bonus) bonus.value = String(state.bonus);
    renderActiveControls();
  }

  function renderActiveControls() {
    diceTypes.forEach((sides) => {
      const input = document.querySelector(`#${selectors.diceControls} input[data-sides="${sides}"]`);
      input?.closest(".dice-row")?.classList.toggle("active", state.counts[sides] > 0);
    });

    getElement(selectors.bonus)?.closest(".bonus-control")?.classList.toggle("active", state.bonus !== 0);
  }

  function updateCount(sides, value) {
    state.counts[sides] = clampNumber(value, 0, 99);
    const input = document.querySelector(`#${selectors.diceControls} input[data-sides="${sides}"]`);
    if (input) input.value = String(state.counts[sides]);
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

  function renderFormula() {
    const formula = getElement(selectors.formula);
    if (formula) {
      formula.textContent = `Tirada: ${getFormula()}`;
    }
  }

  function formatBreakdown(groups, bonus) {
    const lines = groups.map((group) => (
      `${group.count}d${group.sides} -> ${group.rolls.join(", ")}`
    ));

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
      item.append(topLine, formula, breakdown, user);
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
    return `${entry.time}, ${entry.formula}, resultado ${entry.total}${resultLabel}, lanzador ${entry.user}`;
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

    const countsSnapshot = { ...state.counts };
    const bonusSnapshot = state.bonus;
    const formula = getFormula();
    const finalRoll = createRoll(countsSnapshot, bonusSnapshot);

    setRolling(true);

    state.rollInterval = window.setInterval(() => {
      const previewRoll = createRoll(countsSnapshot, bonusSnapshot);
      renderResult(previewRoll.total, null, false);
    }, 40);

    state.rollTimeout = window.setTimeout(() => {
      window.clearInterval(state.rollInterval);
      state.rollInterval = null;
      state.rollTimeout = null;
      renderResult(finalRoll.total, finalRoll.breakdown, true);

      state.history.unshift({
        time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
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
    state.counts = Object.fromEntries(diceTypes.map((sides) => [sides, sides === 20 ? 1 : 0]));
    state.bonus = 0;
    diceTypes.forEach((sides) => {
      const input = document.querySelector(`#${selectors.diceControls} input[data-sides="${sides}"]`);
      if (input) input.value = String(state.counts[sides]);
    });
    updateBonus(0);
    renderResult("", "Pulsa Lanzar para tirar los dados.", true);
  }

  function bindEvents() {
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
      state.counts = Object.fromEntries(diceTypes.map((sides) => [sides, sides === 20 ? 1 : 0]));
      state.bonus = 0;
      state.history = [];
      state.boundPage = null;
      state.isRolling = false;
      syncControlValues();
      renderFormula();
      renderResult("", "Pulsa Lanzar para tirar los dados.", true);
      renderHistory();
    },
  };
})();

window.DadosPresenter = DadosPresenter;
