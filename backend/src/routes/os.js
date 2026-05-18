const express = require('express');
const sb      = require('../supabase');
const { auth, gestorOnly } = require('../middleware/auth');
const router  = express.Router();

// Todas as rotas exigem autenticação
router.use(auth);

// ── GET /os  — Lista todas as OS (com filtros opcionais) ──
// Query params: status, prest, tipo, search
router.get('/', async (req, res) => {
  try {
    let q = sb.from('ordens_servico').select('*').order('updated_at', { ascending: false });

    if (req.query.status) q = q.eq('status', req.query.status);
    if (req.query.prest)  q = q.eq('prest', req.query.prest);
    if (req.query.tipo)   q = q.eq('tipo', req.query.tipo);
    if (req.query.search) q = q.ilike('num', `%${req.query.search}%`);

    // Operadores só veem suas próprias OS
    if (req.user.perfil === 'operador' && req.user.tipo !== 'prestador') {
      q = q.eq('prest', req.user.nome);
    }
    if (req.user.tipo === 'prestador') {
      q = q.eq('prest', req.user.nome);
    }

    const { data, error } = await q;
    if (error) throw error;

    // Converte para o formato que o frontend espera (camelCase)
    const rows = (data || []).map(toFrontend);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /os/:num  — OS individual ──
router.get('/:num', async (req, res) => {
  try {
    const { data, error } = await sb
      .from('ordens_servico')
      .select('*')
      .eq('num', req.params.num)
      .single();
    if (error || !data) return res.status(404).json({ error: 'OS não encontrada' });
    res.json(toFrontend(data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /os  — Criar nova OS ──
router.post('/', async (req, res) => {
  try {
    const row = toDatabase(req.body);
    if (!row.num) return res.status(400).json({ error: 'num é obrigatório' });

    const { data, error } = await sb
      .from('ordens_servico')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(toFrontend(data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /os/:num  — Upsert (criar ou atualizar OS inteira) ──
router.put('/:num', async (req, res) => {
  try {
    const row = { ...toDatabase(req.body), num: req.params.num };

    const { data, error } = await sb
      .from('ordens_servico')
      .upsert(row, { onConflict: 'num' })
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /os/:num  — Atualizar campos específicos ──
// Body: { fields: { status, valor, aprovacao, ... } }
router.patch('/:num', async (req, res) => {
  try {
    const fields = req.body.fields || req.body;
    const mapped = {};

    // Mapeamento frontend → banco
    const fieldMap = {
      status:        'status',
      valor:         'valor',
      aprovacao:     'aprovacao',
      aprovadoPor:   'aprovado_por',
      aprovadoEm:    'aprovado_em',
      conclusao:     'conclusao',
      preenchida:    'preenchida',
      preenchidaPor: 'preenchida_por',
      preenchidaEm:  'preenchida_em',
      pagamentoStatus: 'pagamento_status',
      pagamentoData:   'pagamento_data',
    };

    Object.entries(fields).forEach(([k, v]) => {
      const col = fieldMap[k] || k;
      mapped[col] = v;
    });

    const { data, error } = await sb
      .from('ordens_servico')
      .update(mapped)
      .eq('num', req.params.num)
      .select()
      .single();
    if (error) throw error;
    res.json(toFrontend(data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /os/:num  — Cancelar OS (soft-delete via status) ──
router.delete('/:num', gestorOnly, async (req, res) => {
  try {
    const { error } = await sb
      .from('ordens_servico')
      .update({ status: 'Cancelada' })
      .eq('num', req.params.num);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Helpers de mapeamento ──
function toFrontend(r) {
  return {
    num:           r.num,
    tipo:          r.tipo,
    desc:          r.desc,
    prest:         r.prest,
    estado:        r.estado,
    cidade:        r.cidade,
    inicio:        r.inicio,
    prazo:         r.prazo,
    conclusao:     r.conclusao,
    crg:           r.crg || '–',
    serie:         r.serie,
    local:         r.local,
    status:        r.status,
    valor:         r.valor || '–',
    obs:           r.obs,
    preenchida:    r.preenchida,
    preenchidaPor: r.preenchida_por,
    preenchidaEm:  r.preenchida_em,
    aprovacao:     r.aprovacao,
    aprovadoPor:   r.aprovado_por,
    aprovadoEm:    r.aprovado_em,
    pagamentoStatus: r.pagamento_status,
    pagamentoData:   r.pagamento_data,
    updatedAt:     r.updated_at,
  };
}

function toDatabase(b) {
  return {
    num:           b.num,
    tipo:          b.tipo,
    desc:          b.desc,
    prest:         b.prest,
    estado:        b.estado,
    cidade:        b.cidade,
    inicio:        b.inicio   || null,
    prazo:         b.prazo    || null,
    conclusao:     b.conclusao|| null,
    crg:           b.crg      || '–',
    serie:         b.serie,
    local:         b.local,
    status:        b.status   || 'Aberta',
    valor:         b.valor    || '–',
    obs:           b.obs,
    preenchida:    b.preenchida      || false,
    preenchida_por:b.preenchidaPor   || null,
    preenchida_em: b.preenchidaEm    || null,
    aprovacao:     b.aprovacao       || null,
    aprovado_por:  b.aprovadoPor     || null,
    aprovado_em:   b.aprovadoEm      || null,
    pagamento_status: b.pagamentoStatus || 'pendente',
    pagamento_data:   b.pagamentoData   || null,
  };
}

module.exports = router;
