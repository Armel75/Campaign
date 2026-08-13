
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Lock, User, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  matricule: z.string().min(1, 'Matricule requis'),
  username: z.string().min(1, "Nom d'utilisateur requis"),
  email: z
    .string()
    .email('Email invalide')
    .regex(
      /^[^@\s]+@([^.@\s]+\.)*groupesorepco\.com$/,
      "L'email doit se terminer par groupesorepco.com (ex: nom@info.groupesorepco.com)"
    ),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  password: z.string().min(6, '6 caractères minimum'),
  confirmPassword: z.string().min(6, '6 caractères minimum'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      matricule: '',
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setServerError(null);
    setSuccess(false);
    try {
      await api.post('/auth/register', data);
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { registered: true } }), 1500);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setServerError(err.response.data.message);
      } else {
        setServerError('Erreur lors de la création du compte.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Premium background (identique Login)
  function Backdrop() {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_28%),linear-gradient(135deg,#020617_0%,#061126_35%,#030b18_65%,#020617_100%)]">
        <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.11) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.11) 1px, transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />
        </div>
        <div className="absolute -top-28 left-[8%] h-[360px] w-[360px] rounded-full bg-emerald-500/18 blur-3xl" />
        <div className="absolute top-[12%] right-[-120px] h-[420px] w-[420px] rounded-full bg-sky-500/12 blur-3xl" />
        <div className="absolute -bottom-36 left-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute bottom-[10%] right-[8%] h-[260px] w-[260px] rounded-full bg-white/6 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-28 w-[820px] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(2,6,23,0.35)_100%)]" />
      </div>
    );
  }

  function BrandMark() {
    return (
      <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-[1.35rem] border border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-white/5 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_20px_45px_-20px_rgba(16,185,129,0.7)] ring-1 ring-white/10 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_40%)]" />
        <Lock className="relative z-10 h-6 w-6" />
        <span className="pointer-events-none absolute -bottom-4 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-emerald-400/35 blur-2xl" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <Backdrop />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          {/* Branding à gauche (desktop) */}
          <div className="hidden lg:block">
            <div className="max-w-2xl">
              <div className="flex items-center gap-4">
                <BrandMark />
                <div className="leading-tight">
                  <div className="text-[0.78rem] font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Plateforme métier
                  </div>
                  <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white xl:text-[2.85rem]">
                    Campagne Marketing
                  </h1>
                </div>
              </div>
              <p className="mt-6 max-w-2xl text-[1.05rem] leading-8 text-slate-300">
                Créez votre compte pour accéder à toutes les fonctionnalités premium de la plateforme : gestion des campagnes, tâches, prospects, conversions et budget.
              </p>
            </div>
          </div>
          {/* Formulaire à droite */}
          <div className="mx-auto w-full max-w-[480px]">
            <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
              {/* Branding mobile */}
              <div className="mb-6 flex flex-col items-center text-center lg:hidden">
                <BrandMark />
                <div className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-slate-400">
                  Plateforme métier
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Campagne Marketing{' '}
                  <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                    SOREPCO
                  </span>
                </h1>
                <p className="mt-2 max-w-[36ch] text-sm leading-6 text-slate-300">
                  Créez votre compte pour accéder à toutes les fonctionnalités premium de la plateforme.
                </p>
              </div>
              <Card className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-white/[0.06] shadow-[0_30px_80px_-28px_rgba(0,0,0,0.75)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/[0.05]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-400/12 via-white/5 to-transparent" />
                <div className="pointer-events-none absolute -right-16 top-8 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 bottom-0 h-36 w-36 rounded-full bg-sky-400/8 blur-3xl" />
                <form onSubmit={handleSubmit(onSubmit)} className="relative">
                  <CardContent className="px-6 pb-0 pt-8 sm:px-8">
                    <div className="mb-7 hidden lg:block">
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300/85">
                        Inscription
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Créer un compte</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Remplissez le formulaire pour rejoindre la plateforme.
                      </p>
                    </div>
                    {serverError && (
                      <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive backdrop-blur-sm">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="space-y-0.5">
                            <p className="font-medium">Erreur lors de la création</p>
                            <p className="text-destructive/90">{serverError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {success && (
                      <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3.5 text-sm text-emerald-400 backdrop-blur-sm">
                        Compte créé avec succès ! Redirection…
                      </div>
                    )}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="matricule" className="text-sm text-slate-200">Matricule</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input id="matricule" {...register('matricule')} disabled={isLoading} placeholder="Ex : DL1247" className={cn('h-12 pl-10 rounded-2xl border-white/10 bg-slate-950/45 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,border-color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25 focus-visible:ring-offset-0', errors.matricule && 'border-destructive/60 ring-destructive/30')} />
                        </div>
                        {errors.matricule && <p className="text-xs text-destructive mt-1">{errors.matricule.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="username" className="text-sm text-slate-200">Nom d’utilisateur</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input id="username" {...register('username')} disabled={isLoading} placeholder="Ex : jdupont" className={cn('h-12 pl-10 rounded-2xl border-white/10 bg-slate-950/45 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,border-color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25 focus-visible:ring-offset-0', errors.username && 'border-destructive/60 ring-destructive/30')} />
                        </div>
                        {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-sm text-slate-200">Email</Label>
                        <Input id="email" type="email" {...register('email')} disabled={isLoading} placeholder="Ex : jdupont@info.groupesorepco.com" className={cn('h-12 rounded-2xl border-white/10 bg-slate-950/45 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,border-color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25 focus-visible:ring-offset-0', errors.email && 'border-destructive/60 ring-destructive/30')} />
                        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="firstName" className="text-sm text-slate-200">Prénom</Label>
                        <Input id="firstName" {...register('firstName')} disabled={isLoading} placeholder="Ex : Jean" className={cn('h-12 rounded-2xl border-white/10 bg-slate-950/45 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,border-color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25 focus-visible:ring-offset-0', errors.firstName && 'border-destructive/60 ring-destructive/30')} />
                        {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-sm text-slate-200">Nom</Label>
                        <Input id="lastName" {...register('lastName')} disabled={isLoading} placeholder="Ex : Dupont" className={cn('h-12 rounded-2xl border-white/10 bg-slate-950/45 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,border-color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25 focus-visible:ring-offset-0', errors.lastName && 'border-destructive/60 ring-destructive/30')} />
                        {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="password" className="text-sm text-slate-200">Mot de passe</Label>
                        <Input id="password" type="password" {...register('password')} disabled={isLoading} placeholder="********" className={cn('h-12 rounded-2xl border-white/10 bg-slate-950/45 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,border-color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25 focus-visible:ring-offset-0', errors.password && 'border-destructive/60 ring-destructive/30')} />
                        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword" className="text-sm text-slate-200">Confirmer le mot de passe</Label>
                        <Input id="confirmPassword" type="password" {...register('confirmPassword')} disabled={isLoading} placeholder="********" className={cn('h-12 rounded-2xl border-white/10 bg-slate-950/45 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,border-color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25 focus-visible:ring-offset-0', errors.confirmPassword && 'border-destructive/60 ring-destructive/30')} />
                        {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4 px-6 pb-8 pt-6">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Création…' : 'Créer le compte'}
                    </Button>
                    <div className="text-center text-xs text-slate-400">
                      <span>Déjà un compte ? </span>
                      <Link
                        to="/login"
                        className="text-emerald-400 font-semibold underline underline-offset-4 text-base transition-all duration-200 hover:text-white hover:bg-emerald-400 hover:rounded px-2 py-1 shadow-md"
                      >
                        Se connecter
                      </Link>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
