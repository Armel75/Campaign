import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  StickyNote,
  Plus,
  Pencil,
  BarChart3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LeadActivityTimeline from '@/components/LeadActivityTimeline';

interface LeadConversion {
  id: number | string;
  type?: string;
  status?: string;
  amount?: string | number | null;
  quantity?: number | null;
  conversionDate?: string | null;
  reference?: string | null;
  notes?: string | null;
}

interface LeadDetailsType {
  id: number | string;
  campaignId?: number | string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  status?: string;
  notes?: string | null;
  nextFollowUpAt?: string | null;
  lastContactAt?: string | null;
  convertedAt?: string | null;
  lostReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  campaign?: {
    id?: number | string;
    name?: string;
    status?: string;
  } | null;
  assignedTo?: {
    id?: number | string;
    username?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  createdBy?: {
    id?: number | string;
    username?: string | null;
    email?: string | null;
  } | null;
  conversions?: LeadConversion[];
  _count?: {
    tasks?: number;
    conversions?: number;
    activities?: number;
  };
}

function getLeadStatusBadge(status?: string) {
  switch (status) {
    case 'NOUVEAU':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Nouveau</Badge>;
    case 'CONTACTE':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Contacté</Badge>;
    case 'QUALIFIE':
      return <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">Qualifié</Badge>;
    case 'CONVERTI':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Converti</Badge>;
    case 'PERDU':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Perdu</Badge>;
    case 'INVALIDE':
      return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">Invalide</Badge>;
    default:
      return <Badge variant="outline">{status || '—'}</Badge>;
  }
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

function formatDateSafe(value?: string | null) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yyyy');
  } catch {
    return '—';
  }
}

function formatDateTimeSafe(value?: string | null) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return '—';
  }
}

function PropertyRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start py-2.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
      <div className="w-44 shrink-0 flex items-center text-xs font-medium text-slate-500 dark:text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5 mr-2 shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0 text-sm text-slate-900 dark:text-slate-100 break-words overflow-hidden">
        {value ?? '—'}
      </div>
    </div>
  );
}

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<LeadDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/leads/${id}`);
      const payload = res.data?.data || res.data;
      setLead(payload);
    } catch (error) {
      console.error('Failed to fetch lead details', error);
      setLead(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchLead();
    }
  }, [id]);

  const stats = useMemo(
    () => [
      { label: 'Activités', value: lead?._count?.activities ?? 0 },
      { label: 'Tâches', value: lead?._count?.tasks ?? 0 },
      { label: 'Conversions', value: lead?._count?.conversions ?? 0 },
    ],
    [lead]
  );

  const conversions = useMemo(() => lead?.conversions || [], [lead]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Lead introuvable.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-950 lg:bg-slate-50/50 lg:dark:bg-slate-950 transition-colors duration-200">
      <div className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="default"
              onClick={() => navigate('/leads')}
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux leads
            </Button>

            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-slate-500 dark:text-slate-400">
                #{lead.id}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              {getLeadStatusBadge(lead.status)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/conversions?leadId=${lead.id}`)}
              className="inline-flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Voir les conversions
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/leads/${lead.id}/conversions/new`)}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouvelle conversion
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/leads/${lead.id}`)}
            >
              Modifier le lead
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
                  {lead.name || 'Lead'}
                </h1>
                {getLeadStatusBadge(lead.status)}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span>{lead.campaign?.name || '—'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>
                    {lead.assignedTo?.username ||
                      lead.assignedTo?.name ||
                      lead.assignedTo?.email ||
                      'Non assigné'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold mt-1">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informations du lead</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PropertyRow label="Nom" icon={User} value={lead.name || '—'} />
                <PropertyRow label="Email" icon={Mail} value={lead.email || '—'} />
                <PropertyRow label="Téléphone" icon={Phone} value={lead.phone || '—'} />
                <PropertyRow label="Statut" value={getLeadStatusBadge(lead.status)} />
                <PropertyRow label="Campagne" icon={Briefcase} value={lead.campaign?.name || '—'} />
                <PropertyRow
                  label="Assigné à"
                  icon={User}
                  value={
                    lead.assignedTo?.username ||
                    lead.assignedTo?.name ||
                    lead.assignedTo?.email ||
                    'Non assigné'
                  }
                />
                <PropertyRow
                  label="Prochaine relance"
                  icon={Calendar}
                  value={formatDateSafe(lead.nextFollowUpAt)}
                />
                <PropertyRow
                  label="Dernier contact"
                  icon={Calendar}
                  value={formatDateSafe(lead.lastContactAt)}
                />
                <PropertyRow
                  label="Date de conversion"
                  icon={Calendar}
                  value={formatDateSafe(lead.convertedAt)}
                />
                <PropertyRow
                  label="Motif de perte"
                  value={lead.lostReason || '—'}
                />
                <PropertyRow
                  label="Notes"
                  icon={StickyNote}
                  value={lead.notes || '—'}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Conversions du lead</CardTitle>
                <Button
                  type="button"
                  onClick={() => navigate(`/leads/${lead.id}/conversions/new`)}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </CardHeader>

              <CardContent>
                {conversions.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Aucune conversion enregistrée pour ce lead.
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium">Type</th>
                          <th className="px-4 py-3 text-left font-medium">Statut</th>
                          <th className="px-4 py-3 text-left font-medium">Montant</th>
                          <th className="px-4 py-3 text-left font-medium">Quantité</th>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversions.map((conversion) => (
                          <tr key={conversion.id} className="border-b last:border-b-0">
                            <td className="px-4 py-3">{getConversionTypeLabel(conversion.type)}</td>
                            <td className="px-4 py-3">{getConversionStatusBadge(conversion.status)}</td>
                            <td className="px-4 py-3">{conversion.amount ?? '—'}</td>
                            <td className="px-4 py-3">{conversion.quantity ?? '—'}</td>
                            <td className="px-4 py-3">{formatDateSafe(conversion.conversionDate)}</td>
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
              leadId={lead.id}
              title="Historique du lead"
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Méta informations</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PropertyRow
                  label="Créé par"
                  icon={User}
                  value={lead.createdBy?.username || lead.createdBy?.email || '—'}
                />
                <PropertyRow
                  label="Créé le"
                  icon={Calendar}
                  value={formatDateTimeSafe(lead.createdAt)}
                />
                <PropertyRow
                  label="Dernière mise à jour"
                  icon={Calendar}
                  value={formatDateTimeSafe(lead.updatedAt)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}