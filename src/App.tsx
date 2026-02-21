import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "./store/StoreContext";
import { AuthProvider, useAuth } from "./store/AuthContext";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import RendezVousList from "./pages/RendezVousList";
import Creneaux from "./pages/Creneaux";
import Parametres from "./pages/Parametres";
import Profil from "./pages/Profil";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/rendez-vous" element={<RendezVousList />} />
        <Route path="/creneaux" element={<Creneaux />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="/profil" element={<Profil />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </StoreProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
