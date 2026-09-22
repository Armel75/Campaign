import ChangePasswordModal from '@/components/ChangePasswordModal';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Megaphone,
  Target,
  Users,
  Settings,
  LogOut,
  BarChart3,
  ListTodo,
  Share2,
  ChevronDown,
  Archive,
  TrendingUp,
  ShoppingCart,
  Radar,
  CalendarClock,
  Headset,
  Shield,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NavItem = ({
  icon: Icon,
  label,
  to,
  highlighted,
  disabled,
  badge,
}: {
  icon: any;
  label: string;
  to: string;
  highlighted?: boolean;
  disabled?: boolean;
  badge?: string;
}) => {
  const location = useLocation();

  const targetUrl = new URL(to, 'http://localhost');
  const targetPathname = targetUrl.pathname;
  const targetSearch = targetUrl.search;

  const isActive = disabled
    ? false
    : targetSearch
      ? location.pathname === targetPathname && location.search === targetSearch
      : location.pathname.startsWith(targetPathname);

  const content = (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      disabled={disabled}
      size="sm"
      className={cn(
        'h-9 font-normal transition-all whitespace-nowrap',
        isActive && 'bg-secondary font-medium',
        highlighted && 'border-b-2 border-primary bg-primary/5 font-medium text-primary',
        disabled && 'opacity-50'
      )}
      title={label}
    >
      <Icon className="h-4 w-4 shrink-0 mr-2" />
      <span className="flex items-center gap-1.5">
        <span>{label}</span>
        {highlighted && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
            DG
          </span>
        )}
        {badge && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
            {badge}
          </span>
        )}
      </span>
    </Button>
  );

  if (disabled) {
    return <div>{content}</div>;
  }

  return <Link to={to}>{content}</Link>;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();

  const permissions = user?.permissions;

  const canViewDashboard = !!permissions?.canViewDashboard;
  const canViewStrategicDashboard = !!permissions?.canViewStrategicDashboard;
  const canViewCampaigns = !!permissions?.canViewCampaigns;
  const canViewTasks = !!permissions?.canViewTasks;
  const canViewLeads = !!permissions?.canViewLeads;
  const canViewSettings = !!permissions?.canViewSettings;

  const canManageUsers = !!permissions?.canManageUsers;
  const canManageRoles = !!permissions?.canManageRoles;
  const canDeleteAllCampaigns = !!permissions?.canDeleteAllCampaigns;

  // `canDeleteAllCampaigns` est volontairement inclus : le menu « Objectif » (qui n'était
  // visible qu'avec cette permission) est désormais rangé dans « Paramètres ». Sans cela, un
  // profil n'ayant que cette permission ne verrait plus le menu du tout.
  const showSettingsBlock =
    canViewSettings || canManageUsers || canManageRoles || canDeleteAllCampaigns;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top horizontal navbar — compact Outlook style */}
      <header className="sticky top-0 z-50 border-b bg-card shrink-0">

        {/* Ligne supérieure : actions utilisateur */}
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-b">
          
          {/* Notifications */}
          <NotificationBell labeled />

          {/* Thème */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-sm">
              Thème
            </span>
            <ModeToggle />
          </div>

          {/* Modifier mot de passe */}
          <ChangePasswordModal
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-9 font-normal whitespace-nowrap"
              >
                <Settings className="h-4 w-4 mr-2" />
                Modifier mot de passe
              </Button>
            }
          />

          {/* Profil */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 px-2 gap-2"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                  {user?.username?.substring(0, 2).toUpperCase()}
                </div>

                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-sm font-medium">
                    {user?.username}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    ({user?.role})
                  </span>
                </div>

                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {/* options du profil */}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Déconnexion */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="h-9 font-normal text-destructive hover:text-destructive whitespace-nowrap"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>

        </div>


        {/* Ligne principale : navigation */}
        <div className="px-3 py-2">

          <nav className="flex flex-wrap items-center gap-1">
            
            {canViewDashboard && (
              <NavItem
                icon={LayoutDashboard}
                label="Tableau de bord"
                to="/"
              />
            )}

            {canViewStrategicDashboard && (
              <NavItem
                icon={TrendingUp}
                label="Pilotage stratégique"
                to="/strategic"
                highlighted
              />
            )}

            {canViewStrategicDashboard && (
              <NavItem
                icon={BarChart3}
                label="Rentabilité"
                to="/profitability"
              />
            )}

            {canViewCampaigns && (
              <>
                <NavItem
                  icon={CalendarClock}
                  label="Campagnes planifiées"
                  to="/campaigns?status=PLANIFIEE"
                />

                <NavItem
                  icon={Megaphone}
                  label="Campagne en cours"
                  to="/campaigns"
                />

                <NavItem
                  icon={Archive}
                  label="Archives"
                  to="/campaigns?status=TERMINEE"
                />

                <NavItem
                  icon={ShoppingCart}
                  label="Ventes Campagnes"
                  to="/campaign-sales"
                />
              </>
            )}

            {canViewTasks && (
              <NavItem
                icon={ListTodo}
                label="Tâche Campagne"
                to="/tasks"
              />
            )}

            {canViewLeads && (
              <>
                <NavItem
                  icon={BarChart3}
                  label="Leads"
                  to="/leads"
                />

                <NavItem
                  icon={TrendingUp}
                  label="Conversions"
                  to="/conversions"
                />
              </>
            )}

            {/* Campagne de prospection */}
            <NavItem
              icon={Radar}
              label="Campagne de prospection"
              to="/campaign-prospecting"
              disabled
              badge="A FAIRE"
            />

            {/* Suivi clientèle */}
            <NavItem
              icon={Headset}
              label="Suivi clientèle"
              to="/customer-followup"
              disabled
              badge="A FAIRE"
            />

            {/* Paramètres */}
            {showSettingsBlock && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 font-normal"
                  >
                    <Settings className="h-4 w-4 mr-2" />

                    Paramètres

                    <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">

                  {canViewSettings && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          to="/channels"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          Canaux de communication
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          to="/target-audiences"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Audience cible
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {canDeleteAllCampaigns && (
                    <DropdownMenuItem asChild>
                      <Link
                        to="/objectives"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Target className="mr-2 h-4 w-4" />
                        Objectif
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {canManageUsers && (
                    <DropdownMenuItem asChild>
                      <Link
                        to="/users"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Utilisateurs
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {canManageRoles && (
                    <DropdownMenuItem asChild>
                      <Link
                        to="/roles"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Rôles
                      </Link>
                    </DropdownMenuItem>
                  )}

                </DropdownMenuContent>
              </DropdownMenu>
            )}

          </nav>

        </div>

      </header>
      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-auto">
        <div className="p-6 bg-muted/10">
          {children}
        </div>
      </main>
    </div>
  );
}
