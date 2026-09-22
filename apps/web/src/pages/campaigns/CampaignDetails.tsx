import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import LeadActivityTimeline from '@/components/LeadActivityTimeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  ArrowLeft,
  Calendar,
  User,
  Target,
  Loader2,
  Paperclip,
  CheckSquare,
  Package,
  Clock,
  TrendingUp,
  Lock,
  ExternalLink,
  BarChart3,
  Pencil,
  ShoppingCart,
  Users,
} from 'lucide-react';

import AttachmentSection from './components/AttachmentSection';
import TaskSection from './components/TaskSection';
import CampaignArticlesSection from './components/CampaignArticlesSection';
import ExportButtons from './components/ExportButtons';
import KpiTargetModal from '@/components/KpiTargetModal';
import X3MeasureButton from '@/components/X3MeasureButton';
import { useMeasureJobs } from '@/lib/useMeasureJobs';

interface CampaignAttachment {
  id: string;
  fileName?: string;
  originalName?: string;
  name?: string;
  url?: string;
  mimeType?: string;
  createdAt?: string;
}

type AssignedUserLike = {
  id: string | number;
  username?: string | null;
  email?: string | null;
  name?: string | null;
};

interface CampaignTask {
  id: string;
  title?: string;
  name?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  createdAt?: string;

  assignedTo?: AssignedUserLike | string | number | null;
  assignedToId?: string | number | null;

  assignedToUser?: AssignedUserLike | null;
  assignedToRelation?: AssignedUserLike | null;
  assignedToData?: AssignedUserLike | null;
  assignedToInfo?: AssignedUserLike | null;
  assignedToEntity?: AssignedUserLike | null;
  assignedToProfile?: AssignedUserLike | null;
  assignedToObj?: AssignedUserLike | null;
  assignedToItem?: AssignedUserLike | null;
  assignedToMember?: AssignedUserLike | null;
  assignedToRecord?: AssignedUserLike | null;
  assignedToAccount?: AssignedUserLike | null;
  assignedToContact?: AssignedUserLike | null;

  createdBy?: {
    id: string | number;
    username?: string | null;
    email?: string | null;
  } | null;
}

interface CampaignArticle {
  id: string;
  codeSageX3?: string;
  codeSage100?: string;
  designation?: string;
  currentQuantity?: number;
  quantity?: number;
  plannedQuantity?: number | null;
  quantityAtCreation?: number | null;
  quantityAtStart?: number | null;
  quantityAtClosure?: number | null;
  soldQuantity?: number | null;
  createdAt?: string;
}

interface CampaignConversion {
  id: string | number;
  type?: string;
  status?: string;
  amount?: string | number | null;
  quantity?: number | null;
  reference?: string | null;
  conversionDate?: string | null;
  lead?: {
    id?: string | number;
    name?: string | null;
    email?: string | null;
    status?: string | null;
  } | null;
  createdBy?: {
    id?: string | number;
    username?: string | null;
    email?: string | null;
  } | null;
}

interface CampaignChannelItem {
  id?: string | number;
  name?: string;
  label?: string;
  title?: string;
  channel?: {
    id?: string | number;
    name?: string;
    label?: string;
    title?: string;
  };
}

interface CampaignTargetAudienceItem {
  id?: string | number;
  name?: string;
  label?: string;
  title?: string;
  targetAudience?: {
    id?: string | number;
    name?: string;
    label?: string;
    title?: string;
  };
}

interface CampaignRoiSummary {
  campaignId: number;
  budgetPlanId: number | null;
  currency: string;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  roiPercent: number | null;
  roiStatus:
    | 'CALCULATED'
    | 'ZERO_COST_ZERO_REVENUE'
    | 'NON_CALCULABLE_ZERO_COST'
    | 'NO_ESTABLISHED_REVENUE';
  confirmedSalesCount: number;
}

/**
 * CA facturé Sage X3 des articles de la campagne + clients distincts (Sage X3).
 * Indicateurs SÉPARÉS du revenu attribué : corrélations de périmètre (tous clients,
 * tous vendeurs), jamais des attributions à la campagne.
 */
interface CampaignX3ArticlesRevenue {
  caArticles: number | null;
  /** Clients distincts ayant acheté au moins un article de la campagne. `null` = non mesuré. */
  distinctClients: number | null;
  articlesCount: number;
  articlesMesurables: number;
  articlesNonMesures: number;
  codeDoublons: number;
  computedAt?: string;
}

interface CampaignDetailsType {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;

  objective?: {
    id?: string;
    label?: string;
    name?: string;
  };

  createdById?: string | number;

  createdBy?: {
    id?: string;
    username?: string;
    email?: string;
    fullname?: string;
  };

  updatedBy?: {
    id?: string;
    username?: string;
    email?: string;
    fullname?: string;
  };

  createdAt: string;
  updatedAt: string;

  budget?: number | string;
  channel?: string;
  type?: string;
  priority?: string;
  targetAudience?: string;
  notes?: string;
  location?: string;
  owner?: string;
  manager?: string;

  channels?: CampaignChannelItem[];
  targetAudiences?: CampaignTargetAudienceItem[];

  attachments?: CampaignAttachment[];
  tasks?: CampaignTask[];
  articles?: CampaignArticle[];
  conversions?: CampaignConversion[];

  _count?: {
    attachments?: number;
    tasks?: number;
    articles?: number;
    leads?: number;
    conversions?: number;
  };

  [key: string]: any;
}

function getConversionTypeLabel(type?: string) {
  switch (type) {
    case 'SALE':
      return 'Vente';
    case 'APPOINTMENT':
      return 'Rendez-vous';
    case 'REGISTRATION':
      return 'Inscription';
    case 'SUBSCRIPTION':
      return 'Souscription';
    case 'QUOTE_REQUEST':
      return 'Demande de devis';
    default:
      return type || '—';
  }
}

function getConversionStatusBadge(status?: string) {
  switch (status) {
    case 'PENDING':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">En attente</Badge>;
    case 'CONFIRMED':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmée</Badge>;
    case 'CANCELLED':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Annulée</Badge>;
    case 'REJECTED':
      return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">Rejetée</Badge>;
    default:
      return <Badge variant="outline">{status || '—'}</Badge>;
  }
}

const KPI_GLOBAL_LABELS: Record<string, { label: string; suffix: string }> = {
  SOLD_QUANTITY: { label: 'Qté totale à vendre', suffix: 'unités' },
  REVENUE: { label: 'Objectif de revenu (KPI)', suffix: 'FCFA' },
  LEADS: { label: 'Leads', suffix: 'leads' },
  CONVERSIONS: { label: 'Conversions', suffix: 'conversions' },
  CLIENTS: { label: 'Clients', suffix: 'clients' },
};

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<CampaignDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [roiSummary, setRoiSummary] = useState<CampaignRoiSummary | null>(null);
  const [roiLoading, setRoiLoading] = useState(true);
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [monthlySales, setMonthlySales] = useState<
    Array<{ key: string; monthLabel: string; quantity: number }> | null
  >(null);

  const fetchCampaign = async () => {
    try {
      const res = await api.get(`/campaigns/${id}`);
      const payload = res.data?.data || res.data;
      setCampaign(payload);
    } catch (error) {
      console.error('Failed to fetch campaign details', error);
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignRoi = async () => {
    try {
      const res = await api.get(`/campaigns/${id}/roi`);
      const payload = res.data?.data || res.data;
      setRoiSummary(payload);
    } catch (error) {
      console.error('Failed to fetch campaign ROI', error);
      setRoiSummary(null);
    } finally {
      setRoiLoading(false);
    }
  };

  /**
   * Mesure X3 (CA facturé + clients distincts) — indicateur SÉPARÉ du revenu attribué
   * (corrélation de périmètre, pas attribution).
   *
   * Elle est exécutée en TÂCHE DE FOND côté API et suivie par interrogation d'état
   * (`useMeasureJobs`, la même implémentation que le tableau de bord) : c'est ce qui permet de
   * rester sur « Calcul… » AUSSI LONGTEMPS QU'IL FAUT sans qu'une requête HTTP longue soit coupée
   * par le reverse proxy.
   */
  const x3RevenueUrl = id ? `/campaigns/${id}/x3-revenue` : '';
  const x3RevenueUrls = x3RevenueUrl ? [x3RevenueUrl] : [];

  const {
    dataByKey: x3ByUrl,
    loadingKeys: x3LoadingByUrl,
    restart: restartX3,
  } = useMeasureJobs<CampaignX3ArticlesRevenue>(x3RevenueUrls);

  const x3Revenue = x3ByUrl[x3RevenueUrl] ?? null;
  const x3Loading = x3LoadingByUrl[x3RevenueUrl] === true;

  /** Bouton « Mesurer » : relance la mesure même si un résultat récent est déjà connu. */
  const remeasureX3 = () => restartX3(x3RevenueUrl);

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchCampaignRoi();
    }
  }, [id]);

  // Récupération des montants de vente réels (CA) depuis Sage X3
  useEffect(() => {
    if (!id) return;
    api.get(`/campaigns/${id}/sales-amounts`).then(res => {
      setUnitPrices(res.data?.data || {});
    }).catch(() => {
      // Silence: les montants ne sont pas bloquants
    });
  }, [id]);

  // Ventes des 3 derniers mois précédant le début de campagne (non bloquant)
  useEffect(() => {
    if (!id) return;
    api.get(`/campaigns/${id}/sales-last-3-months`)
      .then(res => {
        setMonthlySales(res.data?.data?.months ?? []);
      })
      .catch(() => {
        setMonthlySales([]);
      });
  }, [id]);

  const attachments = useMemo(() => campaign?.attachments || [], [campaign]);
  const tasks = useMemo(() => campaign?.tasks || [], [campaign]);
  const articles = useMemo(() => campaign?.articles || [], [campaign]);
  const conversions = useMemo(() => campaign?.conversions || [], [campaign]);

  const isCompletedCampaign =
    campaign?.status === 'TERMINEE' || campaign?.status === 'COMPLETED' || campaign?.status === 'ANNULEE';

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            Active
          </Badge>
        );
      case 'DRAFT':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'COMPLETED':
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100">
            Terminée
          </Badge>
        );
      case 'PAUSED':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
            En pause
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
            Annulée
          </Badge>
        );
      case 'BROUILLON':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'PLANIFIEE':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
            Planifiée
          </Badge>
        );
      case 'EN_PAUSE':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
            En pause
          </Badge>
        );
      case 'TERMINEE':
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100">
            Terminée
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || '-'}</Badge>;
    }
  };

  const formatDateSafe = (value?: string) => {
    if (!value) return '—';
    try {
      return format(new Date(value), 'dd/MM/yyyy');
    } catch {
      return '—';
    }
  };

  const formatDateTimeSafe = (value?: string) => {
    if (!value) return '—';
    try {
      return format(new Date(value), 'dd/MM/yyyy HH:mm');
    } catch {
      return '—';
    }
  };

  const formatCurrencySafe = (value?: number | null, currency?: string) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '—';
    }

    try {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Number(value)) + ` ${currency || 'XAF'}`;
    } catch {
      return `${value} ${currency || 'XAF'}`;
    }
  };

  const formatRoiDisplaySafe = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '—';
    }

    try {
      const numValue = Number(value);
      if (numValue > 100) {
        const formatted = new Intl.NumberFormat('fr-FR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(numValue) + ' %';
        return `100%+ (ROI réel: ${formatted})`;
      }
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(numValue) + ' %';
    } catch {
      return `${value} %`;
    }
  };

  const getRoiStatusBadge = (status?: CampaignRoiSummary['roiStatus']) => {
    switch (status) {
      case 'CALCULATED':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            Calculé
          </Badge>
        );
      case 'ZERO_COST_ZERO_REVENUE':
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100">
            Coût nul / revenu nul
          </Badge>
        );
      case 'NON_CALCULABLE_ZERO_COST':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
            Non calculable
          </Badge>
        );
      case 'NO_ESTABLISHED_REVENUE':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
            Revenu non établi
          </Badge>
        );
      default:
        return <Badge variant="outline">—</Badge>;
    }
  };

  const getRoiStatusExplanation = (status?: CampaignRoiSummary['roiStatus']) => {
    switch (status) {
      case 'CALCULATED':
        return 'Le ROI compare les ventes confirmées (type SALE) de la campagne à son budget total : (Revenu − Budget) / Budget.';
      case 'ZERO_COST_ZERO_REVENUE':
        return 'Aucun budget n’est renseigné et aucune vente confirmée n’est enregistrée pour cette campagne.';
      case 'NON_CALCULABLE_ZERO_COST':
        return 'Le ROI ne peut pas être calculé car aucun budget n’est renseigné sur cette campagne.';
      case 'NO_ESTABLISHED_REVENUE':
        return 'Le ROI n’est pas établi : aucune vente confirmée (type SALE) n’est enregistrée pour cette campagne, alors que son budget total est engagé dans le coût.';
      default:
        return 'Aucune information complémentaire disponible pour le calcul du ROI.';
    }
  };

  const displayObjective =
    campaign?.objective?.label || campaign?.objective?.name || '—';

  const displayCreator =
    campaign?.createdBy?.fullname ||
    campaign?.createdBy?.username ||
    campaign?.createdBy?.email ||
    '—';

  const displayChannels = (() => {
    const values =
      campaign?.channels
        ?.map((item) => item?.channel?.name || item?.channel?.label || item?.channel?.title || item?.name || item?.label || item?.title)
        .filter(Boolean) || [];

    if (values.length > 0) {
      return values.join(', ');
    }

    return campaign?.channel || '—';
  })();

  const displayTargetAudiences = (() => {
    const values =
      campaign?.targetAudiences
        ?.map(
          (item) =>
            item?.targetAudience?.name ||
            item?.targetAudience?.label ||
            item?.targetAudience?.title ||
            item?.name ||
            item?.label ||
            item?.title
        )
        .filter(Boolean) || [];

    if (values.length > 0) {
      return values.join(', ');
    }

    return campaign?.targetAudience || '—';
  })();

  const totalSold = useMemo(
    () => articles.reduce((sum, a) => sum + (a.soldQuantity ?? 0), 0),
    [articles]
  );

  const conversionRate = useMemo(() => {
    const convs = campaign?._count?.conversions ?? conversions.length;
    const ld = campaign?._count?.leads ?? 0;
    return ld > 0 ? Math.round((convs / ld) * 100) : 0;
  }, [campaign, conversions]);

  // KPI targets
  const kpiTargets = useMemo(() => {
    const raw = (campaign as any)?.kpiTargets;
    if (!Array.isArray(raw)) return {};
    const map: Record<string, number> = {};
    for (const t of raw) {
      map[t.kpiName] = Number(t.targetValue);
    }
    return map;
  }, [campaign]);

  const getKpiProgress = (kpiName: string, current: number): number | null => {
    const target = kpiTargets[kpiName];
    if (!target || target <= 0) return null;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Objectifs KPI globaux de la campagne (cible + valeur actuelle + % d'atteinte)
  const kpiGlobalBreakdown = useMemo(() => {
    const currentByKpi: Record<string, number> = {
      SOLD_QUANTITY: totalSold,
      REVENUE: roiSummary?.totalRevenue ?? 0,
      LEADS: campaign?._count?.leads ?? 0,
      CONVERSIONS: campaign?._count?.conversions ?? conversions.length,
      CLIENTS: roiSummary?.confirmedSalesCount ?? 0,
    };
    return Object.entries(kpiTargets)
      .filter(([, target]) => Number(target) > 0)
      .map(([kpiName, target]) => {
        const targetValue = Number(target);
        const current = currentByKpi[kpiName] ?? 0;
        const pct = Math.min(Math.round((current / targetValue) * 100), 100);
        return { kpiName, target: targetValue, current, pct };
      });
  }, [kpiTargets, totalSold, roiSummary, campaign, conversions]);

  // Mesure X3 à la demande : affichée uniquement si elle est POSSIBLE (au moins un article
  // codifié). Sinon le bouton promettait une issue qui n'existe pas.
  const x3CanMeasure = !x3Revenue || x3Revenue.articlesMesurables > 0;

  const stats = [
    {
      label: 'Articles',
      value: campaign?._count?.articles ?? articles.length,
      icon: Package,
    },
    {
      label: 'Qté totale vendu (actuelle)',
      value: totalSold > 0 ? totalSold.toLocaleString('fr-FR') : '—',
      icon: ShoppingCart,
      kpiName: 'SOLD_QUANTITY',
      currentValue: totalSold,
    },
    {
      // Revenu SAISI dans le formulaire « Objectifs KPI » (cible), et non le revenu mesuré
      // (somme des conversions confirmées) : ce dernier est déjà suivi dans le bloc
      // « Objectifs KPI » ci-dessous et vaut 0 tant qu'aucune conversion n'est confirmée.
      label: 'Objectif de revenu (KPI)',
      value:
        kpiTargets.REVENUE > 0 ? (
          <span
            className="block"
            title="Objectif de revenu saisi dans le formulaire « Objectifs KPI » de la campagne. Ce n'est PAS un revenu mesuré : le suivi de l'atteinte figure dans le bloc « Objectifs KPI » ci-dessous."
          >
            {Number(kpiTargets.REVENUE).toLocaleString('fr-FR')} FCFA
          </span>
        ) : (
          <span
            className="block text-muted-foreground"
            title="Aucun objectif de revenu défini : renseignez-le via le formulaire « Objectifs KPI » de la campagne."
          >
            —
          </span>
        ),
      icon: TrendingUp,
    },
    {
      label: 'CA facturé des articles (Sage X3)',
      value: x3Loading ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Calcul…</span>
        </span>
      ) : x3Revenue?.caArticles === null || x3Revenue?.caArticles === undefined ? (
        <span
          className="block"
          title={
            x3CanMeasure
              ? "Non mesuré : X3 n'a pas répondu dans le délai imparti. Cliquez sur « Mesurer » pour relancer (quelques secondes)."
              : 'Non mesurable : aucun article de cette campagne ne porte de code Sage exploitable dans X3.'
          }
        >
          <span className="block text-muted-foreground">—</span>
          {x3Revenue && (
            <span className="block text-xs font-normal text-muted-foreground">
              {x3Revenue.articlesMesurables}/{x3Revenue.articlesCount} article(s)
            </span>
          )}
          {x3CanMeasure && <X3MeasureButton onClick={remeasureX3} busy={x3Loading} />}
        </span>
      ) : (
        <span
          className="block"
          title="Corrélation de périmètre (tous clients, tous vendeurs) : ce n'est PAS une attribution à la campagne, ni le revenu utilisé par le ROI."
        >
          <span className="block">
            {Number(x3Revenue.caArticles).toLocaleString('fr-FR')} FCFA
          </span>
          <span className="block text-xs font-normal text-muted-foreground">
            {x3Revenue.articlesMesurables}/{x3Revenue.articlesCount} article(s)
          </span>
        </span>
      ),
      icon: BarChart3,
    },
    {
      label: 'Clients X3 (mesurés)',
      value: x3Loading ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Calcul…</span>
        </span>
      ) : x3Revenue?.distinctClients === null || x3Revenue?.distinctClients === undefined ? (
        <span
          className="block"
          title={
            x3CanMeasure
              ? "Non mesuré : X3 n'a pas répondu dans le délai imparti. Cliquez sur « Mesurer » pour relancer (quelques secondes)."
              : 'Non mesurable : aucun article de cette campagne ne porte de code Sage exploitable dans X3.'
          }
        >
          <span className="block text-muted-foreground">—</span>
          {x3Revenue && (
            <span className="block text-xs font-normal text-muted-foreground">
              {x3Revenue.articlesMesurables}/{x3Revenue.articlesCount} article(s)
            </span>
          )}
          {x3CanMeasure && <X3MeasureButton onClick={remeasureX3} busy={x3Loading} />}
        </span>
      ) : (
        <span
          className="block"
          title="Clients distincts ayant acheté au moins un article de la campagne (Sage X3, tous vendeurs). Corrélation de périmètre : ce n'est PAS une attribution à la campagne."
        >
          <span className="block">{Number(x3Revenue.distinctClients).toLocaleString('fr-FR')}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {x3Revenue.articlesMesurables}/{x3Revenue.articlesCount} article(s)
          </span>
        </span>
      ),
      icon: Users,
    },
    {
      label: 'Leads',
      value: campaign?._count?.leads ?? 0,
      icon: Target,
      kpiName: 'LEADS',
      currentValue: campaign?._count?.leads ?? 0,
    },
    {
      label: 'Conversions',
      value: (() => {
        const convs = campaign?._count?.conversions ?? conversions.length;
        return `${convs} (${conversionRate}%)`;
      })(),
      icon: BarChart3,
      kpiName: 'CONVERSIONS',
      currentValue: campaign?._count?.conversions ?? conversions.length,
    },
    {
      label: 'Ventes confirmées (leads → conversions)',
      value: roiLoading ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Calcul…</span>
        </span>
      ) : roiSummary?.confirmedSalesCount != null
        ? roiSummary.confirmedSalesCount
        : '—',
      icon: Users,
      kpiName: 'CLIENTS',
      currentValue: roiSummary?.confirmedSalesCount ?? 0,
    },
    {
      label: 'Tâches',
      value: campaign?._count?.tasks ?? tasks.length,
      icon: CheckSquare,
    },
    {
      label: 'Pièces jointes',
      value: campaign?._count?.attachments ?? attachments.length,
      icon: Paperclip,
    },
  ];

  const PropertyRow = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: React.ReactNode;
    icon?: React.ElementType;
  }) => (
    <div className="flex items-start py-2.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
      <div className="w-40 shrink-0 flex items-center text-xs font-medium text-slate-500 dark:text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5 mr-2 shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0 text-sm text-slate-900 dark:text-slate-100 break-words overflow-hidden">
        {value ?? '—'}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Campagne introuvable.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Droit de modifier les objectifs KPI de cette campagne (même logique que le backend)
  const canEditThisCampaign =
    !!user?.permissions?.canEditAllCampaigns ||
    String(user?.id) === String(campaign.createdById ?? campaign.createdBy?.id);

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-950 lg:bg-slate-50/50 lg:dark:bg-slate-950 transition-colors duration-200">
      <div className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="default"
              onClick={() => navigate('/campaigns')}
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux campagnes
            </Button>

            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-slate-500 dark:text-slate-400">
                #{campaign.id}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              {getStatusBadge(campaign.status)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border bg-white dark:bg-slate-900 p-1">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500">
                Exports
              </div>
              <div className="min-w-[220px]">
                <ExportButtons campaignId={campaign.id} />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="inline-flex items-center gap-2"
              onClick={() =>
                window.open(
                  'http://192.168.0.13:84/incident',
                  '_blank',
                  'noopener,noreferrer'
                )
              }
            >
              <ExternalLink className="h-4 w-4" />
              Déclarer un incident
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {campaign.name}
                </h1>
                {getStatusBadge(campaign.status)}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDateSafe(campaign.startDate)} → {formatDateSafe(campaign.endDate)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>{displayObjective}</span>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Créée par {displayCreator}</span>
                </div>
              </div>
            </div>

            {/* Ventes des 3 mois précédant la campagne */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Ventes des 3 mois précédant la campagne
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Historique des ventes mensuelles et moyenne calculée sur les 3 mois avant le début de la campagne
                    </p>
                  </div>
                  {monthlySales === null && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      calcul…
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(monthlySales ?? []).map((item) => (
                    <div
                      key={item.key}
                      className="text-center rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 flex flex-col justify-center"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">
                        VENTE {item.monthLabel}
                      </p>
                      <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">
                        {item.quantity != null ? Number(item.quantity).toLocaleString('fr-FR') : '—'}
                      </p>
                    </div>
                  ))}
                  <div
                    className="text-center rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-3.5 flex flex-col justify-center relative overflow-hidden"
                    title="Moyenne des ventes des 3 mois précédant le début de la campagne"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      MOYENNE DES 3 MOIS (PRÉ-CAMPAGNE)
                    </p>
                    <p className="text-2xl font-bold mt-1 text-primary">
                      {monthlySales?.length
                        ? Number(
                            monthlySales.reduce((sum, item) => sum + (item.quantity ?? 0), 0) / monthlySales.length
                          ).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
                        : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isCompletedCampaign && (
              <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      Cette campagne est terminée. L’édition de la campagne ainsi que l’ajout
                      d’articles, de tâches et de pièces jointes sont désactivés.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.map((item) => {
                  const Icon = item.icon;
                  const kpiName = (item as any).kpiName;
                  const currentValue = (item as any).currentValue;
                  const progress = kpiName ? getKpiProgress(kpiName, currentValue ?? 0) : null;
                  return (
                    <Card key={item.label}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{item.label}</p>
                            <p className="text-2xl font-bold mt-1">{item.value}</p>
                            {progress !== null && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                                  <span className="text-muted-foreground">Objectif</span>
                                  <span className={progress >= 100 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>{progress}%</span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      progress >= 100
                                        ? 'bg-green-500'
                                        : progress >= 75
                                          ? 'bg-emerald-400'
                                          : progress >= 50
                                            ? 'bg-amber-400'
                                            : 'bg-red-400'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>

            {/* Objectifs KPI globaux de la campagne */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Objectifs KPI globaux de la campagne</CardTitle>
                {user?.permissions?.canCreateCampaign && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isCompletedCampaign || !canEditThisCampaign}
                    className="flex items-center gap-2 whitespace-nowrap font-semibold"
                    onClick={() => setKpiModalOpen(true)}
                    title={
                      isCompletedCampaign
                        ? 'Objectifs KPI verrouillés : la campagne est terminée'
                        : !canEditThisCampaign
                          ? "Vous n'êtes pas autorisé à modifier les objectifs KPI de cette campagne"
                          : 'Définir les objectifs KPI de la campagne'
                    }
                  >
                    <Target className="h-4 w-4" />
                    <span className="hidden sm:inline">Définir les Objectifs KPI global de la campagne</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {kpiGlobalBreakdown.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Aucun objectif KPI défini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {kpiGlobalBreakdown.map((kpi) => {
                      const meta = KPI_GLOBAL_LABELS[kpi.kpiName];
                      const label = meta?.label ?? kpi.kpiName;
                      const suffix = meta?.suffix ?? '';
                      return (
                        <div key={kpi.kpiName}>
                          <div className="flex items-center justify-between gap-2 text-sm mb-1">
                            <span className="font-medium">{label}</span>
                            <span className="text-muted-foreground">
                              {kpi.current.toLocaleString('fr-FR')} / {kpi.target.toLocaleString('fr-FR')}{' '}
                              {suffix}
                            </span>
                            <span
                              className={`shrink-0 font-semibold ${
                                kpi.pct >= 100
                                  ? 'text-green-600'
                                  : kpi.pct >= 75
                                    ? 'text-emerald-500'
                                    : kpi.pct >= 50
                                      ? 'text-amber-500'
                                      : 'text-red-500'
                              }`}
                            >
                              {kpi.pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${
                                kpi.pct >= 100
                                  ? 'bg-green-500'
                                  : kpi.pct >= 75
                                    ? 'bg-emerald-400'
                                    : kpi.pct >= 50
                                      ? 'bg-amber-400'
                                      : 'bg-red-400'
                              }`}
                              style={{ width: `${kpi.pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Description de la campagne</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm leading-7 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {campaign.description || 'Aucune description renseignée.'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stratégie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm leading-7 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {campaign.strategy || 'Aucune stratégie renseignée.'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Articles de la campagne</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Tableau synthétique des articles
                </div>
              </CardHeader>
              <CardContent>
                {articles.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Aucun article associé à cette campagne.
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium">Informations article</th>
                          <th className="px-4 py-3 text-left font-medium">Quantités</th>
                        </tr>
                      </thead>
                      <tbody>
                        {articles.map((article) => (
                          <tr
                            key={article.id}
                            className="border-b last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                          >
                            <td colSpan={2} className="p-0">
                              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      Code Sage X3
                                    </div>
                                    <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                      {article.codeSageX3 || '—'}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      Code Sage 100
                                    </div>
                                    <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                      {article.codeSage100 || '—'}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      Désignation
                                    </div>
                                    <div className="mt-1 font-medium text-slate-900 dark:text-slate-100 break-words">
                                      {article.designation || '—'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="px-4 py-3 bg-slate-50/60 dark:bg-slate-900/40">
                                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                                    <div className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                      Quantité
                                      <br />
                                      prévue
                                    </div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                                      {article.plannedQuantity ?? 0}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                                    <div className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                      Quantité
                                      <br />
                                      à la création
                                    </div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                                      {article.quantityAtCreation ?? 0}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                                    <div className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                      Quantité
                                      <br />
                                      au démarrage
                                    </div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                                      {article.quantityAtStart ?? 0}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                                    <div className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                      Quantité
                                      <br />
                                      courante
                                    </div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                                      {article.currentQuantity ?? article.quantity ?? 0}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                                    <div className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                      Quantité
                                      <br />
                                      vendue
                                    </div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                                      {article.soldQuantity ?? 0}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                                    <div className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                      Quantité
                                      <br />
                                      à la clôture
                                    </div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                                      {article.quantityAtClosure ?? 0}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
                                    <div className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                      Montant total des ventes de l'article
                                      <br />
                                      en (FCFA)
                                    </div>
                                    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                                      {(() => {
                                        const amount = unitPrices[Number(article.id)];
                                        if (amount == null || amount === 0) return '—';
                                        return Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {isCompletedCampaign ? (
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des articles</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Ajout d’articles désactivé : cette campagne est terminée.
                </CardContent>
              </Card>
            ) : (
              <CampaignArticlesSection
                campaignId={campaign.id}
                articles={articles}
                onUpdate={fetchCampaign}
              />
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Conversions de la campagne</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  className="inline-flex items-center gap-2"
                  onClick={() => navigate('/conversions')}
                >
                  <BarChart3 className="h-4 w-4" />
                  Voir toutes les conversions
                </Button>
              </CardHeader>
              <CardContent>
                {conversions.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Aucune conversion enregistrée pour cette campagne.
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium">Lead</th>
                          <th className="px-4 py-3 text-left font-medium">Type</th>
                          <th className="px-4 py-3 text-left font-medium">Statut</th>
                          <th className="px-4 py-3 text-left font-medium">Montant</th>
                          <th className="px-4 py-3 text-left font-medium">Quantité</th>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-left font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversions.map((conversion) => (
                          <tr
                            key={conversion.id}
                            className="border-b last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">
                                {conversion.lead?.name || '—'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {conversion.lead?.email || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {getConversionTypeLabel(conversion.type)}
                            </td>
                            <td className="px-4 py-3">
                              {getConversionStatusBadge(conversion.status)}
                            </td>
                            <td className="px-4 py-3">{conversion.amount ?? '—'}</td>
                            <td className="px-4 py-3">{conversion.quantity ?? '—'}</td>
                            <td className="px-4 py-3">
                              {formatDateSafe(conversion.conversionDate || undefined)}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="inline-flex items-center gap-2"
                                onClick={() => navigate(`/conversions/${conversion.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4" />
                                Modifier
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <LeadActivityTimeline
              campaignId={campaign.id}
              title="Historique des leads de la campagne"
            />

            <KpiTargetModal
              campaignId={campaign.id}
              open={kpiModalOpen}
              onOpenChange={setKpiModalOpen}
              onSaved={fetchCampaign}
            />

            <TaskSection
              campaignId={campaign.id}
              tasks={tasks}
              onUpdate={fetchCampaign}
              isCampaignCompleted={isCompletedCampaign}
            />

            <AttachmentSection
              campaignId={campaign.id}
              attachments={attachments}
              onUpdate={fetchCampaign}
              isCampaignCompleted={isCompletedCampaign}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Propriétés</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PropertyRow label="Nom" value={campaign.name || '—'} />
                <PropertyRow label="Statut" value={getStatusBadge(campaign.status)} />
                <PropertyRow label="Objectif" icon={Target} value={displayObjective} />
                <PropertyRow label="Date de début" icon={Calendar} value={formatDateSafe(campaign.startDate)} />
                <PropertyRow label="Date de fin" icon={Calendar} value={formatDateSafe(campaign.endDate)} />
                <PropertyRow label="Canal" value={displayChannels} />
                <PropertyRow label="Budget total" icon={BarChart3} value={campaign.totalBudget != null ? Number(campaign.totalBudget).toLocaleString('fr-FR') + ' FCFA' : '—'} />
                <PropertyRow label="Cible" value={displayTargetAudiences} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ROI de la campagne</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cumul de la campagne (toutes périodes). Le tableau de bord propose la même
                  lecture filtrée par période.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {roiLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement du ROI...
                  </div>
                ) : (
                  <>
                    <PropertyRow
                      label="Coût total"
                      value={formatCurrencySafe(roiSummary?.totalCost, roiSummary?.currency)}
                    />
                    <PropertyRow
                      label="Profit net"
                      value={formatCurrencySafe(roiSummary?.netProfit, roiSummary?.currency)}
                    />
                    <PropertyRow
                      label="ROI"
                      value={
                        roiSummary?.roiStatus === 'NO_ESTABLISHED_REVENUE'
                          ? 'Non établi (aucune vente confirmée)'
                          : roiSummary?.roiPercent === null
                            ? 'Non calculable (coût = 0)'
                            : formatRoiDisplaySafe(roiSummary?.roiPercent)
                      }
                    />
                    <PropertyRow
                      label="Statut ROI"
                      value={getRoiStatusBadge(roiSummary?.roiStatus)}
                    />

                    <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {getRoiStatusExplanation(roiSummary?.roiStatus)}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Méta informations</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PropertyRow label="Créée par" icon={User} value={displayCreator} />
                <PropertyRow label="Email créateur" value={campaign.createdBy?.email || '—'} />
                <PropertyRow label="Dernière mise à jour" icon={Clock} value={formatDateTimeSafe(campaign.updatedAt)} />
                <PropertyRow label="Créée le" icon={Clock} value={formatDateTimeSafe(campaign.createdAt)} />
                <PropertyRow
                  label="Modifiée par"
                  value={
                    campaign.updatedBy?.fullname ||
                    campaign.updatedBy?.username ||
                    campaign.updatedBy?.email ||
                    '—'
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contexte métier</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PropertyRow label="Notes" value={campaign.notes || '—'} />
                <PropertyRow label="Pièces jointes" icon={Paperclip} value={attachments.length} />
                <PropertyRow label="Tâches" icon={CheckSquare} value={tasks.length} />
                <PropertyRow label="Articles" icon={Package} value={articles.length} />
                <PropertyRow label="Conversions" icon={TrendingUp} value={campaign?._count?.conversions ?? conversions.length} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}