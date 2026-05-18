const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const sb      = require('../supabase');
const router  = express.Router();

// POST /auth/login  — Gestor / Financeiro / Operador
router.post('/login', async (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha)
    return res.status(400).json({ error: 'usuario e senha obrigatórios' });

  const { data, error } = await sb
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario.toLowerCase().trim())
    .eq('ativo', true)
    .single();

  if (error || !data)
    return res.status(401).json({ error: 'Usuário não encontrado' });

  const ok = await bcrypt.compare(senha, data.senha_hash);
  if (!ok) return res.status(401).json({ error: 'Senha incorreta' });

  const token = jwt.sign(
    { id: data.id, usuario: data.usuario, nome: data.nome, perfil: data.perfil },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, usuario: data.usuario, nome: data.nome, perfil: data.perfil });
});

// POST /auth/login-prestador  — Login de prestador de serviço
router.post('/login-prestador', async (req, res) => {
  const { login, senha } = req.body || {};
  if (!login || !senha)
    return res.status(400).json({ error: 'login e senha obrigatórios' });

  const { data, error } = await sb
    .from('prestadores')
    .select('*')
    .eq('login', login.toLowerCase().trim())
    .eq('status', 'ativo')
    .single();

  if (error || !data)
    return res.status(401).json({ error: 'Prestador não encontrado' });

  const ok = await bcrypt.compare(senha, data.senha_hash);
  if (!ok) return res.status(401).json({ error: 'Senha incorreta' });

  const token = jwt.sign(
    { id: data.id, login: data.login, nome: data.nome, perfil: 'operador', tipo: 'prestador' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, login: data.login, nome: data.nome });
});

module.exports = router;
