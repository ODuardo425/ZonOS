const express = require('express');
const sb      = require('../supabase');
const { auth } = require('../middleware/auth');
const router  = express.Router();

router.use(auth);

// ── GET /preenchimentos  — Todos os preenchimentos (gestor) ──
router.get('/', async (req, res) => {
  try {
    const { data, error } = await sb
      .from('preenchimentos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /preenchimentos/:osNum  — Preenchimento de uma OS ──
router.get('/:osNum', async (req, res) => {
  try {
    const { data, error } = await sb
      .from('preenchimentos')
      .select('*')
      .eq('os_num', req.params.osNum)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) return res.status(404).json({ error: 'Não encontrado' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /preenchimentos  — Salvar/atualizar preenchimento ──
// Body: { num, dados, preenchidoPor, preenchidoEm, fotos }
router.post('/', async (req, res) => {
  try {
    const { num, dados, preenchidoPor, preenchidoEm, fotos } = req.body || {};
    if (!num || !dados) return res.status(400).json({ error: 'num e dados são obrigatórios' });

    // Upsert no preenchimento
    const { data: preen, error: preenErr } = await sb
      .from('preenchimentos')
      .upsert({
        os_num:         num,
        dados:          dados,
        preenchido_por: preenchidoPor || req.user.nome,
        preenchido_em:  preenchidoEm  || new Date().toLocaleString('pt-BR'),
        fotos:          fotos || [],
      }, { onConflict: 'os_num' })
      .select()
      .single();

    if (preenErr) throw preenErr;

    // Atualiza flags na OS
    await sb.from('ordens_servico').update({
      preenchida:     true,
      preenchida_por: preenchidoPor || req.user.nome,
      preenchida_em:  preenchidoEm  || new Date().toLocaleString('pt-BR'),
      status:         'Em validação',
    }).eq('num', num);

    res.status(201).json(preen);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
