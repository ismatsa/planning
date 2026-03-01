import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StoreProvider } from "./store/StoreContext";
import { AuthProvider, useAuth } from "./store/AuthContext";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import RendezVousList from "./pages/RendezVousList";
import UserManagement from "./pages/UserManagement";
import Creneaux from "./pages/Creneaux";
import Parametres from "./pages/Parametres";
import Profil from "./pages/Profil";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <StoreProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/rendez-vous" element={<RendezVousList />} />
          <Route path="/creneaux" element={<Creneaux />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="/utilisateurs" element={<UserManagement />} />
          <Route path="/profil" element={<Profil />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </StoreProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
