const AdminPresenter = (() => {
  const selectors = {
    page: "adminPage",
    tableBody: "adminUsersTableBody",
    reloadButton: "reloadAdminUsers",
    message: "adminMessage",
    summary: "adminSummary",
  };

  const state = {
    boundPage: null,
    users: [],
    roles: [],
    isLoading: false,
  };

  function getElement(id) {
    return document.getElementById(id);
  }

  function normalizeRoleName(roleName) {
    return String(roleName ?? "").trim().toLowerCase();
  }

  function hasAdminRole() {
    return (window.AppSession?.profile?.roles ?? [])
      .some((role) => normalizeRoleName(role?.name ?? role) === "admin");
  }

  function setMessage(message, type = "neutral") {
    const element = getElement(selectors.message);
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
  }

  function setLoading(isLoading) {
    state.isLoading = isLoading;
    const button = getElement(selectors.reloadButton);
    if (button) {
      button.disabled = isLoading;
      button.textContent = isLoading ? "Cargando..." : "Recargar";
    }
  }

  function renderSummary() {
    const summary = getElement(selectors.summary);
    if (!summary) return;
    summary.textContent = `${state.users.length} usuarios - ${state.roles.length} roles disponibles`;
  }

  function createTextCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value || "-";
    return cell;
  }

  function createUserCell(user) {
    const cell = document.createElement("td");
    const name = document.createElement("div");
    const id = document.createElement("div");

    name.className = "admin-user-name";
    name.textContent = user.name || user.username || "Sin nombre";
    id.className = "admin-user-id";
    id.textContent = user.id;

    cell.append(name, id);
    return cell;
  }

  function createRolesCell(user) {
    const cell = document.createElement("td");
    const roles = document.createElement("div");
    roles.className = "admin-roles";

    if (!user.roles?.length) {
      roles.textContent = "Sin roles";
      cell.appendChild(roles);
      return cell;
    }

    user.roles.forEach((role) => {
      const chip = document.createElement("span");
      const removeButton = document.createElement("button");

      chip.className = "admin-role-chip";
      chip.append(document.createTextNode(role.name));

      removeButton.type = "button";
      removeButton.textContent = "x";
      removeButton.title = `Eliminar rol ${role.name}`;
      removeButton.setAttribute("aria-label", `Eliminar rol ${role.name} de ${user.email || user.id}`);
      removeButton.addEventListener("click", () => removeRole(user.id, role.id));

      chip.appendChild(removeButton);
      roles.appendChild(chip);
    });

    cell.appendChild(roles);
    return cell;
  }

  function createAddRoleCell(user) {
    const cell = document.createElement("td");
    const wrapper = document.createElement("div");
    const select = document.createElement("select");
    const button = document.createElement("button");
    const assignedRoleIds = new Set((user.roles ?? []).map((role) => role.id));

    wrapper.className = "admin-add-role";
    select.setAttribute("aria-label", `Rol a anadir para ${user.email || user.id}`);

    const availableRoles = state.roles.filter((role) => !assignedRoleIds.has(role.id));
    if (availableRoles.length === 0) {
      select.disabled = true;
      const option = document.createElement("option");
      option.textContent = "Sin roles disponibles";
      select.appendChild(option);
    } else {
      availableRoles.forEach((role) => {
        const option = document.createElement("option");
        option.value = String(role.id);
        option.textContent = role.name;
        select.appendChild(option);
      });
    }

    button.type = "button";
    button.className = "secondary-button";
    button.textContent = "Anadir";
    button.disabled = availableRoles.length === 0;
    button.addEventListener("click", () => addRole(user.id, Number(select.value)));

    wrapper.append(select, button);
    cell.appendChild(wrapper);
    return cell;
  }

  function renderUsers() {
    const tableBody = getElement(selectors.tableBody);
    if (!tableBody) return;

    tableBody.innerHTML = "";
    if (state.users.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = "No hay usuarios.";
      row.appendChild(cell);
      tableBody.appendChild(row);
      renderSummary();
      return;
    }

    state.users.forEach((user) => {
      const row = document.createElement("tr");
      row.append(
        createUserCell(user),
        createTextCell(user.email),
        createRolesCell(user),
        createAddRoleCell(user),
      );
      tableBody.appendChild(row);
    });

    renderSummary();
  }

  async function loadUsers() {
    if (state.isLoading) return;

    if (!hasAdminRole()) {
      setMessage("No tienes permisos para usar esta aplicacion.", "error");
      state.users = [];
      state.roles = [];
      renderUsers();
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await window.AdminAjax.getAdminUsers();
      state.users = Array.isArray(data?.users) ? data.users : [];
      state.roles = Array.isArray(data?.roles) ? data.roles : [];
      renderUsers();
    } catch (error) {
      setMessage(error.message || "No se pudieron cargar los usuarios.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function addRole(userId, roleId) {
    if (!userId || !roleId) return;

    setMessage("");
    try {
      const data = await window.AdminAjax.postAdminUserRole(userId, roleId);
      state.users = Array.isArray(data?.users) ? data.users : state.users;
      state.roles = Array.isArray(data?.roles) ? data.roles : state.roles;
      renderUsers();
      setMessage("Rol anadido.", "success");
    } catch (error) {
      setMessage(error.message || "No se pudo anadir el rol.", "error");
    }
  }

  async function removeRole(userId, roleId) {
    if (!userId || !roleId) return;

    setMessage("");
    try {
      const data = await window.AdminAjax.deleteAdminUserRole(userId, roleId);
      state.users = Array.isArray(data?.users) ? data.users : state.users;
      state.roles = Array.isArray(data?.roles) ? data.roles : state.roles;
      renderUsers();
      setMessage("Rol eliminado.", "success");
    } catch (error) {
      setMessage(error.message || "No se pudo eliminar el rol.", "error");
    }
  }

  function bindEvents() {
    getElement(selectors.reloadButton)?.addEventListener("click", loadUsers);
  }

  async function init() {
    const page = getElement(selectors.page);
    if (!page) return;

    if (state.boundPage !== page) {
      bindEvents();
      state.boundPage = page;
    }

    await loadUsers();
  }

  function clearData() {
    state.boundPage = null;
    state.users = [];
    state.roles = [];
    state.isLoading = false;
  }

  return {
    init,
    clearData,
  };
})();

window.AdminPresenter = AdminPresenter;
