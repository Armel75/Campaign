import GenericTable from '@/components/GenericTable';
import { useNavigate } from 'react-router-dom';

export default function CampaignList() {
  const navigate = useNavigate();

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', render: (val: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
        val === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
        val === 'DRAFT' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
      }`}>
        {val}
      </span>
    )},
    { key: 'startDate', label: 'Start Date', render: (val: string) => new Date(val).toLocaleDateString() },
    { key: 'endDate', label: 'End Date', render: (val: string) => new Date(val).toLocaleDateString() },
    { key: 'objective', label: 'Objective', render: (obj: any) => obj?.label || '-' },
  ];

  return (
    <div className="space-y-6">
      <GenericTable
        title="Campaigns"
        endpoint="/campaigns"
        columns={columns}
        createPath="/campaigns/new"
        onEdit={(id) => navigate(`/campaigns/${id}`)}
      />
    </div>
  );
}
