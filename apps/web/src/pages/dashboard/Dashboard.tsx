import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  FolderKanban,
  TrendingUp,
  Clock3,
  Megaphone,
  Package,
  Eye,
  FileSpreadsheet,
  Filter,
  Loader2,
  Plus,
} from 'lucide-react';
import KpiTargetModal from '@/components/KpiTargetModal';

type CampaignArticle = {
  id: string | number;
  designation?: string;
  plannedQuantity?: number | null;
  soldQuantity?: number | null;
  currentQuantity?: number | null;
  codeSageX3?: string;
  codeSage100?: string;
};

type Campaign = {
  id: string | number;
  name: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  updatedAt?: string;
  createdAt?: string;
  objective?: { label?: string };
  totalBudget?: number | string | null;
  articles?: CampaignArticle[];
  createdBy?: { id?: string | number } | null;
  kpiTargets?: {
    kpiName?: string;
    targetValue?: number | string;
  }[];
  _count?: {
    leads?: number;
    tasks?: number;
    attachments?: number;
    articles?: number;
    conversions?: number;
  };
};

type Lead = {
  id: string | number;
  name?: string;
  email?: string;
  status?: string;
  createdAt?: string;
};

type Task = {
  id: string | number;
  title?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  campaign?: {
    id?: string | number;
    name?: string;
    title?: string;
  };
  assignee?: {
    id?: string | number;
    username?: string;
  };
};

type Conversion = {
  id: string | number;
  createdAt?: string;
  amount?: number | string;
  status?: string;
  type?: string;
};

type DashboardStats = {
  activeCampaigns: number;
  totalCampaigns: number;
  totalLeads: number;
  totalTasks: number;
  overdueTasks: number;
  plannedCampaigns: number;
  pausedCampaigns: number;
  completedCampaigns: number;
  totalConversions: number;
  conversionRate: number;
  totalExpenses: number;
  totalBudget: number | null;
  remainingBudget: number | null;
};

type CampaignRoiStatus =
  | 'CALCULATED'
  | 'ZERO_COST_ZERO_REVENUE'
  | 'NON_CALCULABLE_ZERO_COST';

type RoiDashboardCampaignItem = {
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

type RoiDashboardSummary = {
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
  topCampaignsByRoi: RoiDashboardCampaignItem[];
  negativeRoiCampaigns: RoiDashboardCampaignItem[];
  nonCalculableRoiCampaigns: RoiDashboardCampaignItem[];
};

function safeArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isDateValid(value?: string) {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value) + ' %';
}

function formatDate(value?: string) {
  if (!isDateValid(value)) return '—';
  return new Date(value as string).toLocaleDateString('fr-FR');
}

function normalizeStatus(status?: string) {
  return String(status || '').trim().toUpperCase();
}

function isSilentHttpError(error: any) {
  return error?.response?.status === 403;
}

function getCampaignStatusBadge(status?: string) {
  const s = normalizeStatus(status);

  switch (s) {
    case 'ACTIVE':
      return (
        <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100">
          Active
        </Badge>
      );
    case 'BROUILLON':
    case 'DRAFT':
      return <Badge variant="secondary">Brouillon</Badge>;
    case 'PLANIFIEE':
      return (
        <Badge className="border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-100">
          Planifiée
        </Badge>
      );
    case 'EN_PAUSE':
    case 'PAUSED':
      return (
        <Badge className="border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          En pause
        </Badge>
      );
    case 'TERMINEE':
    case 'COMPLETED':
      return (
        <Badge className="border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-100">
          Terminée
        </Badge>
      );
    default:
      return <Badge variant="outline">{status || 'Inconnu'}</Badge>;
  }
}

function getTaskStatusBadge(status?: string) {
  const s = String(status || '').trim();

  switch (s) {
    case 'À faire':
      return <Badge variant="secondary">À faire</Badge>;
    case 'En cours':
      return (
        <Badge className="border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-100">
          En cours
        </Badge>
      );
    case 'Terminé':
      return (
        <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100">
          Terminé
        </Badge>
      );
    default:
      return <Badge variant="outline">{status || 'Inconnu'}</Badge>;
  }
}

function getRoiStatusBadge(status?: CampaignRoiStatus) {
  switch (status) {
    case 'CALCULATED':
      return (
        <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100">
          Calculé
        </Badge>
      );
    case 'ZERO_COST_ZERO_REVENUE':
      return (
        <Badge className="border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-100">
          Coût nul / revenu nul
        </Badge>
      );
    case 'NON_CALCULABLE_ZERO_COST':
      return (
        <Badge className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100">
          Non calculable
        </Badge>
      );
    default:
      return <Badge variant="outline">—</Badge>;
  }
}

// Fonction pour formater le ROI avec cap à 100%+ si exceptionnel
function formatRoiDisplay(roiPercent: number | null) {
  if (roiPercent === null) return { display: '—', isExceptional: false, actual: null };
  
  const isExceptional = roiPercent > 100;
  const displayValue = isExceptional ? '100%+' : formatPercent(roiPercent);
  
  return {
    display: displayValue,
    isExceptional,
    actual: roiPercent,
    tooltip: isExceptional ? `ROI réel : ${formatPercent(roiPercent)}` : null,
  };
}

const KPI_LABELS: Record<string, string> = {
  SOLD_QUANTITY: 'Qté vendue',
  REVENUE: 'Revenu',
  LEADS: 'Leads',
  CONVERSIONS: 'Conversions',
  CLIENTS: 'Clients',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingRoi, setLoadingRoi] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [kpiTargetCampaignId, setKpiTargetCampaignId] = useState<string | number | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  // const [expenses, setExpenses] = useState<Expense[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [roiDashboard, setRoiDashboard] = useState<RoiDashboardSummary | null>(null);
  type Period = '7j' | '30j' | '90j' | 'annee' | 'tout';
  const [period, setPeriod] = useState<Period>('annee');
  // const roi = roiDashboard ?? {
  //   totalConfirmedRevenue: 0,
  //   totalRealCost: 0,
  //   totalNetProfit: 0,
  //   globalRoiPercent: null,
  //   globalRoiStatus: 'NON_CALCULABLE_ZERO_COST',
  //   totalConfirmedSalesCount: 0,
  //   topCampaignsByRoi: [],
  //   negativeRoiCampaigns: [],
  //   nonCalculableRoiCampaigns: [],
  // };

  const [stats, setStats] = useState<DashboardStats>({
    activeCampaigns: 0,
    totalCampaigns: 0,
    totalLeads: 0,
    totalTasks: 0,
    overdueTasks: 0,
    plannedCampaigns: 0,
    pausedCampaigns: 0,
    completedCampaigns: 0,
    totalConversions: 0,
    conversionRate: 0,
    totalExpenses: 0,
    totalBudget: null,
    remainingBudget: null,
  });

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        setLoadingBase(true);

        const [
          campaignsResult,
          leadsResult,
          tasksResult,
          conversionsResult,
        ] = await Promise.allSettled([
          api.get('/campaigns', { params: { page: 1, limit: 100 } }),
          api.get('/leads'),
          api.get('/tasks'),
          api.get('/expenses'),
          api.get('/conversions'),
        ]);

        const campaignsData =
          campaignsResult.status === 'fulfilled'
            ? safeArray<Campaign>(campaignsResult.value.data?.data)
            : [];

        const leadsData =
          leadsResult.status === 'fulfilled'
            ? safeArray<Lead>(leadsResult.value.data?.data || leadsResult.value.data)
            : [];

        const tasksData =
          tasksResult.status === 'fulfilled'
            ? safeArray<Task>(tasksResult.value.data?.data || tasksResult.value.data)
            : [];

        const conversionsData =
          conversionsResult.status === 'fulfilled'
            ? safeArray<Conversion>(conversionsResult.value.data?.data || conversionsResult.value.data)
            : [];

        setCampaigns(campaignsData);
        setLeads(leadsData);
        setTasks(tasksData);
        //setExpenses(expensesData);
        setConversions(conversionsData);

        const activeCampaigns = campaignsData.filter((campaign) => {
          const status = normalizeStatus(campaign.status);
          return status === 'ACTIVE';
        }).length;

        const plannedCampaigns = campaignsData.filter((campaign) => {
          const status = normalizeStatus(campaign.status);
          return status === 'PLANIFIEE';
        }).length;

        const pausedCampaigns = campaignsData.filter((campaign) => {
          const status = normalizeStatus(campaign.status);
          return status === 'EN_PAUSE' || status === 'PAUSED';
        }).length;

        const completedCampaigns = campaignsData.filter((campaign) => {
          const status = normalizeStatus(campaign.status);
          return status === 'TERMINEE' || status === 'COMPLETED';
        }).length;

        const overdueTasks = tasksData.filter((task) => {
          if (!task.dueDate || !isDateValid(task.dueDate)) return false;
          const due = new Date(task.dueDate);
          const now = new Date();
          const isDone = String(task.status || '').trim() === 'Terminé';
          return due < now && !isDone;
        }).length;

        const totalConversions = conversionsData.length;
        const conversionRate =
          leadsData.length > 0 ? Number(((totalConversions / leadsData.length) * 100).toFixed(1)) : 0;

        const totalCampaignBudget = campaignsData.reduce(
          (sum, c) => sum + toNumber(c.totalBudget),
          0
        );

        setStats({
          activeCampaigns,
          totalCampaigns: campaignsData.length,
          totalLeads: leadsData.length,
          totalTasks: tasksData.length,
          overdueTasks,
          plannedCampaigns,
          pausedCampaigns,
          completedCampaigns,
          totalConversions,
          conversionRate,
          totalExpenses: totalCampaignBudget,
          totalBudget: totalCampaignBudget,
          remainingBudget: 0,
        });

        if (campaignsResult.status === 'rejected' && !isSilentHttpError(campaignsResult.reason)) {
          console.error('Erreur campagnes :', campaignsResult.reason);
        }
        if (leadsResult.status === 'rejected' && !isSilentHttpError(leadsResult.reason)) {
          console.error('Erreur leads :', leadsResult.reason);
        }
        if (tasksResult.status === 'rejected' && !isSilentHttpError(tasksResult.reason)) {
          console.error('Erreur tasks :', tasksResult.reason);
        }
        if (conversionsResult.status === 'rejected' && !isSilentHttpError(conversionsResult.reason)) {
          console.error('Erreur conversions :', conversionsResult.reason);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingBase(false);
      }
    };

    const fetchRoiData = async () => {
      try {
        setLoadingRoi(true);
        const roiResult = await api.get('/campaigns/roi/dashboard-summary');
        const roiDashboardData = roiResult.data?.data || roiResult.data;
        setRoiDashboard(roiDashboardData);
      } catch (error) {
        if (!isSilentHttpError(error)) {
          console.error('Erreur ROI dashboard :', error);
        }
      } finally {
        setLoadingRoi(false);
      }
    };

    fetchBaseData();
    fetchRoiData();
  }, []);

  // Recharge les campagnes après sauvegarde des objectifs KPI (pour rafraîchir la carte)
  const refreshCampaigns = useCallback(async () => {
    try {
      const res = await api.get('/campaigns', { params: { page: 1, limit: 100 } });
      setCampaigns(safeArray<Campaign>(res.data?.data));
    } catch {
      // Silencieux : on conserve l'état actuel
    }
  }, []);

  const campaignsByStatusData = useMemo(() => {
    return [
      { name: 'Actives', value: stats.activeCampaigns },
      { name: 'Planifiées', value: stats.plannedCampaigns },
      { name: 'En pause', value: stats.pausedCampaigns },
      { name: 'Terminées', value: stats.completedCampaigns },
    ];
  }, [stats]);

  const budgetData = useMemo(() => {
    return [
      {
        name: 'Budget',
        montant: stats.totalBudget,
      },
      {
        name: 'Dépenses',
        montant: stats.totalExpenses,
      },
      {
        name: 'Reste',
        montant: stats.remainingBudget,
      },
    ];
  }, [stats]);

  const getCutoffDate = (p: Period): Date | null => {
    const now = new Date();
    switch (p) {
      case '7j':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      case '30j':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case '90j':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case 'annee':
        return new Date(now.getFullYear(), 0, 1);
      case 'tout':
      default:
        return null;
    }
  };

  const filteredLeads = useMemo(() => {
    const cutoff = getCutoffDate(period);
    if (!cutoff) return leads;
    return leads.filter((l) => l.createdAt && new Date(l.createdAt) >= cutoff);
  }, [leads, period]);

  const filteredConversions = useMemo(() => {
    const cutoff = getCutoffDate(period);
    if (!cutoff) return conversions;
    return conversions.filter((c) => c.createdAt && new Date(c.createdAt) >= cutoff);
  }, [conversions, period]);

  const filteredTasks = useMemo(() => {
    const cutoff = getCutoffDate(period);
    if (!cutoff) return tasks;
    return tasks.filter((t) => t.createdAt && new Date(t.createdAt) >= cutoff);
  }, [tasks, period]);

  const performanceData = useMemo(() => {
    try {
      const monthMap = new Map<string, { name: string; leads: number; conversions: number }>();

      // Agrège les leads par mois
      for (const lead of filteredLeads) {
        if (!lead.createdAt) continue;
        const d = new Date(lead.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('fr-FR', { month: 'short' });
        const entry = monthMap.get(key) || { name: label, leads: 0, conversions: 0 };
        entry.leads++;
        monthMap.set(key, entry);
      }

      // Agrège les conversions par mois
      for (const conv of filteredConversions) {
        if (!conv.createdAt) continue;
        const d = new Date(conv.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('fr-FR', { month: 'short' });
        const entry = monthMap.get(key) || { name: label, leads: 0, conversions: 0 };
        entry.conversions++;
        monthMap.set(key, entry);
      }

      return Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => value);
    } catch {
      return [];
    }
  }, [filteredLeads, filteredConversions]);

  const recentCampaigns = useMemo(() => {
    const sorted = [...campaigns].sort((a, b) => {
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });

    return sorted.slice(0, 5);
  }, [campaigns]);

  const urgentTasks = useMemo(() => {
    const sorted = [...filteredTasks]
      .filter((task) => task.dueDate)
      .sort((a, b) => {
        const da = new Date(a.dueDate || 0).getTime();
        const db = new Date(b.dueDate || 0).getTime();
        return da - db;
      });

    return sorted.slice(0, 5);
  }, [filteredTasks]);

  const activeCampaignCards = useMemo(() => {
    const roiByCampaignId = new Map<number, RoiDashboardCampaignItem>();
    for (const item of roiDashboard?.topCampaignsByRoi ?? []) {
      roiByCampaignId.set(item.campaignId, item);
    }
    for (const item of roiDashboard?.negativeRoiCampaigns ?? []) {
      if (!roiByCampaignId.has(item.campaignId)) roiByCampaignId.set(item.campaignId, item);
    }
    for (const item of roiDashboard?.nonCalculableRoiCampaigns ?? []) {
      if (!roiByCampaignId.has(item.campaignId)) roiByCampaignId.set(item.campaignId, item);
    }

    return campaigns
      .filter((c) => normalizeStatus(c.status) === 'ACTIVE')
      .map((campaign) => {
        const articles = campaign.articles || [];
        const totalSold = articles.reduce((sum, a) => sum + (a.soldQuantity ?? 0), 0);
        const totalPlanned = articles.reduce((sum, a) => sum + (a.plannedQuantity ?? 0), 0);
        const roi = roiByCampaignId.get(Number(campaign.id));

        const cost = roi?.totalCost ?? 0;
        const revenue = roi?.totalRevenue ?? 0;
        const profit = revenue - cost;

        const leadsCount = campaign._count?.leads ?? 0;
        const conversionsCount = campaign._count?.conversions ?? 0;
        const salesCount = roi?.confirmedSalesCount ?? 0;

        // Objectifs KPI définis + atteinte en temps réel (calcul local, sans fetch supplémentaire)
        const kpiTargets = (Array.isArray(campaign.kpiTargets) ? campaign.kpiTargets : [])
          .map((t) => ({
            kpiName: t.kpiName ?? '',
            targetValue: Number(t.targetValue) || 0,
          }))
          .filter((t) => t.kpiName && t.targetValue > 0);

        const currentByKpi: Record<string, number> = {
          SOLD_QUANTITY: totalSold,
          REVENUE: revenue,
          LEADS: leadsCount,
          CONVERSIONS: conversionsCount,
          CLIENTS: salesCount,
        };

        const kpiBreakdown = kpiTargets.map((t) => {
          const current = currentByKpi[t.kpiName] ?? 0;
          const pct = Math.min(Math.round((current / t.targetValue) * 100), 100);
          return {
            kpiName: t.kpiName,
            label: KPI_LABELS[t.kpiName] ?? t.kpiName,
            current,
            targetValue: t.targetValue,
            pct,
          };
        });

        const kpiAttainment =
          kpiBreakdown.length > 0
            ? Math.round(kpiBreakdown.reduce((sum, k) => sum + k.pct, 0) / kpiBreakdown.length)
            : null;

        return {
          id: campaign.id,
          createdById: campaign.createdBy?.id ?? null,
          name: campaign.name,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          leads: leadsCount,
          conversions: conversionsCount,
          tasks: campaign._count?.tasks ?? 0,
          totalSold,
          totalPlanned,
          revenue,
          cost,
          profit,
          salesCount,
          articleCount: articles.length,
          roiPercent: roi?.roiPercent ?? null,
          conversionRate: leadsCount > 0
            ? Math.round((conversionsCount / leadsCount) * 100)
            : 0,
          kpiTargets,
          kpiBreakdown,
          kpiAttainment,
        };
      });
  }, [campaigns, roiDashboard]);

  const businessAlerts = useMemo(() => {
    const alerts: { id: string; label: string; level: 'high' | 'medium' | 'low' }[] = [];

    campaigns.forEach((campaign) => {
      const status = normalizeStatus(campaign.status);
      const taskCount = campaign._count?.tasks ?? 0;
      const leadCount = campaign._count?.leads ?? 0;
      const articleCount = campaign._count?.articles ?? 0;

      if (status === 'ACTIVE' && taskCount === 0) {
        alerts.push({
          id: `campaign-no-task-${campaign.id}`,
          label: `La campagne "${campaign.name}" est active mais ne possède aucune tâche.`,
          level: 'high',
        });
      }

      if (status === 'ACTIVE' && leadCount === 0) {
        alerts.push({
          id: `campaign-no-lead-${campaign.id}`,
          label: `La campagne "${campaign.name}" est active mais n'a encore généré aucun lead.`,
          level: 'medium',
        });
      }

      if (status === 'ACTIVE' && articleCount === 0) {
        alerts.push({
          id: `campaign-no-article-${campaign.id}`,
          label: `La campagne "${campaign.name}" est active mais ne contient aucun article.`,
          level: 'medium',
        });
      }

      if (
        status === 'ACTIVE' &&
        campaign.endDate &&
        isDateValid(campaign.endDate) &&
        new Date(campaign.endDate) < new Date()
      ) {
        alerts.push({
          id: `campaign-end-passed-${campaign.id}`,
          label: `La campagne "${campaign.name}" a dépassé sa date de fin mais reste active.`,
          level: 'high',
        });
      }
    });

    return alerts.slice(0, 6);
  }, [campaigns]);

  const budgetUsagePercent =
    stats.totalBudget != null && stats.totalBudget > 0
      ? Math.min((stats.totalExpenses / stats.totalBudget) * 100, 100)
      : 0;

  const pieColors = ['#22c55e', '#3b82f6', '#f59e0b', '#64748b'];

  const conversionStats = useMemo(() => {
    const confirmed = filteredConversions.filter((item) => normalizeStatus(item.status) === 'CONFIRMED').length;
    const pending = filteredConversions.filter((item) => normalizeStatus(item.status) === 'PENDING').length;
    const cancelled = filteredConversions.filter((item) => normalizeStatus(item.status) === 'CANCELLED').length;
    const rejected = filteredConversions.filter((item) => normalizeStatus(item.status) === 'REJECTED').length;
    const confirmedAmount = filteredConversions
      .filter((item) => normalizeStatus(item.status) === 'CONFIRMED')
      .reduce((sum, item) => sum + toNumber(item.amount), 0);

    return {
      confirmed,
      pending,
      cancelled,
      rejected,
      confirmedAmount,
    };
  }, [filteredConversions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
          <p className="text-sm text-muted-foreground">
            Vue globale des campagnes, urgences, performances et budget.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton Nouvelle campagne (permission de création requise) */}
          {user?.permissions?.canCreateCampaign && (
            <Button onClick={() => navigate('/campaigns/new')} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" /> Nouvelle campagne
            </Button>
          )}
          {/* Filtre période */}
          <div className="flex items-center gap-2 rounded-xl border-2 border-primary/15 bg-primary/[0.04] px-3 py-1.5 shadow-sm">
            <Filter className="h-4 w-4 text-primary shrink-0" />
            <div className="flex items-center gap-0.5">
              {(['7j', '30j', '90j', 'annee', 'tout'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {p === '7j' ? '7j' : p === '30j' ? '30j' : p === '90j' ? '90j' : p === 'annee' ? 'Année' : 'Tout'}
              </button>
            ))}
            </div>
          </div>

          {loadingBase ? (
            <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Chargement en cours…</span>
            </div>
          ) : (
            <Badge variant="outline" className="w-fit">
              Données à jour
            </Badge>
          )}
        </div>
      </div>

      {/* CAMPAGNES EN COURS (PREMIUM) */}
      {activeCampaignCards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold">Campagnes en cours</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCampaignCards.map((camp) => {
              const daysLeft = camp.endDate
                ? Math.max(0, Math.ceil((new Date(camp.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : null;
              const elapsedDays = camp.startDate
                ? Math.max(0, Math.ceil((Date.now() - new Date(camp.startDate).getTime()) / (1000 * 60 * 60 * 24)))
                : 0;
              const totalDuration = camp.startDate && camp.endDate
                ? Math.max(1, Math.ceil((new Date(camp.endDate).getTime() - new Date(camp.startDate).getTime()) / (1000 * 60 * 60 * 24)))
                : 1;
              const displayDays = Math.min(elapsedDays, totalDuration);
              const progress = Math.min(Math.round((displayDays / totalDuration) * 100), 100);
              const isOverdue = camp.endDate ? new Date(camp.endDate) < new Date() : false;
              const canEditThisCampaign =
                !!user?.permissions?.canEditAllCampaigns ||
                String(user?.id) === String(camp.createdById);

              return (
                <div
                  key={camp.id}
                  className="group cursor-pointer rounded-2xl border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/30"
                  onClick={() => navigate(`/campaigns/${camp.id}`)}
                >
                  {/* En-tête */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500 animate-pulse" />
                      <p className="font-semibold text-sm break-words">{camp.name}</p>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-sm font-medium px-2.5 py-1">
                        <Package className="h-4 w-4" />
                        {camp.articleCount} article{camp.articleCount > 1 ? 's' : ''} engagé{camp.articleCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Badge className="shrink-0 bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                      Active
                    </Badge>
                  </div>

                  {/* Barre de progression */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Progression</span>
                      <span className={`text-base font-bold ${
                        isOverdue ? 'text-red-500' : progress >= 100 ? 'text-emerald-600' : totalDuration - displayDays <= 7 ? 'text-amber-600' : ''
                      }`}>{progress}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverdue
                            ? 'bg-gradient-to-r from-red-500 to-rose-400'
                            : progress >= 100
                              ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                              : totalDuration - displayDays <= 7
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                : 'bg-gradient-to-r from-primary to-primary/70'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* ROI */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Retour sur investissement</span>
                      {loadingRoi ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Calcul en cours…
                        </span>
                      ) : (
                        (() => {
                          const roiInfo = formatRoiDisplay(camp.roiPercent);
                          const colorClass = camp.roiPercent !== null && camp.roiPercent >= 0 ? 'text-green-600' : camp.roiPercent !== null && camp.roiPercent < 0 ? 'text-red-500' : '';
                          return (
                            <span 
                              className={`text-base font-bold ${colorClass}`}
                              title={roiInfo.tooltip || undefined}
                            >
                              {roiInfo.display === '—' ? '—' : (camp.roiPercent !== null && camp.roiPercent >= 0 ? '+' : '') + roiInfo.display}
                            </span>
                          );
                        })()
                      )}
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${!loadingRoi && camp.roiPercent !== null && camp.roiPercent >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : !loadingRoi && camp.roiPercent !== null && camp.roiPercent < 0 ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-muted-foreground/10'}`}
                        style={{ width: !loadingRoi && camp.roiPercent !== null ? `${Math.min(Math.abs(camp.roiPercent), 100)}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Atteinte objectifs KPI */}
                  {camp.kpiAttainment !== null && (
                    <div
                      className="mb-4"
                      title={camp.kpiBreakdown
                        .map((k) => `${k.label} : ${k.current.toLocaleString('fr-FR')} / ${k.targetValue.toLocaleString('fr-FR')} (${k.pct}%)`)
                        .join('\n')}
                    >
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Objectifs KPI</span>
                        <span className={`text-base font-bold ${
                          camp.kpiAttainment >= 100
                            ? 'text-emerald-600'
                            : camp.kpiAttainment >= 75
                              ? 'text-emerald-500'
                              : camp.kpiAttainment >= 50
                                ? 'text-amber-500'
                                : 'text-red-500'
                        }`}>
                          {camp.kpiAttainment}% atteint
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${
                            camp.kpiAttainment >= 100
                              ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                              : camp.kpiAttainment >= 75
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : camp.kpiAttainment >= 50
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                  : 'bg-gradient-to-r from-red-500 to-rose-400'
                          }`}
                          style={{ width: `${camp.kpiAttainment}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Métriques */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-xl border bg-background/50 px-3 py-2.5">
                      <div className="text-xs text-muted-foreground">Vendu</div>
                      <div className="text-base font-bold">
                        {camp.totalSold > 0 ? camp.totalSold.toLocaleString('fr-FR') : '—'}{' '}
                        {camp.totalPlanned > 0 && (
                          <span className="text-xs text-muted-foreground font-normal">
                            / {camp.totalPlanned.toLocaleString('fr-FR')} prév.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background/50 px-3 py-2.5">
                      <div className="text-xs text-muted-foreground">Revenu</div>
                      <div className="text-base font-bold">
                        {loadingRoi ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Calcul...
                          </span>
                        ) : (
                          <>{camp.revenue > 0 ? camp.revenue.toLocaleString('fr-FR') : '—'} FCFA</>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background/50 px-3 py-2.5">
                      <div className="text-xs text-muted-foreground">Coût</div>
                      <div className="text-base font-bold">
                        {loadingRoi ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Calcul...
                          </span>
                        ) : (
                          <>{camp.cost > 0 ? camp.cost.toLocaleString('fr-FR') : '—'} FCFA</>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background/50 px-3 py-2.5">
                      <div className="text-xs text-muted-foreground">Profit</div>
                      <div className={`text-base font-bold ${camp.profit > 0 ? 'text-green-600' : camp.profit < 0 ? 'text-red-500' : ''}`}>
                        {loadingRoi ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Calcul...
                          </span>
                        ) : (
                          <>{camp.cost > 0 || camp.revenue > 0
                            ? `${camp.profit > 0 ? '+' : ''}${camp.profit.toLocaleString('fr-FR')} FCFA`
                            : '—'}</>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background/50 px-3 py-2.5">
                      <div className="text-xs text-muted-foreground">Leads</div>
                      <div className="text-base font-bold">{camp.leads}</div>
                    </div>
                    <div className="rounded-xl border bg-background/50 px-3 py-2.5">
                      <div className="text-xs text-muted-foreground">Conversions</div>
                      <div className="text-base font-bold">
                        {camp.conversions}
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          ({camp.conversionRate}%)
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background/50 px-3 py-2.5">
                      <div className="text-xs text-muted-foreground">Clients</div>
                      <div className="text-base font-bold">{camp.salesCount > 0 ? camp.salesCount : '—'}</div>
                    </div>
                  </div>

                  {/* Pied */}
                  <div className="text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span>
                        {loadingRoi
                          ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Chargement…</span>
                              <span className="text-muted-foreground/50">·</span>
                              <span>{camp.totalSold.toLocaleString('fr-FR')} article(s) vendu(s)</span>
                            </span>
                          )
                          : <><span className="font-bold">{camp.salesCount}</span> vente(s) confirmée(s) · <span className="font-bold">{camp.totalSold.toLocaleString('fr-FR')}</span> article(s) vendu(s)</>
                        }
                      </span>
                      {camp.tasks > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 font-semibold">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-bold">{camp.tasks}</span> tâche{camp.tasks > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {daysLeft !== null && (
                        <span className={`font-bold ${daysLeft <= 7 ? 'text-amber-600' : ''}`}>
                          J-{daysLeft}
                        </span>
                      )}
                      <span className="font-semibold">
                        Jour {elapsedDays}/{totalDuration}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">
                        {camp.startDate ? new Date(camp.startDate).toLocaleDateString('fr-FR') : '?'} → {camp.endDate ? new Date(camp.endDate).toLocaleDateString('fr-FR') : '?'}
                      </span>
                    </div>
                  </div>

                  {/* Bouton Voir informations */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/campaigns/${camp.id}`);
                    }}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                  >
                    <Eye className="h-4 w-4" />
                    Voir informations
                  </button>

                  {/* Bouton Export Excel */}
                  <button
                    type="button"
                    disabled={exportingId === String(camp.id)}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setExportingId(String(camp.id));
                      try {
                        const response = await api.get(`/campaigns/${camp.id}/export-excel`, {
                          responseType: 'blob',
                        });
                        const disposition = response.headers['content-disposition'];
                        let fileName = `campagne_${camp.id}.xlsx`;
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
                      } catch (err) {
                        alert('Erreur lors de l\'export Excel.');
                      } finally {
                        setExportingId(null);
                      }
                    }}
                    className={`mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
                      exportingId === String(camp.id)
                        ? 'border-emerald-200/20 bg-emerald-500/10 text-emerald-600/60 cursor-not-allowed'
                        : 'border-emerald-200/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-300/40'
                    }`}
                  >
                    {exportingId === String(camp.id) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Export en cours…
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        Export Infos Campagne Excel
                      </>
                    )}
                  </button>

                  {/* Bouton Ajouter Tâche */}
                  {user?.permissions?.canManageTasks && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tasks/new?campaignId=${camp.id}`);
                      }}
                      className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200/30 bg-blue-500/5 px-4 py-2.5 text-sm font-medium text-blue-600 transition-all hover:bg-blue-500/10 hover:border-blue-300/40 active:scale-[0.98]"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter une Tâche / Commentaire
                    </button>
                  )}

                  {/* Bouton Objectifs KPI (état-aware : Définir / Modifier) */}
                  {user?.permissions?.canCreateCampaign && (
                    <button
                      type="button"
                      disabled={!canEditThisCampaign}
                      onClick={(e) => {
                        e.stopPropagation();
                        setKpiTargetCampaignId(camp.id);
                      }}
                      className={`mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                        camp.kpiTargets.length > 0
                          ? 'border-green-200/30 bg-green-500/5 text-green-600 hover:bg-green-500/10 hover:border-green-300/40'
                          : 'border-violet-200/30 bg-violet-500/5 text-violet-600 hover:bg-violet-500/10 hover:border-violet-300/40'
                      }`}
                    >
                      {camp.kpiTargets.length > 0 ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Modifier Objectifs KPI
                          <span className="rounded-md bg-green-600/10 px-1.5 py-0.5 text-xs font-semibold">
                            {camp.kpiTargets.length}
                          </span>
                        </>
                      ) : (
                        <>
                          <Target className="h-4 w-4" />
                          Définir Objectifs KPI
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <KpiTargetModal
            campaignId={kpiTargetCampaignId ?? ''}
            open={kpiTargetCampaignId !== null}
            onOpenChange={(open) => {
              if (!open) setKpiTargetCampaignId(null);
            }}
            onSaved={() => {
              refreshCampaigns();
            }}
          />
        </div>
      )}

      {/* KPI PRINCIPAUX */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl cursor-pointer transition hover:shadow-md"
          onClick={() => navigate('/campaigns')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campagnes totales</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingBase ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-44" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
                <p className="text-xs text-muted-foreground">
                  Toutes les campagnes enregistrées
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate('/campaigns'); }}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir informations
                </button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl cursor-pointer transition hover:shadow-md"
          onClick={() => navigate('/leads')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads générés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingBase ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-4 w-52" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalLeads}</div>
                <p className="text-xs text-muted-foreground">
                  Prospects capturés par les campagnes
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate('/leads'); }}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir informations
                </button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl cursor-pointer transition hover:shadow-md"
          onClick={() => navigate('/conversions')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingBase ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalConversions}</div>
                <p className="text-xs text-muted-foreground">
                  Taux de conversion : {stats.conversionRate}%
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate('/conversions'); }}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir informations
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI DE PILOTAGE */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl cursor-pointer transition hover:shadow-md"
          onClick={() => navigate('/tasks')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches totales</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingBase ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Chargement en cours…</p>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  Ensemble des tâches de campagne
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate('/tasks'); }}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir informations
                </button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl cursor-pointer transition hover:shadow-md"
          onClick={() => navigate('/tasks')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches en retard</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingBase ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Chargement en cours…</p>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.overdueTasks}</div>
                <p className="text-xs text-muted-foreground">
                  Tâches à traiter en priorité
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate('/tasks'); }}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir informations
                </button>
</>
            )}
          </CardContent>
        </Card>




      </div>

      {/* TAUX DE CONVERSION */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="rounded-2xl cursor-pointer transition hover:shadow-md"
          onClick={() => navigate('/conversions')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taux de conversion global</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            {loadingBase ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Chargement en cours…</p>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-green-600">
                  {stats.conversionRate}%
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{stats.totalConversions} conversion(s) pour {stats.totalLeads} lead(s)</p>
                  <p className="text-xs">
                    Confirmé : {conversionStats.confirmed} ·
                    En attente : {conversionStats.pending} ·
                    Annulé : {conversionStats.cancelled} ·
                    Rejeté : {conversionStats.rejected}
                    {' · '}
                    Montant : {formatCurrency(conversionStats.confirmedAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate('/conversions'); }}
                  className="self-start mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir informations
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI ROI */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenu confirmé total</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRoi ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Calcul en cours…</p>
              </div>
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(roiDashboard?.totalConfirmedRevenue ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coût total réel</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRoi ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Calcul en cours…</p>
              </div>
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(roiDashboard?.totalRealCost ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit net global</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRoi ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Calcul en cours…</p>
              </div>
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(roiDashboard?.totalNetProfit ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ROI global</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingRoi ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Calcul en cours…</p>
              </div>
            ) : (
              <>
                {(() => {
                  const roiInfo = formatRoiDisplay(roiDashboard?.globalRoiPercent ?? null);
                  return (
                    <>
                      <div 
                        className="text-2xl font-bold" 
                        title={roiInfo.tooltip || undefined}
                      >
                        {roiInfo.display}
                      </div>
                      <div className="flex items-center gap-2">
                        {roiDashboard ? getRoiStatusBadge(roiDashboard.globalRoiStatus) : null}
                        {roiInfo.isExceptional && (
                          <Badge className="border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-100">
                            🔥 Exceptionnel
                          </Badge>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROI - LISTES */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Top 5 campagnes par ROI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRoi ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Calcul du ROI en cours…</p>
              </div>
            ) : (roiDashboard?.topCampaignsByRoi || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune campagne calculable pour le moment.
              </p>
            ) : (
              roiDashboard!.topCampaignsByRoi.map((campaign, index) => (
                <div
                  key={campaign.campaignId}
                  className="flex flex-col gap-3 rounded-xl border p-4 cursor-pointer"
                  onClick={() => navigate(`/campaigns/${campaign.campaignId}`)}
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {index + 1}. {campaign.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ROI :{' '}
                      {(() => {
                        const roiInfo = formatRoiDisplay(campaign.roiPercent);
                        return roiInfo.display === '—' 
                          ? 'Non calculable' 
                          : <span title={roiInfo.tooltip || undefined}>{roiInfo.display}</span>;
                      })()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Profit net : {formatCurrency(campaign.netProfit)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {campaign.confirmedSalesCount} vente(s)
                    </Badge>
                    {getCampaignStatusBadge(campaign.status)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${campaign.campaignId}`); }}
                    className="w-full mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-1.5 text-xs font-medium text-primary/80 transition-all hover:bg-primary/10 hover:border-primary/25 active:scale-[0.98]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir informations
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Campagnes à ROI négatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRoi ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Calcul du ROI en cours…</p>
              </div>
            ) : (roiDashboard?.negativeRoiCampaigns || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune campagne à ROI négatif.
              </p>
            ) : (
              roiDashboard!.negativeRoiCampaigns.map((campaign) => (
                <div
                  key={campaign.campaignId}
                  className="flex flex-col gap-3 rounded-xl border p-4 cursor-pointer"
                  onClick={() => navigate(`/campaigns/${campaign.campaignId}`)}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ROI :{' '}
                      {(() => {
                        const roiInfo = formatRoiDisplay(campaign.roiPercent);
                        return roiInfo.display === '—' 
                          ? 'Non calculable' 
                          : <span title={roiInfo.tooltip || undefined}>{roiInfo.display}</span>;
                      })()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Coût : {formatCurrency(campaign.totalCost)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Revenu : {formatCurrency(campaign.totalRevenue)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {getRoiStatusBadge(campaign.roiStatus)}
                    {getCampaignStatusBadge(campaign.status)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${campaign.campaignId}`); }}
                    className="w-full mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-1.5 text-xs font-medium text-primary/80 transition-all hover:bg-primary/10 hover:border-primary/25 active:scale-[0.98]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir informations
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Campagnes à ROI non calculable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRoi ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Calcul du ROI en cours…</p>
              </div>
            ) : (roiDashboard?.nonCalculableRoiCampaigns || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune campagne à ROI non calculable.
              </p>
            ) : (
              roiDashboard!.nonCalculableRoiCampaigns.map((campaign) => (
                <div
                  key={campaign.campaignId}
                  className="flex flex-col gap-3 rounded-xl border p-4 cursor-pointer"
                  onClick={() => navigate(`/campaigns/${campaign.campaignId}`)}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Coût : {formatCurrency(campaign.totalCost)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Revenu : {formatCurrency(campaign.totalRevenue)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Profit net : {formatCurrency(campaign.netProfit)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {getRoiStatusBadge(campaign.roiStatus)}
                    {getCampaignStatusBadge(campaign.status)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${campaign.campaignId}`); }}
                    className="w-full mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-1.5 text-xs font-medium text-primary/80 transition-all hover:bg-primary/10 hover:border-primary/25 active:scale-[0.98]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir informations
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* GRAPHIQUES */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="rounded-2xl lg:col-span-4">
          <CardHeader>
            <CardTitle>Évolution leads / conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Leads"
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="#22c55e"
                  strokeWidth={3}
                  name="Conversions"
                />
              </LineChart>
            </ResponsiveContainer>

          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-3">
          <CardHeader>
            <CardTitle>Répartition des campagnes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={campaignsByStatusData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {campaignsByStatusData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* BUDGET + ALERTES */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="rounded-2xl lg:col-span-4">
          <CardHeader>
            <CardTitle>Vue budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: any) => formatCurrency(toNumber(value))} />
                <Bar dataKey="montant" radius={[8, 8, 0, 0]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Taux d’utilisation du budget</span>
                <span>{budgetUsagePercent.toFixed(1)}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${budgetUsagePercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-3">
          <CardHeader>
            <CardTitle>Alertes métier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {businessAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte détectée.</p>
            ) : (
              businessAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-xl border p-3"
                >
                  <div className="pt-0.5">
                    {alert.level === 'high' ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : alert.level === 'medium' ? (
                      <PauseCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-snug">{alert.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Niveau :{' '}
                      {alert.level === 'high'
                        ? 'élevé'
                        : alert.level === 'medium'
                          ? 'moyen'
                          : 'faible'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* CAMPAGNES RÉCENTES + TÂCHES URGENTES */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Campagnes récentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-start justify-between gap-4 rounded-xl border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{campaign.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Objectif : {campaign.objective?.label || '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fin prévue : {formatDate(campaign.endDate)}
                  </p>
                </div>

                <div>{getCampaignStatusBadge(campaign.status)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Tâches urgentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {urgentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-4 rounded-xl border p-4"
              >
                <div className="space-y-1">
                  <p className="font-medium">{task.title || 'Tâche sans titre'}</p>
                  <p className="text-sm text-muted-foreground">
                    Campagne : {task.campaign?.name || task.campaign?.title || '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Échéance : {formatDate(task.dueDate)}
                  </p>
                </div>

                <div>{getTaskStatusBadge(task.status)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}