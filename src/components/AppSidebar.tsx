import {
  Calendar,
  List,
  Clock,
  Settings,
  Users,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  FileText,
  FilePlus,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";
import { useStore } from "@/store/StoreContext";
import { useSidebarState } from "./AppLayout";
import logo from "@/assets/powertech-short.png";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export default function AppSidebar() {
  const location = useLocation();
  const { logout, user, isAdmin } = useAuth();
  const { collapsed, toggle } = useSidebarState();
  const { devis: devisStore } = useStore();

  const TERMINAL_STATUTS = ['valide', 'refuse', 'annule'];
  const assignedCount = useMemo(() => {
    if (!user) return 0;
    return devisStore.devisList.filter(
      (d) => d.assignedUserId === user.id && !TERMINAL_STATUTS.includes(d.statut)
    ).length;
  }, [devisStore.devisList, user]);

  const sections: {
    title: string;
    items: { to: string; icon: any; label: string; adminOnly?: boolean; badge?: number }[];
  }[] = [
    {
      title: "Événements",
      items: [
        { to: "/", icon: Calendar, label: "Planning" },
        { to: "/rendez-vous", icon: List, label: "Rendez-vous" },
        { to: "/creneaux", icon: Clock, label: "Créneaux", adminOnly: true },
      ],
    },
    {
      title: "Devis",
      items: [
        { to: "/devis/creer", icon: FilePlus, label: "Créer une demmande de devis" },
        {
          to: "/devis",
          icon: FileText,
          label: "Demandes de devis",
          badge: assignedCount > 0 ? assignedCount : undefined,
        },
      ],
    },
    {
      title: "Administration",
      items: [
        { to: "/parametres", icon: Settings, label: "Paramètres", adminOnly: true },
        { to: "/utilisateurs", icon: Users, label: "Utilisateurs", adminOnly: true },
      ],
    },
  ];

  return (
    <>
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-sidebar py-4 gap-2 transition-all duration-200 overflow-hidden
          ${collapsed ? "w-0 -translate-x-full" : "w-16 lg:w-56 items-center lg:items-stretch lg:px-3"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-4 px-2">
          <img src={logo} alt="PowerTech" className="h-9 w-9 object-contain" />
          <span className="hidden lg:block text-sidebar-primary-foreground font-display font-bold text-lg tracking-tight">
            PowerTech
          </span>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {sections.map((section) => {
            const visibleItems = section.items.filter((item) => !("adminOnly" in item && item.adminOnly) || isAdmin);
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title} className="mb-2">
                <span className="hidden lg:block text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold px-3 mb-1">
                  {section.title}
                </span>
                {visibleItems.map(({ to, icon: Icon, label, badge }) => {
                  const active =
                    to === "/"
                      ? location.pathname === "/"
                      : to === "/devis"
                        ? location.pathname === "/devis"
                        : location.pathname.startsWith(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                        ${
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }
                        justify-center lg:justify-start
                      `}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="hidden lg:block flex-1">{label}</span>
                      {badge !== undefined && (
                        <span className="hidden lg:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
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
              ${
                location.pathname === "/profil"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }
              justify-center lg:justify-start
            `}
          >
            <User className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block truncate">{user?.email || "Profil"}</span>
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
