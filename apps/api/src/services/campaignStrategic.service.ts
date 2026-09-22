import prisma from '../infrastructure/prisma/client';
import {
  TtlCache,
  DASHBOARD_CACHE_TTL_MS,
} from '../infrastructure/cache/ttlCache';
import { resolveRoi, CampaignRoiStatus } from './roiStatus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProfitabilityByObjective = {
  objectiveId: number;
  objectiveCode: string;
  objectiveLabel: string;
  campaignCount: number;
  totalBudget: number;
  totalRevenueFromConversions: number;
  totalCost: number;
  totalProfit: number;
  roiPercent: number | null;
  /** `NO_ESTABLISHED_REVENUE` ⇒ ni ROI ni profit affichables (aucune vente confirmée). */
  roiStatus: CampaignRoiStatus;
};

export type AcquisitionCosts = {
  totalLeads: number;
  totalConversions: number;
  totalConfirmedConversions: number;
  totalConfirmedRevenue: number;
  totalBudget: number;
  costPerLead: number | null;
  costPerSale: number | null;
  roas: number | null; // Return On Ad Spend = confirmedRevenue / totalBudget
};

export type MonthlyTrend = {
  year: number;
  month: number; // 1-12
  label: string; // "Janv.", "Fév.", etc.
  campaignsCreated: number;
  campaignsActive: number;
  newLeads: number;
  newConversions: number;
  confirmedRevenue: number;
  totalCost: number;
};

export type StrategicOverview = {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalBudget: number;
  totalExpenses: number;
  totalRevenue: number;
  totalProfit: number;
  globalRoiPercent: number | null;
  globalRoiStatus: CampaignRoiStatus;
};

export type StrategicDashboardSummary = {
  overview: StrategicOverview;
  profitabilityByObjective: ProfitabilityByObjective[];
  acquisitionCosts: AcquisitionCosts;
  monthlyTrends: MonthlyTrend[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

const MONTH_LABELS = [
  'Janv.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin',
  'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.',
];

// ---------------------------------------------------------------------------
// Service principal
// ---------------------------------------------------------------------------

const strategicSummaryCache = new TtlCache(DASHBOARD_CACHE_TTL_MS);

export async function getStrategicDashboardSummary(): Promise<StrategicDashboardSummary> {
  const cached = strategicSummaryCache.get<StrategicDashboardSummary>('strategic-summary');
  if (cached) return cached;

  const summary = await computeStrategicDashboardSummary();
  strategicSummaryCache.set('strategic-summary', summary);
  return summary;
}

async function computeStrategicDashboardSummary(): Promise<StrategicDashboardSummary> {
  // ── 1. Récupérer toutes les campagnes avec leurs relations ──────────────
  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      totalBudget: true,
      createdAt: true,
      updatedAt: true,
      objectiveId: true,
      objective: {
        select: { id: true, code: true, label: true },
      },
      _count: {
        select: {
          leads: true,
          tasks: true,
          articles: true,
        },
      },
      conversions: {
        select: {
          id: true,
          amount: true,
          status: true,
          type: true,
          // `conversionDate` = date métier utilisée pour dater le revenu mensuel
          conversionDate: true,
          createdAt: true,
        },
      },
      leads: {
        select: { id: true, createdAt: true },
      },
      budgetPlanId: true,
      budgetPlan: {
        select: {
          currency: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // ── 2. Agrégations globales ────────────────────────────────────────────
  let totalBudget = 0;
  let totalExpenses = 0;
  let activeCampaigns = 0;
  let completedCampaigns = 0;
  let totalRevenueFromConversions = 0;
  let totalConfirmedConversionsCount = 0;
  let totalLeadsCount = 0;
  let totalConversionsCount = 0;

  // Pour la rentabilité par objectif
  const objectiveMap = new Map<
    number,
    {
      objectiveId: number;
      objectiveCode: string;
      objectiveLabel: string;
      campaignCount: number;
      totalBudget: number;
      totalRevenue: number;
      totalCost: number;
    }
  >();

  // Pour les tendances mensuelles
  const monthlyMap = new Map<
    string,
    {
      year: number;
      month: number;
      campaignsCreated: Set<number>;
      campaignsActive: Set<number>;
      newLeads: Set<number>;
      newConversions: Set<number>;
      confirmedRevenue: number;
      totalCost: number;
    }
  >();

  /**
   * Accès (ou création) du seau mensuel correspondant à une date.
   * Extrait du corps de boucle pour pouvoir imputer le budget d'une campagne à son
   * **mois de début**, alors que les autres indicateurs restent datés sur `createdAt`.
   */
  const getOrCreateMonthlyBucket = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month}`;

    let entry = monthlyMap.get(key);

    if (!entry) {
      entry = {
        year,
        month,
        campaignsCreated: new Set(),
        campaignsActive: new Set(),
        newLeads: new Set(),
        newConversions: new Set(),
        confirmedRevenue: 0,
        totalCost: 0,
      };
      monthlyMap.set(key, entry);
    }

    return entry;
  };

  for (const campaign of campaigns) {
    const budget = toNumber(campaign.totalBudget);
    totalBudget += budget;

    // RÈGLE MÉTIER UNIQUE : le coût d'une campagne est son budget total.
    // Aucune lecture de dépenses — plus de double convention budget / dépenses.
    const campaignCost = budget;
    totalExpenses += campaignCost;

    const status = String(campaign.status || '').trim().toUpperCase();
    if (status === 'ACTIVE') activeCampaigns++;
    if (status === 'TERMINEE' || status === 'COMPLETED') completedCampaigns++;

    // Conversions de cette campagne
    let campaignConfirmedRevenue = 0;
    let campaignConfirmedCount = 0;
    for (const conv of campaign.conversions) {
      totalConversionsCount++;
      if (
        String(conv.status || '').trim().toUpperCase() === 'CONFIRMED' &&
        String(conv.type || '').trim().toUpperCase() === 'SALE'
      ) {
        campaignConfirmedRevenue += toNumber(conv.amount);
        campaignConfirmedCount++;
        totalConfirmedConversionsCount++;
      }
    }
    totalRevenueFromConversions += campaignConfirmedRevenue;

    // Leads
    totalLeadsCount += campaign._count.leads;

    // ── Rentabilité par objectif ──────────────────────────────────────
    if (campaign.objective) {
      const objId = campaign.objective.id;
      if (!objectiveMap.has(objId)) {
        objectiveMap.set(objId, {
          objectiveId: objId,
          objectiveCode: campaign.objective.code,
          objectiveLabel: campaign.objective.label,
          campaignCount: 0,
          totalBudget: 0,
          totalRevenue: 0,
          totalCost: 0,
        });
      }

      const entry = objectiveMap.get(objId)!;
      entry.campaignCount++;
      entry.totalBudget += budget;
      entry.totalRevenue += campaignConfirmedRevenue;
      entry.totalCost += campaignCost;
    }

    // ── Tendances mensuelles ──────────────────────────────────────────
    // Le budget est imputé au MOIS DE DÉBUT de la campagne (règle validée).
    const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
    if (startDate && !Number.isNaN(startDate.getTime())) {
      getOrCreateMonthlyBucket(startDate).totalCost += campaignCost;
    }

    const createdDate = campaign.createdAt ? new Date(campaign.createdAt) : null;
    if (createdDate) {
      const key = `${createdDate.getFullYear()}-${createdDate.getMonth() + 1}`;
      const entry = getOrCreateMonthlyBucket(createdDate);
      entry.campaignsCreated.add(campaign.id);
      if (status === 'ACTIVE') entry.campaignsActive.add(campaign.id);

      // Leads créés ce mois-ci
      for (const lead of campaign.leads) {
        if (lead.createdAt) {
          const leadDate = new Date(lead.createdAt);
          const leadKey = `${leadDate.getFullYear()}-${leadDate.getMonth() + 1}`;
          if (leadKey === key) {
            entry.newLeads.add(lead.id);
          }
        }
      }

    }

    // ── Conversions : rattachées à LEUR propre mois, indépendamment de la campagne ──
    // Avant, elles n'étaient comptées que si elles tombaient dans le mois de CRÉATION de
    // la campagne : toute vente convertie plus tard était purement perdue pour le graphique.
    for (const conv of campaign.conversions) {
      const createdConvDate = conv.createdAt ? new Date(conv.createdAt) : null;
      if (createdConvDate && !Number.isNaN(createdConvDate.getTime())) {
        getOrCreateMonthlyBucket(createdConvDate).newConversions.add(conv.id);
      }

      if (
        String(conv.status || '').trim().toUpperCase() === 'CONFIRMED' &&
        String(conv.type || '').trim().toUpperCase() === 'SALE'
      ) {
        // Revenu daté par la date métier (`conversionDate`), comme partout ailleurs.
        const convBusinessDate = conv.conversionDate
          ? new Date(conv.conversionDate)
          : createdConvDate;

        if (convBusinessDate && !Number.isNaN(convBusinessDate.getTime())) {
          getOrCreateMonthlyBucket(convBusinessDate).confirmedRevenue += toNumber(conv.amount);
        }
      }
    }
  }

  // ── 3. Rentabilité par objectif ────────────────────────────────────────
  // Revenu = conversions CONFIRMED de type SALE uniquement (règle métier unique) :
  // plus d'enrichissement Sage X3, non attribuable à une campagne ni à un objectif.
  const objectiveEntries = Array.from(objectiveMap.entries());

  const profitabilityByObjective: ProfitabilityByObjective[] = objectiveEntries.map(
    ([objId, objEntry]) => {
      const totalRevenue = objEntry.totalRevenue;
      const totalProfit = totalRevenue - objEntry.totalCost;
      // Statut + pourcentage : calcul partagé (services/roiStatus.ts)
      const { roiStatus, roiPercent } = resolveRoi(objEntry.totalCost, totalRevenue);

      return {
        objectiveId: objId,
        objectiveCode: objEntry.objectiveCode,
        objectiveLabel: objEntry.objectiveLabel,
        campaignCount: objEntry.campaignCount,
        totalBudget: roundTo2(objEntry.totalBudget),
        totalRevenueFromConversions: roundTo2(objEntry.totalRevenue),
        totalCost: roundTo2(objEntry.totalCost),
        totalProfit: roundTo2(totalProfit),
        roiPercent: roiPercent === null ? null : roundTo2(roiPercent),
        roiStatus,
      };
    },
  );

  // ── 4. Coûts d'acquisition ─────────────────────────────────────────────
  const costPerLead =
    totalLeadsCount > 0 ? roundTo2(totalBudget / totalLeadsCount) : null;
  const costPerSale =
    totalConfirmedConversionsCount > 0
      ? roundTo2(totalBudget / totalConfirmedConversionsCount)
      : null;
  const roas =
    totalBudget > 0
      ? roundTo2(totalRevenueFromConversions / totalBudget)
      : null;

  const acquisitionCosts: AcquisitionCosts = {
    totalLeads: totalLeadsCount,
    totalConversions: totalConversionsCount,
    totalConfirmedConversions: totalConfirmedConversionsCount,
    totalConfirmedRevenue: roundTo2(totalRevenueFromConversions),
    totalBudget: roundTo2(totalBudget),
    costPerLead,
    costPerSale,
    roas,
  };

  // ── 5. Tendances mensuelles ────────────────────────────────────────────
  const monthlyTrends: MonthlyTrend[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => ({
      year: entry.year,
      month: entry.month,
      label: MONTH_LABELS[entry.month - 1] ?? `${entry.month}`,
      campaignsCreated: entry.campaignsCreated.size,
      campaignsActive: entry.campaignsActive.size,
      newLeads: entry.newLeads.size,
      newConversions: entry.newConversions.size,
      confirmedRevenue: roundTo2(entry.confirmedRevenue),
      totalCost: roundTo2(entry.totalCost),
    }));

  // ── 6. Vue d'ensemble ──────────────────────────────────────────────────
  const totalRevenue = totalRevenueFromConversions;
  const totalProfit = totalRevenue - totalExpenses;
  // Statut + pourcentage : calcul partagé (services/roiStatus.ts) — plus de ternaire morte.
  const { roiStatus: globalRoiStatus, roiPercent: globalRoiPercent } = resolveRoi(
    totalExpenses,
    totalRevenue,
  );

  const overview: StrategicOverview = {
    totalCampaigns: campaigns.length,
    activeCampaigns,
    completedCampaigns,
    totalBudget: roundTo2(totalBudget),
    totalExpenses: roundTo2(totalExpenses),
    totalRevenue: roundTo2(totalRevenue),
    totalProfit: roundTo2(totalProfit),
    globalRoiPercent: globalRoiPercent === null ? null : roundTo2(globalRoiPercent),
    globalRoiStatus,
  };

  return {
    overview,
    profitabilityByObjective,
    acquisitionCosts,
    monthlyTrends,
  };
}
