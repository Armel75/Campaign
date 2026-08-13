import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Pencil, Search, XCircle } from 'lucide-react';

type ConversionItem = {
  id: number | string;
  type?: string;
  status?: string;
  amount?: string | number | null;
  quantity?: number | null;
  reference?: string | null;
  notes?: string | null;
  conversionDate?: string | null;
  lead?: {
    id?: number | string;
    name?: string | null;
    email?: string | null;
    status?: string | null;
  } | null;
  campaign?: {
    id?: number | string;
    name?: string | null;
    status?: string | null;
  } | null;
  createdBy?: {
    id?: number | string;
    username?: string | null;
    email?: string | null;
  } | null;
};

function getTypeLabel(type?: string) {
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

function getStatusLabel(status?: string) {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'CONFIRMED':
      return 'Confirmée';
    case 'CANCELLED':
      return 'Annulée';
    case 'REJECTED':
      return 'Rejetée';
    default:
      return status || '—';
  }
}

function formatDateSafe(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

export default function ConversionList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<ConversionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [totalPages, setTotalPages] = useState(1);

  const leadId = searchParams.get('leadId') || '';

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '10');

    if (searchInput.trim()) params.set('search', searchInput.trim());
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (leadId) params.set('leadId', leadId);

    return params.toString();
  }, [page, searchInput, status, type, leadId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/conversions?${queryString}`);
        setItems(res.data?.data || []);
        setTotalPages(res.data?.totalPages || 1);
      } catch (error) {
        console.error('Failed to fetch conversions', error);
        setItems([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [queryString]);

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (searchInput.trim()) params.set('search', searchInput.trim());
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (leadId) params.set('leadId', leadId);
    params.set('page', '1');

    setPage(1);
    setSearchParams(params);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (leadId) params.set('leadId', leadId);
    params.set('page', '1');

    setSearchInput('');
    setStatus('');
    setType('');
    setPage(1);
    setSearchParams(params);
  };

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(nextPage));
    setPage(nextPage);
    setSearchParams(params);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Conversions</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              La création d’une conversion se fait depuis la fiche d’un lead.
            </div>
          </div>

          <div className="flex items-center gap-2">
            {leadId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/leads/${leadId}/details`)}
              >
                Retour au lead
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher par référence, notes, lead, campagne..."
                className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              />
            </div>

            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                <option value="">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="CONFIRMED">Confirmée</option>
                <option value="CANCELLED">Annulée</option>
                <option value="REJECTED">Rejetée</option>
              </select>
            </div>

            <div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                <option value="">Tous les types</option>
                <option value="SALE">Vente</option>
                <option value="APPOINTMENT">Rendez-vous</option>
                <option value="REGISTRATION">Inscription</option>
                <option value="SUBSCRIPTION">Souscription</option>
                <option value="QUOTE_REQUEST">Demande de devis</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={applyFilters} className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              Rechercher
            </Button>

            <Button type="button" variant="outline" onClick={clearFilters} className="inline-flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Aucune conversion trouvée.
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium">Lead</th>
                    <th className="px-4 py-3 text-left font-medium">Campagne</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Statut</th>
                    <th className="px-4 py-3 text-left font-medium">Montant</th>
                    <th className="px-4 py-3 text-left font-medium">Quantité</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.lead?.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{item.lead?.email || '—'}</div>
                      </td>
                      <td className="px-4 py-3">{item.campaign?.name || '—'}</td>
                      <td className="px-4 py-3">{getTypeLabel(item.type)}</td>
                      <td className="px-4 py-3">{getStatusLabel(item.status)}</td>
                      <td className="px-4 py-3">{item.amount ?? '—'}</td>
                      <td className="px-4 py-3">{item.quantity ?? '—'}</td>
                      <td className="px-4 py-3">{formatDateSafe(item.conversionDate)}</td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="inline-flex items-center gap-2"
                          onClick={() => navigate(`/conversions/${item.id}/edit`)}
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

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Page {page} sur {Math.max(1, totalPages)}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Précédent
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}