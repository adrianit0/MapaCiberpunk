const DADOS_SUPABASE_ROOT_URL = window.AppConfig?.supabase?.rootUrl ?? "https://wtkumfcjqqmgokgrbxxr.supabase.co";
const DICE_ROLLS_URL = `${DADOS_SUPABASE_ROOT_URL}/functions/v1/dice-rolls`;
const dadosAjaxRequest = window.AjaxController.ajaxRequest;

function getDiceRolls(id) {
  const url = id
    ? `${DICE_ROLLS_URL}?id=${encodeURIComponent(id)}`
    : DICE_ROLLS_URL;

  return dadosAjaxRequest(url, {
    method: "GET",
  });
}

function postDiceRoll(roll) {
  return dadosAjaxRequest(DICE_ROLLS_URL, {
    method: "POST",
    body: JSON.stringify(roll),
    showLoading: false,
  });
}

function putDiceRoll(roll) {
  return dadosAjaxRequest(DICE_ROLLS_URL, {
    method: "PUT",
    body: JSON.stringify(roll),
  });
}

function pushDiceRoll(roll) {
  return dadosAjaxRequest(DICE_ROLLS_URL, {
    method: "PUSH",
    body: JSON.stringify(roll),
  });
}

function deleteDiceRoll(roll) {
  return dadosAjaxRequest(DICE_ROLLS_URL, {
    method: "DELETE",
    body: JSON.stringify(roll),
  });
}

window.DadosAjax = {
  DADOS_SUPABASE_ROOT_URL,
  DICE_ROLLS_URL,
  getDiceRolls,
  postDiceRoll,
  putDiceRoll,
  pushDiceRoll,
  deleteDiceRoll,
};
