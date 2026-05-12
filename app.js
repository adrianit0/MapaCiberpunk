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
    authPassword: "authPassword",
    authSubmit: "authSubmit",
    guestAccess: "guestAccess",
    authMessage: "authMessage",
    loginMode: "loginMode",
    registerMode: "registerMode",
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
    const isLogin = mode === "login";

    loginMode.classList.toggle("active", isLogin);
    registerMode.classList.toggle("active", !isLogin);
    loginMode.setAttribute("aria-pressed", String(isLogin));
    registerMode.setAttribute("aria-pressed", String(!isLogin));
    submitButton.textContent = isLogin ? "Entrar" : "Crear cuenta";
    password.autocomplete = isLogin ? "current-password" : "new-password";
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

  async function setViews(session) {
    const isAuthenticated = Boolean(session);
    const authView = getElement(selectors.authView);
    const appView = getElement(selectors.appView);

    if (isAuthenticated) {
      window.AppSession = {
        accessToken: session?.access_token ?? null,
        user: session?.user ?? null,
        isGuest: Boolean(session?.isGuest),
      };
    } else {
      clearApplicationData();
    }

    authView.classList.toggle("hidden", isAuthenticated);
    appView.classList.toggle("hidden", !isAuthenticated);
    authView.setAttribute("aria-hidden", String(isAuthenticated));
    appView.setAttribute("aria-hidden", String(!isAuthenticated));

    if (isAuthenticated) {
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

      setSubmitting(true);
      setMessage("");

      Promise.resolve()
        .then(() => state.mode === "login"
          ? window.Auth.signIn(email, password)
          : window.Auth.signUp(email, password))
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
