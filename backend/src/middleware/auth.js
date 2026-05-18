const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Requer perfil gestor ou financeiro
function gestorOnly(req, res, next) {
  if (req.user?.perfil === 'gestor' || req.user?.perfil === 'financeiro') return next();
  res.status(403).json({ error: 'Acesso negado' });
}

module.exports = { auth, gestorOnly };
