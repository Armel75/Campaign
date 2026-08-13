
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
  matricule: z.string().min(1, 'Matricule is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .regex(
      /^[^@\s]+@([^.@\s]+\.)*groupesorepco\.com$/,
      'Email must end with groupesorepco.com (e.g. nom@info.groupesorepco.com)'
    ),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  roleId: z.string().min(1, 'Role is required'),
  password: z
    .string()
    .optional()
    .refine((value) => !value || value.length >= 6, {
      message: 'Password must be at least 6 characters',
    }),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      matricule: '',
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      roleId: '',
      password: '',
    },
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

          setValue('matricule', data.matricule ?? '');
          setValue('username', data.username ?? '');
          setValue('email', data.email ?? '');
          setValue('firstName', data.firstName ?? '');
          setValue('lastName', data.lastName ?? '');
          setValue('roleId', String(data.roleId ?? ''));
          setValue('password', '');
        } catch (error) {
          console.error(error);
        } finally {
          setInitialLoading(false);
        }
      };

      fetchUser();
    }
  }, [id, isEdit, setValue]);

  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = async (data: UserFormValues) => {
    setLoading(true);
    setServerError(null);

    try {
      const payload: Record<string, unknown> = {
        matricule: data.matricule,
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        roleId: Number(data.roleId),
      };

      if (data.password && data.password.trim()) {
        payload.password = data.password;
      }

      if (isEdit) {
        await api.put(`/users/${id}`, payload);
      } else {
        await api.post('/users', payload);
      }

      navigate('/users');
    } catch (error: any) {
      if (error.response?.data?.message) {
        setServerError(error.response.data.message);
      } else {
        setServerError('Erreur lors de la création ou modification de l’utilisateur.');
      }
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
          <CardDescription>Enter the user's information below.</CardDescription>
        </CardHeader>

        <CardContent>
          {serverError && (
            <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive backdrop-blur-sm">
              {serverError}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="matricule">Matricule</Label>
                <Input id="matricule" {...register('matricule')} placeholder="Ex : DL1247" />
                {errors.matricule && (
                  <p className="text-xs text-destructive">{errors.matricule.message as string}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...register('username')} placeholder="jdoe" />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username.message as string}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} placeholder="john@example.com" />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message as string}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register('firstName')} placeholder="Jean" />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message as string}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register('lastName')} placeholder="Dupont" />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message as string}</p>
                )}
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
                  <option key={role.id} value={String(role.id)}>
                    {role.name}
                  </option>
                ))}
              </select>
              {errors.roleId && <p className="text-xs text-destructive">{errors.roleId.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password {isEdit && '(Leave blank to keep current)'}</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder={isEdit ? '••••••••' : 'Required for new users'}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message as string}</p>
              )}
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