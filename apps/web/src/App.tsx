import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import Login from '@/pages/auth/Login';
import DashboardLayout from '@/layouts/DashboardLayout';
import Dashboard from '@/pages/dashboard/Dashboard';
import CampaignList from '@/pages/campaigns/CampaignList';
import CampaignForm from '@/pages/campaigns/CampaignForm';
import GenericTable from '@/components/GenericTable';
import GenericForm from '@/components/GenericForm';
import { ThemeProvider } from '@/components/theme-provider';
import UserList from '@/pages/users/UserList';
import UserForm from '@/pages/users/UserForm';
import CampaignDetails from '@/pages/campaigns/CampaignDetails';
import CampaignSalesRanking from '@/pages/campaigns/CampaignSalesRanking';
import StrategicDashboard from '@/pages/strategic/StrategicDashboard';
import ProfitabilityDashboard from '@/pages/profitability/ProfitabilityDashboard';
import RoleForm from './pages/roles/RoleForm';
import RoleList from './pages/roles/RoleList';
import LeadDetails from '@/pages/leads/LeadDetails';
import LeadsPage from '@/pages/leads/LeadsPage';
import ConversionList from '@/pages/conversions/ConversionList';
import ConversionForm from '@/pages/conversions/ConversionForm';
import Register from '@/pages/auth/Register';

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

const PermissionRoute = ({
  allowed,
  children,
}: {
  allowed: boolean;
  children: React.ReactNode;
}) => {
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const getTaskStatusLabel = (status?: string) => {
  switch (status) {
    case 'A_FAIRE':
      return 'À faire';
    case 'EN_COURS':
      return 'En cours';
    case 'TERMINE':
      return 'Terminé';
    case 'ANNULE':
      return 'Annulé';
    default:
      return status || '—';
  }
};

const getTaskPriorityLabel = (priority?: string) => {
  switch (priority) {
    case 'FAIBLE':
      return 'Faible';
    case 'MOYENNE':
      return 'Moyenne';
    case 'ELEVEE':
      return 'Élevée';
    case 'URGENTE':
      return 'Urgente';
    default:
      return priority || '—';
  }
};

const AppRoutes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const permissions = user?.permissions;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <PermissionRoute allowed={!!permissions?.canViewDashboard}>
              <Dashboard />
            </PermissionRoute>
          }
        />

        <Route
          path="/strategic"
          element={
            <PermissionRoute allowed={!!permissions?.canViewStrategicDashboard}>
              <StrategicDashboard />
            </PermissionRoute>
          }
        />

        <Route
          path="/profitability"
          element={
            <PermissionRoute allowed={!!permissions?.canViewStrategicDashboard}>
              <ProfitabilityDashboard />
            </PermissionRoute>
          }
        />

        <Route
          path="/campaigns"
          element={
            <PermissionRoute allowed={!!permissions?.canViewCampaigns}>
              <CampaignList />
            </PermissionRoute>
          }
        />
        <Route
          path="/campaign-sales"
          element={
            <PermissionRoute allowed={!!permissions?.canViewCampaigns}>
              <CampaignSalesRanking />
            </PermissionRoute>
          }
        />
        <Route
          path="/campaigns/new"
          element={
            <PermissionRoute allowed={!!permissions?.canCreateCampaign}>
              <CampaignForm />
            </PermissionRoute>
          }
        />
        <Route
          path="/campaigns/:id"
          element={
            <PermissionRoute allowed={!!permissions?.canViewCampaigns}>
              <CampaignDetails />
            </PermissionRoute>
          }
        />
        <Route
          path="/campaigns/:id/edit"
          element={
            <PermissionRoute allowed={!!permissions?.canEditAllCampaigns}>
              <CampaignForm />
            </PermissionRoute>
          }
        />

        <Route
          path="/objectives"
          element={
            <PermissionRoute allowed={!!permissions?.canDeleteAllCampaigns}>
              <GenericTable
                title="Objectifs"
                endpoint="/objectives"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'label', label: 'Libellé' },
                  {
                    key: 'isActive',
                    label: 'Actif',
                    render: (v: boolean) => (v ? 'Oui' : 'Non'),
                  },
                ]}
                createPath="/objectives/new"
                onEdit={(id) => navigate(`/objectives/${id}`)}
                actionsAllowed={!!permissions?.canDeleteAllCampaigns}
              />
            </PermissionRoute>
          }
        />
        <Route
          path="/objectives/new"
          element={
            <PermissionRoute allowed={!!permissions?.canDeleteAllCampaigns}>
              <GenericForm
                title="Objectif"
                endpoint="/objectives"
                redirectPath="/objectives"
                fields={[
                  { name: 'code', label: 'Code', required: true },
                  { name: 'label', label: 'Libellé', required: true },
                  { name: 'description', label: 'Description' },
                ]}
              />
            </PermissionRoute>
          }
        />
        <Route
          path="/objectives/:id"
          element={
            <PermissionRoute allowed={!!permissions?.canDeleteAllCampaigns}>
              <GenericForm
                title="Objectif"
                endpoint="/objectives"
                redirectPath="/objectives"
                fields={[
                  { name: 'code', label: 'Code', required: true },
                  { name: 'label', label: 'Libellé', required: true },
                  { name: 'description', label: 'Description' },
                ]}
              />
            </PermissionRoute>
          }
        />

        <Route
          path="/channels"
          element={
            <PermissionRoute allowed={!!permissions?.canViewSettings}>
              <GenericTable
                title="Canaux de communication"
                endpoint="/channels"
                columns={[
                  { key: 'name', label: 'Nom' },
                  { key: 'description', label: 'Description' },
                ]}
                createPath="/channels/new"
                onEdit={(id) => navigate(`/channels/${id}`)}
              />
            </PermissionRoute>
          }
        />
        <Route
          path="/channels/new"
          element={
            <PermissionRoute allowed={!!permissions?.canViewSettings}>
              <GenericForm
                title="Canal de communication"
                endpoint="/channels"
                redirectPath="/channels"
                fields={[
                  { name: 'name', label: 'Nom', required: true },
                  { name: 'description', label: 'Description' },
                ]}
              />
            </PermissionRoute>
          }
        />
        <Route
          path="/channels/:id"
          element={
            <PermissionRoute allowed={!!permissions?.canViewSettings}>
              <GenericForm
                title="Canal de communication"
                endpoint="/channels"
                redirectPath="/channels"
                fields={[
                  { name: 'name', label: 'Nom', required: true },
                  { name: 'description', label: 'Description' },
                ]}
              />
            </PermissionRoute>
          }
        />
        
        <Route
          path="/tasks"
          element={
            <PermissionRoute allowed={!!permissions?.canViewTasks}>
              <GenericTable
                title="Tâches (définissez des tâches ou des actions pour vos campagnes)"
                endpoint="/tasks"
                columns={[
                  { key: 'title', label: 'Titre' },
                  { key: 'description', label: 'Description' },
                  {
                    key: 'campaign',
                    label: 'Campagne',
                    render: (_: any, row: any) =>
                      row.campaign?.name ||
                      row.campaign?.title ||
                      `#${row.campaign?.id ?? ''}`,
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
                    key: 'createdBy',
                    label: 'Créé par',
                    render: (_: any, row: any) => row.createdBy?.username || '—',
                  },
                  {
                    key: 'status',
                    label: 'Statut',
                    render: (v: string) => getTaskStatusLabel(v),
                  },
                  {
                    key: 'priority',
                    label: 'Priorité',
                    render: (v: string) => getTaskPriorityLabel(v),
                  },
                  {
                    key: 'dueDate',
                    label: 'Date d’échéance',
                    render: (v: string) => (v ? new Date(v).toLocaleDateString() : '—'),
                  },
                  {
                    key: 'createdAt',
                    label: 'Créée le',
                    render: (v: string) => (v ? new Date(v).toLocaleDateString() : '—'),
                  },
                  {
                    key: 'updatedAt',
                    label: 'Modifiée le',
                    render: (v: string) => (v ? new Date(v).toLocaleDateString() : '—'),
                  },
                ]}
                createPath="/tasks/new"
                onEdit={(id) => navigate(`/tasks/${id}/edit`)}
                pagination
                pageSize={10}
                paginationMode="server"
                searchable
                searchPlaceholder="Rechercher par titre, description, campagne, assigné..."
                filters={[
                  {
                    key: 'status',
                    label: 'Statut',
                    options: [
                      { label: 'À faire', value: 'A_FAIRE' },
                      { label: 'En cours', value: 'EN_COURS' },
                      { label: 'Terminé', value: 'TERMINE' },
                      { label: 'Annulé', value: 'ANNULE' },
                    ],
                  },
                  {
                    key: 'priority',
                    label: 'Priorité',
                    options: [
                      { label: 'Faible', value: 'FAIBLE' },
                      { label: 'Moyenne', value: 'MOYENNE' },
                      { label: 'Élevée', value: 'ELEVEE' },
                      { label: 'Urgente', value: 'URGENTE' },
                    ],
                  },
                ]}
              />
            </PermissionRoute>
          }
        />

        <Route
          path="/tasks/new"
          element={
            <PermissionRoute allowed={!!permissions?.canViewTasks}>
              <GenericForm
                title="Tâche"
                endpoint="/tasks"
                redirectPath="/tasks"
                fields={[
                  { name: 'title', label: 'Titre', required: true },
                  {
                    name: 'description',
                    label: 'Description',
                    type: 'textarea',
                    required: false,
                  },
                  {
                    name: 'campaignId',
                    label: 'Campagne',
                    type: 'select',
                    required: true,
                    endpoint: '/campaigns',
                    optionValue: 'id',
                    optionLabel: 'name',
                  },
                  {
                    name: 'assignedTo',
                    label: 'Utilisateur GLPI assigné',
                    type: 'select',
                    required: true,
                    endpoint: '/glpi-users',
                    optionValue: 'id',
                    optionLabel: 'username',
                  },
                  {
                    name: 'status',
                    label: 'Statut',
                    type: 'select',
                    required: true,
                    options: [
                      { label: 'À faire', value: 'A_FAIRE' },
                      { label: 'En cours', value: 'EN_COURS' },
                      { label: 'Terminé', value: 'TERMINE' },
                      { label: 'Annulé', value: 'ANNULE' },
                    ],
                  },
                  {
                    name: 'priority',
                    label: 'Priorité',
                    type: 'select',
                    required: true,
                    options: [
                      { label: 'Faible', value: 'FAIBLE' },
                      { label: 'Moyenne', value: 'MOYENNE' },
                      { label: 'Élevée', value: 'ELEVEE' },
                      { label: 'Urgente', value: 'URGENTE' },
                    ],
                  },
                  {
                    name: 'dueDate',
                    label: 'Date d’échéance',
                    type: 'date',
                    required: false,
                  },
                ]}
              />
            </PermissionRoute>
          }
        />

        <Route
          path="/tasks/:id/edit"
          element={
            <PermissionRoute allowed={!!permissions?.canViewTasks}>
              <GenericForm
                title="Tâche"
                endpoint="/tasks"
                redirectPath="/tasks"
                fields={[
                  { name: 'title', label: 'Titre', required: true },
                  {
                    name: 'description',
                    label: 'Description',
                    type: 'textarea',
                    required: false,
                  },
                  {
                    name: 'campaignId',
                    label: 'Campagne',
                    type: 'select',
                    required: true,
                    endpoint: '/campaigns',
                    optionValue: 'id',
                    optionLabel: 'name',
                  },
                  {
                    name: 'assignedTo',
                    label: 'Utilisateur GLPI assigné',
                    type: 'select',
                    required: true,
                    endpoint: '/glpi-users',
                    optionValue: 'id',
                    optionLabel: 'username',
                  },
                  {
                    name: 'dueDate',
                    label: 'Date d’échéance',
                    type: 'date',
                    required: false,
                  },
                  {
                    name: 'status',
                    label: 'Statut',
                    type: 'select',
                    required: true,
                    options: [
                      { label: 'À faire', value: 'A_FAIRE' },
                      { label: 'En cours', value: 'EN_COURS' },
                      { label: 'Terminé', value: 'TERMINE' },
                      { label: 'Annulé', value: 'ANNULE' },
                    ],
                  },
                  {
                    name: 'priority',
                    label: 'Priorité',
                    type: 'select',
                    required: true,
                    options: [
                      { label: 'Faible', value: 'FAIBLE' },
                      { label: 'Moyenne', value: 'MOYENNE' },
                      { label: 'Élevée', value: 'ELEVEE' },
                      { label: 'Urgente', value: 'URGENTE' },
                    ],
                  },
                ]}
              />
            </PermissionRoute>
          }
        />

        {/* Leads */}
        <Route
          path="/leads"
          element={
            <PermissionRoute allowed={!!permissions?.canViewLeads}>
              <LeadsPage />
            </PermissionRoute>
          }
        />
        
        <Route
          path="/leads/new"
          element={
            <PermissionRoute allowed={!!permissions?.canViewLeads}>
              <GenericForm
                title="Lead"
                endpoint="/leads"
                redirectPath="/leads"
                fields={[
                  {
                    name: 'campaignId',
                    label: 'Campagne',
                    type: 'select',
                    required: true,
                    endpoint: '/campaigns',
                    optionValue: 'id',
                    optionLabel: 'name',
                  },
                  { name: 'name', label: 'Nom', required: true },
                  { name: 'email', label: 'Email', type: 'email', required: false },
                  { name: 'phone', label: 'Téléphone', required: false },
                  {
                    name: 'status',
                    label: 'Statut',
                    type: 'select',
                    required: true,
                    options: [
                      { label: 'Nouveau', value: 'NOUVEAU' },
                      { label: 'Contacté', value: 'CONTACTE' },
                      { label: 'Qualifié', value: 'QUALIFIE' },
                      { label: 'Converti', value: 'CONVERTI' },
                      { label: 'Perdu', value: 'PERDU' },
                      { label: 'Invalide', value: 'INVALIDE' },
                    ],
                  },
                  {
                    name: 'assignedToId',
                    label: 'Utilisateur GLPI assigné',
                    type: 'select',
                    required: false,
                    endpoint: '/glpi-users',
                    optionValue: 'id',
                    optionLabel: 'username',
                  },
                  { name: 'notes', label: 'Notes', type: 'textarea', required: false },
                  {
                    name: 'nextFollowUpAt',
                    label: 'Prochaine relance',
                    type: 'date',
                    required: false,
                  },
                  {
                    name: 'lastContactAt',
                    label: 'Dernier contact',
                    type: 'date',
                    required: false,
                  },
                  {
                    name: 'convertedAt',
                    label: 'Date de conversion',
                    type: 'date',
                    required: false,
                  },
                  {
                    name: 'lostReason',
                    label: 'Motif de perte',
                    required: false,
                  },
                ]}
              />
            </PermissionRoute>
          }
        />

        <Route
          path="/leads/:id"
          element={
            <PermissionRoute allowed={!!permissions?.canViewLeads}>
              <GenericForm
                title="Lead"
                endpoint="/leads"
                redirectPath="/leads"
                fields={[
                  {
                    name: 'campaignId',
                    label: 'Campagne',
                    type: 'select',
                    required: true,
                    endpoint: '/campaigns',
                    optionValue: 'id',
                    optionLabel: 'name',
                  },
                  { name: 'name', label: 'Nom', required: true },
                  { name: 'email', label: 'Email', type: 'email', required: false },
                  { name: 'phone', label: 'Téléphone', required: false },
                  {
                    name: 'status',
                    label: 'Statut',
                    type: 'select',
                    required: true,
                    options: [
                      { label: 'Nouveau', value: 'NOUVEAU' },
                      { label: 'Contacté', value: 'CONTACTE' },
                      { label: 'Qualifié', value: 'QUALIFIE' },
                      { label: 'Converti', value: 'CONVERTI' },
                      { label: 'Perdu', value: 'PERDU' },
                      { label: 'Invalide', value: 'INVALIDE' },
                    ],
                  },
                  {
                    name: 'assignedToId',
                    label: 'Utilisateur GLPI assigné',
                    type: 'select',
                    required: false,
                    endpoint: '/glpi-users',
                    optionValue: 'id',
                    optionLabel: 'username',
                  },
                  { name: 'notes', label: 'Notes', type: 'textarea', required: false },
                  {
                    name: 'nextFollowUpAt',
                    label: 'Prochaine relance',
                    type: 'date',
                    required: false,
                  },
                  {
                    name: 'lastContactAt',
                    label: 'Dernier contact',
                    type: 'date',
                    required: false,
                  },
                  {
                    name: 'convertedAt',
                    label: 'Date de conversion',
                    type: 'date',
                    required: false,
                  },
                  {
                    name: 'lostReason',
                    label: 'Motif de perte',
                    required: false,
                  },
                ]}
              />
            </PermissionRoute>
          }
        />

        <Route
          path="/leads/:id/details"
          element={
            <PermissionRoute allowed={!!permissions?.canViewLeads}>
              <LeadDetails />
            </PermissionRoute>
          }
        />

        {/* Conversions */}
        <Route
          path="/conversions"
          element={
            <PermissionRoute allowed={!!permissions?.canViewLeads}>
              <ConversionList />
            </PermissionRoute>
          }
        />

        <Route
          path="/leads/:leadId/conversions/new"
          element={
            <PermissionRoute allowed={!!permissions?.canViewLeads}>
              <ConversionForm />
            </PermissionRoute>
          }
        />

        <Route
          path="/conversions/:id/edit"
          element={
            <PermissionRoute allowed={!!permissions?.canViewLeads}>
              <ConversionForm />
            </PermissionRoute>
          }
        />

        <Route
          path="/target-audiences"
          element={
            <PermissionRoute allowed={!!permissions?.canViewSettings}>
              <GenericTable
                title="Audience cible"
                endpoint="/target-audiences"
                columns={[
                  { key: 'name', label: 'Nom' },
                  { key: 'description', label: 'Description' },
                ]}
                createPath="/target-audiences/new"
                onEdit={(id) => navigate(`/target-audiences/${id}`)}
              />
            </PermissionRoute>
          }
        />
        <Route
          path="/target-audiences/new"
          element={
            <PermissionRoute allowed={!!permissions?.canViewSettings}>
              <GenericForm
                title="Audience cible"
                endpoint="/target-audiences"
                redirectPath="/target-audiences"
                fields={[
                  { name: 'name', label: 'Nom', required: true },
                  { name: 'description', label: 'Description' },
                ]}
              />
            </PermissionRoute>
          }
        />
        <Route
          path="/target-audiences/:id"
          element={
            <PermissionRoute allowed={!!permissions?.canViewSettings}>
              <GenericForm
                title="Audience cible"
                endpoint="/target-audiences"
                redirectPath="/target-audiences"
                fields={[
                  { name: 'name', label: 'Nom', required: true },
                  { name: 'description', label: 'Description' },
                ]}
              />
            </PermissionRoute>
          }
        />

        {/* Expenses */}
        <Route
          path="/expenses"
          element={
            <PermissionRoute allowed={!!permissions?.canViewExpenses}>
              <GenericTable
                title="Dépenses"
                endpoint="/expenses"
                columns={[
                  {
                    key: 'budgetLine',
                    label: 'Ligne budgétaire',
                    render: (_: any, row: any) =>
                      row.budgetLine?.label || `#${row.budgetLineId ?? ''}`,
                  },
                  { key: 'description', label: 'Description' },
                  { key: 'amount', label: 'Montant', render: (v: number) => `${v}` },
                  {
                    key: 'expenseDate',
                    label: 'Date',
                    render: (v: string) => (v ? new Date(v).toLocaleDateString() : '—'),
                  },
                ]}
                createPath="/expenses/new"
                onEdit={(id) => navigate(`/expenses/${id}`)}
              />
            </PermissionRoute>
          }
        />

        <Route
          path="/expenses/new"
          element={
            <PermissionRoute allowed={!!permissions?.canViewExpenses}>
              <GenericForm
                title="Dépense"
                endpoint="/expenses"
                redirectPath="/expenses"
                fields={[
                  {
                    name: 'budgetLineId',
                    label: 'Ligne budgétaire',
                    type: 'select',
                    required: true,
                    endpoint: '/budget-lines',
                    optionValue: 'id',
                    optionLabel: 'label',
                  },
                  { name: 'description', label: 'Description', required: true },
                  { name: 'amount', label: 'Montant', type: 'number', required: true },
                  { name: 'expenseDate', label: 'Date', type: 'date', required: true },
                ]}
              />
            </PermissionRoute>
          }
        />

        <Route
          path="/expenses/:id"
          element={
            <PermissionRoute allowed={!!permissions?.canViewExpenses}>
              <GenericForm
                title="Dépense"
                endpoint="/expenses"
                redirectPath="/expenses"
                fields={[
                  {
                    name: 'budgetLineId',
                    label: 'Ligne budgétaire',
                    type: 'select',
                    required: true,
                    endpoint: '/budget-lines',
                    optionValue: 'id',
                    optionLabel: 'label',
                  },
                  { name: 'description', label: 'Description', required: true },
                  { name: 'amount', label: 'Montant', type: 'number', required: true },
                  { name: 'expenseDate', label: 'Date', type: 'date', required: true },
                ]}
              />
            </PermissionRoute>
          }
        />

        <Route
          path="/users"
          element={
            <PermissionRoute allowed={!!permissions?.canManageUsers}>
              <UserList />
            </PermissionRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <PermissionRoute allowed={!!permissions?.canManageUsers}>
              <UserForm />
            </PermissionRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <PermissionRoute allowed={!!permissions?.canManageUsers}>
              <UserForm />
            </PermissionRoute>
          }
        />

        <Route
          path="/roles"
          element={
            <PermissionRoute allowed={!!permissions?.canManageRoles}>
              <RoleList />
            </PermissionRoute>
          }
        />
        <Route
          path="/roles/new"
          element={
            <PermissionRoute allowed={!!permissions?.canManageRoles}>
              <RoleForm />
            </PermissionRoute>
          }
        />
        <Route
          path="/roles/:id"
          element={
            <PermissionRoute allowed={!!permissions?.canManageRoles}>
              <RoleForm />
            </PermissionRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}