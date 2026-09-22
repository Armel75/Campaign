import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
  AlertTriangle,
  PiggyBank,
  MousePointerClick,
  Percent,
  Eye,
  Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

/** Statuts partagés avec l'API (services/roiStatus.ts). */
type CampaignRoiStatus =
  | 'CALCULATED'
  | 'ZERO_COST_ZERO_REVENUE'
  | 'NON_CALCULABLE_ZERO_COST'
  | 'NO_ESTABLISHED_REVENUE';

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
  roiStatus: CampaignRoiStatus;
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

type StrategicOverview = {
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

type StrategicDashboardSummary = {
  overview: StrategicOverview;
  profitabilityByObjective: ProfitabilityByObjective[];
  acquisitionCosts: AcquisitionCosts;
  monthlyTrends: MonthlyTrend[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value);
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

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ── Composant principal ────────────────────────────────────────────────────

export default function StrategicDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StrategicDashboardSummary | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/campaigns/strategic/summary');
        setData(res.data?.data ?? res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erreur lors du chargement des données.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Synthèse de rentabilité ─────────────────────────────────────────────
  const roiPerformanceData = useMemo(() => {
    if (!data) return [];
    return data.profitabilityByObjective
      .filter((o) => o.roiPercent !== null)
      .map((o) => ({
        name: o.objectiveLabel.length > 20
          ? o.objectiveLabel.substring(0, 20) + '…'
          : o.objectiveLabel,
        fullName: o.objectiveLabel,
        roi: o.roiPercent ?? 0,
        profit: o.totalProfit,
        cost: o.totalCost,
        campaigns: o.campaignCount,
      }))
      .sort((a, b) => b.roi - a.roi);
  }, [data]);

  // ── Données pour le pie chart (répartition budget par objectif) ─────────
  const budgetByObjectiveData = useMemo(() => {
    if (!data) return [];
    return data.profitabilityByObjective
      .map((o) => ({
        name: o.objectiveLabel.length > 15
          ? o.objectiveLabel.substring(0, 15) + '…'
          : o.objectiveLabel,
        fullName: o.objectiveLabel,
        value: o.totalBudget,
      }))
      .filter((o) => o.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // ── État de chargement ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Pilotage stratégique</h2>
            <p className="text-sm text-muted-foreground">Indicateurs de performance et rentabilité.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Chargement en cours…</span>
          </div>
        </div>

        {/* Bannière d'information */}
        <Card className="rounded-2xl border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Agrégation des données en cours</p>
              <p className="text-xs text-muted-foreground">
                Récupération des campagnes, calcul du ROI, synchronisation des ventes X3…
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Squelette des KPIs */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-28 mb-2" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Squelette du tableau */}
        <Card className="rounded-2xl">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Squelette des graphiques */}
        <div className="grid gap-4 lg:grid-cols-7">
          <Card className="rounded-2xl lg:col-span-4">
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl lg:col-span-3">
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-1">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <Skeleton className="h-[320px] w-full" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── État d'erreur ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pilotage stratégique</h2>
          <p className="text-sm text-muted-foreground">Indicateurs de performance et rentabilité.</p>
        </div>
        <Card className="rounded-2xl border-red-200 bg-red-50">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Erreur de chargement</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overview = data?.overview;
  const acquisition = data?.acquisitionCosts;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pilotage stratégique</h2>
          <p className="text-sm text-muted-foreground">
            Indicateurs de performance, rentabilité et tendances pour la direction.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          Données agrégées en temps réel
        </Badge>
      </div>

      {/* ─── Légende (haut) ────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border-muted bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p><strong>CPA</strong> = Coût Par Acquisition (Budget total / Nombre de leads)</p>
          <p><strong>ROAS</strong> = Return On Ad Spend (Revenu confirmé / Budget total)</p>
          <p><strong>ROI</strong> = (Revenu − Coût) / Coût × 100</p>
          <p className="pt-1">Les revenus correspondent aux conversions confirmées (type SALE). Les coûts correspondent au budget total des campagnes : un seul coût par campagne, jamais les dépenses.</p>
        </CardContent>
      </Card>

      {/* ── KPI de synthèse ───────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI global</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              overview &&
              overview.globalRoiStatus !== 'NO_ESTABLISHED_REVENUE' &&
              overview.globalRoiPercent !== null &&
              overview.globalRoiPercent >= 0
                ? 'text-green-600'
                : overview &&
                    overview.globalRoiStatus !== 'NO_ESTABLISHED_REVENUE' &&
                    overview.globalRoiPercent !== null &&
                    overview.globalRoiPercent < 0
                  ? 'text-red-500'
                  : ''
            }`}>
              {overview && overview.globalRoiStatus === 'NO_ESTABLISHED_REVENUE' ? (
                <span title="Aucune vente confirmée sur le périmètre : le ROI n'est pas calculable (le budget cumulé n'est pas une perte)">
                  —
                </span>
              ) : overview ? (
                formatRoiDisplay(overview.globalRoiPercent)
              ) : (
                '—'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenu {formatCurrency(overview?.totalRevenue ?? 0)} · Coût {formatCurrency(overview?.totalExpenses ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit net</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              !overview || overview.globalRoiStatus === 'NO_ESTABLISHED_REVENUE'
                ? ''
                : overview.totalProfit >= 0
                  ? 'text-green-600'
                  : 'text-red-500'
            }`}>
              {overview && overview.globalRoiStatus === 'NO_ESTABLISHED_REVENUE' ? (
                <span title="Aucune vente confirmée sur le périmètre : le profit n'est pas établi (le coût correspond au budget total des campagnes)">
                  —
                </span>
              ) : overview ? (
                formatCurrency(overview.totalProfit)
              ) : (
                '—'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Budget total : {formatCurrency(overview?.totalBudget ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campagnes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalCampaigns ?? '—'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview?.activeCampaigns} active(s) · {overview?.completedCampaigns} terminée(s)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROAS</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              acquisition && acquisition.roas !== null && acquisition.roas >= 1
                ? 'text-green-600'
                : acquisition && acquisition.roas !== null && acquisition.roas < 1
                  ? 'text-red-500'
                  : ''
            }`}>
              {acquisition?.roas !== null && acquisition?.roas !== undefined
                ? `${acquisition.roas.toFixed(2)}x`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenu / Budget total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Coûts d'acquisition ───────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coût par lead (CPA)</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {acquisition?.costPerLead !== null
                ? formatCurrency(acquisition?.costPerLead ?? 0)
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {acquisition?.totalLeads ?? 0} lead(s) généré(s)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coût par vente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {acquisition?.costPerSale !== null
                ? formatCurrency(acquisition?.costPerSale ?? 0)
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {acquisition?.totalConfirmedConversions ?? 0} vente(s) confirmée(s)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {acquisition && acquisition.totalLeads > 0
                ? `${((acquisition.totalConfirmedConversions / acquisition.totalLeads) * 100).toFixed(1)} %`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {acquisition?.totalConversions ?? 0} conversion(s) totale(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Rentabilité par objectif ──────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Rentabilité par objectif
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.profitabilityByObjective.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun objectif défini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">Objectif</th>
                    <th className="text-right py-3 px-2 font-medium">Campagnes</th>
                    <th className="text-right py-3 px-2 font-medium">Budget</th>
                    <th className="text-right py-3 px-2 font-medium">Revenu</th>
                    <th className="text-right py-3 px-2 font-medium">Coût</th>
                    <th className="text-right py-3 px-2 font-medium">Profit</th>
                    <th className="text-right py-3 px-2 font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.profitabilityByObjective.map((obj) => {
                    const roiPositive = obj.roiPercent !== null && obj.roiPercent >= 0;
                    const profitPositive = obj.totalProfit >= 0;
                    // Aucune vente confirmée ⇒ ni ROI ni profit affichables (évite un faux −100 %)
                    const revenueNotEstablished = obj.roiStatus === 'NO_ESTABLISHED_REVENUE';
                    return (
                      <tr key={obj.objectiveId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">
                          <span>{obj.objectiveLabel}</span>
                          <span className="text-xs text-muted-foreground ml-2">({obj.objectiveCode})</span>
                        </td>
                        <td className="text-right py-3 px-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/campaigns?objectiveId=${obj.objectiveId}`)}
                            className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                          >
                            <Eye className="h-3 w-3" />
                            {obj.campaignCount} Voir
                          </button>
                        </td>
                        <td className="text-right py-3 px-2">{formatCurrency(obj.totalBudget)}</td>
                        <td className="text-right py-3 px-2">{formatCurrency(obj.totalRevenueFromConversions)}</td>
                        <td className="text-right py-3 px-2">{formatCurrency(obj.totalCost)}</td>
                        <td className={`text-right py-3 px-2 font-medium ${
                          revenueNotEstablished ? '' : profitPositive ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {revenueNotEstablished ? '—' : formatCurrency(obj.totalProfit)}
                        </td>
                        <td className={`text-right py-3 px-2 font-bold ${
                          revenueNotEstablished ? '' : roiPositive ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {revenueNotEstablished ? '—' : formatRoiDisplay(obj.roiPercent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Graphiques ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* ROI par objectif */}
        <Card className="rounded-2xl lg:col-span-4">
          <CardHeader>
            <CardTitle>ROI par objectif</CardTitle>
          </CardHeader>
          <CardContent>
            {roiPerformanceData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée de ROI calculable.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roiPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'roi') return [`${value.toFixed(2)} %`, 'ROI'];
                      if (name === 'profit') return [formatCurrency(value), 'Profit'];
                      return [value, name];
                    }}
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
            )}
          </CardContent>
        </Card>

        {/* Répartition budget par objectif */}
        <Card className="rounded-2xl lg:col-span-3">
          <CardHeader>
            <CardTitle>Budget par objectif</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetByObjectiveData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucun budget alloué.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={budgetByObjectiveData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {budgetByObjectiveData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tendances mensuelles ──────────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendances mensuelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.monthlyTrends.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée historique.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data?.monthlyTrends ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="newLeads"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Nouveaux leads"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="newConversions"
                  stroke="#22c55e"
                  strokeWidth={3}
                  name="Nouvelles conversions"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="campaignsCreated"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Campagnes créées"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ─── Revenus vs Coûts mensuels ────────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenus vs Coûts (mensuel)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.monthlyTrends.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée historique.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.monthlyTrends ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="confirmedRevenue" name="Revenu" radius={[8, 8, 0, 0]} fill="#22c55e" />
                <Bar dataKey="totalCost" name="Coût" radius={[8, 8, 0, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ─── Légende / Note ───────────────────────────────────────────────── */}
      <Card className="rounded-2xl border-muted bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p><strong>CPA</strong> = Coût Par Acquisition (Budget total / Nombre de leads)</p>
          <p><strong>ROAS</strong> = Return On Ad Spend (Revenu confirmé / Budget total)</p>
          <p><strong>ROI</strong> = (Revenu − Coût) / Coût × 100</p>
          <p className="pt-1">Les revenus correspondent aux conversions confirmées (type SALE). Les coûts correspondent au budget total des campagnes : un seul coût par campagne, jamais les dépenses.</p>
        </CardContent>
      </Card>
    </div>
  );
}
