import prisma from '../infrastructure/prisma/client';
import {
  getSalesAmountByArticle,
  ArticleCodeRef,
} from './x3Sales.service';

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

export async function getStrategicDashboardSummary(): Promise<StrategicDashboardSummary> {
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
      articles: {
        select: {
          id: true,
          soldQuantity: true,
          codeSageX3: true,
          codeSage100: true,
          campaignId: true,
        },
      },
      conversions: {
        select: {
          id: true,
          amount: true,
          status: true,
          type: true,
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
          budgetLines: {
            select: {
              id: true,
              expenses: {
                select: { amount: true },
              },
            },
          },
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
      articleRefs: ArticleCodeRef[];
      startDate: Date;
      endDate: Date;
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

  for (const campaign of campaigns) {
    const budget = toNumber(campaign.totalBudget);
    totalBudget += budget;

    // Dépenses via budget lines
    let campaignExpenses = 0;
    for (const line of campaign.budgetPlan?.budgetLines ?? []) {
      for (const expense of line.expenses) {
        campaignExpenses += toNumber(expense.amount);
      }
    }

    // Si aucune dépense réelle n'est enregistrée, on considère que
    // le budget saisi sur la campagne = la dépense (prévision = réalisation)
    if (campaignExpenses === 0 && budget > 0) {
      campaignExpenses = budget;
    }
    totalExpenses += campaignExpenses;

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
          articleRefs: [],
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        });
      }

      const entry = objectiveMap.get(objId)!;
      entry.campaignCount++;
      entry.totalBudget += budget;
      entry.totalRevenue += campaignConfirmedRevenue;
      entry.totalCost += campaignExpenses;
      entry.startDate =
        !entry.startDate || campaign.startDate < entry.startDate
          ? campaign.startDate
          : entry.startDate;
      entry.endDate =
        !entry.endDate || (campaign.endDate && campaign.endDate > entry.endDate)
          ? campaign.endDate
          : entry.endDate;

      // Collecter les références d'articles pour le calcul X3
      for (const article of campaign.articles) {
        if (article.codeSage100 || article.codeSageX3) {
          entry.articleRefs.push({
            articleId: article.id,
            codeSage100: article.codeSage100,
            codeSageX3: article.codeSageX3,
          });
        }
      }
    }

    // ── Tendances mensuelles ──────────────────────────────────────────
    const createdDate = campaign.createdAt ? new Date(campaign.createdAt) : null;
    if (createdDate) {
      const key = `${createdDate.getFullYear()}-${createdDate.getMonth() + 1}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          year: createdDate.getFullYear(),
          month: createdDate.getMonth() + 1,
          campaignsCreated: new Set(),
          campaignsActive: new Set(),
          newLeads: new Set(),
          newConversions: new Set(),
          confirmedRevenue: 0,
          totalCost: 0,
        });
      }
      const entry = monthlyMap.get(key)!;
      entry.campaignsCreated.add(campaign.id);
      if (status === 'ACTIVE') entry.campaignsActive.add(campaign.id);
      entry.totalCost += campaignExpenses;

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

      // Conversions créées ce mois-ci
      for (const conv of campaign.conversions) {
        if (conv.createdAt) {
          const convDate = new Date(conv.createdAt);
          const convKey = `${convDate.getFullYear()}-${convDate.getMonth() + 1}`;
          if (convKey === key) {
            entry.newConversions.add(conv.id);
            if (
              String(conv.status || '').trim().toUpperCase() === 'CONFIRMED' &&
              String(conv.type || '').trim().toUpperCase() === 'SALE'
            ) {
              entry.confirmedRevenue += toNumber(conv.amount);
            }
          }
        }
      }
    }
  }

  // ── 3. Revenus X3 par objectif ─────────────────────────────────────────
  // On enrichit chaque objectif avec les revenus réels depuis Sage X3
  const profitabilityByObjective: ProfitabilityByObjective[] = [];
  for (const [objId, objEntry] of objectiveMap) {
    let x3Revenue = 0;
    if (objEntry.articleRefs.length > 0 && objEntry.startDate && objEntry.endDate) {
      try {
        const effectiveEnd =
          objEntry.endDate > new Date() ? new Date() : objEntry.endDate;
        const salesAmounts = await getSalesAmountByArticle(
          objEntry.articleRefs,
          objEntry.startDate,
          effectiveEnd,
        );
        x3Revenue = Object.values(salesAmounts).reduce((s, v) => s + v, 0);
      } catch {
        // Silently fail — les données X3 ne sont pas critiques
      }
    }

    const totalRevenue = objEntry.totalRevenue + x3Revenue;
    const totalProfit = totalRevenue - objEntry.totalCost;
    const roiPercent =
      objEntry.totalCost > 0
        ? roundTo2(((totalRevenue - objEntry.totalCost) / objEntry.totalCost) * 100)
        : totalRevenue > 0
          ? null // Revenu sans coût → non calculable
          : null;

    profitabilityByObjective.push({
      objectiveId: objId,
      objectiveCode: objEntry.objectiveCode,
      objectiveLabel: objEntry.objectiveLabel,
      campaignCount: objEntry.campaignCount,
      totalBudget: roundTo2(objEntry.totalBudget),
      totalRevenueFromConversions: roundTo2(objEntry.totalRevenue),
      totalCost: roundTo2(objEntry.totalCost),
      totalProfit: roundTo2(totalProfit),
      roiPercent,
    });
  }

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
  const globalRoiPercent =
    totalExpenses > 0
      ? roundTo2(((totalRevenue - totalExpenses) / totalExpenses) * 100)
      : totalRevenue > 0
        ? null
        : null;

  const overview: StrategicOverview = {
    totalCampaigns: campaigns.length,
    activeCampaigns,
    completedCampaigns,
    totalBudget: roundTo2(totalBudget),
    totalExpenses: roundTo2(totalExpenses),
    totalRevenue: roundTo2(totalRevenue),
    totalProfit: roundTo2(totalProfit),
    globalRoiPercent,
  };

  return {
    overview,
    profitabilityByObjective,
    acquisitionCosts,
    monthlyTrends,
  };
}
