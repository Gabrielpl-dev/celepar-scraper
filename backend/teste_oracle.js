require('dotenv').config()
const oracledb = require('oracledb')

oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_21_15' })

async function main() {
  let conn
  try {
    conn = await oracledb.getConnection({
      user:          process.env.ORACLE_USER,
      password:      process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    })
    console.log('Conectado!')

    await conn.execute("ALTER SESSION SET CURRENT_SCHEMA = VIASOFT")
    const result = await conn.execute(`
      SELECT c.nome, d.siagroalv
      FROM cultura c
      JOIN receitapadrao r ON r.culturaid = c.culturaid
      JOIN diagnostico d ON d.diagnosticoid = r.diagnosticoid
      WHERE rownum <= 5
    `)
    console.log('Colunas:', result.metaData.map(m => m.name))
    for (const row of result.rows) console.log(row)
  } catch (err) {
    console.error('Erro:', err.message)
  } finally {
    if (conn) await conn.close()
  }
}

main()
