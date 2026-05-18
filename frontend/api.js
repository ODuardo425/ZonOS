// ══════════════════════════════════════════════════
// ZonCharge OS — api.js
// Substitui todas as chamadas ao Google Sheets.
// Inclua este arquivo no index.html ANTES do script principal.
// ══════════════════════════════════════════════════

// 🔧 Troque pela URL do seu serviço no Render
const API_URL = 'https://zoncharge-os.onrender.com';

// Token JWT em memória (não persiste — usuário faz login a cada sessão)
let _apiToken = null;

// ── Helpers internos ──
async function _req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (_apiToken) opts.headers['Authorization'] = 'Bearer ' + _apiToken;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_URL + path, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

const api = {
  get:    (path)         => _req('GET',    path),
  post:   (path, body)   => _req('POST',   path, body),
  put:    (path, body)   => _req('PUT',    path, body),
  patch:  (path, body)   => _req('PATCH',  path, body),
  delete: (path)         => _req('DELETE', path),
};

// ══════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════

async function apiLogin(usuario, senha) {
  const data = await api.post('/auth/login', { usuario, senha });
  _apiToken = data.token;
  return data; // { token, usuario, nome, perfil }
}

async function apiLoginPrestador(login, senha) {
  const data = await api.post('/auth/login-prestador', { login, senha });
  _apiToken = data.token;
  return data;
}

function apiLogout() {
  _apiToken = null;
}

// ══════════════════════════════════════════════════
// ORDENS DE SERVIÇO
// Substitui: carregarSheets(), upsertOS(), updateFieldOS(), postSheets()
// ══════════════════════════════════════════════════

async function carregarSheets(cb) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  if (dot) dot.className = 'sync-dot';
  if (lbl) lbl.textContent = 'Carregando...';
  try {
    const rows = await api.get('/os');
    OS_LIST = rows;
    OS_COUNTER = Math.max(0, ...rows.map(o => {
      const p = (o.num || '').split('-');
      return parseInt(p[p.length - 1]) || 0;
    })) + 1;
    if (dot) dot.className = 'sync-dot on';
    if (lbl) lbl.textContent = rows.length + ' OS';
    setTimeout(() => { const l = document.getElementById('sync-label'); if (l) l.textContent = 'Conectado'; }, 2000);
  } catch (e) {
    console.error('carregarSheets:', e.message);
    if (OS_LIST.length === 0) OS_LIST = [...OS_DEMO_SEED];
    OS_COUNTER = Math.max(0, ...OS_LIST.map(o => parseInt((o.num || '').split('-').pop()) || 0)) + 1;
    if (dot) dot.className = 'sync-dot on';
    if (lbl) lbl.textContent = OS_LIST.length + ' OS — offline';
  }
  if (cb) cb();
}

async function upsertOS(os) {
  try {
    await api.put('/os/' + os.num, os);
    _syncOn('Salvo');
  } catch (e) {
    console.error('upsertOS:', e.message);
    _syncOn('Salvo localmente');
  }
}

async function updateFieldOS(num, fields) {
  try {
    await api.patch('/os/' + num, { fields });
    _syncOn('Salvo');
  } catch (e) {
    console.error('updateFieldOS:', e.message);
  }
}

// postSheets({action, ...}) — mapeia actions para endpoints REST
async function postSheets(body) {
  try {
    const { action, num, dados, aba } = body || {};

    if (action === 'upsertOS') {
      await api.put('/os/' + dados.num, dados);

    } else if (action === 'updateField') {
      await api.patch('/os/' + num, { fields: body.fields });

    } else if (action === 'savePreenchimento') {
      await api.post('/preenchimentos', {
        num: dados.num,
        dados,
        preenchidoPor: dados.preenchidaPor,
        preenchidoEm:  dados.preenchidaEm,
        fotos:         dados.fotos || [],
      });

    } else if (action === 'upsertUsuario') {
      await api.post('/usuarios', dados);

    } else if (action === 'upsertPrestador') {
      await api.post('/prestadores', dados);

    } else if (aba === 'Preenchimento') {
      await api.post('/preenchimentos', { num: dados.num, dados });
    }

    _syncOn('Salvo');
  } catch (e) {
    console.error('postSheets:', e.message);
    _syncOn('Salvo localmente');
  }
}

// Wrapper para enviarSheets (legado)
async function enviarSheets(aba, dados) {
  return postSheets({ aba, dados });
}

// ══════════════════════════════════════════════════
// PREENCHIMENTOS
// ══════════════════════════════════════════════════

async function carregarPreenchimentos(cb) {
  try {
    const rows = await api.get('/preenchimentos');
    rows.forEach(p => {
      _preenchimentos[p.os_num] = p.dados;
      const idx = OS_LIST.findIndex(o => o.num === p.os_num);
      if (idx >= 0) {
        OS_LIST[idx].preenchida    = true;
        OS_LIST[idx].preenchidaPor = p.preenchido_por;
        OS_LIST[idx].preenchidaEm  = p.preenchido_em;
        OS_LIST[idx]._preenchimento = p.dados;
      }
    });
  } catch (e) {
    console.error('carregarPreenchimentos:', e.message);
    // fallback localStorage (modo offline)
    try {
      const stored = JSON.parse(localStorage.getItem('zc_preenchimentos') || '{}');
      Object.keys(stored).forEach(num => {
        _preenchimentos[num] = stored[num];
        const idx = OS_LIST.findIndex(o => o.num === num);
        if (idx >= 0) {
          OS_LIST[idx].preenchida    = true;
          OS_LIST[idx]._preenchimento = stored[num];
          OS_LIST[idx].preenchidaPor = stored[num].preenchidaPor || '';
          OS_LIST[idx].preenchidaEm  = stored[num].preenchidaEm  || '';
        }
      });
    } catch (_) {}
  }
  if (cb) cb();
}

// ══════════════════════════════════════════════════
// USUÁRIOS
// ══════════════════════════════════════════════════

async function carregarUsuarios(cb) {
  try {
    const rows = await api.get('/usuarios');
    _usuarios = {};
    rows.forEach(u => { _usuarios[u.usuario] = u; });
  } catch (e) {
    console.error('carregarUsuarios:', e.message);
    // Fallback: usuários locais do objeto USUARIOS
    if (typeof USUARIOS !== 'undefined') {
      Object.values(USUARIOS).forEach(u => { _usuarios[u.usuario] = u; });
    }
  }
  if (cb) cb();
}

// ══════════════════════════════════════════════════
// PRESTADORES
// ══════════════════════════════════════════════════

async function carregarPrestadores(cb) {
  try {
    const data = await api.get('/prestadores');
    _prestadores = data; // já vem como objeto { login: {...} }
  } catch (e) {
    console.error('carregarPrestadores:', e.message);
  }
  if (cb) cb();
}

// ── Sincronizar (botão na topbar) ──
async function sincronizar() {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  if (dot) dot.className = 'sync-dot';
  if (lbl) lbl.textContent = 'Sincronizando...';
  try {
    await carregarSheets(null);
    await carregarPreenchimentos(null);
    await carregarPrestadores(null);
    if (typeof renderDash === 'function') renderDash();
    if (typeof renderOSList === 'function') renderOSList();
    toast('✓ Sincronizado');
  } catch (e) {
    toast('⚠ Erro ao sincronizar');
  }
}

// ── Helper visual ──
function _syncOn(msg) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  if (dot) dot.className = 'sync-dot on';
  if (lbl) { lbl.textContent = msg; setTimeout(() => { const l = document.getElementById('sync-label'); if (l) l.textContent = 'Conectado'; }, 2000); }
}
