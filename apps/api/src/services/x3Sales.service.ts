import sql from 'mssql';

type SqlDateInput = Date | string;

export interface ArticleCodeRef {
  articleId: number;
  codeSage100?: string | null;
  codeSageX3?: string | null;
}

export interface QuantityByArticleMap {
  [articleId: number]: number;
}

const X3_DB_CONFIG: sql.config = {
  user: process.env.ARTICLE_DB_USER,
  password: process.env.ARTICLE_DB_PASSWORD,
  server: process.env.ARTICLE_DB_SERVER || '',
  port: Number(process.env.ARTICLE_DB_PORT || 1433),
  database: process.env.ARTICLE_DB_NAME,
  options: {
    encrypt: String(process.env.ARTICLE_DB_ENCRYPT).toLowerCase() === 'true',
    trustServerCertificate:
      String(process.env.ARTICLE_DB_TRUST_SERVER_CERTIFICATE).toLowerCase() === 'true',
    instanceName: process.env.ARTICLE_DB_INSTANCE || undefined,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 60000,
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

async function getX3Pool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(X3_DB_CONFIG).connect();
  }

  try {
    return await poolPromise;
  } catch (error) {
    poolPromise = null;
    throw error;
  }
}

function normalizeCode(value?: string | null): string | null {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || null;
}

function normalizeArticleRefs(articleRefs: ArticleCodeRef[]): ArticleCodeRef[] {
  return articleRefs
    .map((item) => ({
      articleId: item.articleId,
      codeSage100: normalizeCode(item.codeSage100),
      codeSageX3: normalizeCode(item.codeSageX3),
    }))
    .filter((item) => item.codeSage100 || item.codeSageX3);
}

function toJsDate(value: SqlDateInput): Date {
  if (value instanceof Date) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return parsed;
}

function splitIntoChunks<T>(items: T[], chunkSize = 200): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  return chunks;
}

function buildArticleRefsValuesClause(
  request: sql.Request,
  articleRefs: ArticleCodeRef[],
): string {
  return articleRefs
    .map((article, index) => {
      const articleIdParam = `articleId${index}`;
      const sage100Param = `sage100${index}`;
      const x3Param = `x3${index}`;

      request.input(articleIdParam, sql.Int, article.articleId);
      request.input(sage100Param, sql.VarChar(1000), article.codeSage100 ?? null);
      request.input(x3Param, sql.VarChar(1000), article.codeSageX3 ?? null);

      return `(@${articleIdParam}, @${sage100Param}, @${x3Param})`;
    })
    .join(', ');
}

function createEmptyResultMap(articleRefs: ArticleCodeRef[]): QuantityByArticleMap {
  const map: QuantityByArticleMap = {};
  for (const item of articleRefs) {
    map[item.articleId] = 0;
  }
  return map;
}

/**
 * Calcule une quantité par article en matchant chaque article
 * avec ses 2 codes potentiels :
 * - Sage100
 * - X3
 *
 * Une ligne source n'est comptée qu'une seule fois par article,
 * même si les 2 codes matchent en même temps.
 */
async function queryQuantityByArticle(params: {
  tableName: string;
  quantityColumn: string;
  articleRefs: ArticleCodeRef[];
  sourceSage100Column: string;
  sourceX3Column: string;
  dateColumn?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<QuantityByArticleMap> {
  const {
    tableName,
    quantityColumn,
    articleRefs,
    sourceSage100Column,
    sourceX3Column,
    dateColumn,
    startDate,
    endDate,
  } = params;

  const normalizedArticleRefs = normalizeArticleRefs(articleRefs);

  if (normalizedArticleRefs.length === 0) {
    return {};
  }

  const pool = await getX3Pool();
  const resultMap = createEmptyResultMap(normalizedArticleRefs);
  const chunks = splitIntoChunks(normalizedArticleRefs, 200);

  for (const chunk of chunks) {
    const request = pool.request();
    const valuesClause = buildArticleRefsValuesClause(request, chunk);

    let dateFilter = '';
    if (dateColumn && startDate && endDate) {
      request.input('startDate', sql.DateTime2, startDate);
      request.input('endDate', sql.DateTime2, endDate);

      dateFilter = `
        AND CAST(src.${dateColumn} AS DATE) >= CAST(@startDate AS DATE)
        AND CAST(src.${dateColumn} AS DATE) <= CAST(@endDate AS DATE)
      `;
    }

    const query = `
      WITH article_refs (articleId, codeSage100, codeSageX3) AS (
        SELECT *
        FROM (VALUES
          ${valuesClause}
        ) AS v(articleId, codeSage100, codeSageX3)
      )
      SELECT
        ar.articleId,
        SUM(CAST(ISNULL(src.${quantityColumn}, 0) AS DECIMAL(18, 4))) AS totalQuantity
      FROM article_refs ar
      LEFT JOIN ${tableName} src
        ON (
          (ar.codeSage100 IS NOT NULL
            AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.${sourceSage100Column}, '') AS VARCHAR(1000))))) = ar.codeSage100)
          OR
          (ar.codeSageX3 IS NOT NULL
            AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.${sourceX3Column}, '') AS VARCHAR(1000))))) = ar.codeSageX3)
        )
        ${dateFilter}
      GROUP BY ar.articleId
    `;

    const response = await request.query(query);

    for (const row of response.recordset) {
      const articleId = Number(row.articleId);
      const totalQuantity = Number(row.totalQuantity ?? 0);

      if (Number.isInteger(articleId)) {
        resultMap[articleId] = totalQuantity;
      }
    }
  }

  return resultMap;
}

/**
 * Ventes pendant la période de campagne.
 * Source :
 * - CODE_SAGE_100
 * - REFERENCE
 */
export async function getSoldQuantitiesByArticle(
  articleRefs: ArticleCodeRef[],
  startDate: SqlDateInput,
  endDate: SqlDateInput,
): Promise<QuantityByArticleMap> {
  const start = toJsDate(startDate);
  const end = toJsDate(endDate);

  if (start > end) {
    throw new Error('startDate must be before or equal to endDate');
  }

  return queryQuantityByArticle({
    tableName: 'dbo.VENTE_VENDEUR_CLIENT',
    quantityColumn: '[QUANTITE]',
    articleRefs,
    sourceSage100Column: '[CODE SAGE_100]',
    sourceX3Column: '[REFERENCE]',
    dateColumn: '[DATE_FACTURE]',
    startDate: start,
    endDate: end,
  });
}

/**
 * Stock global actuel de l'article.
 * Somme sur tous les sites.
 * Source :
 * - CODE_SAGE
 * - CODE
 */
export async function getCurrentStockByArticle(
  articleRefs: ArticleCodeRef[],
): Promise<QuantityByArticleMap> {
  return queryQuantityByArticle({
    tableName: '[LISTING ARTICLE SITE STOCK_PRI_DGros]',
    quantityColumn: '[QTE]',
    articleRefs,
    sourceSage100Column: '[CODE_SAGE]',
    sourceX3Column: '[CODE]',
  });
}

/**
 * Montant total des ventes (CA) par article pendant la période de campagne.
 * Source :
 * - CODE_SAGE_100
 * - REFERENCE
 */
export async function getSalesAmountByArticle(
  articleRefs: ArticleCodeRef[],
  startDate: SqlDateInput,
  endDate: SqlDateInput,
): Promise<QuantityByArticleMap> {
  const start = toJsDate(startDate);
  const end = toJsDate(endDate);

  if (start > end) {
    throw new Error('startDate must be before or equal to endDate');
  }

  return queryQuantityByArticle({
    tableName: 'dbo.VENTE_VENDEUR_CLIENT',
    quantityColumn: '[CA]',
    articleRefs,
    sourceSage100Column: '[CODE SAGE_100]',
    sourceX3Column: '[REFERENCE]',
    dateColumn: '[DATE_FACTURE]',
    startDate: start,
    endDate: end,
  });
}

/**
 * Prix unitaire (CA) par article depuis la vue VENTE_VENDEUR_CLIENT.
 * Retourne le dernier prix unitaire connu pour chaque article.
 */
export async function getUnitPriceByArticle(
  articleRefs: ArticleCodeRef[],
): Promise<QuantityByArticleMap> {
  const normalizedArticleRefs = normalizeArticleRefs(articleRefs);

  if (normalizedArticleRefs.length === 0) {
    return {};
  }

  const pool = await getX3Pool();
  const resultMap = createEmptyResultMap(normalizedArticleRefs);
  const chunks = splitIntoChunks(normalizedArticleRefs, 200);

  for (const chunk of chunks) {
    const request = pool.request();
    const valuesClause = buildArticleRefsValuesClause(request, chunk);

    const query = `
      WITH article_refs (articleId, codeSage100, codeSageX3) AS (
        SELECT *
        FROM (VALUES
          ${valuesClause}
        ) AS v(articleId, codeSage100, codeSageX3)
      ),
      ranked_prices AS (
        SELECT
          ar.articleId,
          CAST(ISNULL(src.[CA], 0) AS DECIMAL(18, 4)) AS unitPrice,
          ROW_NUMBER() OVER (
            PARTITION BY ar.articleId
            ORDER BY src.[DATE_FACTURE] DESC
          ) AS rn
        FROM article_refs ar
        LEFT JOIN dbo.VENTE_VENDEUR_CLIENT src
          ON (
            (ar.codeSage100 IS NOT NULL
              AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.[CODE SAGE_100], '') AS VARCHAR(1000))))) = ar.codeSage100)
            OR
            (ar.codeSageX3 IS NOT NULL
              AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.[REFERENCE], '') AS VARCHAR(1000))))) = ar.codeSageX3)
          )
          AND ISNULL(src.[CA], 0) > 0
      )
      SELECT articleId, unitPrice
      FROM ranked_prices
      WHERE rn = 1
    `;

    const response = await request.query(query);

    for (const row of response.recordset) {
      const articleId = Number(row.articleId);
      const unitPrice = Number(row.unitPrice ?? 0);

      if (Number.isInteger(articleId)) {
        resultMap[articleId] = unitPrice;
      }
    }
  }

  return resultMap;
}

/**
 * Nombre de clients distincts ayant acheté les articles de la campagne.
 * COUNT(DISTINCT CLIENT) sur VENTE_VENDEUR_CLIENT,
 * sans double-compte si un même client achète plusieurs articles.
 */
export async function getDistinctClientCountByArticle(
  articleRefs: ArticleCodeRef[],
  startDate: SqlDateInput,
  endDate: SqlDateInput,
): Promise<number> {
  const normalizedArticleRefs = normalizeArticleRefs(articleRefs);

  if (normalizedArticleRefs.length === 0) {
    return 0;
  }

  const pool = await getX3Pool();
  const chunks = splitIntoChunks(normalizedArticleRefs, 200);

  // Utiliser un Set pour garantir des clients distincts sur tous les articles
  const allClients = new Set<string>();

  for (const chunk of chunks) {
    const request = pool.request();
    const valuesClause = buildArticleRefsValuesClause(request, chunk);

    const start = toJsDate(startDate);
    const end = toJsDate(endDate);

    request.input('startDate', sql.DateTime2, start);
    request.input('endDate', sql.DateTime2, end);

    const query = `
      WITH article_refs (articleId, codeSage100, codeSageX3) AS (
        SELECT *
        FROM (VALUES
          ${valuesClause}
        ) AS v(articleId, codeSage100, codeSageX3)
      )
      SELECT DISTINCT src.[CLIENT] AS clientCode
      FROM article_refs ar
      INNER JOIN dbo.VENTE_VENDEUR_CLIENT src
        ON (
          (ar.codeSage100 IS NOT NULL
            AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.[CODE SAGE_100], '') AS VARCHAR(1000))))) = ar.codeSage100)
          OR
          (ar.codeSageX3 IS NOT NULL
            AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.[REFERENCE], '') AS VARCHAR(1000))))) = ar.codeSageX3)
        )
        AND CAST(src.[DATE_FACTURE] AS DATE) >= CAST(@startDate AS DATE)
        AND CAST(src.[DATE_FACTURE] AS DATE) <= CAST(@endDate AS DATE)
      WHERE src.[CLIENT] IS NOT NULL
    `;

    const response = await request.query(query);

    for (const row of response.recordset) {
      allClients.add(String(row.clientCode).trim());
    }
  }

  return allClients.size;
}

export async function closeX3Connection(): Promise<void> {
  if (!poolPromise) return;

  const pool = await poolPromise;
  await pool.close();
  poolPromise = null;
}