export function requireAdmin(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  const emails = (process.env.ADMIN_EMAILS || 'elsonidoq@gmail.com')
    .split(',').map(e => e.trim());
  if (!req.user || !emails.includes(req.user.email)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
