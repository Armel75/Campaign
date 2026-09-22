import prisma from '../infrastructure/prisma/client';
import {
  TtlCache,
  DASHBOARD_CACHE_TTL_MS,
} from '../infrastructure/cache/ttlCache';
import {
  NON_CALCULABLE_ROI_STATUSES,
  resolveRoi,
  CampaignRoiStatus,
} from './roiStatus';

/**
 * Règles métier uniques du ROI (validées) :
 *
 *  - **Coût** d'une campagne = son `totalBudget`. Un seul coût par campagne : les
 *    dépenses (`Expense`) n'entrent dans aucun calcul de ROI.
 *  - **Revenu** = uniquement les conversions `CONFIRMED` de type `SALE`, rattachables
 *    à la campagne via `Conversion.campaignId`.
 *
 * Les ventes Sage X3 sont volontairement **exclues** du revenu : agrégées par
 * article × date (tous clients, tous vendeurs), elles ne sont pas attribuables à une
 * campagne et pouvaient être comptées deux fois avec les conversions. Elles restent
 * utilisées ailleurs pour les quantités et prix unitaires par article.
 */

// Statut de ROI partagé avec le pilotage stratégique et les exports (source unique).
export type { CampaignRoiStatus };

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
  /** Nombre de conversions CONFIRMED de type SALE (plus de comptage d'articles X3). */
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
  /**
   * Liste complète (non tronquée) des campagnes avec leur ROI.
   * Contrairement à `topCampaignsByRoi` / `negativeRoiCampaigns` /
   * `nonCalculableRoiCampaigns` (limitées à 5 éléments), elle permet au tableau
   * de bord de retrouver le coût/revenu de n'importe quelle campagne active.
   */
  campaigns: CampaignRoiDashboardItem[];
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
      budgetPlan: {
        select: { currency: true },
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

  // Revenu = conversions CONFIRMED de type SALE, seules rattachables à la campagne.
  const totalRevenue = decimalToNumber(confirmedSalesAggregate._sum.amount);
  const confirmedSalesCount = confirmedSalesAggregate._count.id ?? 0;

  const netProfit = totalRevenue - totalCost;

  // Statut + pourcentage : calcul partagé (services/roiStatus.ts)
  const { roiStatus, roiPercent } = resolveRoi(totalCost, totalRevenue);

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

/**
 * Options du résumé ROI du tableau de bord.
 *
 * `from`/`to` (facultatifs) bornent le **revenu** (conversions confirmées dont la date
 * de conversion tombe dans la période). Le **coût** reste le budget total de la
 * campagne, non réparti dans le temps : sur une période courte, le ROI est donc
 * structurellement sous-évalué, ce que l'interface signale explicitement.
 */
export type CampaignRoiDashboardOptions = {
  createdById?: number;
  from?: Date;
  to?: Date;
};

export async function getCampaignRoiDashboardSummary(
  options?: CampaignRoiDashboardOptions
): Promise<CampaignRoiDashboardSummary> {
  const periodKey = `${options?.from?.toISOString() ?? ''}~${options?.to?.toISOString() ?? ''}`;
  const cacheKey = `roi-dashboard:${options?.createdById ?? 'all'}:${periodKey}`;
  const cached = roiDashboardCache.get<CampaignRoiDashboardSummary>(cacheKey);
  if (cached) return cached;

  const summary = await computeCampaignRoiDashboardSummary(options);
  roiDashboardCache.set(cacheKey, summary);
  return summary;
}

async function computeCampaignRoiDashboardSummary(
  options?: CampaignRoiDashboardOptions
): Promise<CampaignRoiDashboardSummary> {
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
      budgetPlan: {
        select: { currency: true },
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
    where: {
      status: 'CONFIRMED',
      type: 'SALE',
      amount: { not: null },
      // Période facultative : ne retenir que les conversions de la période
      ...(options?.from || options?.to
        ? {
            conversionDate: {
              ...(options?.from ? { gte: options.from } : {}),
              ...(options?.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    },
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

  // ROI par campagne : un seul groupBy Prisma en amont, aucun appel externe.
  const campaignRoiItems = campaigns.map((campaign) => {
    const totalCost =
      campaign.totalBudget !== null ? decimalToNumber(campaign.totalBudget) : 0;

    const confirmedSales = confirmedSalesByCampaign.get(campaign.id) ?? {
      revenue: 0,
      count: 0,
    };
    // Revenu = conversions CONFIRMED de type SALE (cf. en-tête du fichier).
    const totalRevenue = confirmedSales.revenue;
    const confirmedSalesCount = confirmedSales.count;

    const netProfit = totalRevenue - totalCost;

    const { roiStatus, roiPercent } = resolveRoi(totalCost, totalRevenue);

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

  const { roiStatus: globalRoiStatus, roiPercent: globalRoiPercent } = resolveRoi(
    totalRealCost,
    totalConfirmedRevenue,
  );

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

  // « Non calculable » regroupe les deux cas non affichables : coût nul et revenu non établi.
  const nonCalculableRoiCampaigns = campaignRoiItems
    .filter((item) => NON_CALCULABLE_ROI_STATUSES.includes(item.roiStatus))
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
    nonCalculableRoiCampaignCount: campaignRoiItems.filter((item) =>
      NON_CALCULABLE_ROI_STATUSES.includes(item.roiStatus)
    ).length,
    // Liste complète : mêmes items que ceux utilisés pour construire les listes
    // tronquées ci-dessus (aucun calcul supplémentaire, aucun coût additionnel).
    campaigns: campaignRoiItems,
    topCampaignsByRoi,
    negativeRoiCampaigns,
    nonCalculableRoiCampaigns,
  };
}