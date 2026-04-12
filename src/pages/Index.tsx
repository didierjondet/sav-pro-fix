import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useShop } from '@/contexts/ShopContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

import { SAVDashboard } from '@/components/sav/SAVDashboard';
import { SAVForm } from '@/components/sav/SAVForm';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import { DailyAssistant } from '@/components/statistics/DailyAssistant';
import { DataAssistant } from '@/components/statistics/DataAssistant';
import { ShopNamePromptDialog } from '@/components/dialogs/ShopNamePromptDialog';
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
    loading: shopLoading,
    refetch: refetchShop
  } = useShop();
  const { rolePermissions, loading: permLoading } = useRolePermissions();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'new-sav'>('dashboard');
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Redirect to /sav if simplified view is active (from permissions or localStorage)
  useEffect(() => {
    if (!authLoading && user && !permLoading) {
      const isSimplified = localStorage.getItem('fixway_simplified_view') === 'true';
      if (isSimplified) {
        navigate('/sav');
      }
    }
  }, [user, authLoading, permLoading, navigate]);

  // Rediriger les super admins vers /super-admin SAUF s'ils sont en mode impersonation
  useEffect(() => {
    if (profile?.role === 'super_admin') {
      // profile here is the effective profile, so if impersonating it will be 'admin'
      navigate('/super-admin');
    }
  }, [profile, navigate]);

  // Attendre que TOUTES les données soient chargées : Auth → Profile → Shop
  // Ne PAS traiter user && !profile comme chargement — c'est un nouvel utilisateur sans onboarding
  const isLoading = authLoading || profileLoading || (profile && shopLoading);

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
  // Fail-closed: n'afficher les assistants que si shop est chargé ET la config est explicitement active
  const aiModulesConfig = shop ? (shop as any)?.ai_modules_config : null;
  const isDailyAssistantEnabled = aiModulesConfig ? aiModulesConfig.daily_assistant_enabled !== false : false;
  const isAssistantEnabled = aiModulesConfig ? aiModulesConfig.assistant_enabled !== false : false;

  const showShopNamePrompt = profile?.role === 'admin' && shop?.name === 'Mon Magasin';

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

            {showShopNamePrompt && (
              <ShopNamePromptDialog shopId={shop!.id} onSaved={() => refetchShop()} />
            )}
            
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
      
    </div>
  );
};
export default Index;