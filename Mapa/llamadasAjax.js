const SUPABASE_ROOT_URL = window.AppConfig?.supabase?.rootUrl ?? "https://wtkumfcjqqmgokgrbxxr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = window.AppConfig?.supabase?.publishableKey
  || window.AppConfig?.supabase?.anonKey
  || "";

const CYBER_LOCATION_TYPES_URL = `${SUPABASE_ROOT_URL}/functions/v1/cyber-location-types`;
const CYBER_LOCATION_URL = `${SUPABASE_ROOT_URL}/functions/v1/cyber-location`;

function ajaxRequest(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(SUPABASE_PUBLISHABLE_KEY ? { apikey: SUPABASE_PUBLISHABLE_KEY } : {}),
    ...getAuthHeaders(),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  }).then(async (response) => {
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const detail = errorBody ? ` - ${errorBody}` : "";
      throw new Error(`Error ${response.status}: ${response.statusText}${detail}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  });
}

function getAuthHeaders() {
  const token = window.AppSession?.accessToken;
  const bearerToken = token || SUPABASE_PUBLISHABLE_KEY;
  return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};
}

function getCyberLocationTypes() {
  return ajaxRequest(CYBER_LOCATION_TYPES_URL, {
    method: "GET",
  });
}

function getCyberLocation() {
  return ajaxRequest(CYBER_LOCATION_URL, {
    method: "GET",
  });
}

function postCyberLocation(location) {
  return ajaxRequest(CYBER_LOCATION_URL, {
    method: "POST",
    body: JSON.stringify(location),
  });
}

function putCyberLocation(location) {
  return ajaxRequest(CYBER_LOCATION_URL, {
    method: "PUT",
    body: JSON.stringify(location),
  });
}

function deleteCyberLocation(location) {
  return ajaxRequest(CYBER_LOCATION_URL, {
    method: "DELETE",
    body: JSON.stringify(location),
  });
}

window.LlamadasAjax = {
  SUPABASE_ROOT_URL,
  CYBER_LOCATION_TYPES_URL,
  CYBER_LOCATION_URL,
  getCyberLocationTypes,
  getCyberLocation,
  postCyberLocation,
  putCyberLocation,
  deleteCyberLocation,
};
