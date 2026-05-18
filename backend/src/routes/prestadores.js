const express = require('express');
const bcrypt  = require('bcryptjs');
const sb      = require('../supabase');
const { auth, gestorOnly } = require('../middleware/auth');
const router  = express.Router();

router.use(auth);

// ── GET /prestadores  — Listar ──
router.get('/', async (req, res) => {
  try {
    const { data, error } = await sb
      .from('prestadores')
      .select('id, codigo, nome, login, tel, tipos, status, created_at')
      .order('nome');
    if (error) throw error;

    // Retorna no formato que o frontend espera
    const result = (data || []).reduce((acc, p) => {
      acc[p.login] = {
        id:     p.codigo,
        nome:   p.nome,
        login:  p.login,
        tel:    p.tel,
        tipos:  p.tipos,
        status: p.status,
        ativo:  p.status !== 'bloqueado',
      };
      return acc;
    }, {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /prestadores  — Criar ou atualizar ──
router.post('/', gestorOnly, async (req, res) => {
  try {
    const { id, nome, login, senha, tel, tipos, status } = req.body || {};
    if (!nome || !login)
      return res.status(400).json({ error: 'nome e login são obrigatórios' });

    const { data: existing } = await sb
      .from('prestadores')
      .select('id, senha_hash, codigo')
      .eq('login', login.toLowerCase().trim())
      .single();

    let senha_hash = existing?.senha_hash;
    if (senha) {
      senha_hash = await bcrypt.hash(senha, 12);
    } else if (!existing) {
      return res.status(400).json({ error: 'Senha obrigatória para novo prestador' });
    }

    // Gera código sequencial se novo
    let codigo = existing?.codigo || id;
    if (!codigo) {
      const { count } = await sb.from('prestadores').select('*', { count: 'exact', head: true });
      codigo = 'PREST-' + String((count || 0) + 1).padStart(3, '0');
    }

    const row = {
      codigo,
      nome:      nome.trim(),
      login:     login.toLowerCase().trim(),
      senha_hash,
      tel:       tel || '',
      tipos:     tipos || '',
      status:    status || 'ativo',
    };

    const { data, error } = await sb
      .from('prestadores')
      .upsert(row, { onConflict: 'login' })
      .select('codigo, nome, login, tel, tipos, status')
      .single();
    if (error) throw error;
    res.json({ ...data, id: data.codigo, ativo: data.status !== 'bloqueado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /prestadores/:login  — Bloquear/desbloquear ──
router.patch('/:login', gestorOnly, async (req, res) => {
  try {
    const { status } = req.body || {};
    const { error } = await sb
      .from('prestadores')
      .update({ status: status || 'bloqueado' })
      .eq('login', req.params.login);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
