import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Settings, User, Bell, LogOut, HardDrive, AlertTriangle, MessageSquare, FileCheck, RefreshCw, RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useShop } from '@/contexts/ShopContext';
import { useShopStorageUsage } from '@/hooks/useStorageUsage';
import { useUnifiedSMSCredits } from '@/hooks/useUnifiedSMSCredits';
import { useSubscription } from '@/hooks/useSubscription';
import { useProfile } from '@/hooks/useProfile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
interface HeaderProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
}
export function Header({
  onMenuClick,
  isMobileMenuOpen
}: HeaderProps) {
  const {
    user,
    signOut,
    forceReconnect
  } = useAuth();
  const {
    shop,
    loading: shopLoading,
    refetch: refetchShop
  } = useShop();
  const queryClient = useQueryClient();
  const {
    profile
  } = useProfile();
  const {
    storageGB
  } = useShopStorageUsage(shop?.id);
  const {
    subscription,
    checkLimits
  } = useSubscription();
  const {
    credits: smsCredits
  } = useUnifiedSMSCredits();
  const navigate = useNavigate();
  const getSAVLimits = () => {
    if (!subscription) return {
      remaining: 0,
      total: 0,
      isWarning: false,
      isCritical: false
    };
    let savLimit = subscription.custom_sav_limit;
    if (!savLimit) {
      if (subscription.subscription_tier === 'free') savLimit = 5;else if (subscription.subscription_tier === 'premium') savLimit = 50;else if (subscription.subscription_tier === 'enterprise') savLimit = 100;else savLimit = 5;
    }
    const remaining = Math.max(0, savLimit - subscription.monthly_sav_count);
    const usagePercent = subscription.monthly_sav_count / savLimit * 100;
    return {
      remaining,
      total: savLimit,
      isWarning: usagePercent >= 80 && usagePercent < 95,
      isCritical: usagePercent >= 95
    };
  };
  const getSMSLimits = () => {
    if (!smsCredits) return {
      remaining: 0,
      total: 0,
      isWarning: false,
      isCritical: false
    };
    return {
      remaining: smsCredits.total_remaining,
      total: smsCredits.total_available,
      isWarning: smsCredits.is_warning,
      isCritical: smsCredits.is_critical || smsCredits.is_exhausted
    };
  };
  const savLimits = getSAVLimits();
  const smsLimits = getSMSLimits();
  const hasWarning = savLimits.isWarning || smsLimits.isWarning || savLimits.isCritical || smsLimits.isCritical;

  // Fonction pour vider le cache et rafraîchir
  const handleClearCache = async () => {
    try {
      queryClient.clear(); // Vider tout le cache React Query
      await refetchShop(); // Recharger les données shop
      toast.success('Cache vidé avec succès', {
        description: 'Les données ont été rafraîchies'
      });
    } catch (error) {
      console.error('Erreur lors du vidage du cache:', error);
      toast.error('Erreur lors du vidage du cache');
    }
  };

  // Fonction de reset d'urgence
  const handleEmergencyReset = async () => {
    if (window.confirm('⚠️ RESET COMPLET\n\nCela va vous déconnecter et nettoyer toutes les données en cache.\n\nContinuer ?')) {
      await forceReconnect();
    }
  };
  return <header className="bg-card border-b border-border shadow-sm">
      {hasWarning && <Alert className="rounded-none border-x-0 border-t-0 bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {savLimits.isCritical && `Limite SAV mensuelle critique atteinte (${subscription?.monthly_sav_count}/${savLimits.total})`}
            {savLimits.isWarning && !savLimits.isCritical && `Attention: limite SAV mensuelle bientôt atteinte (${subscription?.monthly_sav_count}/${savLimits.total})`}
            {(savLimits.isCritical || savLimits.isWarning) && (smsLimits.isCritical || smsLimits.isWarning) && ' - '}
            {smsLimits.isCritical && `Crédits SMS épuisés (${(smsCredits?.monthly_used || 0) + (smsCredits?.purchasable_used || 0)}/${smsLimits.total})`}
            {smsLimits.isWarning && !smsLimits.isCritical && `Attention: crédits SMS bientôt épuisés (${(smsCredits?.monthly_used || 0) + (smsCredits?.purchasable_used || 0)}/${smsLimits.total})`}
            {' '}<Button variant="link" className="h-auto p-0 text-orange-800 underline" onClick={() => navigate('/subscription')}>
              Mettre à niveau
            </Button>
          </AlertDescription>
        </Alert>}
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            {shopLoading || !shop ? (
              <div className="flex items-center space-x-2">
                <Skeleton className="h-14 w-14 md:h-16 md:w-16 rounded" />
                <div className="flex flex-col space-y-1">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ) : (
              <>
                {shop.logo_url ? (
                  <img 
                    src={shop.logo_url} 
                    alt="Logo du magasin" 
                    className="h-14 w-14 md:h-16 md:w-16 object-contain" 
                  />
                ) : (
                  <img 
                    src="/lovable-uploads/3d99a913-9d52-4f6c-9a65-78b3bd561739.png" 
                    alt="Logo FixWay Pro" 
                    className="h-14 w-14 md:h-16 md:w-16 object-contain" 
                  />
                )}
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-foreground">
                    {shop.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Propulsé par FixWay.fr</span>
                    {storageGB > 0}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>


        <div className="flex items-center space-x-4">
          {/* Affichage des limites en permanence */}
          <div className="hidden md:flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <FileCheck className="h-4 w-4" />
              <span>{savLimits.remaining} SAV restants</span>
            </div>
            
            {/* SMS - Affichage détaillé si crédits achetés */}
            {smsCredits?.has_purchased_credits ? <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <div className="flex items-center space-x-1">
                  <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs">
                    Plan: {smsCredits.monthly_remaining}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                    Achetés: {smsCredits.purchasable_remaining}
                  </span>
                </div>
              </div> : <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{smsLimits.remaining} SMS restants</span>
              </div>}
          </div>
          
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.email : user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleClearCache}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Vider le cache
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleEmergencyReset} className="text-destructive">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset d'urgence
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>;
}