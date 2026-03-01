import { Calendar, List, Settings, Clock, User, Users, LogOut, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import { useSidebarState } from './AppLayout';
import logo from '@/assets/powertech-short.png';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', icon: Calendar, label: 'Planning' },
  { to: '/rendez-vous', icon: List, label: 'Rendez-vous' },
  { to: '/creneaux', icon: Clock, label: 'Créneaux', adminOnly: true },
  { to: '/parametres', icon: Settings, label: 'Paramètres', adminOnly: true },
  { to: '/utilisateurs', icon: Users, label: 'Utilisateurs', adminOnly: true },
];

export default function AppSidebar() {
  const location = useLocation();
  const { logout, user, isAdmin } = useAuth();
  const { collapsed, toggle } = useSidebarState();
  const visibleItems = navItems.filter(item => !('adminOnly' in item) || isAdmin);

  return (
    <>
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-sidebar py-4 gap-2 transition-all duration-200 overflow-hidden
          ${collapsed ? 'w-0 -translate-x-full' : 'w-16 lg:w-56 items-center lg:items-stretch lg:px-3'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6 px-2">
          <img src={logo} alt="PowerTech" className="h-9 w-9 object-contain" />
          <span className="hidden lg:block text-sidebar-primary-foreground font-display font-bold text-lg tracking-tight">
            PowerTech
          </span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {visibleItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }
                  justify-center lg:justify-start
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden lg:block">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Collapse button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent mx-auto lg:mx-0"
          title="Masquer la barre latérale"
        >
          <PanelLeftClose className="h-5 w-5" />
        </Button>

        {/* Profil */}
        <div className="flex flex-col gap-1 border-t border-sidebar-border pt-2">
          <Link
            to="/profil"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
              ${location.pathname === '/profil'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }
              justify-center lg:justify-start
            `}
          >
            <User className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block truncate">{user?.email || 'Profil'}</span>
          </Link>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground justify-center lg:justify-start w-full"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Show button when collapsed */}
      {collapsed && (
        <div className="fixed top-3 left-0 z-50 h-12 w-12 flex items-center justify-center bg-sidebar rounded-r-xl shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent h-10 w-10"
            title="Afficher la barre latérale"
          >
            <PanelLeft className="h-6 w-6" />
          </Button>
        </div>
      )}
    </>
  );
}
