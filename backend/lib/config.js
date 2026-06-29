const path = require('path')

module.exports = {
  ORACLE_LIB_DIR: 'C:\\oracle\\instantclient_21_15',
  TABELAS_JSON:   path.join(__dirname, '..', '..', 'banco', 'tabelas.json'),
  CULTURAS_DB:    path.join(__dirname, '..', '..', 'banco', 'local.db'),
  AGROFIT_DB:     path.join(__dirname, '..', 'agrofit_ids.db'),
}
