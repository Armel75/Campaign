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
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SidebarItem = ({ icon: Icon, label, to }: { icon: any, label: string, to: string }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  
  return (
    <Link to={to}>
      <Button 
        variant={isActive ? "secondary" : "ghost"} 
        className={cn("w-full justify-start", isActive && "bg-secondary")}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold">CampaignMgr</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" />
          <SidebarItem icon={Megaphone} label="Campaigns" to="/campaigns" />
          <SidebarItem icon={Target} label="Objectives" to="/objectives" />
          <SidebarItem icon={Share2} label="Channels" to="/channels" />
          <SidebarItem icon={Users} label="Audiences" to="/target-audiences" />
          <SidebarItem icon={ListTodo} label="Tasks" to="/tasks" />
          <SidebarItem icon={BarChart3} label="Leads" to="/leads" />
          <SidebarItem icon={DollarSign} label="Expenses" to="/expenses" />
          
          {user?.role === 'ADMIN' && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-muted-foreground uppercase">Admin</p>
              </div>
              <SidebarItem icon={Users} label="Users" to="/users" />
              <SidebarItem icon={Settings} label="Roles" to="/roles" />
            </>
          )}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="text-sm">
              <p className="font-medium">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center px-6 bg-card md:hidden">
          <h1 className="text-lg font-bold">CampaignMgr</h1>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
