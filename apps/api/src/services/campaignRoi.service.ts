import prisma from '../infrastructure/prisma/client';
import { getSalesAmountByArticle, ArticleCodeRef } from './x3Sales.service';
import { mapLimit } from '../infrastructure/utils/async';
import {
  TtlCache,
  DASHBOARD_CACHE_TTL_MS,
} from '../infrastructure/cache/ttlCache';

export type CampaignRoiStatus =
  | 'CALCULATED'
  | 'ZERO_COST_ZERO_REVENUE'
  | 'NON_CALCULABLE_ZERO_COST';

export type CampaignRoiSummary = {
  campaignId: number;
  budgetPlanId: number | null;
  currency: string;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  roiPercent: number | null;
  roiStatus: CampaignRoiStatus;
  confirmedSalesCount: number;
};

export type CampaignRoiDashboardItem = {
  campaignId: number;
  name: string;
  status?: string;
  currency: string;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  roiPercent: number | null;
  roiStatus: CampaignRoiStatus;
  confirmedSalesCount: number;
};

export type CampaignRoiDashboardSummary = {
  currency: string;
  campaignCount: number;
  totalConfirmedRevenue: number;
  totalRealCost: number;
  totalNetProfit: number;
  globalRoiPercent: number | null;
  globalRoiStatus: CampaignRoiStatus;
  totalConfirmedSalesCount: number;
  calculableCampaignCount: number;
  negativeRoiCampaignCount: number;
  nonCalculableRoiCampaignCount: number;
  topCampaignsByRoi: CampaignRoiDashboardItem[];
  negativeRoiCampaigns: CampaignRoiDashboardItem[];
  nonCalculableRoiCampaigns: CampaignRoiDashboardItem[];
};

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const num = Number(value);

  if (Number.isNaN(num)) {
    return 0;
  }

  return num;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getCampaignRoiSummary(
  campaignId: number
): Promise<CampaignRoiSummary> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      budgetPlanId: true,
      totalBudget: true,
      startDate: true,
      endDate: true,
      budgetPlan: {
        select: { currency: true },
      },
      articles: {
        select: { id: true, codeSageX3: true, codeSage100: true },
      },
    },
  });

  if (!campaign) {
    throw new Error('Campagne introuvable');
  }

  // Le coût total de la campagne = totalBudget saisi directement sur la campagne
  const totalCost = campaign.totalBudget !== null
    ? decimalToNumber(campaign.totalBudget)
    : 0;

  const confirmedSalesAggregate = await prisma.conversion.aggregate({
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
    where: {
      campaignId,
      status: 'CONFIRMED',
      type: 'SALE',
      amount: {
        not: null,
      },
    },
  });

  let totalRevenue = decimalToNumber(confirmedSalesAggregate._sum.amount);
  let confirmedSalesCount = confirmedSalesAggregate._count.id ?? 0;

  // Ajout des ventes réelles depuis Sage X3
  if (campaign.startDate && campaign.endDate) {
    const articleRefs: ArticleCodeRef[] = campaign.articles
      .filter(a => a.codeSage100 || a.codeSageX3)
      .map(a => ({ articleId: a.id, codeSage100: a.codeSage100, codeSageX3: a.codeSageX3 }));

    if (articleRefs.length > 0) {
      try {
        const effectiveEndDate = campaign.endDate > new Date() ? new Date() : campaign.endDate;
        const salesAmounts = await getSalesAmountByArticle(articleRefs, campaign.startDate, effectiveEndDate);

        const x3Revenue = Object.values(salesAmounts).reduce((sum, val) => sum + val, 0);
        const x3SalesCount = Object.values(salesAmounts).filter(val => val > 0).length;

        totalRevenue += x3Revenue;
        confirmedSalesCount += x3SalesCount;
      } catch (error) {
        console.error('Erreur lors de la récupération des ventes Sage X3 pour le ROI:', error);
      }
    }
  }

  const netProfit = totalRevenue - totalCost;

  let roiPercent: number | null = null;
  let roiStatus: CampaignRoiStatus = 'CALCULATED';

  if (totalCost === 0) {
    if (totalRevenue === 0) {
      roiPercent = 0;
      roiStatus = 'ZERO_COST_ZERO_REVENUE';
    } else {
      roiPercent = null;
      roiStatus = 'NON_CALCULABLE_ZERO_COST';
    }
  } else {
    roiPercent = ((totalRevenue - totalCost) / totalCost) * 100;
    roiStatus = 'CALCULATED';
  }

  return {
    campaignId: campaign.id,
    budgetPlanId: campaign.budgetPlanId,
    currency: campaign.budgetPlan?.currency || 'XAF',
    totalCost: roundTo2(totalCost),
    totalRevenue: roundTo2(totalRevenue),
    netProfit: roundTo2(netProfit),
    roiPercent: roiPercent === null ? null : roundTo2(roiPercent),
    roiStatus,
    confirmedSalesCount,
  };
}

const roiDashboardCache = new TtlCache(DASHBOARD_CACHE_TTL_MS);

export async function getCampaignRoiDashboardSummary(options?: {
  createdById?: number;
}): Promise<CampaignRoiDashboardSummary> {
  const cacheKey = `roi-dashboard:${options?.createdById ?? 'all'}`;
  const cached = roiDashboardCache.get<CampaignRoiDashboardSummary>(cacheKey);
  if (cached) return cached;

  const summary = await computeCampaignRoiDashboardSummary(options);
  roiDashboardCache.set(cacheKey, summary);
  return summary;
}

async function computeCampaignRoiDashboardSummary(options?: {
  createdById?: number;
}): Promise<CampaignRoiDashboardSummary> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(options?.createdById ? { createdById: options.createdById } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      budgetPlanId: true,
      totalBudget: true,
      startDate: true,
      endDate: true,
      budgetPlan: {
        select: { currency: true },
      },
      articles: {
        select: { id: true, codeSageX3: true, codeSage100: true },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Ventes confirmées (SALE) par campagne — UNE seule requête groupBy
  // (remplace 1 agrégat Prisma par campagne). Résultat identique.
  const confirmedSalesRows = await prisma.conversion.groupBy({
    by: ['campaignId'],
    _sum: { amount: true },
    _count: { id: true },
    where: { status: 'CONFIRMED', type: 'SALE', amount: { not: null } },
  });
  const confirmedSalesByCampaign = new Map<
    number,
    { revenue: number; count: number }
  >();
  for (const row of confirmedSalesRows) {
    if (row.campaignId === null) continue; // conversion sans campagne → non rattachable
    confirmedSalesByCampaign.set(row.campaignId, {
      revenue: decimalToNumber(row._sum.amount),
      count: row._count.id ?? 0,
    });
  }

  // ROI par campagne : calculs Prisma batchés + appels X3 PARALLÉLISÉS
  // (pool X3 max 10 connexions → concurrence limitée à 5).
  const campaignRoiItems = await mapLimit(campaigns, 5, async (campaign) => {
    const totalCost =
      campaign.totalBudget !== null ? decimalToNumber(campaign.totalBudget) : 0;

    const confirmedSales = confirmedSalesByCampaign.get(campaign.id) ?? {
      revenue: 0,
      count: 0,
    };
    let totalRevenue = confirmedSales.revenue;
    let confirmedSalesCount = confirmedSales.count;

    // Ventes réelles Sage X3 (période propre à cette campagne — comportement conservé)
    if (campaign.startDate && campaign.endDate) {
      const articleRefs: ArticleCodeRef[] = campaign.articles
        .filter((a) => a.codeSage100 || a.codeSageX3)
        .map((a) => ({
          articleId: a.id,
          codeSage100: a.codeSage100,
          codeSageX3: a.codeSageX3,
        }));

      if (articleRefs.length > 0) {
        try {
          const effectiveEndDate =
            campaign.endDate > new Date() ? new Date() : campaign.endDate;
          const salesAmounts = await getSalesAmountByArticle(
            articleRefs,
            campaign.startDate,
            effectiveEndDate,
          );

          const x3Revenue = Object.values(salesAmounts).reduce((sum, val) => sum + val, 0);
          const x3SalesCount = Object.values(salesAmounts).filter((val) => val > 0).length;

          totalRevenue += x3Revenue;
          confirmedSalesCount += x3SalesCount;
        } catch (error) {
          console.error(
            'Erreur lors de la récupération des ventes Sage X3 pour le ROI:',
            error,
          );
        }
      }
    }

    const netProfit = totalRevenue - totalCost;

    let roiPercent: number | null = null;
    let roiStatus: CampaignRoiStatus = 'CALCULATED';

    if (totalCost === 0) {
      if (totalRevenue === 0) {
        roiPercent = 0;
        roiStatus = 'ZERO_COST_ZERO_REVENUE';
      } else {
        roiPercent = null;
        roiStatus = 'NON_CALCULABLE_ZERO_COST';
      }
    } else {
      roiPercent = ((totalRevenue - totalCost) / totalCost) * 100;
      roiStatus = 'CALCULATED';
    }

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      currency: campaign.budgetPlan?.currency || 'XAF',
      totalCost: roundTo2(totalCost),
      totalRevenue: roundTo2(totalRevenue),
      netProfit: roundTo2(netProfit),
      roiPercent: roiPercent === null ? null : roundTo2(roiPercent),
      roiStatus,
      confirmedSalesCount,
    };
  });

  const totalConfirmedRevenue = campaignRoiItems.reduce(
    (sum, item) => sum + item.totalRevenue,
    0
  );

  const totalRealCost = campaignRoiItems.reduce(
    (sum, item) => sum + item.totalCost,
    0
  );

  const totalNetProfit = campaignRoiItems.reduce(
    (sum, item) => sum + item.netProfit,
    0
  );

  const totalConfirmedSalesCount = campaignRoiItems.reduce(
    (sum, item) => sum + item.confirmedSalesCount,
    0
  );

  let globalRoiPercent: number | null = null;
  let globalRoiStatus: CampaignRoiStatus = 'CALCULATED';

  if (totalRealCost === 0) {
    if (totalConfirmedRevenue === 0) {
      globalRoiPercent = 0;
      globalRoiStatus = 'ZERO_COST_ZERO_REVENUE';
    } else {
      globalRoiPercent = null;
      globalRoiStatus = 'NON_CALCULABLE_ZERO_COST';
    }
  } else {
    globalRoiPercent = ((totalConfirmedRevenue - totalRealCost) / totalRealCost) * 100;
    globalRoiStatus = 'CALCULATED';
  }

  const calculableCampaigns = campaignRoiItems.filter(
    (item) => item.roiPercent !== null
  );

  const topCampaignsByRoi = [...calculableCampaigns]
    .sort((a, b) => (b.roiPercent ?? -Infinity) - (a.roiPercent ?? -Infinity))
    .slice(0, 5);

  const negativeRoiCampaigns = [...calculableCampaigns]
    .filter((item) => (item.roiPercent ?? 0) < 0)
    .sort((a, b) => (a.roiPercent ?? 0) - (b.roiPercent ?? 0))
    .slice(0, 5);

  const nonCalculableRoiCampaigns = campaignRoiItems
    .filter((item) => item.roiStatus === 'NON_CALCULABLE_ZERO_COST')
    .slice(0, 5);

  return {
    currency: 'XAF',
    campaignCount: campaignRoiItems.length,
    totalConfirmedRevenue: roundTo2(totalConfirmedRevenue),
    totalRealCost: roundTo2(totalRealCost),
    totalNetProfit: roundTo2(totalNetProfit),
    globalRoiPercent:
      globalRoiPercent === null ? null : roundTo2(globalRoiPercent),
    globalRoiStatus,
    totalConfirmedSalesCount,
    calculableCampaignCount: calculableCampaigns.length,
    negativeRoiCampaignCount: campaignRoiItems.filter(
      (item) => item.roiPercent !== null && item.roiPercent < 0
    ).length,
    nonCalculableRoiCampaignCount: campaignRoiItems.filter(
      (item) => item.roiStatus === 'NON_CALCULABLE_ZERO_COST'
    ).length,
    topCampaignsByRoi,
    negativeRoiCampaigns,
    nonCalculableRoiCampaigns,
  };
}