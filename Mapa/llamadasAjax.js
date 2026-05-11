const SUPABASE_ROOT_URL = window.AppConfig?.supabase?.rootUrl ?? "https://wtkumfcjqqmgokgrbxxr.supabase.co";

const CYBER_LOCATION_TYPES_URL = `${SUPABASE_ROOT_URL}/functions/v1/cyber-location-types`;
const CYBER_LOCATION_URL = `${SUPABASE_ROOT_URL}/functions/v1/cyber-location`;
const ajaxRequest = window.AjaxController.ajaxRequest;

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
