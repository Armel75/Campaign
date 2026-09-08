import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  TrendingDown,
  Minus,
  AlertTriangle,
  PiggyBank,
  Percent,
  Loader2,
  FileDown,
  Printer,
  ArrowUp,
  ArrowDown,
  MousePointerClick,
  Target,
  Award,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type MonthMetrics = {
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

type MonthComparison = {
  revenueChange: number;
  revenueChangePercent: number | null;
  costChange: number;
  costChangePercent: number | null;
  profitChange: number;
  profitChangePercent: number | null;
  roiChange: number | null;
  leadsChange: number;
  leadsChangePercent: number | null;
  conversionsChange: number;
  conversionsChangePercent: number | null;
};

type TopBottomCampaign = {
  campaignId: number;
  name: string;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  roiPercent: number | null;
  roiStatus: string;
  confirmedSalesCount: number;
};

type StrategicOverview = {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalBudget: number;
  totalExpenses: number;
  totalRevenue: number;
  totalProfit: number;
  globalRoiPercent: number | null;
};

type ProfitabilityByObjective = {
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

type AcquisitionCosts = {
  totalLeads: number;
  totalConversions: number;
  totalConfirmedConversions: number;
  totalConfirmedRevenue: number;
  totalBudget: number;
  costPerLead: number | null;
  costPerSale: number | null;
  roas: number | null;
};

type MonthlyTrend = {
  year: number;
  month: number;
  label: string;
  campaignsCreated: number;
  campaignsActive: number;
  newLeads: number;
  newConversions: number;
  confirmedRevenue: number;
  totalCost: number;
};

type ProfitabilityReport = {
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

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)} %`;
}

function formatRoiDisplay(value: number | null) {
  if (value === null) return '—';
  if (value > 100) {
    return `100%+ (ROI réel: ${value >= 0 ? '+' : ''}${value.toFixed(2)} %)`;
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)} %`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} k`;
  return value.toLocaleString('fr-FR');
}

function getTrendColor(value: number | null | undefined, inverse = false) {
  if (value === null || value === undefined) return 'text-muted-foreground';
  if (inverse) {
    if (value > 0) return 'text-red-500';
    if (value < 0) return 'text-green-500';
    return 'text-muted-foreground';
  }
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ProfitabilityDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfitabilityReport | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filterParams, setFilterParams] = useState<{ month?: number; year?: number }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (filterParams.month !== undefined) params.set('month', String(filterParams.month));
        if (filterParams.year !== undefined) params.set('year', String(filterParams.year));
        const qs = params.toString();
        const apiUrl = `/campaigns/profitability/report${qs ? `?${qs}` : ''}`;
        const res = await api.get(apiUrl);
        setData(res.data?.data ?? res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erreur lors du chargement du rapport de rentabilité.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filterParams]);

  // ── Export Excel ─────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (filterParams.month !== undefined) params.set('month', String(filterParams.month));
      if (filterParams.year !== undefined) params.set('year', String(filterParams.year));
      const qs = params.toString();
      const exportUrl = `/campaigns/profitability/export/excel${qs ? `?${qs}` : ''}`;
      const response = await api.get(exportUrl, {
        responseType: 'blob',
      });
      const disposition = response.headers['content-disposition'];
      let fileName = `rapport-rentabilite-${new Date().toISOString().slice(0, 7)}.xlsx`;
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match) fileName = match[1];
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erreur export Excel:', err);
    } finally {
      setExporting(false);
    }
  };

  // ── Export PDF (impression navigateur) ────────────────────────────────────
  const handleExportPdf = () => {
    window.print();
  };

  // ── Memoized chart data ─────────────────────────────────────────────────
  const roiPerformanceData = useMemo(() => {
    if (!data) return [];
    return data.profitabilityByObjective
      .filter((o) => o.roiPercent !== null)
      .map((o) => ({
        name: o.objectiveLabel.length > 20 ? o.objectiveLabel.substring(0, 20) + '…' : o.objectiveLabel,
        fullName: o.objectiveLabel,
        roi: o.roiPercent ?? 0,
        profit: o.totalProfit,
        cost: o.totalCost,
      }))
      .sort((a, b) => b.roi - a.roi);
  }, [data]);

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 print:space-y-4">
        {/* Skeleton header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-72 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        {/* Skeleton info */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700 dark:text-blue-300">Calcul des indicateurs de rentabilité en cours...</span>
        </div>

        {/* Skeleton KPI cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton table */}
        <Card className="rounded-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rapport de Rentabilité</h2>
          <p className="text-sm text-muted-foreground">Analyse détaillée de la rentabilité des campagnes</p>
        </div>

        <Card className="rounded-2xl border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Erreur de chargement</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { currentMonth, previousMonth, comparison, overview, acquisitionCosts, profitabilityByObjective, monthlyTrends, topCampaignsByRoi, bottomCampaignsByRoi, availableMonths } = data!;

  // Mois actuellement affiché (depuis la réponse API)
  const activeMonth = data!.selectedMonth;
  const activeYear = data!.selectedYear;
  const currentIndex = Math.max(0, availableMonths.findIndex(
    (m) => m.month === activeMonth && m.year === activeYear
  ));
  const hasPrevious = currentIndex < availableMonths.length - 1;
  const hasNext = currentIndex > 0;

  // ── Navigation mois ─────────────────────────────────────────────────────
  const goToMonth = (month: number, year: number) => {
    setFilterParams({ month, year });
  };

  const goToPrevious = () => {
    const idx = availableMonths.findIndex((m) => m.month === activeMonth && m.year === activeYear);
    if (idx < availableMonths.length - 1) {
      const prev = availableMonths[idx + 1];
      goToMonth(prev.month, prev.year);
    }
  };

  const goToNext = () => {
    const idx = availableMonths.findIndex((m) => m.month === activeMonth && m.year === activeYear);
    if (idx > 0) {
      const next = availableMonths[idx - 1];
      goToMonth(next.month, next.year);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 print:space-y-4 profitability-report">
      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <div className="print-break-avoid flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight">Rapport de Rentabilité</h2>
            <Badge variant="outline" className="text-sm bg-primary/5 border-primary/20">
              {currentMonth?.label ?? 'Général'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Analyse détaillée de la rentabilité des campagnes marketing
            {data?.reportGeneratedAt && (
              <span className="ml-2 text-xs opacity-60">
                · Généré le {new Date(data.reportGeneratedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </p>

          {/* ── FILTRE MOIS PREMIUM ──────────────────────────────────── */}
          {availableMonths && availableMonths.length > 0 && (
            <div className="mt-4 flex items-center gap-1.5 print:hidden">
              {/* Précédent - caché si un seul mois */}
              {availableMonths.length > 1 && (
                <button
                  type="button"
                  onClick={goToPrevious}
                  disabled={!hasPrevious}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Mois précédent"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Précédent</span>
                </button>
              )}

              {/* Pills des mois */}
              <div className="flex gap-1.5 py-1 flex-wrap">
                {availableMonths.map((m) => {
                  const isActive = m.month === activeMonth && m.year === activeYear;
                  return (
                    <button
                      key={`${m.year}-${m.month}`}
                      type="button"
                      onClick={() => goToMonth(m.month, m.year)}
                      className={`
                        relative px-3.5 py-1.5 rounded-full text-xs font-medium
                        transition-all duration-200 whitespace-nowrap
                        ${isActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }
                      `}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* Suivant - caché si un seul mois */}
              {availableMonths.length > 1 && (
                <button
                  type="button"
                  onClick={goToNext}
                  disabled={!hasNext}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Mois suivant"
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 print:hidden shrink-0">
          <Button
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting}
            className="gap-2 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Exporter le rapport en Excel (.xlsx)"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Exporter Excel
          </Button>
          <Button
            size="sm"
            onClick={handleExportPdf}
            className="gap-2 bg-red-600 text-white shadow-sm hover:bg-red-700"
            title="Exporter le rapport en PDF (impression)"
          >
            <Printer className="h-4 w-4" />
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* ── SECTION 1 : KPI MENSUELS AVEC COMPARAISON ───────────────── */}
      <div className="print-break-avoid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* ROI Mensuel */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROI Mensuel</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRoiDisplay(currentMonth?.roiPercent ?? null)}
            </div>
            {comparison && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(comparison.roiChange)}`}>
                {comparison.roiChange !== null && comparison.roiChange !== 0 && (
                  comparison.roiChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
                <span>
                  {comparison.roiChange !== null
                    ? `${comparison.roiChange >= 0 ? '+' : ''}${comparison.roiChange.toFixed(1)} pts vs ${previousMonth?.label ?? 'M-1'}`
                    : 'N/A'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenu Mensuel */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenu Mensuel</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonth ? formatCurrency(currentMonth.totalRevenue) : '—'}
            </div>
            {comparison && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(comparison.revenueChangePercent)}`}>
                {comparison.revenueChangePercent !== null && comparison.revenueChangePercent !== 0 && (
                  comparison.revenueChangePercent > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
                <span>
                  {comparison.revenueChangePercent !== null
                    ? `${formatPercent(comparison.revenueChangePercent)} vs ${previousMonth?.label ?? 'M-1'}`
                    : `${formatCurrency(comparison.revenueChange)} vs ${previousMonth?.label ?? 'M-1'}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profit Net */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Net</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(currentMonth?.totalProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {currentMonth ? formatCurrency(currentMonth.totalProfit) : '—'}
            </div>
            {comparison && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(comparison.profitChangePercent)}`}>
                {comparison.profitChangePercent !== null && comparison.profitChangePercent !== 0 && (
                  comparison.profitChangePercent > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
                <span>
                  {comparison.profitChangePercent !== null
                    ? `${formatPercent(comparison.profitChangePercent)} vs ${previousMonth?.label ?? 'M-1'}`
                    : `${formatCurrency(comparison.profitChange)} vs ${previousMonth?.label ?? 'M-1'}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coût Total */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coût Total</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonth ? formatCurrency(currentMonth.totalCost) : '—'}
            </div>
            {comparison && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(comparison.costChangePercent, true)}`}>
                {comparison.costChangePercent !== null && comparison.costChangePercent !== 0 && (
                  comparison.costChangePercent > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
                <span>
                  {comparison.costChangePercent !== null
                    ? `${formatPercent(comparison.costChangePercent)} vs ${previousMonth?.label ?? 'M-1'}`
                    : `${formatCurrency(comparison.costChange)} vs ${previousMonth?.label ?? 'M-1'}`}
                </span>
                {comparison.costChange !== 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {comparison.costChange > 0 ? '(hausse)' : '(baisse)'}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 2 : EFFICACITÉ ───────────────────────────────────── */}
      <div className="print-break-avoid grid gap-4 md:grid-cols-3">
        {/* Cost Per Lead */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost Per Lead (CPL)</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {acquisitionCosts.costPerLead !== null ? formatCurrency(acquisitionCosts.costPerLead) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {acquisitionCosts.totalLeads.toLocaleString('fr-FR')} leads générés
            </p>
          </CardContent>
        </Card>

        {/* Cost Per Sale */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost Per Sale (CPS)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {acquisitionCosts.costPerSale !== null ? formatCurrency(acquisitionCosts.costPerSale) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {acquisitionCosts.totalConfirmedConversions.toLocaleString('fr-FR')} ventes confirmées
            </p>
          </CardContent>
        </Card>

        {/* ROAS */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROAS (Retour sur Invest. Pub.)</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${(acquisitionCosts.roas ?? 0) >= 1 ? 'text-green-600' : 'text-red-500'}`}>
              {acquisitionCosts.roas !== null
                ? `${acquisitionCosts.roas.toFixed(2)}x`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {acquisitionCosts.roas !== null
                ? acquisitionCosts.roas >= 1
                  ? `${acquisitionCosts.roas.toFixed(2)} FCFA gagné pour 1 FCFA dépensé`
                  : `${acquisitionCosts.roas.toFixed(2)} FCFA pour 1 FCFA dépensé`
                : 'Non calculable'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 3 : COMPARAISON MOIS vs MOIS (TABLEAU) ──────────── */}
      {currentMonth && previousMonth && comparison && (
        <div className="print-break-avoid">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Comparaison {currentMonth.label} vs {previousMonth.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Métrique</th>
                      <th className="text-right py-3 px-2 font-semibold text-muted-foreground">{currentMonth.label}</th>
                      <th className="text-right py-3 px-2 font-semibold text-muted-foreground">{previousMonth.label}</th>
                      <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Variation</th>
                      <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Tendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: 'Revenu',
                        current: currentMonth.totalRevenue,
                        previous: previousMonth.totalRevenue,
                        change: comparison.revenueChange,
                        changePercent: comparison.revenueChangePercent,
                        format: formatCurrency,
                        inverse: false,
                      },
                      {
                        label: 'Coût',
                        current: currentMonth.totalCost,
                        previous: previousMonth.totalCost,
                        change: comparison.costChange,
                        changePercent: comparison.costChangePercent,
                        format: formatCurrency,
                        inverse: true,
                      },
                      {
                        label: 'Profit',
                        current: currentMonth.totalProfit,
                        previous: previousMonth.totalProfit,
                        change: comparison.profitChange,
                        changePercent: comparison.profitChangePercent,
                        format: formatCurrency,
                        inverse: false,
                      },
                      {
                        label: 'ROI',
                        current: currentMonth.roiPercent,
                        previous: previousMonth.roiPercent,
                        change: comparison.roiChange,
                        changePercent: null,
                        format: (v: number | null) => v !== null ? `${v.toFixed(1)}%` : '—',
                        inverse: false,
                      },
                      {
                        label: 'Leads générés',
                        current: currentMonth.newLeads,
                        previous: previousMonth.newLeads,
                        change: comparison.leadsChange,
                        changePercent: comparison.leadsChangePercent,
                        format: (v: number) => v.toLocaleString('fr-FR'),
                        inverse: false,
                      },
                      {
                        label: 'Conversions',
                        current: currentMonth.newConversions,
                        previous: previousMonth.newConversions,
                        change: comparison.conversionsChange,
                        changePercent: comparison.conversionsChangePercent,
                        format: (v: number) => v.toLocaleString('fr-FR'),
                        inverse: false,
                      },
                    ].map((row, idx) => {
                      const changeValue = row.change;
                      const hasChanged = changeValue !== null && changeValue !== 0;
                      const isPositive = changeValue !== null && changeValue > 0;

                      let trendColor = 'text-muted-foreground';
                      if (hasChanged) {
                        if (row.inverse) {
                          trendColor = isPositive ? 'text-red-500' : 'text-green-500';
                        } else {
                          trendColor = isPositive ? 'text-green-500' : 'text-red-500';
                        }
                      }

                      const TrendIcon = hasChanged
                        ? isPositive ? TrendingUp : TrendingDown
                        : Minus;

                      return (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3 px-2 font-medium">{row.label}</td>
                          <td className="text-right py-3 px-2">{row.format(row.current as any)}</td>
                          <td className="text-right py-3 px-2 text-muted-foreground">{row.format(row.previous as any)}</td>
                          <td className={`text-right py-3 px-2 font-semibold ${trendColor}`}>
                            {row.changePercent !== null
                              ? formatPercent(row.changePercent)
                              : row.change !== null
                                ? row.format(row.change as any)
                                : '—'}
                          </td>
                          <td className="text-right py-3 px-2">
                            {row.change !== null && row.change !== 0 && (
                              <TrendIcon className={`h-4 w-4 inline-block ${trendColor}`} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SECTION 4 : GRAPHIQUES ───────────────────────────────────── */}
      <div className="print-break-avoid grid gap-6 lg:grid-cols-7">
        {/* Graphique ROI par Objectif */}
        <Card className="rounded-2xl lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">ROI par Objectif</CardTitle>
          </CardHeader>
          <CardContent>
            {roiPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roiPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)} %`, 'ROI']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                  />
                  <Bar dataKey="roi" radius={[8, 8, 0, 0]}>
                    {roiPerformanceData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.roi >= 0 ? '#22c55e' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune donnée de ROI disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graphique Évolution mensuelle */}
        <Card className="rounded-2xl lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="confirmedRevenue"
                    stroke="#22c55e"
                    strokeWidth={3}
                    name="Revenu"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalCost"
                    stroke="#ef4444"
                    strokeWidth={3}
                    name="Coût"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune tendance mensuelle disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 5 : TOP / BOTTOM CAMPAGNES ──────────────────────── */}
      <div className="print-break-avoid grid gap-6 lg:grid-cols-2">
        {/* Top 5 */}
        <Card className="rounded-2xl border-green-200/30 dark:border-green-900/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Top Campagnes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topCampaignsByRoi.length > 0 ? (
              <div className="space-y-2">
                {topCampaignsByRoi.map((camp, idx) => (
                  <div
                    key={camp.campaignId}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/20 cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-950/40 transition-colors"
                    onClick={() => navigate(`/campaigns/${camp.campaignId}`)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-green-600 w-5 shrink-0">#{idx + 1}</span>
                      <span className="text-sm font-medium truncate">{camp.name}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-sm font-bold text-green-600">
                        {formatPercent(camp.roiPercent)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(camp.netProfit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune campagne performante
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bottom */}
        <Card className="rounded-2xl border-red-200/30 dark:border-red-900/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-lg">Campagnes en difficulté</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {bottomCampaignsByRoi.length > 0 ? (
              <div className="space-y-2">
                {bottomCampaignsByRoi.map((camp, idx) => (
                  <div
                    key={camp.campaignId}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/20 cursor-pointer hover:bg-red-100/50 dark:hover:bg-red-950/40 transition-colors"
                    onClick={() => navigate(`/campaigns/${camp.campaignId}`)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-red-500 w-5 shrink-0">#{idx + 1}</span>
                      <span className="text-sm font-medium truncate">{camp.name}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-sm font-bold text-red-500">
                        {formatPercent(camp.roiPercent)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(camp.netProfit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune campagne en difficulté
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 6 : RENTABILITÉ PAR OBJECTIF (TABLEAU) ──────────── */}
      <div className="print-break-avoid">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Rentabilité par Objectif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Objectif</th>
                    <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Campagnes</th>
                    <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Budget</th>
                    <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Revenu</th>
                    <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Coût</th>
                    <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Profit</th>
                    <th className="text-right py-3 px-2 font-semibold text-muted-foreground">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {profitabilityByObjective.length > 0 ? (
                    profitabilityByObjective.map((obj) => {
                      const roiPositive = (obj.roiPercent ?? 0) >= 0;
                      return (
                        <tr key={obj.objectiveId} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3 px-2 font-medium">{obj.objectiveLabel}</td>
                          <td className="text-right py-3 px-2">{obj.campaignCount}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(obj.totalBudget)}</td>
                          <td className="text-right py-3 px-2 text-green-600 font-medium">
                            {formatCurrency(obj.totalRevenueFromConversions)}
                          </td>
                          <td className="text-right py-3 px-2">{formatCurrency(obj.totalCost)}</td>
                          <td className={`text-right py-3 px-2 font-bold ${obj.totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatCurrency(obj.totalProfit)}
                          </td>
                          <td className={`text-right py-3 px-2 font-bold ${roiPositive ? 'text-green-600' : 'text-red-500'}`}>
                            {formatRoiDisplay(obj.roiPercent)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-muted-foreground">
                        Aucune donnée de rentabilité par objectif
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 7 : KPIS GLOBAUX (Vue d'ensemble DG) ────────────── */}
      <div className="print-break-avoid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROI Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${(overview.globalRoiPercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatRoiDisplay(overview.globalRoiPercent)}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCurrency(overview.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">{overview.totalCampaigns} campagnes</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dépenses Réelles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCurrency(overview.totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campagnes actives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{overview.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">{overview.completedCampaigns} terminées</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Styles d'impression ──────────────────────────────────────── */}
      <style>{`
        @media print {
          .profitability-report {
            font-size: 12px;
          }
          .print-break-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1.5cm;
            size: A4 landscape;
          }
        }
      `}</style>
    </div>
  );
}
