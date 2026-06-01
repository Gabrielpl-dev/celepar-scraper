const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, 'agrofit_ids.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS agrofit_ids (
    ma        TEXT PRIMARY KEY,
    id        TEXT NOT NULL,
    nome      TEXT,
    atualizado TEXT DEFAULT (datetime('now','localtime'))
  )
`);

// Migração: se a tabela ainda tem 'nome' como PK (schema antigo), converte
const cols = db.prepare("PRAGMA table_info(agrofit_ids)").all();
const nomePK = cols.find(c => c.name === 'nome' && c.pk === 1);
if (nomePK) {
  db.exec(`
    CREATE TABLE agrofit_ids_new (
      ma        TEXT PRIMARY KEY,
      id        TEXT NOT NULL,
      nome      TEXT,
      atualizado TEXT DEFAULT (datetime('now','localtime'))
    );
    INSERT INTO agrofit_ids_new (ma, id, atualizado)
      SELECT nome, id, atualizado FROM agrofit_ids;
    DROP TABLE agrofit_ids;
    ALTER TABLE agrofit_ids_new RENAME TO agrofit_ids;
  `);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username      TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'viewer',
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  )
`);

// Migração: adiciona coluna role se ainda não existir
const userCols = db.prepare('PRAGMA table_info(users)').all();
if (!userCols.find(c => c.name === 'role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'");
}

module.exports = db;
