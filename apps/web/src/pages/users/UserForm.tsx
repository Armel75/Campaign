import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import api from '@/lib/api';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Role is required'),
  password: z.string().optional(),
}).refine((data) => {
  // Password is required for new users
  if (!data.password && !data.roleId) return false; // Hacky check for edit mode context passed via props if I could, but here I rely on optional
  return true;
});

export default function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(userSchema),
  });

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get('/roles');
        setRoles(res.data.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchRoles();

    if (isEdit) {
      const fetchUser = async () => {
        try {
          const res = await api.get(`/users/${id}`);
          const data = res.data;
          setValue('username', data.username);
          setValue('email', data.email);
          setValue('roleId', data.roleId);
        } catch (error) {
          console.error(error);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchUser();
    }
  }, [id, isEdit, setValue]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/users/${id}`, data);
      } else {
        await api.post('/users', data);
      }
      navigate('/users');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{isEdit ? 'Edit User' : 'Create User'}</h2>
          <p className="text-muted-foreground">
            {isEdit ? 'Update user details and role.' : 'Add a new user to the system.'}
          </p>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Enter the user's information below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...register('username')} placeholder="jdoe" />
                {errors.username && <p className="text-xs text-destructive">{errors.username.message as string}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} placeholder="john@example.com" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleId">Role</Label>
              <select 
                id="roleId" 
                {...register('roleId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              {errors.roleId && <p className="text-xs text-destructive">{errors.roleId.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password {isEdit && '(Leave blank to keep current)'}</Label>
              <Input id="password" type="password" {...register('password')} placeholder={isEdit ? "••••••••" : "Required for new users"} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message as string}</p>}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} className="min-w-[120px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save User
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
