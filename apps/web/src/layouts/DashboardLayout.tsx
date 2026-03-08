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
  DollarSign,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { useState } from 'react';
import { Shield } from 'lucide-react';

const SidebarItem = ({
  icon: Icon,
  label,
  to,
  isCollapsed,
}: {
  icon: any;
  label: string;
  to: string;
  isCollapsed: boolean;
}) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  
  return (
    <Link to={to}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full font-normal transition-all",
          isCollapsed ? "justify-center px-2" : "justify-start",
          isActive && "bg-secondary font-medium"
        )}
        title={isCollapsed ? label : undefined}
      >
        <Icon className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-2")} />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Button>
    </Link>
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "border-r bg-card hidden md:flex flex-col transition-all duration-300",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn("p-4 border-b flex items-center", isSidebarCollapsed ? "justify-center" : "justify-between gap-2")}>
          <div className={cn("flex items-center", isSidebarCollapsed ? "justify-center" : "gap-2 min-w-0")}>
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              CM
            </div>
            {!isSidebarCollapsed && (
              <h1 className="text-xl font-bold tracking-tight truncate">CampaignMgr</h1>
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
        
        <nav className={cn("flex-1 overflow-y-auto", isSidebarCollapsed ? "p-2 space-y-2" : "p-4 space-y-1")}>
          <div className="mb-4">
            {!isSidebarCollapsed && (
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wider">Main</p>
            )}

            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" isCollapsed={isSidebarCollapsed} />
            <SidebarItem icon={Megaphone} label="Campaigns" to="/campaigns" isCollapsed={isSidebarCollapsed} />
            <SidebarItem icon={Target} label="Objectives" to="/objectives" isCollapsed={isSidebarCollapsed} />
            <SidebarItem icon={ListTodo} label="Tasks" to="/tasks" isCollapsed={isSidebarCollapsed} />
            <SidebarItem icon={BarChart3} label="Leads" to="/leads" isCollapsed={isSidebarCollapsed} />
            <SidebarItem icon={DollarSign} label="Expenses" to="/expenses" isCollapsed={isSidebarCollapsed} />
          </div>

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
                      "h-4 w-4 transition-transform duration-200",
                      isSettingsOpen ? "rotate-180" : "rotate-0"
                    )}
                  />
                </Button>

                <div
                  className={cn(
                    "space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                    isSettingsOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <SidebarItem icon={Share2} label="Channels" to="/channels" isCollapsed={isSidebarCollapsed} />
                  <SidebarItem icon={Users} label="Audiences" to="/target-audiences" isCollapsed={isSidebarCollapsed} />
                  
                  {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <SidebarItem icon={Users} label="Utilisateurs" to="/users" isCollapsed={isSidebarCollapsed} />
                  )}
                  
                  {user?.role === 'SUPER_ADMIN' && (
                    <SidebarItem icon={Shield} label="Roles" to="/roles" isCollapsed={isSidebarCollapsed} />
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <SidebarItem icon={Share2} label="Channels" to="/channels" isCollapsed={isSidebarCollapsed} />
                <SidebarItem icon={Users} label="Audiences" to="/target-audiences" isCollapsed={isSidebarCollapsed} />
                
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                  <SidebarItem icon={Users} label="Utilisateurs" to="/users" isCollapsed={isSidebarCollapsed} />
                )}
                
                {user?.role === 'ADMIN' && (
                  <SidebarItem icon={Settings} label="Roles" to="/roles" isCollapsed={isSidebarCollapsed} />
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t bg-muted/20">
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
                    {user?.username?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-sm overflow-hidden min-w-0">
                    <p className="font-medium truncate max-w-[100px]">{user?.username}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[100px]">{user?.role}</p>
                  </div>
                </div>
                <ModeToggle />
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card md:hidden">
          <h1 className="text-lg font-bold">CampaignMgr</h1>
          <ModeToggle />
        </header>
        <div className="flex-1 p-6 overflow-auto bg-muted/10">
          {children}
        </div>
      </main>
    </div>
  );
}