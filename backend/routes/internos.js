const express      = require('express')
const Database     = require('better-sqlite3')
const path         = require('path')
const requireAdmin = require('../middleware/requireAdmin')

const router = express.Router()

const DBS = [
  {
    name:   'agrofit_ids.db',
    label:  'Agrofit + Usuários',
    path:   path.join(__dirname, '..', 'agrofit_ids.db'),
    tables: [
      { name: 'agrofit_ids', hideCols: [] },
      { name: 'users',       hideCols: ['password_hash'] },
    ],
  },
  {
    name:   'local.db',
    label:  'Culturas (mapeamento Celepar)',
    path:   path.join(__dirname, '..', '..', 'banco', 'local.db'),
    tables: [
      { name: 'culturas', hideCols: [] },
    ],
  },
]

router.get('/internos', requireAdmin, (req, res) => {
  try {
    const databases = DBS.map(({ name, label, path: dbPath, tables }) => {
      const db = new Database(dbPath, { readonly: true })
      const data = tables.map(({ name: tbl, hideCols }) => {
        const allCols = db.prepare(`PRAGMA table_info(${tbl})`).all().map(c => c.name)
        const cols    = allCols.filter(c => !hideCols.includes(c))
        const rows    = db.prepare(`SELECT ${cols.join(', ')} FROM ${tbl}`).all()
        return { name: tbl, cols, rows }
      })
      db.close()
      return { name, label, tables: data }
    })
    res.json({ ok: true, databases })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
