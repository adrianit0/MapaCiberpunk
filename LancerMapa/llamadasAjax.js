const LancerMapaAjax = (() => {
  const SUPABASE_ROOT_URL = window.AppConfig?.supabase?.rootUrl ?? "https://wtkumfcjqqmgokgrbxxr.supabase.co";
  const LANCER_MAP_STATE_URL = `${SUPABASE_ROOT_URL}/functions/v1/lancer-map-state`;
  const ajaxRequest = window.AjaxController.ajaxRequest;

  function getState(options = {}) {
    return ajaxRequest(LANCER_MAP_STATE_URL, {
      method: "GET",
      showLoading: options.showLoading ?? false,
    });
  }

  function upsertToken(token, options = {}) {
    return ajaxRequest(LANCER_MAP_STATE_URL, {
      method: "POST",
      body: JSON.stringify(token),
      showLoading: false,
      signal: options.signal,
    });
  }

  function deleteToken(tokenId) {
    return ajaxRequest(LANCER_MAP_STATE_URL, {
      method: "DELETE",
      body: JSON.stringify({ token_id: tokenId }),
      showLoading: false,
    });
  }

  return {
    getState,
    upsertToken,
    deleteToken,
  };
})();

window.LancerMapaAjax = LancerMapaAjax;
