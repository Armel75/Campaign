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
  famille?: string | null;
  tauxRotation?: number | null;
}

export interface CatalogBrowseFilters {
  famille?: string;
  searchQuery?: string;
  tauxRotationOperator?: 'GT' | 'LT' | 'EQ';
  tauxRotationValue?: number;
  source: ArticleSource;
}

export interface CatalogBrowseResult {
  codeSageX3: string;
  codeSage100: string | null;
  designation: string | null;
  currentQuantity: number;
  famille: string | null;
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
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 300000,
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(externalDbConfig).connect();
  }

  try {
    return await poolPromise;
  } catch (error) {
    poolPromise = null;
    throw error;
  }
}

function normalizeCode(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
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
  source: ArticleSource,
): Promise<CatalogArticleResult[]> {
  const cleanCodes = Array.from(
    new Set(
      codes
        .map((code) => normalizeCode(code))
        .filter(Boolean),
    ),
  );

  if (cleanCodes.length === 0) {
    return [];
  }

  const pool = await getPool();
  const request = pool.request();

  cleanCodes.forEach((code, index) => {
    request.input(`code${index}`, sql.VarChar(1000), code);
  });

  const inClause = cleanCodes.map((_, index) => `@code${index}`).join(', ');

  const query =
    source === 'SAGE_X3'
      ? `
        SELECT DISTINCT
          CAST(a.CODE AS VARCHAR(100)) AS codeSageX3,
          CAST(a.CODE_SAGE AS VARCHAR(100)) AS codeSage100,
          CAST(a.DESIGNATION AS VARCHAR(255)) AS designation,
          CAST(ISNULL(a.QTE, 0) AS INT) AS currentQuantity,
          CAST(a.FAMILLE AS VARCHAR(100)) AS famille,
          CAST(ISNULL(a.[TAUX ROTATION], 0) AS DECIMAL(18, 2)) AS tauxRotation
        FROM [LISTING ARTICLE SITE STOCK_PRI_DGros] a
        WHERE a.CODE IN (${inClause})
      `
      : `
        SELECT DISTINCT
          CAST(a.CODE AS VARCHAR(100)) AS codeSageX3,
          CAST(a.CODE_SAGE AS VARCHAR(100)) AS codeSage100,
          CAST(a.DESIGNATION AS VARCHAR(255)) AS designation,
          CAST(ISNULL(a.QTE, 0) AS INT) AS currentQuantity,
          CAST(a.FAMILLE AS VARCHAR(100)) AS famille,
          CAST(ISNULL(a.[TAUX ROTATION], 0) AS DECIMAL(18, 2)) AS tauxRotation
        FROM [LISTING ARTICLE SITE STOCK_PRI_DGros] a
        WHERE a.CODE_SAGE IN (${inClause})
      `;

  const result = await request.query(query);
  const rows = result.recordset || [];

  const indexed = new Map<string, any>();

  for (const row of rows) {
    const key =
      source === 'SAGE_X3'
        ? normalizeCode(row.codeSageX3)
        : normalizeCode(row.codeSage100);

    if (key) {
      indexed.set(key, row);
    }
  }

  return cleanCodes.map((inputCode) => {
    const normalizedInputCode = normalizeCode(inputCode);
    const row = indexed.get(normalizedInputCode);

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
      currentQuantity: Number(row.currentQuantity ?? 0),
      famille: row.famille ?? null,
      tauxRotation: row.tauxRotation != null ? Number(row.tauxRotation) : null,
    };
  });
}

export async function browseArticlesInCatalog(
  filters: CatalogBrowseFilters,
): Promise<CatalogBrowseResult[]> {
  const pool = await getPool();
  const request = pool.request();

  const conditions: string[] = [];
  let paramIndex = 0;

  if (filters.famille) {
    const paramName = `famille${paramIndex++}`;
    request.input(paramName, sql.VarChar(100), filters.famille.toUpperCase());
    conditions.push(`a.FAMILLE = @${paramName}`);
  }

  if (filters.searchQuery) {
    const paramName = `search${paramIndex++}`;
    request.input(paramName, sql.VarChar(500), `%${filters.searchQuery.trim().toUpperCase()}%`);
    conditions.push(`a.DESIGNATION LIKE @${paramName}`);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const query = `
    SELECT
      a.CODE AS codeSageX3,
      MAX(a.CODE_SAGE) AS codeSage100,
      MAX(a.DESIGNATION) AS designation,
      CAST(SUM(ISNULL(a.QTE, 0)) AS INT) AS currentQuantity,
      MAX(a.FAMILLE) AS famille
    FROM [LISTING ARTICLE SITE STOCK_PRI_DGros] a
    ${whereClause}
    GROUP BY a.CODE
    ORDER BY a.CODE
  `;

  try {
    const result = await request.query(query);
    const rows = result.recordset || [];

    return rows.map((row: any) => ({
      codeSageX3: row.codeSageX3 ?? null,
      codeSage100: row.codeSage100 ?? null,
      designation: row.designation ?? null,
      currentQuantity: Number(row.currentQuantity ?? 0),
      famille: row.famille ?? null,
    }));
  } catch (error) {
    console.error('Failed to browse articles:', error);
    return [];
  }
}