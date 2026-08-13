import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, Ban } from 'lucide-react';

type LeadSummary = {
  id: number | string;
  campaignId?: number | string;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  campaign?: {
    id?: number | string;
    name?: string | null;
    status?: string | null;
  } | null;
};

type ConversionPayload = {
  id?: number | string;
  leadId?: string;
  campaignId?: string;
  type: string;
  status: string;
  amount: string;
  quantity: string;
  reference: string;
  notes: string;
  conversionDate: string;
  lead?: LeadSummary | null;
  campaign?: {
    id?: number | string;
    name?: string | null;
    status?: string | null;
  } | null;
};

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function ConversionForm() {
  const navigate = useNavigate();
  const { leadId, id } = useParams<{ leadId?: string; id?: string }>();

  const isEdit = !!id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const [lead, setLead] = useState<LeadSummary | null>(null);
  const [form, setForm] = useState<ConversionPayload>({
    type: 'SALE',
    status: 'CONFIRMED',
    amount: '',
    quantity: '',
    reference: '',
    notes: '',
    conversionDate: toDateInputValue(new Date().toISOString()),
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        if (isEdit && id) {
          const res = await api.get(`/conversions/${id}`);
          const data = res.data?.data || res.data;

          setLead(data.lead || null);
          setForm({
            id: data.id,
            leadId: String(data.leadId || data.lead?.id || ''),
            campaignId: String(data.campaignId || data.campaign?.id || ''),
            type: data.type || 'SALE',
            status: data.status || 'CONFIRMED',
            amount: data.amount != null ? String(data.amount) : '',
            quantity: data.quantity != null ? String(data.quantity) : '',
            reference: data.reference || '',
            notes: data.notes || '',
            conversionDate: toDateInputValue(data.conversionDate),
            lead: data.lead || null,
            campaign: data.campaign || null,
          });
        } else if (leadId) {
          const res = await api.get(`/leads/${leadId}`);
          const data = res.data?.data || res.data;

          setLead({
            id: data.id,
            campaignId: data.campaignId,
            name: data.name,
            email: data.email,
            status: data.status,
            campaign: data.campaign,
          });

          setForm((prev) => ({
            ...prev,
            leadId: String(data.id),
            campaignId: String(data.campaignId || data.campaign?.id || ''),
          }));
        } else {
          setError('Lead manquant pour créer la conversion.');
        }
      } catch (e: any) {
        console.error('Failed to load conversion form', e);
        setError(e?.response?.data?.message || 'Chargement impossible.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit, leadId]);

  const handleChange = (name: keyof ConversionPayload, value: string) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');

      const payload = {
        leadId: form.leadId,
        type: form.type,
        status: form.status,
        amount: form.amount || null,
        quantity: form.quantity || null,
        reference: form.reference || null,
        notes: form.notes || null,
        conversionDate: form.conversionDate || null,
      };

      if (isEdit && id) {
        await api.put(`/conversions/${id}`, payload);
        navigate('/conversions');
        return;
      }

      await api.post('/conversions', payload);
      navigate(`/leads/${form.leadId}/details`);
    } catch (e: any) {
      console.error('Failed to save conversion', e);
      setError(e?.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelConversion = async () => {
    if (!id) return;

    const confirmed = window.confirm('Voulez-vous vraiment annuler cette conversion ?');
    if (!confirmed) return;

    try {
      setCancelling(true);
      setError('');
      await api.patch(`/conversions/${id}/cancel`);
      navigate('/conversions');
    } catch (e: any) {
      console.error('Failed to cancel conversion', e);
      setError(e?.response?.data?.message || 'Annulation impossible.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="inline-flex items-center gap-2"
          onClick={() =>
            navigate(isEdit ? '/conversions' : `/leads/${form.leadId}/details`)
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        {isEdit && (
          <Button
            type="button"
            variant="outline"
            className="inline-flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleCancelConversion}
            disabled={cancelling || form.status === 'CANCELLED'}
          >
            {cancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            Annuler la conversion
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Modifier la conversion' : 'Nouvelle conversion'}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground mb-1">Lead</div>
              <div className="font-medium">{lead?.name || '—'}</div>
              <div className="text-sm text-muted-foreground">{lead?.email || '—'}</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground mb-1">Campagne</div>
              <div className="font-medium">{lead?.campaign?.name || form.campaign?.name || '—'}</div>
              <div className="text-sm text-muted-foreground">ID lead : {form.leadId || '—'}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                  required
                >
                  <option value="SALE">Vente</option>
                  <option value="APPOINTMENT">Rendez-vous</option>
                  <option value="REGISTRATION">Inscription</option>
                  <option value="SUBSCRIPTION">Souscription</option>
                  <option value="QUOTE_REQUEST">Demande de devis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Statut *</label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                  required
                >
                  <option value="PENDING">En attente</option>
                  <option value="CONFIRMED">Confirmée</option>
                  <option value="CANCELLED">Annulée</option>
                  <option value="REJECTED">Rejetée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Montant</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                  placeholder="Ex: 25000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quantité</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                  placeholder="Ex: 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Référence</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => handleChange('reference', e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                  placeholder="Ex: CMD-2026-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date de conversion</label>
                <input
                  type="date"
                  value={form.conversionDate}
                  onChange={(e) => handleChange('conversionDate', e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full min-h-[140px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                placeholder="Ajoute ici le contexte de la conversion..."
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving} className="inline-flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEdit ? 'Enregistrer les modifications' : 'Créer la conversion'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(isEdit ? '/conversions' : `/leads/${form.leadId}/details`)
                }
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}