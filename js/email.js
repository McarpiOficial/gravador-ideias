// Envio da ideia por email, via um Apps Script Web App que o usuário publica
// na própria conta Google (mesmo mecanismo do backup do app Gastos — ver
// tools/apps-script-email.gs). Sem backend próprio, sem senha de email
// guardada no aparelho: quem envia de fato é o MailApp do Google, do lado do
// script.

export function isValidWebAppUrl(url) {
  return /^https:\/\/.+/.test(String(url || '').trim());
}

export function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(String(value || '').trim());
}

// O Apps Script não responde com cabeçalhos de CORS de forma confiável,
// então um fetch que rejeita não prova que o envio falhou — só que o
// navegador não deixou ler a resposta. Por isso só vira erro "de verdade"
// quando o próprio script responde de forma legível dizendo que recusou.
export async function postIdeia(url, payload) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      // text/plain evita o preflight OPTIONS, que o Apps Script não trata bem.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch {
    const err = new Error('sem confirmação de leitura');
    err.unconfirmed = true;
    throw err;
  }

  let json = null;
  try {
    json = JSON.parse(await res.text());
  } catch {
    // resposta não veio em json legível
  }

  if (json?.ok) return json;
  if (json && json.ok === false) throw new Error(json.error || 'O envio foi recusado.');

  const err = new Error('sem confirmação de leitura');
  err.unconfirmed = true;
  throw err;
}
