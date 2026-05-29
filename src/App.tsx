import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useContext } from "react";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import MyEvents from "./pages/MyEvents";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import Social from "./pages/Social";
import NotFound from "./pages/NotFound";
import ServicosLanding from "./pages/servicos/Landing";
import ServicosAuth from "./pages/servicos/Auth";
import ServicosFeed from "./pages/servicos/Feed";
import ServicosChat from "./pages/servicos/Chat";
import ServicosOfertantes from "./pages/servicos/Ofertantes";
import ServicosAssinatura from "./pages/servicos/Assinatura";
import ServicosPerfil from "./pages/servicos/Perfil";
import ServicosAdmin from "./pages/servicos/Admin";
import { ClonedAuthProvider, clonedRoutes } from "./cloned/ClonedRoutes";
import { AuthContext as ClonedAuthContext } from "./cloned/ClonedAuthContext";
import IncomingCallListener from "./cloned/components/IncomingCallListener";
import { ErrorDebugPopup } from "./components/ErrorDebugPopup";
import { DebugErrorThrower } from "./components/DebugErrorThrower";

const AppRoutes = () => {
  const { user } = useContext(ClonedAuthContext) as { user: { role?: string } | null };

  return (
    <Routes>
      {clonedRoutes(user)}
      <Route path="/discover" element={<Discover />} />
      <Route path="/event/:id" element={<Index />} />
      <Route path="/event/:id/edit" element={<EditEvent />} />
      <Route path="/my-events" element={<MyEvents />} />
      <Route path="/create-event" element={<CreateEvent />} />
      <Route path="/social" element={<Social />} />
      {/* Rotas antigas mantidas em fallback para não quebrar links já existentes. */}
      <Route path="/legacy/auth" element={<Auth />} />
      <Route path="/legacy/admin" element={<Admin />} />
      <Route path="/legacy/servicos" element={<ServicosLanding />} />
      <Route path="/legacy/servicos/auth" element={<ServicosAuth />} />
      <Route path="/legacy/servicos/home" element={<ServicosFeed />} />
      <Route path="/legacy/servicos/chat" element={<ServicosChat />} />
      <Route path="/legacy/servicos/ofertantes" element={<ServicosOfertantes />} />
      <Route path="/legacy/servicos/assinatura" element={<ServicosAssinatura />} />
      <Route path="/legacy/servicos/perfil" element={<ServicosPerfil />} />
      <Route path="/legacy/servicos/admin" element={<ServicosAdmin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <TooltipProvider>
    <ClonedAuthProvider>
      <Toaster />
      <Sonner />
      <IncomingCallListener />
      <DebugErrorThrower />
      <AppRoutes />
      <ErrorDebugPopup />
    </ClonedAuthProvider>
  </TooltipProvider>
);

export default App;
