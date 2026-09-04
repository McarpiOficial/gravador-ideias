// Envio de email do app "Gravador de Ideias", usando a sua própria conta
// Google (MailApp) — sem senha nenhuma guardada no aparelho.
//
// COMO INSTALAR (uma vez só):
// 1. Acesse script.google.com e crie um novo projeto (ou abra uma planilha
//    qualquer seguindo Extensões -> Apps Script, se preferir associar a uma).
// 2. Apague o conteúdo do editor e cole este arquivo inteiro.
// 3. Implantar -> Nova implantação -> tipo "App da Web".
//      Executar como: Eu (sua conta)
//      Quem tem acesso: Qualquer pessoa
//    Implantar. Na primeira vez o Google pede para autorizar - é você
//    autorizando o seu próprio script, aceite mesmo com o aviso de
//    "app não verificado".
// 4. Copie a "URL do app da Web" (termina em /exec) e cole no app, em
//    Configurações -> Endereço do Web App.
// 5. Em Configurações, preencha também o email de destino e toque em
//    "Enviar um teste" para confirmar que chegou.
//
// SEGURANÇA: quem tiver essa URL consegue mandar o script enviar email (com
// o remetente sendo a sua conta Google) para qualquer destinatário — o
// mesmo modelo de confiança já usado no backup do app Gastos. Trate a URL
// como um segredo (não a publique em lugar nenhum) e, se quiser travar o
// destino de vez, troque a linha abaixo marcada "DESTINO FIXO" para usar um
// endereço fixo em vez do que vier no aplicativo.

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var destinatario = String(payload.destinatario || '').trim();
    // DESTINO FIXO (opcional): comente a linha acima e descomente a de baixo
    // para sempre enviar para um endereço fixo, ignorando o que vier do app.
    // var destinatario = 'seu-email@exemplo.com';

    var assunto = String(payload.assunto || 'Nova ideia registrada').trim();
    var texto = String(payload.texto || '').trim();

    if (!destinatario) throw new Error('Sem email de destino.');
    if (!texto) throw new Error('Sem texto para enviar.');

    MailApp.sendEmail(destinatario, assunto, texto);

    return respond({ ok: true, enviadoEm: new Date().toISOString() });
  } catch (err) {
    return respond({ ok: false, error: String((err && err.message) || err) });
  }
}

// Visitar a URL do app pelo navegador cai aqui - serve só para confirmar
// que a implantação está no ar.
function doGet(e) {
  return ContentService.createTextOutput(
    'Endpoint de envio de email do Gravador de Ideias. Use POST com o corpo em JSON.'
  );
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
