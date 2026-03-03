import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import Login from '@/pages/auth/Login';
import DashboardLayout from '@/layouts/DashboardLayout';
import Dashboard from '@/pages/dashboard/Dashboard';
import CampaignList from '@/pages/campaigns/CampaignList';
import CampaignForm from '@/pages/campaigns/CampaignForm';
import GenericTable from '@/components/GenericTable';
import GenericForm from '@/components/GenericForm';

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <DashboardLayout><Outlet /></DashboardLayout>;
};

export default function App() {
  return (
    <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            
            {/* Campaigns */}
            <Route path="/campaigns" element={<CampaignList />} />
            <Route path="/campaigns/new" element={<CampaignForm />} />
            <Route path="/campaigns/:id" element={<CampaignForm />} />

            {/* Objectives */}
            <Route path="/objectives" element={
              <GenericTable 
                title="Objectives" 
                endpoint="/objectives" 
                columns={[
                  { key: 'code', label: 'Code' }, 
                  { key: 'label', label: 'Label' },
                  { key: 'isActive', label: 'Active', render: (v: boolean) => v ? 'Yes' : 'No' }
                ]}
                createPath="/objectives/new"
                onEdit={(id) => window.location.href = `/objectives/${id}`}
              />
            } />
            <Route path="/objectives/new" element={
              <GenericForm 
                title="Objective" 
                endpoint="/objectives" 
                redirectPath="/objectives"
                fields={[
                  { name: 'code', label: 'Code', required: true },
                  { name: 'label', label: 'Label', required: true },
                  { name: 'description', label: 'Description' }
                ]}
              />
            } />

            {/* Channels */}
            <Route path="/channels" element={
              <GenericTable 
                title="Channels" 
                endpoint="/channels" 
                columns={[{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }]}
                createPath="/channels/new"
              />
            } />
            <Route path="/channels/new" element={
              <GenericForm 
                title="Channel" 
                endpoint="/channels" 
                redirectPath="/channels"
                fields={[
                  { name: 'name', label: 'Name', required: true },
                  { name: 'description', label: 'Description' }
                ]}
              />
            } />

            {/* Tasks */}
            <Route path="/tasks" element={
              <GenericTable 
                title="Tasks" 
                endpoint="/tasks" 
                columns={[
                  { key: 'title', label: 'Title' }, 
                  { key: 'status', label: 'Status' },
                  { key: 'dueDate', label: 'Due Date', render: (v: string) => new Date(v).toLocaleDateString() }
                ]}
                createPath="/tasks/new"
              />
            } />
            <Route path="/tasks/new" element={
              <GenericForm 
                title="Task" 
                endpoint="/tasks" 
                redirectPath="/tasks"
                fields={[
                  { name: 'title', label: 'Title', required: true },
                  { name: 'status', label: 'Status' },
                  { name: 'dueDate', label: 'Due Date', type: 'date' }
                ]}
              />
            } />

             {/* Leads */}
             <Route path="/leads" element={
              <GenericTable 
                title="Leads" 
                endpoint="/leads" 
                columns={[
                  { key: 'name', label: 'Name' }, 
                  { key: 'email', label: 'Email' },
                  { key: 'status', label: 'Status' }
                ]}
                createPath="/leads/new"
              />
            } />
            <Route path="/leads/new" element={
              <GenericForm 
                title="Lead" 
                endpoint="/leads" 
                redirectPath="/leads"
                fields={[
                  { name: 'name', label: 'Name', required: true },
                  { name: 'email', label: 'Email', type: 'email', required: true },
                  { name: 'status', label: 'Status' }
                ]}
              />
            } />

            {/* Target Audiences */}
            <Route path="/target-audiences" element={
              <GenericTable 
                title="Target Audiences" 
                endpoint="/target-audiences" 
                columns={[{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }]}
                createPath="/target-audiences/new"
              />
            } />
            <Route path="/target-audiences/new" element={
              <GenericForm 
                title="Target Audience" 
                endpoint="/target-audiences" 
                redirectPath="/target-audiences"
                fields={[
                  { name: 'name', label: 'Name', required: true },
                  { name: 'description', label: 'Description' }
                ]}
              />
            } />

            {/* Expenses */}
            <Route path="/expenses" element={
              <GenericTable 
                title="Expenses" 
                endpoint="/expenses" 
                columns={[
                  { key: 'description', label: 'Description' }, 
                  { key: 'amount', label: 'Amount', render: (v: number) => `$${v}` },
                  { key: 'expenseDate', label: 'Date', render: (v: string) => new Date(v).toLocaleDateString() }
                ]}
                createPath="/expenses/new"
              />
            } />
            <Route path="/expenses/new" element={
              <GenericForm 
                title="Expense" 
                endpoint="/expenses" 
                redirectPath="/expenses"
                fields={[
                  { name: 'description', label: 'Description', required: true },
                  { name: 'amount', label: 'Amount', type: 'number', required: true },
                  { name: 'expenseDate', label: 'Date', type: 'date', required: true }
                ]}
              />
            } />

            {/* Admin Routes */}
            <Route path="/users" element={
              <GenericTable 
                title="Users" 
                endpoint="/users" 
                columns={[{ key: 'username', label: 'Username' }, { key: 'email', label: 'Email' }]}
              />
            } />
            <Route path="/roles" element={
              <GenericTable 
                title="Roles" 
                endpoint="/roles" 
                columns={[{ key: 'name', label: 'Name' }]}
              />
            } />

          </Route>
        </Routes>
    </AuthProvider>
  );
}
