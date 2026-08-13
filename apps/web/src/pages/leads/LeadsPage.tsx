import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GenericTable from '@/components/GenericTable';
import ImportLeadsModal from '@/components/ImportLeadsModal';

function getLeadStatusLabel(status?: string) {
  switch (status) {
    case 'NOUVEAU':
      return 'Nouveau';
    case 'CONTACTE':
      return 'Contacté';
    case 'QUALIFIE':
      return 'Qualifié';
    case 'CONVERTI':
      return 'Converti';
    case 'PERDU':
      return 'Perdu';
    case 'INVALIDE':
      return 'Invalide';
    default:
      return status || '—';
  }
}

export default function LeadsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  return (
    <GenericTable
      title="Leads (importer vos leads à partir d'un fichier Excel, Csv)"
      endpoint="/leads"
      columns={[
        {
          key: 'name',
          label: 'Nom',
          render: (v: string, row: any) => (
            <button
              type="button"
              onClick={() => navigate(`/leads/${row.id}/details`)}
              className="text-left font-medium text-primary hover:underline"
            >
              {v || `#${row.id}`}
            </button>
          ),
        },
        {
          key: 'campaignId',
          label: 'Campagne',
          render: (_: any, row: any) =>
            row.campaign?.name || `#${row.campaignId ?? ''}`,
        },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Téléphone' },
        {
          key: 'status',
          label: 'Statut',
          render: (v: string) => getLeadStatusLabel(v),
        },
        {
          key: 'assignedTo',
          label: 'Assigné à',
          render: (_: any, row: any) =>
            row.assignedTo?.username ||
            row.assignedTo?.name ||
            row.assignedTo?.email ||
            '—',
        },
        {
          key: 'nextFollowUpAt',
          label: 'Prochaine relance',
          render: (v: string) => (v ? new Date(v).toLocaleDateString() : '—'),
        },
      ]}
      createPath="/leads/new"
      onEdit={(id) => navigate(`/leads/${id}`)}
      onViewDetails={(id) => navigate(`/leads/${id}/details`)}
      pagination
      pageSize={10}
      paginationMode="server"
      searchable
      searchPlaceholder="Rechercher par nom, email, téléphone, campagne, assigné..."
      filters={[
        {
          key: 'status',
          label: 'Statut',
          options: [
            { label: 'Nouveau', value: 'NOUVEAU' },
            { label: 'Contacté', value: 'CONTACTE' },
            { label: 'Qualifié', value: 'QUALIFIE' },
            { label: 'Converti', value: 'CONVERTI' },
            { label: 'Perdu', value: 'PERDU' },
            { label: 'Invalide', value: 'INVALIDE' },
          ],
        },
      ]}
      refreshKey={refreshKey}
      extraActions={
        <ImportLeadsModal onImported={() => setRefreshKey((k) => k + 1)} />
      }
    />
  );
}
