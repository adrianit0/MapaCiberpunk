const Auth = (() => {
  const config = window.AppConfig?.supabase;
  let client = null;

  function getPublishableKey() {
    return config?.publishableKey || config?.anonKey;
  }

  function hasConfig() {
    return Boolean(config?.rootUrl && getPublishableKey());
  }

  function getClient() {
    if (!hasConfig()) {
      throw new Error("Falta configurar la Publishable key de Supabase en Utils/supabaseConfig.js.");
    }

    if (!window.supabase?.createClient) {
      throw new Error("No se pudo cargar el cliente de Supabase.");
    }

    if (!client) {
      client = window.supabase.createClient(config.rootUrl, getPublishableKey());
    }

    return client;
  }

  function getSession() {
    return getClient().auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      return data.session;
    });
  }

  function signIn(email, password) {
    return getClient().auth.signInWithPassword({
      email,
      password,
    });
  }

  function signUp(email, password) {
    return getClient().auth.signUp({
      email,
      password,
    });
  }

  function signOut() {
    return getClient().auth.signOut();
  }

  function onAuthStateChange(callback) {
    return getClient().auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }

  return {
    hasConfig,
    getClient,
    getSession,
    signIn,
    signUp,
    signOut,
    onAuthStateChange,
  };
})();

window.Auth = Auth;
