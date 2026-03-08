import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface Role {
  id: number;
  name: string;

  canViewAllCampaigns: boolean;
  canEditAllCampaigns: boolean;
  canDeleteAllCampaigns: boolean;
  canCreateCampaign: boolean;

  canManageTasks: boolean;
  canAssignTasks: boolean;

  canManageCampaignArticles: boolean;
  canManageAttachments: boolean;

  canManageUsers: boolean;
  canManageRoles: boolean;
  canExportCampaign: boolean;

  createdAt: string;
  updatedAt: string;
}

function PermissionBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <Badge variant={active ? 'default' : 'outline'} className="whitespace-nowrap">
      {label}
    </Badge>
  );
}

export default function RoleList() {
  const navigate = useNavigate();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/roles');
      setRoles(res.data?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Do you really want to delete this role?');
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await api.delete(`/roles/${id}`);
      setRoles((prev) => prev.filter((role) => role.id !== id));
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              Manage role permissions in a clear and readable view.
            </CardDescription>
          </div>

          <Button onClick={() => navigate('/roles/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </CardHeader>

        <CardContent>
          {roles.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No roles found.
            </div>
          ) : (
            <div className="space-y-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4 flex-1 min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold truncate">{role.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            ID: {role.id}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/roles/${role.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(role.id)}
                            disabled={deletingId === role.id}
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === role.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                        <div className="rounded-lg border p-4">
                          <h4 className="mb-3 text-sm font-semibold">Campaign</h4>
                          <div className="flex flex-wrap gap-2">
                            <PermissionBadge
                              active={role.canViewAllCampaigns}
                              label="View all"
                            />
                            <PermissionBadge
                              active={role.canEditAllCampaigns}
                              label="Edit all"
                            />
                            <PermissionBadge
                              active={role.canDeleteAllCampaigns}
                              label="Delete all"
                            />
                            <PermissionBadge
                              active={role.canCreateCampaign}
                              label="Create"
                            />
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h4 className="mb-3 text-sm font-semibold">Tasks</h4>
                          <div className="flex flex-wrap gap-2">
                            <PermissionBadge
                              active={role.canManageTasks}
                              label="Manage"
                            />
                            <PermissionBadge
                              active={role.canAssignTasks}
                              label="Assign"
                            />
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h4 className="mb-3 text-sm font-semibold">Content</h4>
                          <div className="flex flex-wrap gap-2">
                            <PermissionBadge
                              active={role.canManageCampaignArticles}
                              label="Articles"
                            />
                            <PermissionBadge
                              active={role.canManageAttachments}
                              label="Attachments"
                            />
                            <PermissionBadge
                              active={role.canExportCampaign}
                              label="Export"
                            />
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h4 className="mb-3 text-sm font-semibold">Administration</h4>
                          <div className="flex flex-wrap gap-2">
                            <PermissionBadge
                              active={role.canManageUsers}
                              label="Users"
                            />
                            <PermissionBadge
                              active={role.canManageRoles}
                              label="Roles"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-1 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Created: {new Date(role.createdAt).toLocaleString()}
                    </span>
                    <span>
                      Updated: {new Date(role.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}