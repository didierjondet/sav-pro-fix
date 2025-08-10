import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useProfile } from '@/hooks/useProfile';
import { useSAVUnreadMessages } from '@/hooks/useSAVUnreadMessages';
import { useShopSettings } from '@/hooks/useShopSettings';
import { MessageSquare, Package, Users, BarChart3, FileText, Settings, X, Plus, Shield, CreditCard, HelpCircle } from 'lucide-react';
import { useQuotes } from '@/hooks/useQuotes';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const baseNavigation = [
  { name: 'Tableau de bord', href: '/', icon: BarChart3 },
  { name: 'Dossiers SAV', href: '/sav', icon: FileText },
  { name: 'Stock pièces', href: '/parts', icon: Package },
  { name: 'Devis', href: '/quotes', icon: FileText },
  { name: 'Commandes', href: '/orders', icon: Package },
  { name: 'Clients', href: '/customers', icon: Users },
  { name: 'Chat clients', href: '/client-chats', icon: MessageSquare },
  { name: 'Statistiques', href: '/statistics', icon: BarChart3 },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { cases } = useSAVCases();
  const { profile } = useProfile();
  const { settings } = useShopSettings();
  const { savWithUnreadMessages } = useSAVUnreadMessages();
  const totalUnread = (savWithUnreadMessages || []).reduce((sum, s) => sum + s.unread_count, 0);
  const { quotes } = useQuotes();
  const quoteCounts = (quotes || []).reduce((acc, q) => {
    if (q.status === 'accepted') acc.accepted++;
    else if (q.status === 'rejected') acc.rejected++;
    else acc.inProgress++;
    return acc;
  }, { inProgress: 0, accepted: 0, rejected: 0 });

  // Créer la navigation dynamique selon les paramètres du magasin
  const navigation = [...baseNavigation];
  
  console.log('🔧 Sidebar settings:', settings);
  console.log('📋 Menu visible:', settings?.subscription_menu_visible);
  
  if (settings?.subscription_menu_visible) {
    console.log('✅ Adding subscription menu to navigation');
    navigation.push({ name: 'Abonnement', href: '/subscription', icon: CreditCard });
  } else {
    console.log('❌ Subscription menu hidden');
  }

  // Calculate status counts with distinction between client, external and shop pending
  const statusCounts = (cases || []).reduce((acc, savCase) => {
    if (savCase.status === 'pending') {
      if (savCase.sav_type === 'client') {
        acc.pendingClient++;
      } else if (savCase.sav_type === 'external') {
        acc.pendingExternal++;
      } else {
        acc.pendingShop++;
      }
    } else if (savCase.status === 'in_progress') {
      acc.inProgress++;
    } else if (['delivered', 'ready'].includes(savCase.status)) {
      acc.completed++;
    }
    return acc;
  }, { pendingClient: 0, pendingExternal: 0, pendingShop: 0, inProgress: 0, completed: 0 });
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 md:hidden">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? 'default' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      isActive && 'bg-primary text-primary-foreground'
                    )}
                    onClick={() => {
                      navigate(item.href);
                      onClose();
                    }}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    <span>{item.name}</span>
                    {item.href === '/client-chats' && totalUnread > 0 && (
                      <Badge variant="destructive" className="ml-auto">{totalUnread}</Badge>
                    )}
                  </Button>
                );
              })}
              
              {/* Super Admin Link */}
              {profile?.role === 'super_admin' && (
                <Button
                  variant={location.pathname === '/super-admin' ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    location.pathname === '/super-admin' && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => {
                    navigate('/super-admin');
                    onClose();
                  }}
                >
                  <Shield className="mr-3 h-5 w-5" />
                  Super Admin
                </Button>
              )}
            </nav>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Statut SAV
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>En attente client</span>
                  <span className="font-medium">{statusCounts.pendingClient}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>En attente Externe</span>
                  <span className="font-medium">{statusCounts.pendingExternal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>En attente magasin</span>
                  <span className="font-medium">{statusCounts.pendingShop}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 mt-2">
                  <span className="text-destructive font-bold">TOTAL SAV</span>
                  <span className="font-bold text-destructive">{statusCounts.pendingClient + statusCounts.pendingExternal + statusCounts.pendingShop}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Statut devis
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>En cours</span>
                  <span className="font-medium">{quoteCounts.inProgress}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Validé</span>
                  <span className="font-medium">{quoteCounts.accepted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Refusé</span>
                  <span className="font-medium">{quoteCounts.rejected}</span>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start mb-2"
              onClick={() => {
                navigate('/support');
                onClose();
              }}
            >
              <HelpCircle className="mr-3 h-5 w-5" />
              Support
            </Button>
            <Button
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                navigate('/settings');
                onClose();
              }}
            >
              <Settings className="mr-3 h-5 w-5" />
              Paramètres
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}