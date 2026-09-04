// Bootstrap e delegação de eventos.

import * as store from './store.js';
import * as ui from './ui.js';
import { speechSupported, createRecognizer } from './voice.js';
import { isValidWebAppUrl, isValidEmail, postIdeia } from './email.js';

const btnMic = document.getElementById('btn-mic');
const micStatus = document.getElementById('mic-status');
const transcriptEl = document.getElementById('transcript');
const btnLimpar = document.getElementById('btn-limpar');
const btnEnviar = document.getElementById('btn-enviar');
const envioHint = document.getElementById('envio-hint');
const listaHistorico = document.getElementById('lista-historico');
const btnSettings = document.getElementById('btn-settings');
const overlay = document.getElementById('overlay');
const sheet = document.getElementById('sheet');
const toastEl = document.getElementById('toast');

let state = store.load();
let recognizer = null;
let ouvindo = false;

// ---------- toast

function toast(message, duration = 2600) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toastEl.hidden = true; }, duration);
}

// ---------- render

function renderHistorico() {
  listaHistorico.innerHTML = ui.renderHistorico(state.historico);
}

function renderEnvioHint() {
  const pronto = state.config.webAppUrl && state.config.destinatario;
  envioHint.textContent = pronto
    ? ''
    : 'Configure o email de destino em ⚙️ Configurações antes de enviar.';
}

// ---------- microfone

function statusParado(msg) {
  micStatus.textContent = msg;
  micStatus.classList.remove('is-error');
  btnMic.classList.remove('is-listening');
}

function iniciarEscuta() {
  if (!speechSupported()) {
    micStatus.textContent = 'Reconhecimento de voz não é compatível com este navegador — digite direto no campo abaixo.';
    micStatus.classList.add('is-error');
    return;
  }
  if (recognizer) { recognizer.abort(); recognizer = null; }

  recognizer = createRecognizer({
    onInterim(texto) {
      transcriptEl.value = texto;
    },
    onFinal(texto) {
      if (texto) transcriptEl.value = texto;
    },
    onError(code) {
      const mensagens = {
        'not-allowed': 'Sem permissão para o microfone. Libere nas configurações do navegador.',
        'service-not-allowed': 'O navegador bloqueou o microfone — é preciso HTTPS.',
        'no-speech': 'Não ouvi nada. Toque no microfone e tente de novo.',
        network: 'O reconhecimento de fala precisa de internet.',
      };
      micStatus.textContent = mensagens[code] || `Falha no reconhecimento (${code}). Pode digitar direto no campo abaixo.`;
      micStatus.classList.add('is-error');
    },
    onEnd() {
      ouvindo = false;
      btnMic.classList.remove('is-listening');
      if (!micStatus.classList.contains('is-error')) {
        statusParado(transcriptEl.value.trim()
          ? 'Gravação parada — confira o texto e envie, ou grave de novo.'
          : 'Toque no microfone e descreva a ideia ou o problema.');
      }
    },
  });

  if (!recognizer) return;
  ouvindo = true;
  btnMic.classList.add('is-listening');
  micStatus.classList.remove('is-error');
  micStatus.textContent = 'Ouvindo… toque de novo para parar.';
  recognizer.start();
}

function pararEscuta() {
  if (recognizer) recognizer.stop();
}

btnMic.addEventListener('click', () => {
  if (ouvindo) pararEscuta();
  else iniciarEscuta();
});

btnLimpar.addEventListener('click', () => {
  transcriptEl.value = '';
  statusParado('Toque no microfone e descreva a ideia ou o problema.');
  transcriptEl.focus();
});

// ---------- envio

async function enviarIdeia() {
  const texto = transcriptEl.value.trim();
  if (!texto) { toast('Grave ou digite a ideia antes de enviar.'); return; }
  if (!isValidWebAppUrl(state.config.webAppUrl) || !isValidEmail(state.config.destinatario)) {
    toast('Configure o email de destino em Configurações antes de enviar.');
    return;
  }

  btnEnviar.disabled = true;
  const payload = {
    destinatario: state.config.destinatario,
    assunto: state.config.assunto || 'Nova ideia registrada',
    texto,
    geradoEm: new Date().toISOString(),
  };

  try {
    await postIdeia(state.config.webAppUrl, payload);
    store.addIdeia({ texto, status: 'enviado' });
    renderHistorico();
    transcriptEl.value = '';
    statusParado('Enviado! Toque no microfone para registrar outra ideia.');
    toast('Ideia enviada por email.');
  } catch (err) {
    if (err.unconfirmed) {
      store.addIdeia({ texto, status: 'sem_confirmacao' });
      renderHistorico();
      toast('Enviado, mas sem confirmação de leitura — o texto continua aqui até você confirmar.');
    } else {
      store.addIdeia({ texto, status: 'erro', erro: err.message });
      renderHistorico();
      toast(`Falha ao enviar: ${err.message}`);
    }
  } finally {
    btnEnviar.disabled = false;
  }
}

btnEnviar.addEventListener('click', enviarIdeia);

// ---------- configurações (folha)

function openSheet(html) {
  sheet.innerHTML = html;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSheet() {
  overlay.hidden = true;
  sheet.innerHTML = '';
  document.body.style.overflow = '';
}

overlay.addEventListener('click', (event) => {
  if (event.target === overlay) closeSheet();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !overlay.hidden) closeSheet();
});

function openSettingsSheet() {
  openSheet(ui.renderSettingsSheet(state));
}

btnSettings.addEventListener('click', openSettingsSheet);

sheet.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  switch (target.dataset.action) {
    case 'close':
      closeSheet();
      break;
    case 'historico-limpar':
      store.clearHistorico();
      sheet.innerHTML = ui.renderSettingsSheet(state);
      renderHistorico();
      toast('Histórico apagado.');
      break;
    case 'teste-envio': {
      if (!isValidWebAppUrl(state.config.webAppUrl) || !isValidEmail(state.config.destinatario)) {
        toast('Preencha o endereço do Web App e o email de destino primeiro.');
        break;
      }
      target.disabled = true;
      try {
        await postIdeia(state.config.webAppUrl, {
          destinatario: state.config.destinatario,
          assunto: `Teste — ${state.config.assunto || 'Gravador de Ideias'}`,
          texto: 'Este é um email de teste do Gravador de Ideias — se ele chegou, o envio está configurado corretamente.',
          geradoEm: new Date().toISOString(),
        });
        toast('Teste enviado — confira sua caixa de entrada.');
      } catch (err) {
        toast(err.unconfirmed
          ? 'Enviado, mas sem confirmação de leitura — confira sua caixa de entrada.'
          : `Falha no teste: ${err.message}`);
      } finally {
        target.disabled = false;
      }
      break;
    }
    default:
      break;
  }
});

listaHistorico.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action="historico-remover"]');
  if (!target) return;
  store.removeIdeia(target.dataset.id);
  renderHistorico();
});

// Configurações: cada campo persiste sozinho, sem botão "salvar" à parte.
sheet.addEventListener('change', (event) => {
  const { id } = event.target;
  if (id === 'cfg-destinatario') {
    const raw = event.target.value.trim();
    const errorEl = document.getElementById('cfg-destinatario-error');
    if (!raw) {
      errorEl.hidden = true;
      store.setConfig({ destinatario: null });
    } else if (!isValidEmail(raw)) {
      errorEl.textContent = 'Isso não parece um email válido.';
      errorEl.hidden = false;
    } else {
      errorEl.hidden = true;
      event.target.value = raw;
      store.setConfig({ destinatario: raw });
    }
    renderEnvioHint();
  } else if (id === 'cfg-assunto') {
    store.setConfig({ assunto: event.target.value.trim() || 'Nova ideia registrada' });
  } else if (id === 'cfg-webapp-url') {
    const raw = event.target.value.trim();
    const errorEl = document.getElementById('cfg-webapp-url-error');
    if (!raw) {
      errorEl.hidden = true;
      store.setConfig({ webAppUrl: null });
    } else if (!isValidWebAppUrl(raw)) {
      errorEl.textContent = 'O endereço precisa começar com https://.';
      errorEl.hidden = false;
    } else {
      errorEl.hidden = true;
      event.target.value = raw;
      store.setConfig({ webAppUrl: raw });
    }
    renderEnvioHint();
  }
});

store.subscribe((next) => { state = next; });

// ---------- inicialização

if (!speechSupported()) {
  micStatus.textContent = 'Reconhecimento de voz não é compatível com este navegador — digite direto no campo abaixo.';
  micStatus.classList.add('is-error');
}
renderHistorico();
renderEnvioHint();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW:', err));
  });
}
