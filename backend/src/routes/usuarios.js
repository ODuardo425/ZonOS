const express = require('express');
const bcrypt  = require('bcryptjs');
const sb      = require('../supabase');
const { auth, gestorOnly } = require('../middleware/auth');
const router  = express.Router();

router.use(auth, gestorOnly);

// ── GET /usuarios ──
router.get('/', async (req, res) => {
  try {
    const { data, error } = await sb
      .from('usuarios')
      .select('id, usuario, nome, perfil, ativo, created_at')
      .order('nome');
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /usuarios  — Criar ou atualizar usuário ──
// Body: { usuario, senha, nome, perfil, ativo }
router.post('/', async (req, res) => {
  try {
    const { usuario, senha, nome, perfil, ativo } = req.body || {};
    if (!usuario || !nome || !perfil)
      return res.status(400).json({ error: 'usuario, nome e perfil são obrigatórios' });

    // Verifica se já existe
    const { data: existing } = await sb
      .from('usuarios')
      .select('id, senha_hash')
      .eq('usuario', usuario.toLowerCase().trim())
      .single();

    let senha_hash = existing?.senha_hash;
    if (senha) {
      senha_hash = await bcrypt.hash(senha, 12);
    } else if (!existing) {
      return res.status(400).json({ error: 'Senha obrigatória para novo usuário' });
    }

    const row = {
      usuario:    usuario.toLowerCase().trim(),
      senha_hash,
      nome:       nome.trim(),
      perfil:     perfil.toLowerCase(),
      ativo:      ativo !== false && ativo !== 'Não',
    };

    const { data, error } = await sb
      .from('usuarios')
      .upsert(row, { onConflict: 'usuario' })
      .select('id, usuario, nome, perfil, ativo')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /usuarios/:usuario  — Desativar ──
router.delete('/:usuario', async (req, res) => {
  try {
    const { error } = await sb
      .from('usuarios')
      .update({ ativo: false })
      .eq('usuario', req.params.usuario);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
