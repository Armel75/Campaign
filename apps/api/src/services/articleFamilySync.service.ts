import prisma from "../infrastructure/prisma/client";
import sql from "mssql";

const X3_DB_CONFIG: sql.config = {
  user: process.env.ARTICLE_DB_USER,
  password: process.env.ARTICLE_DB_PASSWORD,
  server: process.env.ARTICLE_DB_SERVER || "",
  port: Number(process.env.ARTICLE_DB_PORT || 1433),
  database: process.env.ARTICLE_DB_NAME,
  options: {
    encrypt: String(process.env.ARTICLE_DB_ENCRYPT).toLowerCase() === "true",
    trustServerCertificate:
      String(process.env.ARTICLE_DB_TRUST_SERVER_CERTIFICATE).toLowerCase() === "true",
    instanceName: process.env.ARTICLE_DB_INSTANCE || undefined,
    enableArithAbort: true,
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 0, // Pas de timeout pour le CRON (la requête peut prendre plusieurs minutes)
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
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

export class ArticleFamilySyncService {
  /**
   * Synchronise les familles depuis la vue X3 LISTING ARTICLE SITE STOCK
   * vers la table locale article_families dans CampagneDB.
   */
  async syncFamiliesToLocalDb(): Promise<{
    success: boolean;
    synced: number;
    message: string;
  }> {
    try {
      const pool = await getPool();
      const request = pool.request();

      console.log("[FAMILY SYNC] Début de la synchronisation des familles depuis X3...");

      const result = await request.query(`
        SELECT DISTINCT a.FAMILLE AS famille
        FROM [LISTING ARTICLE SITE STOCK_PRI_DGros] a
        WHERE a.FAMILLE IS NOT NULL
          AND a.FAMILLE != ''
        ORDER BY a.FAMILLE
      `);

      const rows = result.recordset || [];
      const families = rows
        .map((row: any) => String(row.famille).trim())
        .filter(Boolean);

      console.log(`[FAMILY SYNC] ${families.length} familles trouvées dans X3`);

      if (families.length === 0) {
        return {
          success: true,
          synced: 0,
          message: "Aucune famille trouvée dans X3",
        };
      }

      // Insère uniquement les nouvelles familles (celles déjà présentes sont ignorées)
      let insertedCount = 0;

      for (const name of families) {
        const existing = await prisma.articleFamily.findUnique({
          where: { name },
          select: { id: true },
        });

        if (!existing) {
          await prisma.articleFamily.create({
            data: { name },
          });
          insertedCount++;
        }
      }

      if (insertedCount > 0) {
        console.log(`[FAMILY SYNC] ${insertedCount} nouvelle(s) famille(s) insérée(s)`);
      }

      console.log(`[FAMILY SYNC] ${families.length} familles synchronisées avec succès`);

      return {
        success: true,
        synced: insertedCount,
        message: `${families.length} famille(s) trouvée(s) dans X3, ${insertedCount} nouvelle(s) insérée(s) en local`,
      };
    } catch (error: any) {
      const message = error?.message || "Erreur inconnue";
      console.error("[FAMILY SYNC] Échec de la synchronisation:", message);

      return {
        success: false,
        synced: 0,
        message: `Échec de la synchronisation: ${message}`,
      };
    }
  }

  /**
   * Recherche des familles dans la table locale.
   */
  async searchFamilies(query: string): Promise<string[]> {
    const search = String(query || "").trim();

    try {
      const prismaAny = prisma as any;
      const where = search.length >= 2
        ? { name: { contains: search } }
        : {};

      const rows = await prismaAny.articleFamily.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
        select: {
          name: true,
        },
      });

      return rows.map((row: any) => row.name);
    } catch (error) {
      console.error("[FAMILY SYNC] Erreur de recherche locale:", error);
      return [];
    }
  }
}
