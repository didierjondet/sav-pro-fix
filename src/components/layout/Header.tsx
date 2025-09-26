import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Settings, User, Bell, LogOut, HardDrive, AlertTriangle, MessageSquare, FileCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useShop } from '@/hooks/useShop';
import { useShopStorageUsage } from '@/hooks/useStorageUsage';
import { useUnifiedSMSCredits } from '@/hooks/useUnifiedSMSCredits';
import { useSubscription } from '@/hooks/useSubscription';
import { useProfile } from '@/hooks/useProfile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    shop
  } = useShop();
  const { profile } = useProfile();
  const {
    storageGB
  } = useShopStorageUsage(shop?.id);
  const { subscription, checkLimits } = useSubscription();
  const { credits: smsCredits } = useUnifiedSMSCredits();
  const navigate = useNavigate();

  const getSAVLimits = () => {
    if (!subscription) return { remaining: 0, total: 0, isWarning: false, isCritical: false };
    
    let savLimit = subscription.custom_sav_limit;
    if (!savLimit) {
      if (subscription.subscription_tier === 'free') savLimit = 5;
      else if (subscription.subscription_tier === 'premium') savLimit = 50;
      else if (subscription.subscription_tier === 'enterprise') savLimit = 100;
      else savLimit = 5;
    }
    
    const remaining = Math.max(0, savLimit - subscription.monthly_sav_count);
    const usagePercent = (subscription.monthly_sav_count / savLimit) * 100;
    
    return {
      remaining,
      total: savLimit,
      isWarning: usagePercent >= 80 && usagePercent < 95,
      isCritical: usagePercent >= 95
    };
  };

  const getSMSLimits = () => {
    if (!smsCredits) return { remaining: 0, total: 0, isWarning: false, isCritical: false };
    
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
  return <header className="bg-card border-b border-border shadow-sm">
      {hasWarning && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-orange-50 border-orange-200">
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
        </Alert>
      )}
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            {shop ? <>
                {shop.logo_url ? <img src={shop.logo_url} alt="Logo du magasin" className="h-14 w-14 md:h-16 md:w-16 object-contain" /> : <img src="/lovable-uploads/3d99a913-9d52-4f6c-9a65-78b3bd561739.png" alt="Logo FixWay Pro" className="h-14 w-14 md:h-16 md:w-16 object-contain" />}
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-foreground">
                    {shop.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Propulsé par FixWay.fr</span>
                    {storageGB > 0}
                  </div>
                </div>
              </> : <div className="flex items-center space-x-2">
                <div className="h-14 w-14 md:h-16 md:w-16 bg-muted animate-pulse rounded" />
                <div className="flex flex-col space-y-1">
                  <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                </div>
              </div>}
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
            {smsCredits?.has_purchased_credits ? (
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <div className="flex items-center space-x-1">
                  <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs">
                    Plan: {smsCredits.monthly_remaining}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                    Achetés: {smsCredits.purchasable_remaining}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{smsLimits.remaining} SMS restants</span>
              </div>
            )}
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
                {profile ? 
                  `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.email :
                  user?.email
                }
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem onClick={forceReconnect} className="text-orange-600">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Réparer l'authentification
              </DropdownMenuItem>
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