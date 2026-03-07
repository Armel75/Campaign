import sql from 'mssql';

export type ArticleSource = 'SAGE_X3' | 'SAGE_100';

export interface CatalogArticleResult {
  inputCode: string;
  source: ArticleSource;
  found: boolean;
  message?: string;
  codeSageX3?: string | null;
  codeSage100?: string | null;
  designation?: string | null;
  currentQuantity?: number | null;
}

const externalDbConfig: sql.config = {
  user: process.env.ARTICLE_DB_USER,
  password: process.env.ARTICLE_DB_PASSWORD,
  server: process.env.ARTICLE_DB_SERVER || '',
  database: process.env.ARTICLE_DB_NAME,
  port: process.env.ARTICLE_DB_PORT ? Number(process.env.ARTICLE_DB_PORT) : 1433,
  options: {
    encrypt: process.env.ARTICLE_DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.ARTICLE_DB_TRUST_SERVER_CERTIFICATE === 'true',
    instanceName: process.env.ARTICLE_DB_INSTANCE,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(externalDbConfig).connect();
  }
  return poolPromise;
}

export async function testArticleCatalogConnection(): Promise<boolean> {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    return true;
  } catch (error) {
    console.error('Sage X3 connection failed:', error);
    return false;
  }
}

export async function searchArticlesInCatalog(
  codes: string[],
  source: ArticleSource
): Promise<CatalogArticleResult[]> {
  const cleanCodes = Array.from(
    new Set(codes.map((code) => code.trim()).filter(Boolean))
  );

  if (cleanCodes.length === 0) {
    return [];
  }

  const pool = await getPool();
  const request = pool.request();

  cleanCodes.forEach((code, index) => {
    request.input(`code${index}`, sql.VarChar, code);
  });

  const inClause = cleanCodes.map((_, index) => `@code${index}`).join(', ');

  /**
   * IMPORTANT
   * Ici tu dois adapter les noms de table et de colonnes
   * avec les vrais noms de ta base Sage X3 / édition pilotée.
   *
   * Pour l’instant je mets des noms génériques.
   */

  const query =
    source === 'SAGE_X3'
      ? `
        SELECT
          CAST(a.CODE AS VARCHAR(100)) AS codeSageX3,
          CAST(a.CODE_SAGE AS VARCHAR(100)) AS codeSage100,
          CAST(a.DESIGNATION AS VARCHAR(255)) AS designation,
          CAST(ISNULL(a.QTE, 0) AS INT) AS currentQuantity
        FROM [LISTING ARTICLE SITE STOCK_PRI_DGros] a
        WHERE a.CODE IN (${inClause})
      `
      : `
        SELECT
          CAST(a.CODE AS VARCHAR(100)) AS codeSageX3,
          CAST(a.CODE_SAGE AS VARCHAR(100)) AS codeSage100,
          CAST(a.DESIGNATION AS VARCHAR(255)) AS designation,
          CAST(ISNULL(a.QTE, 0) AS INT) AS currentQuantity
        FROM [LISTING ARTICLE SITE STOCK_PRI_DGros] a
        WHERE a.CODE_SAGE IN (${inClause})
      `;

  const result = await request.query(query);
  const rows = result.recordset || [];

  const indexed = new Map<string, any>();

  for (const row of rows) {
    const key =
      source === 'SAGE_X3'
        ? String(row.codeSageX3 || '').trim()
        : String(row.codeSage100 || '').trim();

    if (key) {
      indexed.set(key, row);
    }
  }

  return cleanCodes.map((inputCode) => {
    const row = indexed.get(inputCode);

    if (!row) {
      return {
        inputCode,
        source,
        found: false,
        message: 'Article introuvable',
      };
    }

    return {
      inputCode,
      source,
      found: true,
      codeSageX3: row.codeSageX3 ?? null,
      codeSage100: row.codeSage100 ?? null,
      designation: row.designation ?? null,
      currentQuantity: row.currentQuantity ?? 0,
    };
  });
}