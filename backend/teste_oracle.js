const oracledb = require('oracledb')

async function main() {
  let conn
  try {
    conn = await oracledb.getConnection({
      user: 'gpl_scraper',
      password: 'Gabriel@0112!L',
      connectString: 'reag.vms.com.br:1521/reag',
    })
    console.log('Conectado!')

    const result = await conn.execute(`
      SELECT c.nome, d.siagroalv
      FROM viasoft.cultura c
      JOIN viasoft.receitapadrao r ON r.culturaid = c.culturaid
      JOIN viasoft.diagnostico d ON d.diagnosticoid = r.diagnosticoid
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
