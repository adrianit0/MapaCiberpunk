const LOGIN_SUPABASE_ROOT_URL = window.AppConfig?.supabase?.rootUrl ?? "https://wtkumfcjqqmgokgrbxxr.supabase.co";
const AUTH_LOGIN_URL = `${LOGIN_SUPABASE_ROOT_URL}/functions/v1/auth-login`;
const AUTH_REGISTER_URL = `${LOGIN_SUPABASE_ROOT_URL}/functions/v1/auth-register`;
const PROFILE_URL = `${LOGIN_SUPABASE_ROOT_URL}/functions/v1/profile`;
const loginAjaxRequest = window.AjaxController.ajaxRequest;

function postLogin(credentials) {
  return loginAjaxRequest(AUTH_LOGIN_URL, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

function postRegister(registration) {
  return loginAjaxRequest(AUTH_REGISTER_URL, {
    method: "POST",
    body: JSON.stringify(registration),
  });
}

function getProfile() {
  return loginAjaxRequest(PROFILE_URL, {
    method: "GET",
  });
}

function putProfile(profile) {
  return loginAjaxRequest(PROFILE_URL, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

window.LoginAjax = {
  LOGIN_SUPABASE_ROOT_URL,
  AUTH_LOGIN_URL,
  AUTH_REGISTER_URL,
  PROFILE_URL,
  postLogin,
  postRegister,
  getProfile,
  putProfile,
};
