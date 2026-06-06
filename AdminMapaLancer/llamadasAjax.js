const AdminMapaLancerAjax = (() => {
  const SUPABASE_ROOT_URL = window.AppConfig?.supabase?.rootUrl ?? "https://wtkumfcjqqmgokgrbxxr.supabase.co";
  const LANCER_MAP_ADMIN_URL = `${SUPABASE_ROOT_URL}/functions/v1/lancer-map-admin`;
  const STORAGE_BUCKET = "lancer-mapa";
  const ajaxRequest = window.AjaxController.ajaxRequest;

  function getPayload() {
    return ajaxRequest(LANCER_MAP_ADMIN_URL, { method: "GET" });
  }

  function createMap(payload) {
    return ajaxRequest(LANCER_MAP_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({ action: "map", ...payload }),
    });
  }

  function updateMap(payload) {
    return ajaxRequest(LANCER_MAP_ADMIN_URL, {
      method: "PUT",
      body: JSON.stringify({ action: "map", ...payload }),
    });
  }

  function deleteMap(id) {
    return ajaxRequest(LANCER_MAP_ADMIN_URL, {
      method: "DELETE",
      body: JSON.stringify({ target: "map", id }),
    });
  }

  function createCharacter(payload) {
    return ajaxRequest(LANCER_MAP_ADMIN_URL, {
      method: "POST",
      body: JSON.stringify({ action: "character", ...payload }),
    });
  }

  function deleteCharacter(id) {
    return ajaxRequest(LANCER_MAP_ADMIN_URL, {
      method: "DELETE",
      body: JSON.stringify({ target: "character", id }),
    });
  }

  async function uploadFile(file, folder) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await window.Auth.getClient()
      .storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false });

    if (error) throw error;

    const { data: publicData } = window.Auth.getClient()
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return {
      image_path: data.path,
      image_url: publicData.publicUrl,
    };
  }

  return {
    STORAGE_BUCKET,
    getPayload,
    createMap,
    updateMap,
    deleteMap,
    createCharacter,
    deleteCharacter,
    uploadFile,
  };
})();

window.AdminMapaLancerAjax = AdminMapaLancerAjax;
