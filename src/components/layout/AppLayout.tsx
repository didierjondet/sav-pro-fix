import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useShop } from '@/contexts/ShopContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import { Loader2 } from 'lucide-react';

export function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { shop, loading: shopLoading } = useShop();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirection auth
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  // Redirection super admin (vérification via email ou autre méthode)
  // Note: super_admin n'est pas dans le type user_role, on ne fait pas de redirection ici

  // Loading state global
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

  // Setup profil si nécessaire
  if (!profile) {
    return <ProfileSetup onComplete={refetchProfile} />;
  }

  const handleMenuClick = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <div className="flex flex-1 overflow-hidden">
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
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
