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
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { useState } from 'react';

const SidebarItem = ({ icon: Icon, label, to }: { icon: any, label: string, to: string }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  
  return (
    <Link to={to}>
      <Button 
        variant={isActive ? "secondary" : "ghost"} 
        className={cn("w-full justify-start font-normal", isActive && "bg-secondary font-medium")}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col transition-all duration-300">
        <div className="p-6 border-b flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            CM
          </div>
          <h1 className="text-xl font-bold tracking-tight">CampaignMgr</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-4">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wider">Main</p>
            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" />
            <SidebarItem icon={Megaphone} label="Campaigns" to="/campaigns" />
            <SidebarItem icon={Target} label="Objectives" to="/objectives" />
            <SidebarItem icon={ListTodo} label="Tasks" to="/tasks" />
            <SidebarItem icon={BarChart3} label="Leads" to="/leads" />
            <SidebarItem icon={DollarSign} label="Expenses" to="/expenses" />
          </div>

          <div>
            <Button 
              variant="ghost" 
              className="w-full justify-between hover:bg-transparent px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
              <span>Paramétrage</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", isSettingsOpen ? "rotate-0" : "-rotate-90")} />
            </Button>
            
            <div className={cn("space-y-1 overflow-hidden transition-all duration-300 ease-in-out", isSettingsOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}>
              <SidebarItem icon={Share2} label="Channels" to="/channels" />
              <SidebarItem icon={Users} label="Audiences" to="/target-audiences" />
              
              {user?.role === 'ADMIN' && (
                <>
                  <SidebarItem icon={Users} label="Utilisateurs" to="/users" />
                  <SidebarItem icon={Settings} label="Roles" to="/roles" />
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                {user?.username?.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-sm overflow-hidden">
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
