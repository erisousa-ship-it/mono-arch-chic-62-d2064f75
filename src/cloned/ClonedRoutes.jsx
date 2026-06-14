import React, { useEffect, useState } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './i18n';
import './App.css';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import FeedPage from './pages/FeedPage';
import KeniaDashboard from './pages/KeniaDashboard';
import AIChat from './pages/AIChat';
import MessagesPage from './pages/MessagesPage';
import ServicesPage from './pages/ServicesPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import DirectChatPage from './pages/DirectChatPage';
import VolunteersPage from './pages/VolunteersPage';
import VolunteerRegisterPage from './pages/VolunteerRegisterPage';
import OfferServicesPage from './pages/OfferServicesPage';
import NearbyHelpersPage from './pages/NearbyHelpersPage';
import MapPage from './pages/MapPage';
import JobsPage from './pages/JobsPage';
import HousingPage from './pages/HousingPage';
import SubscriptionPage from './pages/SubscriptionPage';
import PublicProfilePage from './pages/PublicProfilePage';
import CallPage from './pages/CallPage';
import OferecoAjudaPage from './pages/OferecoAjudaPage';
import SouVoluntarioPage from './pages/SouVoluntarioPage';
import { AuthContext } from './ClonedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateSvcProfile, normalizeAuthUser } from './lib/authProfile';

export function ClonedAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  useTranslation();

  const loadUser = async (session) => {
    if (!session?.user) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      return null;
    }

    const profile = await getOrCreateSvcProfile(session.user);
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
    }

    const isAdmin = (roles ?? []).some((item) => item.role === 'admin');
    const normalized = normalizeAuthUser(session.user, profile);
    const hydratedUser = { ...normalized, role: isAdmin ? 'admin' : normalized.role };
    setUser(hydratedUser);
    setToken(session.access_token || null);
    if (session.access_token) localStorage.setItem('token', session.access_token);
    return hydratedUser;
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) await loadUser(session);
      } catch (error) {
        console.error('Error fetching user:', error);
        if (!cancelled) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null);
      if (session?.access_token) localStorage.setItem('token', session.access_token);
      else localStorage.removeItem('token');

      setTimeout(() => {
        loadUser(session).catch((error) => console.error('Error syncing auth user:', error));
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (newToken, userData) => {
    if (newToken) localStorage.setItem('token', newToken);
    setToken(newToken || null);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUser(session);
      return;
    }
    setUser(userData || null);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return loadUser(session);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, token, loading, isAuthenticated: Boolean(user), login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function clonedRoutes(user) {
  return [
    <Route key="cloned-root" path="/" element={!user ? <LandingPage /> : <Navigate to="/home" />} />,
    <Route key="cloned-servicos" path="/servicos" element={!user ? <LandingPage /> : <Navigate to="/home" />} />,
    <Route key="cloned-auth" path="/auth" element={!user ? <AuthPage /> : <Navigate to="/home" />} />,
    <Route key="cloned-servicos-auth" path="/servicos/auth" element={!user ? <AuthPage /> : <Navigate to="/home" />} />,
    <Route key="cloned-home" path="/home" element={user ? <KeniaDashboard /> : <Navigate to="/" />} />,
    <Route key="cloned-servicos-home" path="/servicos/home" element={user ? <KeniaDashboard /> : <Navigate to="/" />} />,
    <Route key="cloned-home-old" path="/home-old" element={<HomePage />} />,
    <Route key="cloned-chat" path="/chat" element={<MessagesPage />} />,
    <Route key="cloned-servicos-chat" path="/servicos/chat" element={<MessagesPage />} />,
    <Route key="cloned-ai-chat" path="/ai-chat" element={<AIChat />} />,
    <Route key="cloned-services" path="/services" element={<ServicesPage />} />,
    <Route key="cloned-ofertantes" path="/servicos/ofertantes" element={<VolunteersPage />} />,
    <Route key="cloned-profile" path="/profile" element={<ProfilePage />} />,
    <Route key="cloned-servicos-profile" path="/servicos/perfil" element={<ProfilePage />} />,
    <Route key="cloned-public-profile" path="/u/:userId" element={<PublicProfilePage />} />,
    <Route key="cloned-call" path="/call/:room" element={<CallPage />} />,
    <Route key="cloned-admin" path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/home" />} />,
    <Route key="cloned-servicos-admin" path="/servicos/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/home" />} />,
    <Route key="cloned-direct-chat" path="/direct-chat/:userId" element={<DirectChatPage />} />,
    <Route key="cloned-volunteers" path="/volunteers" element={<VolunteersPage />} />,
    <Route key="cloned-jobs" path="/jobs" element={<JobsPage />} />,
    <Route key="cloned-housing" path="/housing" element={<HousingPage />} />,
    <Route key="cloned-nearby" path="/nearby" element={<NearbyHelpersPage />} />,
    <Route key="cloned-map" path="/map" element={<MapPage />} />,
    <Route key="cloned-volunteer-register" path="/volunteer-register" element={<VolunteerRegisterPage />} />,
    <Route key="cloned-oferecer" path="/oferecer-servicos" element={<OfferServicesPage />} />,
    <Route key="cloned-assinatura" path="/assinatura" element={<SubscriptionPage />} />,
    <Route key="cloned-servicos-assinatura" path="/servicos/assinatura" element={<SubscriptionPage />} />,
    <Route key="cloned-ofereco-ajuda" path="/ofereco-ajuda" element={<OferecoAjudaPage />} />,
    <Route key="cloned-sou-voluntario" path="/sou-voluntario" element={<SouVoluntarioPage />} />,
  ];
}
