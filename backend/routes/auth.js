const router  = require('express').Router()
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const db      = require('../db')

const GPL_USER = 'GPL_SCRAPER'

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ ok: false, error: 'usuário e senha obrigatórios' })

  if (username.toUpperCase() === GPL_USER) {
    if (password !== process.env.ORACLE_PASSWORD)
      return res.status(401).json({ ok: false, error: 'credenciais inválidas' })
    const token = jwt.sign({ username: GPL_USER, role: 'oracle' }, process.env.JWT_SECRET, { expiresIn: '24h' })
    return res.json({ ok: true, token, username: GPL_USER, role: 'oracle' })
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user) return res.status(401).json({ ok: false, error: 'credenciais inválidas' })

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) return res.status(401).json({ ok: false, error: 'credenciais inválidas' })

  const token = jwt.sign({ username, role: 'local' }, process.env.JWT_SECRET, { expiresIn: '24h' })
  res.json({ ok: true, token, username, role: 'local' })
})

router.post('/auth/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ ok: false, error: 'usuário e senha obrigatórios' })

  if (username.toUpperCase() === GPL_USER)
    return res.status(400).json({ ok: false, error: 'nome de usuário reservado' })

  const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(username)
  if (existing)
    return res.status(409).json({ ok: false, error: 'usuário já existe' })

  const hash = await bcrypt.hash(password, 12)
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash)

  const token = jwt.sign({ username, role: 'local' }, process.env.JWT_SECRET, { expiresIn: '24h' })
  res.json({ ok: true, token, username, role: 'local' })
})

module.exports = router
