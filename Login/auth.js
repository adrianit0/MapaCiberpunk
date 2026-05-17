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

  async function setClientSession(data) {
    if (data?.session?.access_token && data?.session?.refresh_token) {
      const { error } = await getClient().auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (error) throw error;
    }

    return {
      data,
      error: null,
    };
  }

  async function signIn(email, password) {
    const data = await window.LoginAjax.postLogin({
      email,
      password,
    });

    return setClientSession(data);
  }

  async function signUp(email, password, profile) {
    const data = await window.LoginAjax.postRegister({
      email,
      password,
      name: profile?.name,
      username: profile?.username,
    });

    return setClientSession(data);
  }

  function signOut() {
    return getClient().auth.signOut();
  }

  function getProfile() {
    return window.LoginAjax.getProfile();
  }

  function updateProfile(profile) {
    return window.LoginAjax.putProfile(profile);
  }

  function onAuthStateChange(callback) {
    return getClient().auth.onAuthStateChange((event, session) => {
      callback(session, event);
    });
  }

  return {
    hasConfig,
    getClient,
    getSession,
    signIn,
    signUp,
    signOut,
    getProfile,
    updateProfile,
    onAuthStateChange,
  };
})();

window.Auth = Auth;
