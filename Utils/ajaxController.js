const AjaxController = (() => {
  const LOADING_ELEMENT_ID = "ajaxLoadingOverlay";
  const LOADING_STYLE_ID = "ajaxLoadingStyles";
  let activeRequests = 0;

  function getPublishableKey() {
    return window.AppConfig?.supabase?.publishableKey
      || window.AppConfig?.supabase?.anonKey
      || "";
  }

  function getAuthHeaders() {
    const token = window.AppSession?.accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function ensureLoadingStyles() {
    if (document.getElementById(LOADING_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = LOADING_STYLE_ID;
    style.textContent = `
      .ajax-loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        background: rgba(13, 17, 23, 0.42);
        opacity: 0;
        pointer-events: none;
        transition: opacity 160ms ease;
      }

      .ajax-loading-overlay.is-visible {
        opacity: 1;
        pointer-events: auto;
      }

      .ajax-loading-spinner {
        width: 52px;
        height: 52px;
        border: 4px solid rgba(255, 255, 255, 0.25);
        border-top-color: #58a6ff;
        border-radius: 50%;
        animation: ajax-loading-spin 0.8s linear infinite;
      }

      @keyframes ajax-loading-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getLoadingElement() {
    let loadingElement = document.getElementById(LOADING_ELEMENT_ID);

    if (!loadingElement) {
      loadingElement = document.createElement("div");
      loadingElement.id = LOADING_ELEMENT_ID;
      loadingElement.className = "ajax-loading-overlay";
      loadingElement.setAttribute("role", "status");
      loadingElement.setAttribute("aria-live", "polite");
      loadingElement.setAttribute("aria-label", "Cargando");
      loadingElement.innerHTML = '<div class="ajax-loading-spinner" aria-hidden="true"></div>';
      document.body.appendChild(loadingElement);
    }

    return loadingElement;
  }

  function showLoading() {
    activeRequests += 1;
    ensureLoadingStyles();
    getLoadingElement().classList.add("is-visible");
  }

  function hideLoading() {
    activeRequests = Math.max(0, activeRequests - 1);

    if (activeRequests === 0) {
      getLoadingElement().classList.remove("is-visible");
    }
  }

  function ajaxRequest(url, options = {}) {
    const { showLoading: showLoadingOption, ...fetchOptions } = options;
    const publishableKey = getPublishableKey();
    const headers = {
      "Content-Type": "application/json",
      ...(publishableKey ? { apikey: publishableKey } : {}),
      ...getAuthHeaders(),
      ...fetchOptions.headers,
    };

    const shouldShowLoading = showLoadingOption !== false;

    if (shouldShowLoading) {
      showLoading();
    }

    return fetch(url, {
      ...fetchOptions,
      headers,
    }).then(async (response) => {
      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        let detail = errorBody;

        try {
          const parsedError = errorBody ? JSON.parse(errorBody) : null;
          detail = parsedError?.error || parsedError?.message || errorBody;
        } catch (_error) {
          detail = errorBody;
        }

        detail = detail ? ` - ${detail}` : "";
        throw new Error(`Error ${response.status}: ${response.statusText}${detail}`);
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    }).finally(() => {
      if (shouldShowLoading) {
        hideLoading();
      }
    });
  }

  return {
    ajaxRequest,
  };
})();

window.AjaxController = AjaxController;
