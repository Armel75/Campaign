import {
  getStrategicDashboardSummary,
  StrategicOverview,
  ProfitabilityByObjective,
  AcquisitionCosts,
  MonthlyTrend,
} from './campaignStrategic.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MonthMetrics = {
  month: number;
  year: number;
  label: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  roiPercent: number | null;
  newLeads: number;
  newConversions: number;
  campaignsCreated: number;
  campaignsActive: number;
};

export type MonthComparison = {
  revenueChange: number;
  revenueChangePercent: number | null;
  costChange: number;
  costChangePercent: number | null;
  profitChange: number;
  profitChangePercent: number | null;
  roiChange: number | null; // points de pourcentage
  leadsChange: number;
  leadsChangePercent: number | null;
  conversionsChange: number;
  conversionsChangePercent: number | null;
};

export type TopBottomCampaign = {
  campaignId: number;
  name: string;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  roiPercent: number | null;
  roiStatus: string;
  confirmedSalesCount: number;
};

export type ProfitabilityReport = {
  currentMonth: MonthMetrics | null;
  previousMonth: MonthMetrics | null;
  comparison: MonthComparison | null;
  overview: StrategicOverview;
  profitabilityByObjective: ProfitabilityByObjective[];
  acquisitionCosts: AcquisitionCosts;
  monthlyTrends: MonthlyTrend[];
  topCampaignsByRoi: TopBottomCampaign[];
  bottomCampaignsByRoi: TopBottomCampaign[];
  availableMonths: { month: number; year: number; label: string }[];
  selectedMonth: number;
  selectedYear: number;
  reportGeneratedAt: string;
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

function formatMonthLabel(month: number, year: number): string {
  return `${MONTH_LABELS[month - 1] ?? month} ${year}`;
}

function computeRoiPercent(totalCost: number, totalRevenue: number): number | null {
  if (totalCost > 0) {
    return roundTo2(((totalRevenue - totalCost) / totalCost) * 100);
  }
  if (totalRevenue > 0) return null; // Revenu sans coût → non calculable
  return 0;
}

// ---------------------------------------------------------------------------
// Service principal
// ---------------------------------------------------------------------------

export async function getProfitabilityReport(
  month?: number,
  year?: number,
): Promise<ProfitabilityReport> {
  // Réutiliser le service stratégique existant — NE PAS réinventer la roue
  const strategicData = await getStrategicDashboardSummary();

  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1; // 1-indexed
  const targetYear = year ?? now.getFullYear();

  const { monthlyTrends, overview, profitabilityByObjective, acquisitionCosts } = strategicData;

  // ── Mois disponibles (triés du plus récent au plus ancien) ─────────────
  const availableMonths = [...monthlyTrends]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map((t) => ({
      month: t.month,
      year: t.year,
      label: formatMonthLabel(t.month, t.year),
    }));

  // ── Extraire le mois cible et le mois précédent ────────────────────────
  let currentMonthData: MonthMetrics | null = null;
  let previousMonthData: MonthMetrics | null = null;

  const currentTrend = monthlyTrends.find(
    (t) => t.year === targetYear && t.month === targetMonth,
  );

  if (currentTrend) {
    const profit = currentTrend.confirmedRevenue - currentTrend.totalCost;
    currentMonthData = {
      month: currentTrend.month,
      year: currentTrend.year,
      label: formatMonthLabel(currentTrend.month, currentTrend.year),
      totalRevenue: currentTrend.confirmedRevenue,
      totalCost: currentTrend.totalCost,
      totalProfit: roundTo2(profit),
      roiPercent: computeRoiPercent(currentTrend.totalCost, currentTrend.confirmedRevenue),
      newLeads: currentTrend.newLeads,
      newConversions: currentTrend.newConversions,
      campaignsCreated: currentTrend.campaignsCreated,
      campaignsActive: currentTrend.campaignsActive,
    };

    // Mois précédent = M-1
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const prevTrend = monthlyTrends.find(
      (t) => t.year === prevYear && t.month === prevMonth,
    );

    if (prevTrend) {
      const prevProfit = prevTrend.confirmedRevenue - prevTrend.totalCost;
      previousMonthData = {
        month: prevTrend.month,
        year: prevTrend.year,
        label: formatMonthLabel(prevTrend.month, prevTrend.year),
        totalRevenue: prevTrend.confirmedRevenue,
        totalCost: prevTrend.totalCost,
        totalProfit: roundTo2(prevProfit),
        roiPercent: computeRoiPercent(prevTrend.totalCost, prevTrend.confirmedRevenue),
        newLeads: prevTrend.newLeads,
        newConversions: prevTrend.newConversions,
        campaignsCreated: prevTrend.campaignsCreated,
        campaignsActive: prevTrend.campaignsActive,
      };
    }
  }

  // Fallback: si pas de données pour le mois demandé,
  // prendre les deux derniers mois disponibles
  if (!currentMonthData && monthlyTrends.length >= 1) {
    const lastIdx = monthlyTrends.length - 1;
    const last = monthlyTrends[lastIdx];
    const profit = last.confirmedRevenue - last.totalCost;
    currentMonthData = {
      month: last.month,
      year: last.year,
      label: formatMonthLabel(last.month, last.year),
      totalRevenue: last.confirmedRevenue,
      totalCost: last.totalCost,
      totalProfit: roundTo2(profit),
      roiPercent: computeRoiPercent(last.totalCost, last.confirmedRevenue),
      newLeads: last.newLeads,
      newConversions: last.newConversions,
      campaignsCreated: last.campaignsCreated,
      campaignsActive: last.campaignsActive,
    };

    if (monthlyTrends.length >= 2) {
      const prev = monthlyTrends[lastIdx - 1];
      const prevProfit = prev.confirmedRevenue - prev.totalCost;
      previousMonthData = {
        month: prev.month,
        year: prev.year,
        label: formatMonthLabel(prev.month, prev.year),
        totalRevenue: prev.confirmedRevenue,
        totalCost: prev.totalCost,
        totalProfit: roundTo2(prevProfit),
        roiPercent: computeRoiPercent(prev.totalCost, prev.confirmedRevenue),
        newLeads: prev.newLeads,
        newConversions: prev.newConversions,
        campaignsCreated: prev.campaignsCreated,
        campaignsActive: prev.campaignsActive,
      };
    }
  }

  // ── Calcul des comparaisons S-1 ────────────────────────────────────────
  let comparison: MonthComparison | null = null;

  if (currentMonthData && previousMonthData) {
    const pRev =
      previousMonthData.totalRevenue > 0
        ? ((currentMonthData.totalRevenue - previousMonthData.totalRevenue) /
            previousMonthData.totalRevenue) *
          100
        : null;

    const pCost =
      previousMonthData.totalCost > 0
        ? ((currentMonthData.totalCost - previousMonthData.totalCost) /
            previousMonthData.totalCost) *
          100
        : null;

    const pProfit =
      previousMonthData.totalProfit > 0
        ? ((currentMonthData.totalProfit - previousMonthData.totalProfit) /
            previousMonthData.totalProfit) *
          100
        : previousMonthData.totalProfit < 0 && currentMonthData.totalProfit > 0
          ? 100 // Passage de négatif à positif → +100%
          : null;

    const pLeads =
      previousMonthData.newLeads > 0
        ? ((currentMonthData.newLeads - previousMonthData.newLeads) /
            previousMonthData.newLeads) *
          100
        : null;

    const pConvs =
      previousMonthData.newConversions > 0
        ? ((currentMonthData.newConversions - previousMonthData.newConversions) /
            previousMonthData.newConversions) *
          100
        : null;

    const roiChange =
      currentMonthData.roiPercent !== null && previousMonthData.roiPercent !== null
        ? roundTo2(currentMonthData.roiPercent - previousMonthData.roiPercent)
        : null;

    comparison = {
      revenueChange: roundTo2(currentMonthData.totalRevenue - previousMonthData.totalRevenue),
      revenueChangePercent: pRev !== null ? roundTo2(pRev) : null,
      costChange: roundTo2(currentMonthData.totalCost - previousMonthData.totalCost),
      costChangePercent: pCost !== null ? roundTo2(pCost) : null,
      profitChange: roundTo2(currentMonthData.totalProfit - previousMonthData.totalProfit),
      profitChangePercent: pProfit !== null ? roundTo2(pProfit) : null,
      roiChange,
      leadsChange: currentMonthData.newLeads - previousMonthData.newLeads,
      leadsChangePercent: pLeads !== null ? roundTo2(pLeads) : null,
      conversionsChange: currentMonthData.newConversions - previousMonthData.newConversions,
      conversionsChangePercent: pConvs !== null ? roundTo2(pConvs) : null,
    };
  }

  // ── Extraire Top 5 et Bottom 5 campagnes depuis le ROI dashboard ───────
  // On ré-importe getCampaignRoiDashboardSummary si disponible
  let topCampaignsByRoi: TopBottomCampaign[] = [];
  let bottomCampaignsByRoi: TopBottomCampaign[] = [];

  try {
    const { getCampaignRoiDashboardSummary } = await import('./campaignRoi.service');
    const roiDashboard = await getCampaignRoiDashboardSummary();

    topCampaignsByRoi = roiDashboard.topCampaignsByRoi
      .slice(0, 5)
      .map((c) => ({
        campaignId: c.campaignId,
        name: c.name,
        totalCost: c.totalCost,
        totalRevenue: c.totalRevenue,
        netProfit: c.netProfit,
        roiPercent: c.roiPercent,
        roiStatus: c.roiStatus,
        confirmedSalesCount: c.confirmedSalesCount,
      }));

    bottomCampaignsByRoi = roiDashboard.negativeRoiCampaigns
      .slice(0, 5)
      .map((c) => ({
        campaignId: c.campaignId,
        name: c.name,
        totalCost: c.totalCost,
        totalRevenue: c.totalRevenue,
        netProfit: c.netProfit,
        roiPercent: c.roiPercent,
        roiStatus: c.roiStatus,
        confirmedSalesCount: c.confirmedSalesCount,
      }));
  } catch {
    // Silently fail — les données ROI dashboard ne sont pas critiques
  }

  return {
    currentMonth: currentMonthData,
    previousMonth: previousMonthData,
    comparison,
    overview,
    profitabilityByObjective,
    acquisitionCosts,
    monthlyTrends,
    topCampaignsByRoi,
    bottomCampaignsByRoi,
    availableMonths,
    selectedMonth: currentMonthData?.month ?? targetMonth,
    selectedYear: currentMonthData?.year ?? targetYear,
    reportGeneratedAt: new Date().toISOString(),
  };
}
