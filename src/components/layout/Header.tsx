import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Settings, User, Bell, LogOut, HardDrive, AlertTriangle, MessageSquare, FileCheck, RefreshCw, Loader2 } from 'lucide-react';
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
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { del } from 'idb-keyval';
interface HeaderProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
}
const Header = ({
  onMenuClick,
  isMobileMenuOpen
}: HeaderProps) => {
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleClearCache = async () => {
    try {
      // Vider le cache React Query
      await queryClient.invalidateQueries();
      await queryClient.clear();
      
      // Vider le cache IndexedDB
      await del('FIXWAY_REACT_QUERY_CACHE');
      
      // Recharger les données du shop
      await refetchShop();
      
      toast({
        title: "Cache vidé",
        description: "Le cache a été vidé avec succès. Les données vont être rechargées.",
      });
      
      // Recharger la page après un court délai
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vider le cache",
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries();
      toast({
        title: "✅ Synchronisation réussie",
        description: "Les données ont été mises à jour",
      });
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        title: "Erreur",
        description: "Impossible de synchroniser",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

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
    if (!smsCredits || !shop) return {
      remaining: 0,
      total: 0,
      used: 0,
      isWarning: false,
      isCritical: false,
      showAlert: false
    };
    
    // Vérifier si l'alerte SMS est activée
    const alertEnabled = (shop as any).sms_alert_enabled ?? true;
    const alertThreshold = (shop as any).sms_alert_threshold ?? 20;
    
    const totalUsed = smsCredits.monthly_used + smsCredits.purchasable_used;
    const showAlert = alertEnabled && smsCredits.total_remaining <= alertThreshold;
    
    return {
      remaining: smsCredits.total_remaining,
      total: smsCredits.total_available,
      used: totalUsed,
      isWarning: showAlert && smsCredits.total_remaining > 0,
      isCritical: smsCredits.total_remaining <= 0,
      showAlert
    };
  };
  const savLimits = getSAVLimits();
  const smsLimits = getSMSLimits();
  const hasWarning = savLimits.isWarning || savLimits.isCritical || smsLimits.showAlert;
  return <header className="bg-card border-b border-border shadow-sm">
      {hasWarning && <Alert className="rounded-none border-x-0 border-t-0 bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {savLimits.isCritical && `Limite SAV mensuelle critique atteinte (${subscription?.monthly_sav_count}/${savLimits.total})`}
            {savLimits.isWarning && !savLimits.isCritical && `Attention: limite SAV mensuelle bientôt atteinte (${subscription?.monthly_sav_count}/${savLimits.total})`}
            {(savLimits.isCritical || savLimits.isWarning) && smsLimits.showAlert && ' - '}
            {smsLimits.isCritical && `Crédits SMS épuisés (${smsLimits.used}/${smsLimits.total})`}
            {smsLimits.isWarning && !smsLimits.isCritical && `Attention: crédits SMS bientôt épuisés (${smsLimits.used}/${smsLimits.total})`}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="h-8"
              title="Synchroniser les données"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>

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
};

export default React.memo(Header);