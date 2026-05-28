import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Plus, User, Settings, Users, MapPin, Briefcase } from 'lucide-react';
import { AuthContext } from '../ClonedAuthContext';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();

  const isActive = (path) => location.pathname === path;

  // Mid-button action: migrants quickly access SOS request; helpers go to volunteers page
  const midButtonAction = () => {
    if (user?.role === 'migrant') {
      // Navigate to home and trigger SOS modal via query param
      navigate('/home?openSOS=1');
    } else {
      navigate('/volunteers');
    }
  };

  const leftItems = [
    { icon: Home, label: t('home') || 'Início', path: '/home', testId: 'nav-home' },
    { icon: Briefcase, label: t('work') || 'Trabalho', path: '/jobs', testId: 'nav-jobs' },
  ];

  const rightItems = [
    { icon: MessageCircle, label: t('chat') || 'Chat', path: '/chat', testId: 'nav-chat' },
    { icon: User, label: t('profile') || 'Perfil', path: '/profile', testId: 'nav-profile' },
  ];

  // Show admin shortcut for admins
  if (user?.role === 'admin') {
    rightItems.splice(1, 0, { icon: Settings, label: 'Admin', path: '/admin', testId: 'nav-admin' });
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex items-center justify-around z-50"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
      data-testid="bottom-navigation"
    >
      {leftItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            data-testid={item.testId}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1 p-2 min-w-[60px]"
          >
            <Icon className={`w-6 h-6 ${active ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-[10px] ${active ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>{item.label}</span>
          </button>
        );
      })}

      {/* Floating center "+" button */}
      <button
        onClick={midButtonAction}
        data-testid="nav-publish-center"
        className="flex flex-col items-center gap-1 p-2 min-w-[60px] relative"
      >
        <div className="w-12 h-12 -mt-6 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg transition-colors">
          <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[10px] text-green-600 font-semibold mt-1">{t('publish') || 'Publicar'}</span>
      </button>

      {rightItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            data-testid={item.testId}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1 p-2 min-w-[60px]"
          >
            <Icon className={`w-6 h-6 ${active ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-[10px] ${active ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
