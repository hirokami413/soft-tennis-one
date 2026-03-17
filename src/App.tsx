import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Layout } from './components/Layout';
import { MenuHubView } from './views/MenuHubView';
import { TeamView } from './views/TeamView';
import { TennisNoteView } from './views/TennisNoteView';
import { CoachSupportView } from './views/CoachSupportView';
import { AboutView } from './views/AboutView';
import { ProDashboardView } from './views/ProDashboardView';
import { LoginView } from './views/LoginView';
import { OnboardingModal } from './components/OnboardingModal';
import { PlaylistProvider } from './contexts/PlaylistContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './components/Toast';

function AppContent() {
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useLocalStorage('app_active_tab', 'menu');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('app_onboarding_done');
  });

  // Handle invite link if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode) {
      sessionStorage.setItem('softtennis_pending_invite', inviteCode);
      setActiveTab('team');
      
      // Clean up URL
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  }, []);

  if (!isLoggedIn) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'menu':
        return <MenuHubView />;
      case 'team':
        return <TeamView />;
      case 'note':
        return <TennisNoteView />;
      case 'coach':
        return <CoachSupportView />;
      case 'pro-dashboard':
        return <ProDashboardView />;
      case 'about':
        return <AboutView />;
      default:
        return <div className="p-4 text-center">Not Found</div>;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <FavoritesProvider>
              <PlaylistProvider>
                <AppContent />
              </PlaylistProvider>
            </FavoritesProvider>
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
