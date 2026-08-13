import prisma from '../infrastructure/prisma/client';
import {
  ArticleCodeRef,
  getSoldQuantitiesByArticle,
  getCurrentStockByArticle,
} from './x3Sales.service';

interface SyncCampaignStockResult {
  campaignId: number;
  totalArticles: number;
  updatedArticles: number;
  skippedArticles: number;
  message: string;
}

function normalizeCode(value?: string | null): string | null {
  const v = String(value || '').trim().toUpperCase();
  return v || null;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

function toSafeInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function getEffectiveEndDate(endDate: Date): Date {
  const now = new Date();
  return endDate > now ? now : endDate;
}

function buildArticleRefs(
  articles: Array<{
    id: number;
    codeSageX3?: string | null;
    codeSage100?: string | null;
  }>,
): ArticleCodeRef[] {
  return articles
    .map((article) => ({
      articleId: article.id,
      codeSage100: normalizeCode(article.codeSage100),
      codeSageX3: normalizeCode(article.codeSageX3),
    }))
    .filter((article) => article.codeSage100 || article.codeSageX3);
}

/**
 * Synchronise une campagne :
 * - soldQuantity = ventes pendant la période de campagne
 * - currentQuantity = stock global réel actuel (somme de tous les sites)
 */
export async function syncCampaignStock(
  campaignId: number,
): Promise<SyncCampaignStockResult> {
  const startedAt = new Date();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  const syncLog = await prisma.campaignStockSyncLog.create({
    data: {
      campaignId: campaign.id,
      status: 'RUNNING',
      startedAt,
      message: `Synchronisation démarrée pour la campagne "${campaign.name}"`,
    },
  });

  try {
    const articles = await prisma.article.findMany({
      where: {
        campaignId: campaign.id,
      },
      select: {
        id: true,
        campaignId: true,
        codeSageX3: true,
        codeSage100: true,
        designation: true,
        plannedQuantity: true,
        quantityAtCreation: true,
        quantityAtStart: true,
        currentQuantity: true,
        quantityAtClosure: true,
        soldQuantity: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (articles.length === 0) {
      const finishedAt = new Date();
      const message = `Aucun article trouvé pour la campagne "${campaign.name}"`;

      await prisma.campaignStockSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          finishedAt,
          message,
        },
      });

      return {
        campaignId: campaign.id,
        totalArticles: 0,
        updatedArticles: 0,
        skippedArticles: 0,
        message,
      };
    }

    const articleRefs = buildArticleRefs(articles);
    const effectiveEndDate = getEffectiveEndDate(campaign.endDate);

    const soldQuantitiesByArticleId = await getSoldQuantitiesByArticle(
      articleRefs,
      campaign.startDate,
      effectiveEndDate,
    );

    const currentStocksByArticleId = await getCurrentStockByArticle(articleRefs);

    let updatedArticles = 0;
    let skippedArticles = 0;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const article of articles) {
        const hasCode =
          normalizeCode(article.codeSage100) || normalizeCode(article.codeSageX3);

        if (!hasCode) {
          skippedArticles += 1;
          continue;
        }

        const soldQuantity = toSafeInt(soldQuantitiesByArticleId[article.id], 0);
        const currentQuantity = toSafeInt(currentStocksByArticleId[article.id], 0);

        await tx.article.update({
          where: { id: article.id },
          data: {
            soldQuantity,
            currentQuantity,
            lastSyncAt: now,
          },
        });

        updatedArticles += 1;
      }
    });

    const finishedAt = new Date();
    const message = `Synchronisation terminée pour la campagne "${campaign.name}" : ${updatedArticles} article(s) mis à jour, ${skippedArticles} ignoré(s).`;

    await prisma.campaignStockSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'SUCCESS',
        finishedAt,
        message,
      },
    });

    return {
      campaignId: campaign.id,
      totalArticles: articles.length,
      updatedArticles,
      skippedArticles,
      message,
    };
  } catch (error) {
    const finishedAt = new Date();
    const message = `Échec de synchronisation pour la campagne "${campaign.name}" : ${toErrorMessage(error)}`;

    await prisma.campaignStockSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'FAILED',
        finishedAt,
        message,
      },
    });

    throw error;
  }
}

/**
 * Synchronise toutes les campagnes actives.
 */
export async function syncAllActiveCampaignStocks(): Promise<{
  totalCampaigns: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    campaignId: number;
    success: boolean;
    message: string;
  }>;
}> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const results: Array<{
    campaignId: number;
    success: boolean;
    message: string;
  }> = [];

  let successCount = 0;
  let failedCount = 0;

  for (const campaign of campaigns) {
    try {
      const result = await syncCampaignStock(campaign.id);

      results.push({
        campaignId: campaign.id,
        success: true,
        message: result.message,
      });

      successCount += 1;
    } catch (error) {
      results.push({
        campaignId: campaign.id,
        success: false,
        message: `Campaign ${campaign.id} failed: ${toErrorMessage(error)}`,
      });

      failedCount += 1;
    }
  }

  return {
    totalCampaigns: campaigns.length,
    successCount,
    failedCount,
    results,
  };
}

/**
 * Synchronise une liste précise de campagnes.
 */
export async function syncCampaignStocksByIds(
  campaignIds: number[],
): Promise<{
  totalCampaigns: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    campaignId: number;
    success: boolean;
    message: string;
  }>;
}> {
  const uniqueIds = [...new Set(campaignIds)].filter(
    (id) => Number.isInteger(id) && id > 0,
  );

  const results: Array<{
    campaignId: number;
    success: boolean;
    message: string;
  }> = [];

  let successCount = 0;
  let failedCount = 0;

  for (const campaignId of uniqueIds) {
    try {
      const result = await syncCampaignStock(campaignId);

      results.push({
        campaignId,
        success: true,
        message: result.message,
      });

      successCount += 1;
    } catch (error) {
      results.push({
        campaignId,
        success: false,
        message: `Campaign ${campaignId} failed: ${toErrorMessage(error)}`,
      });

      failedCount += 1;
    }
  }

  return {
    totalCampaigns: uniqueIds.length,
    successCount,
    failedCount,
    results,
  };
}