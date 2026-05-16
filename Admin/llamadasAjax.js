const ADMIN_SUPABASE_ROOT_URL = window.AppConfig?.supabase?.rootUrl ?? "https://wtkumfcjqqmgokgrbxxr.supabase.co";
const ADMIN_USERS_URL = `${ADMIN_SUPABASE_ROOT_URL}/functions/v1/admin-users`;
const adminAjaxRequest = window.AjaxController.ajaxRequest;

function getAdminUsers() {
  return adminAjaxRequest(ADMIN_USERS_URL, {
    method: "GET",
  });
}

function postAdminUserRole(userId, roleId) {
  return adminAjaxRequest(ADMIN_USERS_URL, {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      rol_id: roleId,
    }),
  });
}

function deleteAdminUserRole(userId, roleId) {
  return adminAjaxRequest(ADMIN_USERS_URL, {
    method: "DELETE",
    body: JSON.stringify({
      user_id: userId,
      rol_id: roleId,
    }),
  });
}

window.AdminAjax = {
  ADMIN_SUPABASE_ROOT_URL,
  ADMIN_USERS_URL,
  getAdminUsers,
  postAdminUserRole,
  deleteAdminUserRole,
};
