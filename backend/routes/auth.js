const router  = require('express').Router()
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const db      = require('../db')
const requireAuth  = require('../middleware/requireAuth')
const requireAdmin = require('../middleware/requireAdmin')

const GPL_USER = 'GPL_SCRAPER'

function signToken(payload) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não configurado no .env')
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' })
}

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password)
      return res.status(400).json({ ok: false, error: 'usuário e senha obrigatórios' })

    if (username.toUpperCase() === GPL_USER) {
      const adminPwd = process.env.GPL_SCRAPER_PASSWORD
      if (!adminPwd) {
        console.error('[auth/login] GPL_SCRAPER_PASSWORD não configurado')
        return res.status(500).json({ ok: false, error: 'Erro de configuração do servidor' })
      }
      if (password !== adminPwd)
        return res.status(401).json({ ok: false, error: 'credenciais inválidas' })
      const token = signToken({ username: GPL_USER, role: 'admin' })
      return res.json({ ok: true, token, username: GPL_USER, role: 'admin' })
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (!user) return res.status(401).json({ ok: false, error: 'credenciais inválidas' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ ok: false, error: 'credenciais inválidas' })

    const role  = user.role ?? 'viewer'
    const token = signToken({ username, role })
    res.json({ ok: true, token, username, role })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

router.post('/auth/register', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password)
      return res.status(400).json({ ok: false, error: 'usuário e senha obrigatórios' })

    if (username.toUpperCase() === GPL_USER)
      return res.status(400).json({ ok: false, error: 'nome de usuário reservado' })

    const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(username)
    if (existing)
      return res.status(409).json({ ok: false, error: 'usuário já existe' })

    const hash = await bcrypt.hash(password, 12)
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, 'viewer')

    const token = signToken({ username, role: 'viewer' })
    res.json({ ok: true, token, username, role: 'viewer' })
  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

// Promover usuário para admin — apenas admins podem fazer isso
router.post('/auth/promote', requireAuth, requireAdmin, (req, res) => {
  try {
    const { username } = req.body
    if (!username) return res.status(400).json({ ok: false, error: 'username obrigatório' })
    if (username.toUpperCase() === GPL_USER)
      return res.status(400).json({ ok: false, error: 'usuário reservado' })
    const user = db.prepare('SELECT username FROM users WHERE username = ?').get(username)
    if (!user) return res.status(404).json({ ok: false, error: 'usuário não encontrado' })
    db.prepare("UPDATE users SET role = 'admin' WHERE username = ?").run(username)
    res.json({ ok: true, message: `${username} promovido a admin` })
  } catch (err) {
    console.error('[auth/promote]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

module.exports = router
