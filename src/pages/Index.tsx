import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useShop } from '@/contexts/ShopContext';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { SAVDashboard } from '@/components/sav/SAVDashboard';
import { SAVForm } from '@/components/sav/SAVForm';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import { DailyAssistant } from '@/components/statistics/DailyAssistant';
import { DataAssistant } from '@/components/statistics/DataAssistant';
import { Loader2 } from 'lucide-react';
const Index = () => {
  const {
    user,
    loading: authLoading
  } = useAuth();
  const {
    profile,
    loading: profileLoading,
    refetch: refetchProfile
  } = useProfile();
  const {
    shop,
    loading: shopLoading
  } = useShop();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'new-sav'>('dashboard');
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Rediriger les super admins vers /super-admin
  useEffect(() => {
    if (profile?.role === 'super_admin') {
      navigate('/super-admin');
    }
  }, [profile, navigate]);

  // Attendre que TOUTES les données soient chargées : Auth → Profile → Shop
  const isLoading = authLoading || profileLoading || (user && !profile) || (profile && shopLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Chargement en cours...</p>
            <p className="text-sm text-muted-foreground">
              {authLoading && 'Vérification de votre authentification...'}
              {!authLoading && profileLoading && 'Chargement de votre profil...'}
              {!authLoading && !profileLoading && shopLoading && 'Chargement de votre boutique...'}
            </p>
          </div>
        </div>
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
  // Vérifier si les modules IA sont activés
  const aiModulesConfig = (shop as any)?.ai_modules_config || {};
  const isDailyAssistantEnabled = aiModulesConfig.daily_assistant_enabled !== false;
  const isAssistantEnabled = aiModulesConfig.assistant_enabled !== false;

  const renderContent = () => {
    switch (currentView) {
      case 'new-sav':
        return <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Nouveau dossier SAV</h2>
            </div>
            <SAVForm />
          </div>;
      default:
        return <div className="space-y-6">
            {isAssistantEnabled && <DataAssistant />}
            {isDailyAssistantEnabled && <DailyAssistant />}
            <SAVDashboard />
          </div>;
    }
  };
  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={handleMenuClick} isMobileMenuOpen={isMobileMenuOpen} />
          
          <main className="flex-1 overflow-y-auto p-6">
            {renderContent()}
            
            {/* Lien discret pour super admin */}
            {profile?.role === 'super_admin' && (
              <div className="fixed bottom-4 left-4">
                <button 
                  onClick={() => window.location.href = '/landing'} 
                  className="text-xs text-muted-foreground opacity-30 hover:opacity-100 transition-opacity"
                >
                  •
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};
export default Index;