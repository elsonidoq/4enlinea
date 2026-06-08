const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'elsonidoq@gmail.com')
  .split(',').map(e => e.trim());

export function requireAdmin(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  if (!req.user || !ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
