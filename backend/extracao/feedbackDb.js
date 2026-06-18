const db = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS extracao_feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pdf_nome    TEXT    NOT NULL,
    campo       TEXT    NOT NULL,
    pagina_correta INTEGER NOT NULL,
    texto_pagina   TEXT,
    criado_em   TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS extracao_keywords (
    campo   TEXT NOT NULL,
    keyword TEXT NOT NULL,
    fonte   TEXT DEFAULT 'auto',
    PRIMARY KEY (campo, keyword)
  );
`);

function salvarFeedback(pdfNome, campo, paginaCorreta, textoPagina = null) {
  return db.prepare(
    `INSERT INTO extracao_feedback (pdf_nome, campo, pagina_correta, texto_pagina)
     VALUES (?, ?, ?, ?)`
  ).run(pdfNome, campo, paginaCorreta, textoPagina);
}

function buscarFeedbackPorCampo(campo) {
  return db.prepare(
    `SELECT * FROM extracao_feedback WHERE campo = ? AND texto_pagina IS NOT NULL`
  ).all(campo);
}

function camposComFeedback() {
  return db.prepare(
    `SELECT DISTINCT campo FROM extracao_feedback WHERE texto_pagina IS NOT NULL`
  ).all().map(r => r.campo);
}

function salvarKeyword(campo, keyword, fonte = 'auto') {
  db.prepare(
    `INSERT OR IGNORE INTO extracao_keywords (campo, keyword, fonte) VALUES (?, ?, ?)`
  ).run(campo, keyword.toLowerCase().trim(), fonte);
}

function removerKeyword(campo, keyword) {
  db.prepare(`DELETE FROM extracao_keywords WHERE campo = ? AND keyword = ?`).run(campo, keyword);
}

function getKeywordsDinamicas() {
  const rows = db.prepare(`SELECT campo, keyword FROM extracao_keywords`).all();
  const result = {};
  for (const { campo, keyword } of rows) {
    (result[campo] ??= []).push(keyword);
  }
  return result;
}

module.exports = { salvarFeedback, buscarFeedbackPorCampo, camposComFeedback, salvarKeyword, removerKeyword, getKeywordsDinamicas };
