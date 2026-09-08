/* Script temporaire : inspecte la structure réelle de la table leads en base. */
const sql = require('mssql');

const config = {
  server: 'DLADIR2017',
  port: 51269,
  database: 'CampagneDB',
  user: 'sa',
  password: 'dir@SIEX!1989',
  options: { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 10000,
  requestTimeout: 10000,
};

async function main() {
  const pool = await sql.connect(config);
  const cols = await pool
    .request()
    .query(
      "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'leads' ORDER BY ORDINAL_POSITION"
    );
  console.log('=== Colonnes de la table leads ===');
  console.log(cols.recordset.map((c) => `${c.COLUMN_NAME} (${c.DATA_TYPE}, null=${c.IS_NULLABLE})`).join('\n'));

  const sample = await pool.request().query('SELECT TOP 3 * FROM leads ORDER BY id DESC');
  console.log('\n=== Échantillon (3 dernières lignes) ===');
  console.log(JSON.stringify(sample.recordset, null, 2));
  await pool.close();
}

main().catch((e) => {
  console.error('ERREUR :', e.message);
  process.exit(1);
});
