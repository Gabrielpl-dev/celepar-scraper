const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, 'agrofit_ids.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS agrofit_ids (
    nome      TEXT PRIMARY KEY,
    id        TEXT NOT NULL,
    atualizado TEXT DEFAULT (datetime('now','localtime'))
  )
`);

module.exports = db;
