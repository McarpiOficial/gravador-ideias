// Renderização por template string. Nenhum estado vive aqui.

import { APP_VERSION } from './version.js';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const icon = (name, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

function fmtDataHora(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const data = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} às ${hora}`;
}

const STATUS_INFO = {
  enviado: { icone: 'check', classe: '', texto: 'Enviado' },
  sem_confirmacao: { icone: 'alert', classe: 'is-warning', texto: 'Enviado, sem confirmação' },
  erro: { icone: 'alert', classe: 'is-danger', texto: 'Falha no envio' },
};

// ---------- histórico

export function renderHistorico(historico) {
  if (!historico.length) {
    return '<p class="hint">Nenhuma ideia enviada ainda — grave a primeira acima.</p>';
  }
  const itens = historico.map((item) => {
    const info = STATUS_INFO[item.status] || STATUS_INFO.erro;
    return `
      <li class="historico-item ${info.classe}">
        <div class="historico-topo">
          <span class="historico-status">${icon(info.icone, 'icon icon--sm')} ${esc(info.texto)}</span>
          <button type="button" class="icon-btn icon-btn--sm" data-action="historico-remover" data-id="${esc(item.id)}" aria-label="Remover do histórico">
            ${icon('trash', 'icon icon--sm')}
          </button>
        </div>
        <p class="historico-texto">${esc(item.texto)}</p>
        <p class="historico-meta">${esc(fmtDataHora(item.criadoEm))}${item.erro ? ` · ${esc(item.erro)}` : ''}</p>
      </li>`;
  }).join('');
  return `<ul class="historico-lista">${itens}</ul>`;
}

// ---------- configurações

function statusConfigTexto(config) {
  if (!config.webAppUrl || !config.destinatario) {
    return 'Preencha o endereço do Web App e o email de destino para poder enviar.';
  }
  return `As ideias serão enviadas para ${config.destinatario}.`;
}

export function renderSettingsSheet(state) {
  const count = state.historico.length;
  return `
    <div class="sheet-head">
      <div>
        <h2 id="sheet-title">Configurações</h2>
        <p>${count} ideia${count === 1 ? '' : 's'} no histórico · ${esc(APP_VERSION)}</p>
      </div>
      <button type="button" class="icon-btn" data-action="close" aria-label="Fechar">${icon('x')}</button>
    </div>
    <div class="sheet-body">
      <h3 class="settings-section">${icon('mail', 'icon icon--sm')} Destino do email</h3>
      <p class="hint">${esc(statusConfigTexto(state.config))}</p>

      <div class="field">
        <label for="cfg-destinatario">Email de destino</label>
        <input type="text" id="cfg-destinatario" inputmode="email" autocomplete="off"
               placeholder="voce@exemplo.com"
               value="${esc(state.config.destinatario || '')}">
      </div>
      <p class="error" id="cfg-destinatario-error" hidden></p>

      <div class="field">
        <label for="cfg-assunto">Assunto do email</label>
        <input type="text" id="cfg-assunto" autocomplete="off"
               placeholder="Nova ideia registrada"
               value="${esc(state.config.assunto || '')}">
      </div>

      <h3 class="settings-section" style="margin-top:20px">${icon('cloud', 'icon icon--sm')} Envio (Apps Script)</h3>
      <p class="hint">O envio usa um Apps Script Web App publicado na sua própria conta Google — sem
      senha nenhuma guardada no aparelho. Veja o passo a passo em
      <code>tools/apps-script-email.gs</code> no projeto.</p>
      <div class="field">
        <label for="cfg-webapp-url">Endereço do Web App</label>
        <input type="text" id="cfg-webapp-url" inputmode="url" autocomplete="off"
               placeholder="https://script.google.com/macros/s/.../exec"
               value="${esc(state.config.webAppUrl || '')}">
      </div>
      <p class="error" id="cfg-webapp-url-error" hidden></p>
      <button type="button" class="btn" style="width:100%" data-action="teste-envio">
        ${icon('send')} Enviar um teste
      </button>

      <h3 class="settings-section" style="margin-top:20px">${icon('broom', 'icon icon--sm')} Histórico</h3>
      <p class="hint">O histórico fica só neste aparelho, mesmo depois de enviado por email.</p>
      <button type="button" class="btn btn--danger" style="width:100%" data-action="historico-limpar" ${count ? '' : 'disabled'}>
        ${icon('trash')} Apagar histórico
      </button>
    </div>`;
}
