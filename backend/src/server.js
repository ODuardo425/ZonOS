require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes         = require('./routes/auth');
const osRoutes           = require('./routes/os');
const preenchRoutes      = require('./routes/preenchimentos');
const usuariosRoutes     = require('./routes/usuarios');
const prestadoresRoutes  = require('./routes/prestadores');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Permite requisições sem origin (mobile, curl, Postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

// ── Healthcheck ──
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Rotas ──
app.use('/auth',        authRoutes);
app.use('/os',          osRoutes);
app.use('/preenchimentos', preenchRoutes);
app.use('/usuarios',    usuariosRoutes);
app.use('/prestadores', prestadoresRoutes);

// ── 404 ──
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// ── Erros globais ──
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno' });
});

app.listen(PORT, () => {
  console.log(`ZonCharge OS backend rodando na porta ${PORT}`);
});
