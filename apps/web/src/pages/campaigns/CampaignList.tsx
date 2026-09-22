import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Plus, Loader2, Pencil, FileSpreadsheet, Target } from 'lucide-react';
import { format } from 'date-fns';
import KpiTargetModal from '@/components/KpiTargetModal';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Campaign {
  id: string;
  name: string;
  strategy?: string;
  status: string;
  startDate: string;
  endDate: string;
  objective?: { label: string };
  createdBy?: { id?: string | number } | null;
  _count?: { leads: number; tasks: number; conversions: number };
  articles?: Array<{
    id?: string;
    designation?: string;
    plannedQuantity?: number | null;
    quantityAtCreation?: number | null;
    quantityAtStart?: number | null;
    quantityAtClosure?: number | null;
    soldQuantity?: number | null;
    currentQuantity?: number | null;
    codeSageX3?: string | null;
    codeSage100?: string | null;
  }>;
}

interface CampaignListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Statuts considérés comme "terminés" → objectifs KPI verrouillés
function isCampaignCompleted(status?: string) {
  return ['TERMINEE', 'COMPLETED', 'ANNULEE'].includes(String(status || '').trim().toUpperCase());
}

export default function CampaignList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpiTargetCampaignId, setKpiTargetCampaignId] = useState<string | null>(null);

  // ── Double scrollbar horizontale (haut + bas) synchronisés ────────────────
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [tableClientWidth, setTableClientWidth] = useState(0);

  const hasHorizontalOverflow = tableScrollWidth > tableClientWidth;

  // Mesure la largeur scrollable du tableau (recalculée au chargement / resize)
  useEffect(() => {
    const el = bottomScrollRef.current;
    if (!el) return;
    const measure = () => {
      setTableScrollWidth(el.scrollWidth);
      setTableClientWidth(el.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [campaigns]);

  // Synchronise la barre du bas vers celle du haut
  useEffect(() => {
    const bottom = bottomScrollRef.current;
    const top = topScrollRef.current;
    if (!bottom || !top) return;
    const syncBottomToTop = () => {
      if (top.scrollLeft !== bottom.scrollLeft) top.scrollLeft = bottom.scrollLeft;
    };
    bottom.addEventListener('scroll', syncBottomToTop);
    return () => bottom.removeEventListener('scroll', syncBottomToTop);
  }, [campaigns]);

  // Synchronise la barre du haut vers celle du bas
  const handleTopScroll = () => {
    const bottom = bottomScrollRef.current;
    const top = topScrollRef.current;
    if (bottom && top && bottom.scrollLeft !== top.scrollLeft) {
      bottom.scrollLeft = top.scrollLeft;
    }
  };

  const [page, setPage] = useState(1);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [objectiveFilter, setObjectiveFilter] = useState(searchParams.get('objectiveId') || '');

  const [meta, setMeta] = useState<CampaignListMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // État pour les montants de vente par campagne
  const [campaignSales, setCampaignSales] = useState<Record<string, number>>({});
  const [campaignSalesErrors, setCampaignSalesErrors] = useState<Record<string, boolean>>({});

  // Déplacement des hooks d'état pour les dates d'export ici (top du composant)
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportingBatch, setExportingBatch] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    const urlStatus = searchParams.get('status') || '';
    const urlObjective = searchParams.get('objectiveId') || '';
    if (urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
      setPage(1);
    }
    if (urlObjective !== objectiveFilter) {
      setObjectiveFilter(urlObjective);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);

        const res = await api.get('/campaigns', {
          params: {
            page,
            limit,
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(objectiveFilter ? { objectiveId: objectiveFilter } : {}),
          },
        });

        setCampaigns(res.data.data || []);
        setMeta(
          res.data.meta || {
            page: 1,
            limit,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        );
      } catch (error) {
        console.error('Failed to fetch campaigns', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [page, statusFilter, objectiveFilter]);

  // Récupération des montants de vente par campagne
  useEffect(() => {
    if (campaigns.length === 0) return;
    const ids = campaigns.map(c => c.id);
    api.post('/campaigns/sales-summary', { campaignIds: ids }).then(res => {
      setCampaignSales(res.data?.data || {});
      setCampaignSalesErrors(res.data?.errors || {});
    }).catch(() => {
      // Silence: les montants ne sont pas bloquants
    });
  }, [campaigns]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
            Active
          </Badge>
        );
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      case 'COMPLETED':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
            Completed
          </Badge>
        );
      case 'PAUSED':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">
            Paused
          </Badge>
        );
      case 'BROUILLON':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'PLANIFIEE':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
            Planifiée
          </Badge>
        );
      case 'EN_PAUSE':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">
            En pause
          </Badge>
        );
      case 'TERMINEE':
        return (
          <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200">
            Terminée
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePreviousPage = () => {
    if (meta.hasPreviousPage) {
      setPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (meta.hasNextPage) {
      setPage((prev) => prev + 1);
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);

    if (value) {
      setSearchParams({ status: value });
    } else {
      setSearchParams({});
    }
  };


  // Fonction d'export Excel
  const handleExportExcel = async () => {
    if (!campaigns.length) return;
    if (!exportStartDate || !exportEndDate) return;
    // Filtrer les campagnes selon la période choisie
    const start = new Date(exportStartDate);
    const end = new Date(exportEndDate);
    const filtered = campaigns.filter(c => {
      const cStart = new Date(c.startDate);
      const cEnd = new Date(c.endDate);
      return cStart >= start && cEnd <= end;
    });
    if (!filtered.length) {
      alert('Aucune campagne trouvée dans la période sélectionnée.');
      return;
    }

    // Appel à l'API backend pour générer l'Excel avec style
    setExportingBatch(true);
    try {
      const ids = filtered.map(c => c.id);
      const response = await api.post('/campaigns/export-excel-batch', { campaignIds: ids }, {
        responseType: 'blob',
      });

      // Téléchargement du fichier
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'campagnes.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erreur lors de l\'export Excel.');
    } finally {
      setExportingBatch(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight">
          {statusFilter === 'TERMINEE' ? 'Archives des campagnes' : 'Campagne'}
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="flex gap-2 items-end">
            <div className="flex flex-col">
              <label htmlFor="exportStartDate" className="text-xs font-medium mb-1">Date Début campagne</label>
              <input
                id="exportStartDate"
                type="date"
                className="border rounded px-2 py-1 text-sm bg-background"
                value={exportStartDate}
                onChange={e => setExportStartDate(e.target.value)}
                style={{ minWidth: 120 }}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="exportEndDate" className="text-xs font-medium mb-1">Date Fin campagne</label>
              <input
                id="exportEndDate"
                type="date"
                className="border rounded px-2 py-1 text-sm bg-background"
                value={exportEndDate}
                onChange={e => setExportEndDate(e.target.value)}
                style={{ minWidth: 120 }}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => handleExportExcel()}
              title="Filtrer et exporter les campagnes en Excel"
              className="ml-2"
              disabled={!exportStartDate || !exportEndDate || exportingBatch}
            >
              {exportingBatch ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Export en cours…</>
              ) : (
                <><FileSpreadsheet className="mr-2 h-4 w-4" /> Filtrer & Exporter campagne Excel</>
              )}
            </Button>
          </div>
          <Button onClick={() => navigate('/campaigns/new')}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Campagne
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === 'TERMINEE' ? 'Campagnes archivées' : 'Campagne Marketing'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <label htmlFor="statusFilter" className="text-sm font-medium">
                Filtrer par statut
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="flex h-10 w-full min-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Tous les statuts</option>
                <option value="BROUILLON">BROUILLON</option>
                <option value="PLANIFIEE">PLANIFIEE</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="EN_PAUSE">EN_PAUSE</option>
                <option value="TERMINEE">TERMINEE</option>
              </select>
            </div>

            {objectiveFilter && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Filtré par objectif #{objectiveFilter}</span>
                <button
                  type="button"
                  onClick={() => { setObjectiveFilter(''); setSearchParams({}); setPage(1); }}
                  className="text-xs text-primary hover:underline"
                >
                  Effacer le filtre
                </button>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Page {meta.page} sur {meta.totalPages} — {meta.total} campagne(s)
            </div>
          </div>

          {hasHorizontalOverflow && (
            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="overflow-x-auto"
              aria-hidden="true"
            >
              <div style={{ width: tableScrollWidth, height: 1 }} />
            </div>
          )}

          <Table containerRef={bottomScrollRef}>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Stratégie</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Objectif</TableHead>
                <TableHead>Date début</TableHead>
                <TableHead>Date Fin</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Conv.</TableHead>
                <TableHead>
                  <span title="CA facturé Sage X3 des articles de la campagne sur sa fenêtre (tous clients, tous vendeurs) : corrélation de périmètre, PAS une attribution à la campagne.">
                    CA facturé des articles (Sage X3)
                  </span>
                </TableHead>
                <TableHead>Total articles vendus</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={campaign.strategy}>
                        {campaign.strategy || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>{campaign.objective?.label || '-'}</TableCell>
                    <TableCell>{format(new Date(campaign.startDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(campaign.endDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {(() => {
                        const start = new Date(campaign.startDate);
                        const end = new Date(campaign.endDate);
                        const now = new Date();
                        const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                        const elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                        const displayDays = Math.min(elapsedDays, totalDays);
                        const progress = Math.min(Math.round((displayDays / totalDays) * 100), 100);
                        const isOverdue = now > end;
                        const isWarning = !isOverdue && totalDays - displayDays <= 7;
                        return (
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${isOverdue
                                    ? 'bg-red-500'
                                    : isWarning
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className={`shrink-0 text-xs ${isOverdue ? 'text-red-500 font-medium' : isWarning ? 'text-amber-600 font-medium' : 'text-muted-foreground'
                              }`}>
                              {displayDays}/{totalDays}j
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center">{campaign._count?.leads ?? 0}</TableCell>
                    <TableCell className="text-center">{campaign._count?.conversions ?? 0}</TableCell>
                    <TableCell>
                      {(() => {
                        if (campaignSalesErrors[campaign.id]) return '—';
                        const amount = campaignSales[campaign.id];
                        if (amount === undefined) return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> calcul…</span>;
                        if (amount == null) return '—';
                        const perimeter = campaign.articles?.length ?? 0;
                        return (
                          <div className="leading-tight">
                            <div>
                              {Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA
                            </div>
                            <div
                              className="text-xs text-muted-foreground"
                              title="Nombre d'articles rattachés à la campagne : taille du périmètre sur lequel ce CA est mesuré."
                            >
                              {perimeter} article(s)
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const totalSold = campaign.articles?.reduce(
                          (sum, a) => sum + (a.soldQuantity ?? 0),
                          0
                        ) ?? 0;
                        if (totalSold === 0) return '—';
                        return totalSold.toLocaleString('fr-FR');
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/campaigns/${campaign.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir Détails
                        </Button>

                        {user?.permissions?.canManageTasks && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Redirige vers le formulaire de création de tâche
                              // avec l'ID de la campagne en paramètre.
                              navigate(`/tasks/new?campaignId=${campaign.id}`);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter Tâche
                          </Button>
                        )}

                        {user?.permissions?.canEditAllCampaigns && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/campaigns/${campaign.id}/edit`);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier Infos Campagne
                          </Button>
                        )}

                        {user?.permissions?.canCreateCampaign && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-violet-700 border-violet-300"
                            disabled={
                              isCampaignCompleted(campaign.status) ||
                              !(
                                !!user?.permissions?.canEditAllCampaigns ||
                                String(user?.id) === String(campaign.createdBy?.id)
                              )
                            }
                            title={
                              isCampaignCompleted(campaign.status)
                                ? 'Objectifs KPI verrouillés : la campagne est terminée'
                                : !user?.permissions?.canEditAllCampaigns &&
                                  String(user?.id) !== String(campaign.createdBy?.id)
                                  ? "Vous n'êtes pas autorisé à modifier les objectifs KPI de cette campagne"
                                  : 'Définir les objectifs KPI de la campagne'
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setKpiTargetCampaignId(String(campaign.id));
                            }}
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Définir les Objectifs KPI de la campagne
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          title="Exporter cette campagne en Excel"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setExportingId(String(campaign.id));
                            try {
                              const response = await api.get(`/campaigns/${campaign.id}/export-excel`, {
                                responseType: 'blob',
                              });
                              const disposition = response.headers['content-disposition'];
                              let fileName = `campagne_${campaign.id}.xlsx`;
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
                          disabled={exportingId === String(campaign.id)}
                        >
                          {exportingId === String(campaign.id) ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin text-green-600" /> Export en cours…</>
                          ) : (
                            <><FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Export Excel</>
                          )}
                        </Button>
                        {user?.permissions?.canEditAllCampaigns && campaign.status === 'ANNULEE' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-700 border-green-300"
                            title="Réactiver la campagne"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm('Voulez-vous vraiment réactiver cette campagne ?')) return;
                              try {
                                await api.patch(`/campaigns/${campaign.id}/status`, { status: 'ACTIVE' });
                                setCampaigns((prev) => prev.map(c => c.id === campaign.id ? { ...c, status: 'ACTIVE' } : c));
                              } catch (err) {
                                alert('Erreur lors de la réactivation.');
                              }
                            }}
                          >
                            Réactiver
                          </Button>
                        )}
                        {user?.permissions?.canEditAllCampaigns && campaign.status === 'ACTIVE' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-700 border-red-300"
                            title="Annuler la campagne"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm('Voulez-vous vraiment annuler cette campagne ?')) return;
                              try {
                                await api.patch(`/campaigns/${campaign.id}/status`, { status: 'ANNULEE' });
                                setCampaigns((prev) => prev.map(c => c.id === campaign.id ? { ...c, status: 'ANNULEE' } : c));
                              } catch (err) {
                                alert('Erreur lors de l\'annulation.');
                              }
                            }}
                          >
                            Annuler
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={!meta.hasPreviousPage}
            >
              Précédent
            </Button>

            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={!meta.hasNextPage}
            >
              Suivant
            </Button>
          </div>

          <KpiTargetModal
            campaignId={kpiTargetCampaignId ?? ''}
            open={kpiTargetCampaignId !== null}
            onOpenChange={(open) => {
              if (!open) setKpiTargetCampaignId(null);
            }}
            onSaved={() => {
              /* Les cibles KPI ne sont pas affichées dans la liste : rien à rafraîchir ici */
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}