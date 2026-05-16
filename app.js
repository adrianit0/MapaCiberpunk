const App = (() => {
  const state = {
    mode: "login",
    authSubscription: null,
    menuAssetsLoaded: false,
  };

  const selectors = {
    authView: "authView",
    appView: "appView",
    authForm: "authForm",
    authEmail: "authEmail",
    authName: "authName",
    authUsername: "authUsername",
    authNameField: "authNameField",
    authUsernameField: "authUsernameField",
    authPassword: "authPassword",
    authSubmit: "authSubmit",
    guestAccess: "guestAccess",
    authMessage: "authMessage",
    loginMode: "loginMode",
    registerMode: "registerMode",
    profileButton: "profileButton",
    profileDialog: "profileDialog",
    profileForm: "profileForm",
    profileName: "profileName",
    profileUsername: "profileUsername",
    profileAvatarUrl: "profileAvatarUrl",
    profileMessage: "profileMessage",
    profileSubmit: "profileSubmit",
    closeProfileDialog: "closeProfileDialog",
    logoutButton: "logoutButton",
  };

  function getElement(id) {
    return document.getElementById(id);
  }

  function setMessage(message, type = "neutral") {
    const authMessage = getElement(selectors.authMessage);
    authMessage.textContent = message;
    authMessage.dataset.type = type;
  }

  function setSubmitting(isSubmitting) {
    const submitButton = getElement(selectors.authSubmit);
    const guestButton = getElement(selectors.guestAccess);
    submitButton.disabled = isSubmitting;
    guestButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting
      ? "Procesando..."
      : state.mode === "login" ? "Entrar" : "Crear cuenta";
  }

  function setProfileMessage(message, type = "neutral") {
    const profileMessage = getElement(selectors.profileMessage);
    profileMessage.textContent = message;
    profileMessage.dataset.type = type;
  }

  function setProfileSubmitting(isSubmitting) {
    const submitButton = getElement(selectors.profileSubmit);
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Guardando..." : "Guardar";
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

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No se pudo cargar ${src}.`));
      document.body.appendChild(script);
    });
  }

  async function loadMenuApplication() {
    if (!state.menuAssetsLoaded) {
      loadStylesheet("Menu/styles.css");
      await loadScript("Menu/presenter.js");
      state.menuAssetsLoaded = true;
    }

    await window.MenuPresenter?.init?.();
  }

  function setMode(mode) {
    state.mode = mode;

    const loginMode = getElement(selectors.loginMode);
    const registerMode = getElement(selectors.registerMode);
    const submitButton = getElement(selectors.authSubmit);
    const password = getElement(selectors.authPassword);
    const nameField = getElement(selectors.authNameField);
    const usernameField = getElement(selectors.authUsernameField);
    const name = getElement(selectors.authName);
    const username = getElement(selectors.authUsername);
    const isLogin = mode === "login";

    loginMode.classList.toggle("active", isLogin);
    registerMode.classList.toggle("active", !isLogin);
    loginMode.setAttribute("aria-pressed", String(isLogin));
    registerMode.setAttribute("aria-pressed", String(!isLogin));
    submitButton.textContent = isLogin ? "Entrar" : "Crear cuenta";
    password.autocomplete = isLogin ? "current-password" : "new-password";
    nameField.classList.toggle("hidden", isLogin);
    usernameField.classList.toggle("hidden", isLogin);
    name.required = !isLogin;
    username.required = !isLogin;
    setMessage("");
  }

  function clearApplicationData() {
    window.MapPresenter?.clearData?.();
    window.TurnosLancerPresenter?.clearData?.();
    window.DadosPresenter?.clearData?.();
    window.Locations?.clearData?.();
    window.MenuPresenter?.clear?.();
    window.AppSession = null;

    const authForm = getElement(selectors.authForm);
    authForm.reset();
    setMode("login");
  }

  async function loadProfile() {
    if (!window.AppSession || window.AppSession.isGuest) {
      return null;
    }

    const profile = await window.Auth.getProfile();
    window.AppSession.profile = profile;
    return profile;
  }

  function fillProfileForm(profile = window.AppSession?.profile ?? {}) {
    getElement(selectors.profileName).value = profile.name ?? "";
    getElement(selectors.profileUsername).value = profile.username ?? "";
    getElement(selectors.profileAvatarUrl).value = profile.avatar_url ?? "";
  }

  async function setViews(session) {
    const isAuthenticated = Boolean(session);
    const authView = getElement(selectors.authView);
    const appView = getElement(selectors.appView);

    if (isAuthenticated) {
      window.AppSession = {
        accessToken: session?.access_token ?? null,
        user: session?.user ?? null,
        isGuest: Boolean(session?.isGuest),
        profile: null,
      };
    } else {
      clearApplicationData();
    }

    authView.classList.toggle("hidden", isAuthenticated);
    appView.classList.toggle("hidden", !isAuthenticated);
    authView.setAttribute("aria-hidden", String(isAuthenticated));
    appView.setAttribute("aria-hidden", String(!isAuthenticated));

    if (isAuthenticated) {
      const profileButton = getElement(selectors.profileButton);
      profileButton.disabled = Boolean(session?.isGuest);

      if (!session?.isGuest) {
        await loadProfile().catch((error) => {
          console.warn("No se pudo cargar el perfil.", error);
        });
      }

      await loadMenuApplication();
    }
  }

  function createGuestSession() {
    return {
      access_token: null,
      isGuest: true,
      user: {
        id: "guest",
        email: null,
      },
    };
  }

  function handleAuthResult(result, successMessage) {
    if (result.error) {
      throw result.error;
    }

    if (!result.data?.session) {
      setMessage(successMessage, "success");
    }
  }

  function bindEvents() {
    getElement(selectors.loginMode).addEventListener("click", () => setMode("login"));
    getElement(selectors.registerMode).addEventListener("click", () => setMode("register"));

    getElement(selectors.authForm).addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      const name = form.elements.name.value.trim();
      const username = form.elements.username.value.trim();

      setSubmitting(true);
      setMessage("");

      Promise.resolve()
        .then(() => state.mode === "login"
          ? window.Auth.signIn(email, password)
          : window.Auth.signUp(email, password, { name, username }))
        .then((result) => {
          const message = "Cuenta creada. Revisa tu email si Supabase requiere confirmacion.";
          handleAuthResult(result, message);
        })
        .catch((error) => {
          setMessage(error.message || "No se pudo completar la autenticacion.", "error");
        })
        .finally(() => {
          setSubmitting(false);
        });
    });

    getElement(selectors.profileButton).addEventListener("click", () => {
      if (window.AppSession?.isGuest) {
        return;
      }

      setProfileMessage("");
      fillProfileForm();
      getElement(selectors.profileDialog).showModal();
    });

    getElement(selectors.closeProfileDialog).addEventListener("click", () => {
      getElement(selectors.profileDialog).close();
    });

    getElement(selectors.profileForm).addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const profile = {
        name: form.elements.name.value.trim(),
        username: form.elements.username.value.trim(),
        avatar_url: form.elements.avatar_url.value.trim() || null,
      };

      setProfileSubmitting(true);
      setProfileMessage("");

      window.Auth.updateProfile(profile)
        .then((updatedProfile) => {
          window.AppSession.profile = updatedProfile;
          fillProfileForm(updatedProfile);
          setProfileMessage("Perfil actualizado.", "success");
        })
        .catch((error) => {
          setProfileMessage(error.message || "No se pudo actualizar el perfil.", "error");
        })
        .finally(() => {
          setProfileSubmitting(false);
        });
    });

    getElement(selectors.guestAccess).addEventListener("click", () => {
      setMessage("");
      setViews(createGuestSession()).catch((error) => {
        setMessage(error.message || "No se pudo cargar la aplicación.", "error");
      });
    });

    getElement(selectors.logoutButton).addEventListener("click", () => {
      if (window.AppSession?.isGuest) {
        setViews(null);
        return;
      }

      window.Auth.signOut()
        .then(() => setViews(null))
        .catch((error) => {
          setMessage(error.message || "No se pudo cerrar la sesion.", "error");
        });
    });
  }

  function init() {
    bindEvents();
    setMode("login");

    if (!window.Auth.hasConfig()) {
      setMessage("Configura la Publishable key de Supabase en Utils/supabaseConfig.js para activar el login.", "error");
      getElement(selectors.authSubmit).disabled = true;
      return;
    }

    Promise.resolve()
      .then(() => window.Auth.getSession())
      .then(setViews)
      .then(() => {
        state.authSubscription = window.Auth.onAuthStateChange((session) => {
          setViews(session).catch((error) => {
            setMessage(error.message || "No se pudo cargar la aplicación.", "error");
          });
        });
      })
      .catch((error) => {
        setMessage(error.message || "No se pudo comprobar la sesion.", "error");
      });
  }

  return {
    init,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
