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
  PanelLeftClose,
  PanelLeftOpen,
  Archive,
  TrendingUp,
  ShoppingCart,
  Radar,
  CalendarClock,
  Headset,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { useState } from 'react';
import { Shield } from 'lucide-react';

const SidebarItem = ({
  icon: Icon,
  label,
  to,
  isCollapsed,
  highlighted,
  disabled,
  badge,
}: {
  icon: any;
  label: string;
  to: string;
  isCollapsed: boolean;
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
      className={cn(
        'w-full font-normal transition-all',
        isCollapsed ? 'justify-center px-2' : 'justify-start',
        isActive && 'bg-secondary font-medium',
        highlighted && !isCollapsed && 'border-l-2 border-primary bg-primary/5 font-medium text-primary',
        highlighted && isCollapsed && 'ring-1 ring-primary ring-inset',
        disabled && 'opacity-50'
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className={cn('h-4 w-4 shrink-0', !isCollapsed && 'mr-2')} />
      {!isCollapsed && (
        <span className="flex flex-col items-start gap-1 min-w-0">
          <span className="flex items-center gap-2 min-w-0 w-full">
            <span className="truncate">{label}</span>
            {highlighted && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                DG
              </span>
            )}
          </span>
          {badge && (
            <span className="shrink-0 inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
              {badge}
            </span>
          )}
        </span>
      )}
    </Button>
  );

  if (disabled) {
    return <div>{content}</div>;
  }

  return <Link to={to}>{content}</Link>;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const showSettingsBlock =
    canViewSettings || canManageUsers || canManageRoles;

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'border-r bg-card hidden md:flex flex-col transition-all duration-300',
          isSidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div
          className={cn(
            'p-4 border-b flex items-center',
            isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2'
          )}
        >
          <div
            className={cn(
              'flex items-center',
              isSidebarCollapsed ? 'justify-center' : 'gap-2 min-w-0'
            )}
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              CM
            </div>
            {!isSidebarCollapsed && (
              <h1 className="text-xl font-bold tracking-tight truncate">Campagne</h1>
            )}
          </div>

          {!isSidebarCollapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(true)}
              className="shrink-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isSidebarCollapsed && (
          <div className="p-2 border-b flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        <nav
          className={cn(
            'flex-1 overflow-y-auto',
            isSidebarCollapsed ? 'p-2 space-y-2' : 'p-4 space-y-1'
          )}
        >
          <div className="mb-4">
            {!isSidebarCollapsed && (
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wider">
                Main
              </p>
            )}

            {canViewDashboard && (
              <SidebarItem
                icon={LayoutDashboard}
                label="Tableau de bord"
                to="/"
                isCollapsed={isSidebarCollapsed}
              />
            )}

            {canViewStrategicDashboard && (
              <SidebarItem
                icon={TrendingUp}
                label="Pilotage stratégique DG"
                to="/strategic"
                isCollapsed={isSidebarCollapsed}
                highlighted
              />
            )}

            {canViewStrategicDashboard && (
              <SidebarItem
                icon={BarChart3}
                label="Rentabilité"
                to="/profitability"
                isCollapsed={isSidebarCollapsed}
              />
            )}

            {canViewCampaigns && (
              <>
                <SidebarItem
                  icon={CalendarClock}
                  label="Campagnes planifiées"
                  to="/campaigns?status=PLANIFIEE"
                  isCollapsed={isSidebarCollapsed}
                />

                <SidebarItem
                  icon={Megaphone}
                  label="Campagne"
                  to="/campaigns"
                  isCollapsed={isSidebarCollapsed}
                />

                <SidebarItem
                  icon={Archive}
                  label="Archives"
                  to="/campaigns?status=TERMINEE"
                  isCollapsed={isSidebarCollapsed}
                />

                <SidebarItem
                  icon={ShoppingCart}
                  label="Ventes Campagnes"
                  to="/campaign-sales"
                  isCollapsed={isSidebarCollapsed}
                />
              </>
            )}

            {canDeleteAllCampaigns && (
              <SidebarItem
                icon={Target}
                label="Objectif"
                to="/objectives"
                isCollapsed={isSidebarCollapsed}
              />
            )}

            {canViewTasks && (
              <SidebarItem
                icon={ListTodo}
                label="Tâche Campagne"
                to="/tasks"
                isCollapsed={isSidebarCollapsed}
              />
            )}

            {canViewLeads && (
              <>
                <SidebarItem
                  icon={BarChart3}
                  label="Leads"
                  to="/leads"
                  isCollapsed={isSidebarCollapsed}
                />
                <SidebarItem
                  icon={TrendingUp}
                  label="Conversions"
                  to="/conversions"
                  isCollapsed={isSidebarCollapsed}
                />
              </>
            )}

            {/* Placeholders publics (grisés) — visibles par tout le monde */}
            <SidebarItem
              icon={Radar}
              label="Campagne de prospection"
              to="/campaign-prospecting"
              isCollapsed={isSidebarCollapsed}
              disabled
              badge="A FAIRE"
            />
            <SidebarItem
              icon={Headset}
              label="Suivi clientèle"
              to="/customer-followup"
              isCollapsed={isSidebarCollapsed}
              disabled
              badge="A FAIRE"
            />
          </div>

          {showSettingsBlock && (
            <div>
              {!isSidebarCollapsed ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-between px-4 mb-2 font-medium border bg-muted/40 hover:bg-muted transition-all"
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Paramétrage
                    </span>

                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isSettingsOpen ? 'rotate-180' : 'rotate-0'
                      )}
                    />
                  </Button>

                  <div
                    className={cn(
                      'space-y-1 overflow-hidden transition-all duration-300 ease-in-out',
                      isSettingsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    {canViewSettings && (
                      <>
                        <SidebarItem
                          icon={Share2}
                          label="Canal de communication"
                          to="/channels"
                          isCollapsed={isSidebarCollapsed}
                        />
                        <SidebarItem
                          icon={Users}
                          label="Audience cible"
                          to="/target-audiences"
                          isCollapsed={isSidebarCollapsed}
                        />
                      </>
                    )}

                    {canManageUsers && (
                      <SidebarItem
                        icon={Users}
                        label="Utilisateurs"
                        to="/users"
                        isCollapsed={isSidebarCollapsed}
                      />
                    )}

                    {canManageRoles && (
                      <SidebarItem
                        icon={Shield}
                        label="Rôles"
                        to="/roles"
                        isCollapsed={isSidebarCollapsed}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  {canViewSettings && (
                    <>
                      <SidebarItem
                        icon={Share2}
                        label="Channels"
                        to="/channels"
                        isCollapsed={isSidebarCollapsed}
                      />
                      <SidebarItem
                        icon={Users}
                        label="Audiences"
                        to="/target-audiences"
                        isCollapsed={isSidebarCollapsed}
                      />
                    </>
                  )}

                  {canManageUsers && (
                    <SidebarItem
                      icon={Users}
                      label="Utilisateurs"
                      to="/users"
                      isCollapsed={isSidebarCollapsed}
                    />
                  )}

                  {canManageRoles && (
                    <SidebarItem
                      icon={Shield}
                      label="Roles"
                      to="/roles"
                      isCollapsed={isSidebarCollapsed}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ...existing code... */}
        </nav>

        <div className="p-4 border-t bg-muted/20 flex flex-col gap-2">
          {/* Bouton Modifier mot de passe fixé en bas, juste au-dessus du bloc utilisateur/déconnexion */}
          {!isSidebarCollapsed && (
            <ChangePasswordModal
              trigger={
                <Button variant="outline" className="w-full justify-between font-medium border bg-muted/40 hover:bg-muted transition-all">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Modifier mot de passe
                  </span>
                </Button>
              }
            />
          )}
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
                    {user?.username?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-sm overflow-hidden min-w-0">
                    <p className="font-medium truncate max-w-[100px]">{user?.username}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {user?.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <NotificationBell />
                  <ModeToggle />
                </div>
              </div>

              <Button variant="destructive" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
                {user?.username?.substring(0, 2).toUpperCase()}
              </div>

              <NotificationBell />
              <ModeToggle />

              <Button
                variant="destructive"
                size="icon"
                className="h-10 w-10"
                onClick={logout}
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card md:hidden">
          <h1 className="text-lg font-bold">CampaignMgr</h1>
          <ModeToggle />
        </header>
        <div className="flex-1 p-6 overflow-auto bg-muted/10">{children}</div>
      </main>
    </div>
  );
}