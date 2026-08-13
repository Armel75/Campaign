import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/lib/api';
import { Plus, Pencil, UserX, UserCheck, User as UserIcon, Shield, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import ResetUserPasswordModal from '@/components/ResetUserPasswordModal';

interface User {
  id: string;
  username: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (user: User) => {
    const nextActive = !user.isActive;
    if (
      !confirm(
        nextActive
          ? `Réactiver l'utilisateur « ${user.username} » ?`
          : `Désactiver l'utilisateur « ${user.username} » ?`
      )
    ) return;
    try {
      await api.patch(`/users/${user.id}/status`, { isActive: nextActive });
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage system users and their roles.</p>
        </div>
        <Button onClick={() => navigate('/users/new')} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Create User
        </Button>
      </div>

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="rounded-md border bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="h-12 px-4 align-middle font-medium">User</th>
                  <th className="h-12 px-4 align-middle font-medium">Role</th>
                  <th className="h-12 px-4 align-middle font-medium">Joined</th>
                  <th className="h-12 px-4 align-middle font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <UserIcon className="h-8 w-8 opacity-20" />
                        <p>No users found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.username}
                              {!user.isActive && (
                                <Badge variant="secondary" className="text-[10px]">Désactivé</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge variant={user.role.name === 'ADMIN' ? 'default' : 'secondary'} className="gap-1">
                          <Shield className="h-3 w-3" />
                          {user.role.name}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/users/${user.id}`)}>
                            <Pencil className="h-4 w-4 mr-1 text-muted-foreground" />
                            Modifier
                          </Button>
                          <ResetUserPasswordModal userId={user.id} username={user.username} />
                          {user.role.name !== 'SUPER_ADMIN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={
                                user.isActive
                                  ? 'hover:bg-destructive/10 hover:text-destructive'
                                  : 'hover:bg-green-500/10 hover:text-green-600'
                              }
                              onClick={() => handleToggleActive(user)}
                            >
                              {user.isActive ? (
                                <UserX className="h-4 w-4 mr-1" />
                              ) : (
                                <UserCheck className="h-4 w-4 mr-1" />
                              )}
                              {user.isActive ? 'Désactiver' : 'Activer'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
