import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
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
    <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
      <Lock className="h-5 w-5" />
      <span className="pointer-events-none absolute -bottom-3 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full bg-primary/20 blur-xl" />
    </div>
  );
}

function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.10]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Soft blobs */}
      <div className="absolute -top-28 right-[-120px] h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-32 left-[-140px] h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />

      {/* Top highlight */}
      <div className="absolute left-1/2 top-0 h-24 w-[760px] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-2xl dark:via-white/10" />
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-2xl border bg-card/40 p-4 shadow-sm backdrop-blur transition-colors hover:bg-card/55">
      <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div className="relative min-h-screen w-full bg-background text-foreground">
      <Backdrop />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-2">
          {/* GAUCHE — Branding / Valeur produit */}
          <div className="hidden lg:block">
            <div className="max-w-xl">
              <div className="flex items-center gap-4">
                <BrandMark />
                <div className="leading-tight">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Campagne Marketing
                  </h1>
                </div>
              </div>

              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Centralisez vos campagnes, vos tâches, vos prospects et votre budget dans un espace de travail
                professionnel — conçu pour décider vite, exécuter mieux et mesurer l’impact.
              </p>

              {/* Pillars */}
              <div className="mt-7 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border bg-card/40 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Gauge className="h-4 w-4 text-primary" />
                    Contrôle
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Vision globale, sans friction.</p>
                </div>
                <div className="rounded-2xl border bg-card/40 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Performance
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Suivi et optimisation continue.</p>
                </div>
                <div className="rounded-2xl border bg-card/40 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Fiabilité
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Données prêtes pour le reporting.</p>
                </div>
              </div>

              {/* Features */}
              <div className="mt-7 grid gap-3">
                <FeatureItem
                  icon={<Target className="h-4 w-4" />}
                  title="Suivi des campagnes"
                  desc="Planifiez, suivez l’avancement et gardez une lecture claire des actions en cours."
                />
                <FeatureItem
                  icon={<CheckSquare className="h-4 w-4" />}
                  title="Gestion des tâches"
                  desc="Orchestrez l’exécution : priorités, responsables, échéances et statut, au même endroit."
                />
                <FeatureItem
                  icon={<Users className="h-4 w-4" />}
                  title="Gestion des prospects"
                  desc="Suivez le pipeline : qualification, prochaine action, et historique pour ne rien perdre."
                />
                <FeatureItem
                  icon={<TrendingUp className="h-4 w-4" />}
                  title="Suivi des conversions"
                  desc="Reliez l’effort au résultat : conversions, sources et efficacité des actions."
                />
                <FeatureItem
                  icon={<Wallet className="h-4 w-4" />}
                  title="Pilotage du budget"
                  desc="Gardez le contrôle : dépenses, allocations, écarts et visibilité immédiate sur le ROI."
                />
              </div>
            </div>
          </div>

          {/* DROITE — Formulaire (logique inchangée) */}
          <div className="mx-auto w-full max-w-[460px]">
            <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
              {/* Mobile: Branding + Valeur synthèse */}
              <div className="mb-6 flex flex-col items-center text-center lg:hidden">
                <BrandMark />
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                  Pilotez vos campagnes en toute confiance
                </h1>
                <p className="mt-1 max-w-[34ch] text-sm text-muted-foreground">
                  Campagnes, tâches, prospects, conversions et budget — centralisés dans un seul espace.
                </p>
              </div>

              <Card className="relative overflow-hidden border bg-card/70 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:rounded-2xl">
                {/* Card top glow */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/12 to-transparent" />

                <form onSubmit={handleSubmit(onSubmit)} className="relative">
                  <CardContent className="px-6 pb-0 pt-8 sm:px-8">
                    {/* Desktop header */}
                    <div className="mb-7 hidden lg:block">
                      <p className="text-sm font-medium text-muted-foreground">Accès sécurisé</p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight">Connexion</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Entrez vos identifiants pour accéder à votre espace de travail.
                      </p>
                    </div>

                    {/* Error (logique inchangée, style amélioré) */}
                    {serverError && (
                      <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="space-y-0.5">
                            <p className="font-medium">Impossible de vous connecter</p>
                            {/* contenu inchangé (serverError) */}
                            <p className="text-destructive/90">{serverError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fields */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm">
                          Nom d’utilisateur
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="username"
                            placeholder="Saisissez votre nom d’utilisateur"
                            className={cn(
                              'h-11 pl-9',
                              'rounded-xl',
                              'bg-background/60',
                              'shadow-sm',
                              'transition-[box-shadow,border-color,background-color] duration-200',
                              'focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0',
                              errors.username
                                ? 'border-destructive/60 focus-visible:ring-destructive/30'
                                : 'border-border/60 hover:border-border'
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
                        <Label htmlFor="password" className="text-sm">
                          Mot de passe
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className={cn(
                              'h-11 pl-9 pr-11',
                              'rounded-xl',
                              'bg-background/60',
                              'shadow-sm',
                              'transition-[box-shadow,border-color,background-color] duration-200',
                              'focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0',
                              errors.password
                                ? 'border-destructive/60 focus-visible:ring-destructive/30'
                                : 'border-border/60 hover:border-border'
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
                              'absolute right-1 top-1/2 h-9 -translate-y-1/2 rounded-lg px-2',
                              'text-muted-foreground hover:text-foreground',
                              'hover:bg-muted/50'
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
                    <div className="mt-6 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                      Conseil : utilisez vos identifiants d’entreprise. En cas de blocage, contactez votre administrateur.
                    </div>
                  </CardContent>

                  <CardFooter className="mt-6 flex flex-col gap-4 px-6 pb-8 sm:px-8">
                    <Button
                      type="submit"
                      className={cn(
                        'h-11 w-full rounded-xl',
                        'shadow-sm',
                        'transition-[transform,box-shadow] active:scale-[0.99]',
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

                    <div className="text-center text-xs text-muted-foreground">
                      <span className="opacity-70">Besoin d’un accès ? </span>
                      <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">
                        Contacter l’administrateur
                      </a>
                    </div>

                    <div className="text-center text-[11px] text-muted-foreground/70">
                      &copy; {year} CampaignMgr SaaS. Tous droits réservés.
                    </div>
                  </CardFooter>
                </form>
              </Card>

              {/* Desktop small reassurance */}
              <div className="mt-6 hidden text-center text-xs text-muted-foreground/60 lg:block">
                © 2026 SOREPCO • Espace de travail privé
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}