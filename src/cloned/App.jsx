import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './i18n';
import './App.css';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateSvcProfile, normalizeAuthUser } from './lib/authProfile';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import FeedPage from './pages/FeedPage';
import AIChat from './pages/AIChat';
import MessagesPage from './pages/MessagesPage';
import ServicesPage from './pages/ServicesPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import DirectChatPage from './pages/DirectChatPage';
import VolunteersPage from './pages/VolunteersPage';
import VolunteerRegisterPage from './pages/VolunteerRegisterPage';
import NearbyHelpersPage from './pages/NearbyHelpersPage';
import MapPage from './pages/MapPage';
import JobsPage from './pages/JobsPage';
import HousingPage from './pages/HousingPage';
import SubscriptionPage from './pages/SubscriptionPage';

export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  const hydrate = async (authUser) => {
    if (!authUser) { setUser(null); return; }
    try {
      const profile = await getOrCreateSvcProfile(authUser);
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', authUser.id);
      const isAdmin = (roles ?? []).some((r) => r.role === 'admin');
      const normalized = normalizeAuthUser(authUser, profile);
      setUser({ ...normalized, role: isAdmin ? 'admin' : normalized.role });
    } catch (e) { console.error('hydrate error', e); }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setToken(session?.access_token ?? null);
      hydrate(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
      hydrate(session?.user ?? null).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshUser = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    await hydrate(u);
  };

  const login = async (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    // ensure full hydration (role, profile) afterwards
    const { data: { user: u } } = await supabase.auth.getUser();
    await hydrate(u);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/home" />} />
          <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/home" />} />
          <Route path="/home" element={user ? <FeedPage /> : <Navigate to="/" />} />
          <Route path="/home-old" element={user ? <HomePage /> : <Navigate to="/" />} />
          <Route path="/chat" element={user ? <MessagesPage /> : <Navigate to="/" />} />
          <Route path="/ai-chat" element={user ? <AIChat /> : <Navigate to="/" />} />
          <Route path="/services" element={user ? <ServicesPage /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/" />} />
          <Route path="/admin" element={user && user.role === 'admin' ? <AdminDashboard /> : (user ? <Navigate to="/home" /> : <Navigate to="/" />)} />
          <Route path="/direct-chat/:userId" element={user ? <DirectChatPage /> : <Navigate to="/" />} />
          <Route path="/volunteers" element={user ? <VolunteersPage /> : <Navigate to="/" />} />
          <Route path="/jobs" element={user ? <JobsPage /> : <Navigate to="/" />} />
          <Route path="/housing" element={user ? <HousingPage /> : <Navigate to="/" />} />
          <Route path="/nearby" element={user ? <NearbyHelpersPage /> : <Navigate to="/" />} />
          <Route path="/map" element={user ? <MapPage /> : <Navigate to="/" />} />
          <Route path="/volunteer-register" element={<VolunteerRegisterPage />} />
          <Route path="/assinatura" element={user ? <SubscriptionPage /> : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
