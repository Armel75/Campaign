import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  ArrowLeft,
  Calendar,
  User,
  Target,
  Loader2,
  FileText,
  FileSpreadsheet,
  Paperclip,
  CheckSquare,
  Package,
  Clock,
  TrendingUp,
} from 'lucide-react';

import AttachmentSection from './components/AttachmentSection';
import TaskSection from './components/TaskSection';
import CampaignArticlesSection from './components/CampaignArticlesSection';
import ExportButtons from './components/ExportButtons';

interface CampaignAttachment {
  id: string;
  fileName?: string;
  originalName?: string;
  name?: string;
  url?: string;
  mimeType?: string;
  createdAt?: string;
}

interface CampaignTask {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  createdAt?: string;
}

interface CampaignArticle {
  id: string;
  codeSageX3?: string;
  codeSage100?: string;
  designation?: string;
  currentQuantity?: number;
  quantity?: number;
  createdAt?: string;
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

  attachments?: CampaignAttachment[];
  tasks?: CampaignTask[];
  articles?: CampaignArticle[];

  _count?: {
    attachments?: number;
    tasks?: number;
    articles?: number;
    leads?: number;
  };

  [key: string]: any;
}

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<CampaignDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  const attachments = useMemo(() => campaign?.attachments || [], [campaign]);
  const tasks = useMemo(() => campaign?.tasks || [], [campaign]);
  const articles = useMemo(() => campaign?.articles || [], [campaign]);

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
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
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

  const displayObjective =
    campaign?.objective?.label || campaign?.objective?.name || '—';

  const displayCreator =
    campaign?.createdBy?.fullname ||
    campaign?.createdBy?.username ||
    campaign?.createdBy?.email ||
    '—';

  const stats = [
    {
      label: 'Articles',
      value: campaign?._count?.articles ?? articles.length,
      icon: Package,
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
    {
      label: 'Leads',
      value: campaign?._count?.leads ?? 0,
      icon: TrendingUp,
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
        {Icon && <Icon className="h-3.5 w-3.5 mr-2" />}
        {label}
      </div>
      <div className="flex-1 text-sm text-slate-900 dark:text-slate-100 break-words">
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

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-950 lg:bg-slate-50/50 lg:dark:bg-slate-950 transition-colors duration-200">
      {/* Top bar */}
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left side */}
          <div className="lg:col-span-8 space-y-8">
            {/* Header block */}
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

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.label}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p className="text-2xl font-bold mt-1">{item.value}</p>
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

            {/* Description */}
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

            {/* Articles quick overview */}
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
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium">Code Sage X3</th>
                          <th className="px-4 py-3 text-left font-medium">Code Sage 100</th>
                          <th className="px-4 py-3 text-left font-medium">Désignation</th>
                          <th className="px-4 py-3 text-right font-medium">Quantité actuelle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {articles.map((article) => (
                          <tr
                            key={article.id}
                            className="border-b last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                          >
                            <td className="px-4 py-3">{article.codeSageX3 || '—'}</td>
                            <td className="px-4 py-3">{article.codeSage100 || '—'}</td>
                            <td className="px-4 py-3 font-medium">
                              {article.designation || '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {article.currentQuantity ?? article.quantity ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Articles CRUD section */}
            <CampaignArticlesSection
              campaignId={campaign.id}
              articles={articles}
              onUpdate={fetchCampaign}
            />

            {/* Tasks CRUD section */}
            <TaskSection
              campaignId={campaign.id}
              tasks={tasks}
              onUpdate={fetchCampaign}
            />

            {/* Attachments CRUD section */}
            <AttachmentSection
              campaignId={campaign.id}
              attachments={attachments}
              onUpdate={fetchCampaign}
            />
          </div>

          {/* Right side */}
          <div className="lg:col-span-4 space-y-6">
            {/* Main properties */}
            <Card>
              <CardHeader>
                <CardTitle>Propriétés</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PropertyRow
                  label="Nom"
                  value={campaign.name || '—'}
                />
                <PropertyRow
                  label="Statut"
                  value={getStatusBadge(campaign.status)}
                />
                <PropertyRow
                  label="Objectif"
                  icon={Target}
                  value={displayObjective}
                />
                <PropertyRow
                  label="Date de début"
                  icon={Calendar}
                  value={formatDateSafe(campaign.startDate)}
                />
                <PropertyRow
                  label="Date de fin"
                  icon={Calendar}
                  value={formatDateSafe(campaign.endDate)}
                />
                <PropertyRow
                  label="Canal"
                  value={campaign.channel || '—'}
                />
                <PropertyRow
                  label="Type"
                  value={campaign.type || '—'}
                />
                <PropertyRow
                  label="Priorité"
                  value={campaign.priority || '—'}
                />
                <PropertyRow
                  label="Budget"
                  value={campaign.budget ?? '—'}
                />
                <PropertyRow
                  label="Cible"
                  value={campaign.targetAudience || '—'}
                />
                <PropertyRow
                  label="Responsable"
                  value={campaign.manager || campaign.owner || '—'}
                />
                <PropertyRow
                  label="Localisation"
                  value={campaign.location || '—'}
                />
              </CardContent>
            </Card>

            {/* Audit / meta */}
            <Card>
              <CardHeader>
                <CardTitle>Méta informations</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PropertyRow
                  label="Créée par"
                  icon={User}
                  value={displayCreator}
                />
                <PropertyRow
                  label="Email créateur"
                  value={campaign.createdBy?.email || '—'}
                />
                <PropertyRow
                  label="Dernière mise à jour"
                  icon={Clock}
                  value={formatDateTimeSafe(campaign.updatedAt)}
                />
                <PropertyRow
                  label="Créée le"
                  icon={Clock}
                  value={formatDateTimeSafe(campaign.createdAt)}
                />
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

            {/* Business context */}
            <Card>
              <CardHeader>
                <CardTitle>Contexte métier</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PropertyRow
                  label="Notes"
                  value={campaign.notes || '—'}
                />
                <PropertyRow
                  label="Pièces jointes"
                  icon={Paperclip}
                  value={attachments.length}
                />
                <PropertyRow
                  label="Tâches"
                  icon={CheckSquare}
                  value={tasks.length}
                />
                <PropertyRow
                  label="Articles"
                  icon={Package}
                  value={articles.length}
                />
              </CardContent>
            </Card>

            {/* Raw info fallback */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Toutes les informations disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-slate-950 text-slate-100 p-4 text-xs overflow-auto max-h-[420px]">
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(campaign, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
    </div>
  );
}