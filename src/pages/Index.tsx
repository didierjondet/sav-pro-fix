import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SAVDashboard } from '@/components/sav/SAVDashboard';
import { SAVForm } from '@/components/sav/SAVForm';
import { ProfileSetup } from '@/components/auth/ProfileSetup';

const Index = () => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'new-sav'>('dashboard');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user) {
      // Utilisateur connecté, on reste sur le dashboard
    }
  }, [user, loading, navigate]);

  // Rediriger les super admins vers /super-admin
  useEffect(() => {
    if (profile?.role === 'super_admin') {
      navigate('/super-admin');
    }
  }, [profile, navigate]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Si l'utilisateur n'a pas de profil, afficher le setup
  if (!profile) {
    return <ProfileSetup onComplete={refetchProfile} />;
  }

  const handleMenuClick = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'new-sav':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Nouveau dossier SAV</h2>
            </div>
            <SAVForm />
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Tableau de bord</h2>
            </div>
            <SAVDashboard />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            onMenuClick={handleMenuClick}
            isMobileMenuOpen={isMobileMenuOpen}
          />
          
          <main className="flex-1 overflow-y-auto p-6">
            {renderContent()}
            
            {/* Lien discret pour super admin */}
            <div className="fixed bottom-4 left-4">
              <button
                onClick={() => window.location.href = '/landing'}
                className="text-xs text-muted-foreground opacity-30 hover:opacity-100 transition-opacity"
              >
                •
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
