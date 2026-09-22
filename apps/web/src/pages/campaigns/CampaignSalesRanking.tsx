import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Trophy, BarChart3, TrendingUp, Eye, FileSpreadsheet } from 'lucide-react';

interface CampaignArticle {
  id?: string;
  soldQuantity?: number | null;
}

interface Campaign {
  id: string;
  name: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  articles?: CampaignArticle[];
}

const TOP_N = 10;

function safeArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function getStatusBadge(status?: string) {
  const s = String(status || '').trim().toUpperCase();

  switch (s) {
    case 'ACTIVE':
      return (
        <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100">
          Active
        </Badge>
      );
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
    case 'ANNULEE':
      return <Badge variant="outline">Annulée</Badge>;
    default:
      return <Badge variant="outline">{status || '—'}</Badge>;
  }
}

export default function CampaignSalesRanking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // L'export du classement est une action premium : bouton masqué sans la permission.
  const canExportCampaign = user?.permissions?.canExportCampaign === true;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Revenus par campagne (Sage X3)
  const [sales, setSales] = useState<Record<string, number | null>>({});
  const [salesErrors, setSalesErrors] = useState<Record<string, boolean>>({});
  const [salesLoading, setSalesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/campaigns', { params: { page: 1, limit: 1000 } });
        if (!cancelled) setCampaigns(safeArray<Campaign>(res.data?.data));
      } catch (error) {
        console.error('Failed to fetch campaigns', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Revenus par campagne (Sage X3)
  useEffect(() => {
    if (campaigns.length === 0) return;
    let cancelled = false;
    setSalesLoading(true);
    api
      .post('/campaigns/sales-summary', { campaignIds: campaigns.map((c) => c.id) })
      .then((res) => {
        if (cancelled) return;
        setSales(res.data?.data || {});
        setSalesErrors(res.data?.errors || {});
      })
      .catch(() => {
        if (!cancelled) setSales({});
      })
      .finally(() => {
        if (!cancelled) setSalesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaigns]);

  // Classement par quantité d'articles vendus (décroissant)
  const ranking = useMemo(() => {
    return campaigns
      .map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        soldQuantity: (c.articles ?? []).reduce((sum, a) => sum + (a.soldQuantity ?? 0), 0),
      }))
      .sort((a, b) => b.soldQuantity - a.soldQuantity);
  }, [campaigns]);

  const maxSold = ranking.length > 0 ? ranking[0].soldQuantity : 0;
  const totalSold = ranking.reduce((sum, c) => sum + c.soldQuantity, 0);
  const campaignsWithSales = ranking.filter((c) => c.soldQuantity > 0).length;
  const best = ranking[0];

  const totalRevenue = useMemo(
    () =>
      ranking.reduce((sum, c) => {
        const r = sales[c.id];
        return sum + (typeof r === 'number' && Number.isFinite(r) ? r : 0);
      }, 0),
    [ranking, sales]
  );

  const displayed = showAll ? ranking : ranking.slice(0, TOP_N);

  // ── Export Excel du classement complet (généré côté API) ───────────────
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const response = await api.get('/campaigns/sales-ranking/export', {
        responseType: 'blob',
      });

      const disposition = response.headers['content-disposition'];
      let fileName = `classement-ventes-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    } catch (error) {
      console.error('Erreur export Excel du classement des ventes :', error);
    } finally {
      setExporting(false);
    }
  };

  const formatQty = (n: number) => (n > 0 ? n.toLocaleString('fr-FR') : '0');
  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

  const formatRevenue = (campId: string) => {
    if (salesLoading) {
      return (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          calcul…
        </span>
      );
    }
    if (salesErrors[campId]) return '—';
    const amount = sales[campId];
    if (amount === undefined || amount === null) return '—';
    return Number(amount).toLocaleString('fr-FR') + ' FCFA';
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Ventes par campagne</h2>
        <p className="text-sm text-muted-foreground">
          Classement des campagnes par quantité d'articles vendus.
        </p>
      </div>

      {/* Synthèse */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total articles vendus</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSold.toLocaleString('fr-FR')}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle
              className="text-sm font-medium"
              title="CA facturé Sage X3 des articles des campagnes sur leur fenêtre (tous clients, tous vendeurs) : corrélation de périmètre, PAS une attribution à la campagne."
            >
              CA facturé des articles (Sage X3)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRevenue > 0 ? totalRevenue.toLocaleString('fr-FR') : '—'} FCFA
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meilleure campagne</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {best && best.soldQuantity > 0 ? (
              <>
                <div className="text-lg font-bold truncate" title={best.name}>
                  {best.name}
                </div>
                <p className="text-sm text-muted-foreground">
                  {best.soldQuantity.toLocaleString('fr-FR')} articles vendus
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campagnes avec ventes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaignsWithSales}
              <span className="text-base font-normal text-muted-foreground"> / {ranking.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classement */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle>Classement des ventes</CardTitle>
          <div className="flex items-center gap-2">
            {canExportCampaign && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={exporting || loading}
                title="Exporter le classement complet en Excel (.xlsx)"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                )}
                {exporting ? 'Export…' : 'Exporter Excel'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Voir Top ${TOP_N}` : 'Voir tout'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune campagne trouvée.</p>
          ) : (
            displayed.map((camp, index) => {
              const rank = index + 1;
              const pct = maxSold > 0 ? Math.round((camp.soldQuantity / maxSold) * 100) : 0;
              return (
                <div
                  key={camp.id}
                  onClick={() => navigate(`/campaigns/${camp.id}`)}
                  className="group cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 shrink-0 text-center text-lg font-bold">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : (
                        <span className="text-muted-foreground">{rank}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate" title={camp.name}>
                          {camp.name}
                        </span>
                        <div className="shrink-0 text-right">
                          <div
                            className={`font-bold ${
                              camp.soldQuantity > 0 ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {formatQty(camp.soldQuantity)} vendus
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatRevenue(camp.id)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${
                            camp.soldQuantity > 0
                              ? 'bg-gradient-to-r from-primary to-primary/60'
                              : 'bg-muted-foreground/10'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {formatDate(camp.startDate)} → {formatDate(camp.endDate)}
                        </span>
                        {getStatusBadge(camp.status)}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/campaigns/${camp.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Voir détails
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
