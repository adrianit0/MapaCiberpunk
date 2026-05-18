const GLOSARIO_SUPABASE_ROOT_URL = window.AppConfig?.supabase?.rootUrl ?? "https://wtkumfcjqqmgokgrbxxr.supabase.co";
const GLOSARIO_TYPES_URL = `${GLOSARIO_SUPABASE_ROOT_URL}/functions/v1/lancer-glossary-tipo`;
const GLOSARIO_ENTRIES_URL = `${GLOSARIO_SUPABASE_ROOT_URL}/functions/v1/lancer-glossary`;
const glosarioAjaxRequest = window.AjaxController.ajaxRequest;

function getGlossaryTypes() {
  return glosarioAjaxRequest(GLOSARIO_TYPES_URL, {
    method: "GET",
  });
}

function postGlossaryType(type) {
  return glosarioAjaxRequest(GLOSARIO_TYPES_URL, {
    method: "POST",
    body: JSON.stringify(type),
  });
}

function putGlossaryType(type) {
  return glosarioAjaxRequest(GLOSARIO_TYPES_URL, {
    method: "PUT",
    body: JSON.stringify(type),
  });
}

function deleteGlossaryType(type) {
  return glosarioAjaxRequest(GLOSARIO_TYPES_URL, {
    method: "DELETE",
    body: JSON.stringify(type),
  });
}

function getGlossaryEntries(id) {
  const url = id
    ? `${GLOSARIO_ENTRIES_URL}?id=${encodeURIComponent(id)}`
    : GLOSARIO_ENTRIES_URL;

  return glosarioAjaxRequest(url, {
    method: "GET",
  });
}

function postGlossaryEntry(entry) {
  return glosarioAjaxRequest(GLOSARIO_ENTRIES_URL, {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

function putGlossaryEntry(entry) {
  return glosarioAjaxRequest(GLOSARIO_ENTRIES_URL, {
    method: "PUT",
    body: JSON.stringify(entry),
  });
}

function deleteGlossaryEntry(entry) {
  return glosarioAjaxRequest(GLOSARIO_ENTRIES_URL, {
    method: "DELETE",
    body: JSON.stringify(entry),
  });
}

window.GlosarioAjax = {
  GLOSARIO_SUPABASE_ROOT_URL,
  GLOSARIO_TYPES_URL,
  GLOSARIO_ENTRIES_URL,
  getGlossaryTypes,
  postGlossaryType,
  putGlossaryType,
  deleteGlossaryType,
  getGlossaryEntries,
  postGlossaryEntry,
  putGlossaryEntry,
  deleteGlossaryEntry,
};
