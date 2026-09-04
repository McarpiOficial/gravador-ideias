# Gravador de Ideias

App pessoal (PWA) para registrar uma ideia ou problema na hora, por voz, e
enviar por email antes de esquecer. Roda inteiramente no navegador do
celular — **nada fica salvo em nenhum servidor próprio**: o histórico vive
só no aparelho (localStorage) e o envio do email usa um Apps Script na sua
própria conta Google.

## Como funciona

1. Toque no microfone e descreva a ideia ou o problema em voz alta — o texto
   vai aparecendo na tela conforme você fala (reconhecimento de voz do
   navegador, Web Speech API). Toque de novo para parar.
2. Revise ou edite o texto transcrito à mão, se precisar.
3. Toque em **Enviar por email** — o texto vai para o email configurado em
   Configurações, com o assunto também configurado lá.
4. Cada envio fica registrado no **Histórico**, com data/hora e o status
   (enviado, sem confirmação, ou falha) — útil para saber se algo precisa
   ser reenviado.

Nada é digitado ou falado à toa: se a transcrição de voz não for compatível
com o navegador (ou errar), dá para digitar direto no campo de texto.

## Configuração (uma vez, no aparelho)

O envio de email precisa de um pequeno Apps Script publicado na sua própria
conta Google — é o mesmo mecanismo usado no backup do app Gastos, sem
depender de nenhum serviço terceiro nem de senha guardada no app.

1. Siga o passo a passo no topo de [tools/apps-script-email.gs](tools/apps-script-email.gs)
   para publicar o Web App na sua conta Google e copiar a URL (termina em
   `/exec`).
2. Abra o app no celular, toque em ⚙️ **Configurações** e preencha:
   - **Email de destino**: para onde as ideias devem chegar.
   - **Assunto do email**: usado em todo envio (o corpo é sempre o texto
     transcrito).
   - **Endereço do Web App**: a URL copiada no passo 1.
3. Toque em **Enviar um teste** para confirmar que chegou.

Essas configurações ficam guardadas só neste aparelho — instalando o app em
outro celular, configure de novo lá.

## Como usar no celular

1. Abra a URL do app publicado (GitHub Pages) no navegador do celular.
2. No menu do navegador, escolha **"Adicionar à tela de início"** (Android/
   Chrome) ou **"Adicionar à Tela de Início"** (iOS/Safari, no botão de
   compartilhar). O app passa a abrir em tela cheia, como um aplicativo, e
   funciona offline depois do primeiro acesso (o envio de email, claro,
   precisa de internet).
3. Configure o email de destino (veja acima) e comece a gravar ideias.

## Rodar localmente (preview)

```bash
npx serve -l 5211
```

Depois abra `http://localhost:5211` no navegador. O microfone (Web Speech
API) só funciona em `localhost` ou HTTPS — não funciona abrindo o
`index.html` direto como arquivo (`file://`).

## Estrutura

```
index.html            shell do app
styles.css            tema visual (mobile-first, claro/escuro automático)
js/store.js           configuração + histórico em localStorage
js/voice.js           reconhecimento de voz (Web Speech API)
js/email.js           envio ao Apps Script (fetch)
js/ui.js               renderização do histórico e da folha de Configurações
js/app.js              bootstrap e ligação dos eventos
manifest.webmanifest   configuração do PWA
sw.js                   service worker (funcionamento offline)
tools/apps-script-email.gs   script para colar no Apps Script (envio de email)
tools/gen-icons.mjs          gera os ícones PNG do PWA a partir de icon.svg
```
