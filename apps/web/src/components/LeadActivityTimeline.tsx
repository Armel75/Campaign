import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, User, CalendarClock, GitCompare, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface LeadActivityItem {
  id: number;
  type: string;
  title: string;
  description?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  activityDate?: string;
  createdAt?: string;
  lead?: {
    id: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: string | null;
  } | null;
  campaign?: {
    id: number;
    name?: string | null;
    status?: string | null;
  } | null;
  createdBy?: {
    id: number;
    username?: string | null;
    email?: string | null;
  } | null;
}

interface LeadActivityTimelineProps {
  leadId?: string | number;
  campaignId?: string | number;
  title?: string;
}

function getActivityTypeLabel(type?: string) {
  switch (type) {
    case 'CREATION':
      return 'Création';
    case 'CHANGEMENT_STATUT':
      return 'Changement de statut';
    case 'NOTE':
      return 'Note';
    case 'APPEL':
      return 'Appel';
    case 'EMAIL':
      return 'Email';
    case 'WHATSAPP':
      return 'WhatsApp';
    case 'TACHE_CREEE':
      return 'Tâche créée';
    case 'RELANCE':
      return 'Relance';
    case 'CONVERSION':
      return 'Conversion';
    case 'PERDU':
      return 'Perdu';
    case 'REASSIGNATION':
      return 'Réassignation';
    default:
      return type || 'Activité';
  }
}

function getActivityBadge(type?: string) {
  switch (type) {
    case 'CREATION':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Création</Badge>;
    case 'CHANGEMENT_STATUT':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Statut</Badge>;
    case 'NOTE':
      return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">Note</Badge>;
    case 'CONVERSION':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Conversion</Badge>;
    case 'PERDU':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Perdu</Badge>;
    case 'REASSIGNATION':
      return <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">Réassignation</Badge>;
    default:
      return <Badge variant="outline">{getActivityTypeLabel(type)}</Badge>;
  }
}

function formatDateTimeSafe(value?: string) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return '—';
  }
}

export default function LeadActivityTimeline({
  leadId,
  campaignId,
  title = 'Historique des activités',
}: LeadActivityTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<LeadActivityItem[]>([]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (leadId !== undefined && leadId !== null && String(leadId).trim() !== '') {
      params.set('leadId', String(leadId));
    }
    if (campaignId !== undefined && campaignId !== null && String(campaignId).trim() !== '') {
      params.set('campaignId', String(campaignId));
    }
    return params.toString();
  }, [leadId, campaignId]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/lead-activities${queryString ? `?${queryString}` : ''}`);
        setActivities(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (error) {
        console.error('Failed to fetch lead activities', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [queryString]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            Journal chronologique des actions métier
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Chargement de l’historique...
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Aucune activité enregistrée.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getActivityBadge(activity.type)}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {activity.title}
                      </span>
                    </div>

                    {activity.description && (
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        {activity.description}
                      </div>
                    )}

                    {(activity.oldValue || activity.newValue) && (
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 text-sm">
                        <div className="flex items-center gap-2 mb-2 text-slate-600 dark:text-slate-300">
                          <GitCompare className="h-4 w-4" />
                          Évolution
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Ancienne valeur</div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {activity.oldValue || '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Nouvelle valeur</div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {activity.newValue || '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        <span>
                          {activity.createdBy?.username || activity.createdBy?.email || 'Utilisateur inconnu'}
                        </span>
                      </div>

                      {activity.lead?.name && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Lead : {activity.lead.name}</span>
                        </div>
                      )}

                      {activity.campaign?.name && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Campagne : {activity.campaign.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>{formatDateTimeSafe(activity.activityDate || activity.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}