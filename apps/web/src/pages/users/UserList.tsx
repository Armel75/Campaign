import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, User as UserIcon, Shield, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  username: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
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
                            <div className="font-medium">{user.username}</div>
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
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/users/${user.id}`)}>
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(user.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
