module.exports = function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ ok: false, error: 'acesso restrito a administradores' })
  next()
}
