import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  Target,
  CheckSquare,
  Users,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Gauge,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function BrandMark() {
  return (
    <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-[1.35rem] border border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-white/5 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_20px_45px_-20px_rgba(16,185,129,0.7)] ring-1 ring-white/10 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_40%)]" />
      <Lock className="relative z-10 h-6 w-6" />
      <span className="pointer-events-none absolute -bottom-4 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-emerald-400/35 blur-2xl" />
    </div>
  );
}

export default LoginPage;

function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_28%),linear-gradient(135deg,#020617_0%,#061126_35%,#030b18_65%,#020617_100%)]">
      {/* Grille premium */}
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

      {/* Voiles lumineux */}
      <div className="absolute -top-28 left-[8%] h-[360px] w-[360px] rounded-full bg-emerald-500/18 blur-3xl" />
      <div className="absolute top-[12%] right-[-120px] h-[420px] w-[420px] rounded-full bg-sky-500/12 blur-3xl" />
      <div className="absolute -bottom-36 left-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-500/12 blur-3xl" />
      <div className="absolute bottom-[10%] right-[8%] h-[260px] w-[260px] rounded-full bg-white/6 blur-3xl" />

      {/* Halo central */}
      <div className="absolute left-1/2 top-0 h-28 w-[820px] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(2,6,23,0.35)_100%)]" />
    </div>
  );
}

function PillarCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/25 hover:bg-white/[0.07] hover:shadow-[0_24px_60px_-24px_rgba(16,185,129,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_38%)] opacity-80" />
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 shadow-inner shadow-emerald-400/10">
            {icon}
          </span>
          {title}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-300">{desc}</p>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-[1px] shadow-[0_10px_35px_-12px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/20 hover:shadow-[0_24px_60px_-24px_rgba(16,185,129,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_33%)] opacity-80" />
      <div className="absolute -right-12 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start gap-4 rounded-[1.7rem] border border-white/8 bg-slate-950/45 px-4 py-4 backdrop-blur-2xl">
        <div className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_-16px_rgba(16,185,129,0.7)] ring-1 ring-emerald-400/10">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[1rem] font-semibold tracking-tight text-white">{title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Affiche le message de succès si on vient de s'inscrire
  useEffect(() => {
    if (location.state && location.state.registered) {
      setRegisterSuccess(true);
      // Nettoie l'état pour ne pas réafficher si on revient
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setServerError(null);

    // Artificial delay for better UX (prevents flickering on fast networks)
    const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const [response] = await Promise.all([api.post('/auth/login', data), minLoadingTime]);

      login(response.data.accessToken, response.data.user);
      navigate('/');
    } catch (err: any) {
      await minLoadingTime; // Ensure delay even on error

      if (err.response) {
        if (err.response.status === 401) {
          setServerError('Invalid username or password.');
        } else if (err.response.status === 403) {
          setServerError('Access denied. Please contact support.');
        } else if (err.response.status === 429) {
          setServerError('Too many attempts. Please try again later.');
        } else if (err.response.status >= 500) {
          setServerError('Server error. Our team has been notified.');
        } else {
          setServerError('An error occurred. Please try again.');
        }
      } else if (err.request) {
        setServerError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setServerError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <Backdrop />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          {/* GAUCHE — Branding / Valeur produit */}
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
                Centralisez vos campagnes, vos tâches, vos prospects et votre budget dans un espace de travail
                professionnel — pensé pour accélérer l’exécution, renforcer la visibilité et améliorer la qualité du pilotage.
              </p>

              {/* Pillars */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <PillarCard
                  icon={<Gauge className="h-4 w-4" />}
                  title="Contrôle"
                  desc="Vision globale, sans friction."
                />
                <PillarCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  title="Performance"
                  desc="Suivi et optimisation continue."
                />
                <PillarCard
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="Fiabilité"
                  desc="Données prêtes pour le reporting."
                />
              </div>

              {/* Features */}
              <div className="mt-8 grid gap-4">
                <FeatureItem
                  icon={<Target className="h-5 w-5" />}
                  title="Suivi des campagnes"
                  desc="Planifiez, suivez l’avancement et gardez une lecture claire des actions en cours."
                />
                <FeatureItem
                  icon={<CheckSquare className="h-5 w-5" />}
                  title="Gestion des tâches"
                  desc="Orchestrez l’exécution : priorités, responsables, échéances et statut, au même endroit."
                />
                <FeatureItem
                  icon={<Users className="h-5 w-5" />}
                  title="Gestion des prospects"
                  desc="Suivez le pipeline : qualification, prochaine action, et historique pour ne rien perdre."
                />
                <FeatureItem
                  icon={<TrendingUp className="h-5 w-5" />}
                  title="Suivi des conversions"
                  desc="Reliez l’effort au résultat : conversions, sources et efficacité des actions."
                />
                <FeatureItem
                  icon={<Wallet className="h-5 w-5" />}
                  title="Pilotage du budget"
                  desc="Gardez le contrôle : dépenses, allocations, écarts et visibilité immédiate sur le ROI."
                />
              </div>
            </div>
          </div>

          {/* DROITE — Formulaire (logique inchangée) */}
          <div className="mx-auto w-full max-w-[480px]">
            <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
              {/* Mobile: Branding + Valeur synthèse */}
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
                  Campagnes, tâches, prospects, conversions et budget — centralisés dans un seul espace.
                </p>
              </div>

              <div className="mb-8 hidden justify-center lg:flex">
                <h2 className="text-4xl font-semibold tracking-tight">
                  <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                    SOREPCO
                  </span>
                </h2>
              </div>

              <Card className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-white/[0.06] shadow-[0_30px_80px_-28px_rgba(0,0,0,0.75)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/[0.05]">
                {/* Card top glow */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-400/12 via-white/5 to-transparent" />
                <div className="pointer-events-none absolute -right-16 top-8 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 bottom-0 h-36 w-36 rounded-full bg-sky-400/8 blur-3xl" />

                <form onSubmit={handleSubmit(onSubmit)} className="relative">
                  <CardContent className="px-6 pb-0 pt-8 sm:px-8">
                    {/* Desktop header */}
                    <div className="mb-7 hidden lg:block">
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300/85">
                        Accès sécurisé
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Connexion</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Entrez vos identifiants pour accéder à votre espace de travail.
                      </p>
                    </div>

                    {/* Succès inscription */}
                    {registerSuccess && (
                      <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3.5 text-sm text-emerald-400 backdrop-blur-sm">
                        Compte créé avec succès ! Vous pouvez vous connecter.
                      </div>
                    )}
                    {/* Error (logique inchangée, style amélioré) */}
                    {serverError && (
                      <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive backdrop-blur-sm">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="space-y-0.5">
                            <p className="font-medium">Impossible de vous connecter</p>
                            <p className="text-destructive/90">{serverError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fields */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm text-slate-200">
                          Nom d’utilisateur
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="username"
                            placeholder="Saisissez votre nom d’utilisateur"
                            className={cn(
                              'h-12 pl-10',
                              'rounded-2xl',
                              'border-white/10 bg-slate-950/45 text-white placeholder:text-slate-500',
                              'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                              'transition-[box-shadow,border-color,background-color] duration-200',
                              'focus-visible:ring-2 focus-visible:ring-emerald-400/25 focus-visible:ring-offset-0',
                              errors.username
                                ? 'border-destructive/60 focus-visible:ring-destructive/30'
                                : 'hover:border-white/20'
                            )}
                            disabled={isLoading}
                            autoComplete="username"
                            {...register('username')}
                          />
                        </div>
                        {errors.username && (
                          <p className="text-xs text-destructive">{errors.username.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm text-slate-200">
                          Mot de passe
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className={cn(
                              'h-12 pl-10 pr-12',
                              'rounded-2xl',
                              'border-white/10 bg-slate-950/45 text-white placeholder:text-slate-500',
                              'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                              'transition-[box-shadow,border-color,background-color] duration-200',
                              'focus-visible:ring-2 focus-visible:ring-emerald-400/25 focus-visible:ring-offset-0',
                              errors.password
                                ? 'border-destructive/60 focus-visible:ring-destructive/30'
                                : 'hover:border-white/20'
                            )}
                            disabled={isLoading}
                            autoComplete="current-password"
                            {...register('password')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-xl px-2.5',
                              'text-slate-400 hover:text-white',
                              'hover:bg-white/8'
                            )}
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            </span>
                          </Button>
                        </div>
                        {errors.password && (
                          <p className="text-xs text-destructive">{errors.password.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Micro-copy FR */}
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-xs leading-5 text-slate-300 backdrop-blur-sm">
                      Conseil : utilisez vos identifiants d’entreprise. En cas de blocage, contactez votre administrateur.
                    </div>
                  </CardContent>

                  <CardFooter className="mt-6 flex flex-col gap-4 px-6 pb-8 sm:px-8">
                    <Button
                      type="submit"
                      className={cn(
                        'h-12 w-full rounded-2xl border border-emerald-400/20',
                        'bg-gradient-to-r from-emerald-500 via-emerald-500 to-green-500 text-white',
                        'shadow-[0_18px_38px_-18px_rgba(16,185,129,0.9)]',
                        'transition-[transform,box-shadow,filter] duration-200 active:scale-[0.99]',
                        'hover:brightness-105 hover:shadow-[0_24px_48px_-20px_rgba(16,185,129,1)]',
                        'disabled:opacity-100'
                      )}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connexion en cours…
                        </>
                      ) : (
                        'Se connecter'
                      )}
                    </Button>

                    <div className="text-center text-xs text-slate-400">
                      <span className="opacity-80">Pas de compte ? </span>
                      <Link
                          to="/auth/register"
                          className="text-emerald-400 font-semibold underline underline-offset-4 text-base transition-all duration-200 hover:text-white hover:bg-emerald-400 hover:rounded px-2 py-1 shadow-md"
                      >
                          Créer un compte
                      </Link>
                    </div>

                    <div className="text-center text-[11px] text-slate-500">
                      &copy; {year} CampaignMgr SaaS. Tous droits réservés.
                    </div>
                  </CardFooter>
                </form>
              </Card>

              {/* Desktop small reassurance */}
              <div className="mt-6 hidden text-center text-xs text-slate-500 lg:block">
                © 2026 <span className="font-semibold text-emerald-400">SOREPCO</span> • Espace de travail privé
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
