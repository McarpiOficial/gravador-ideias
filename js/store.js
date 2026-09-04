// Estado em localStorage. Schema versionado, com migracao.
// So guarda configuracao (destino do email) e o historico de ideias ja
// enviadas — nunca o audio em si, que nunca chega a ser gravado em disco.

const STORAGE_KEY = 'gravadorIdeias.state';
const SCHEMA_VERSION = 1;
const MAX_HISTORICO = 200;

let state = null;
const listeners = new Set();

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    config: {
      webAppUrl: null,
      destinatario: null,
      assunto: 'Nova ideia registrada',
    },
    historico: [],
    seq: 0,
  };
}

function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const next = {
    version: SCHEMA_VERSION,
    config: {
      webAppUrl: /^https:\/\/.+/.test(raw.config?.webAppUrl || '') ? raw.config.webAppUrl.trim() : null,
      destinatario: /^\S+@\S+\.\S+$/.test(raw.config?.destinatario || '') ? raw.config.destinatario.trim() : null,
      assunto: String(raw.config?.assunto || '').trim() || base.config.assunto,
    },
    historico: [],
    seq: Number(raw.seq) || 0,
  };
  for (const item of Array.isArray(raw.historico) ? raw.historico : []) {
    if (!item || !item.texto) continue;
    next.historico.push({
      id: String(item.id || `i_${++next.seq}`),
      texto: String(item.texto),
      criadoEm: item.criadoEm || new Date().toISOString(),
      status: ['enviado', 'sem_confirmacao', 'erro'].includes(item.status) ? item.status : 'erro',
      erro: item.erro ? String(item.erro).slice(0, 300) : null,
    });
  }
  next.historico = next.historico.slice(0, MAX_HISTORICO);
  return next;
}

export function load() {
  let raw = null;
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text) raw = JSON.parse(text);
  } catch (err) {
    console.warn('Estado ilegível, começando do zero.', err);
  }
  state = raw ? migrate(raw) : defaultState();
  return state;
}

export function getState() {
  if (!state) load();
  return state;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Não foi possível salvar.', err);
  }
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- configuracao

export function setConfig(patch) {
  Object.assign(state.config, patch);
  persist();
}

// ---------- historico

export function addIdeia({ texto, status, erro }) {
  const entry = {
    id: `i_${++state.seq}`,
    texto: String(texto).trim(),
    criadoEm: new Date().toISOString(),
    status: ['enviado', 'sem_confirmacao'].includes(status) ? status : 'erro',
    erro: status === 'erro' ? String(erro || '').slice(0, 300) : null,
  };
  state.historico.unshift(entry);
  state.historico = state.historico.slice(0, MAX_HISTORICO);
  persist();
  return entry;
}

export function removeIdeia(id) {
  const i = state.historico.findIndex((h) => h.id === id);
  if (i < 0) return false;
  state.historico.splice(i, 1);
  persist();
  return true;
}

export function clearHistorico() {
  state.historico = [];
  persist();
}
