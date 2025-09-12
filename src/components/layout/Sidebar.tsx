import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useProfile } from '@/hooks/useProfile';
import { useSAVUnreadMessages } from '@/hooks/useSAVUnreadMessages';
import { useShop } from '@/hooks/useShop';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { MessageSquare, Package, Users, BarChart3, FileText, Settings, X, Plus, Shield, CreditCard, HelpCircle, Info } from 'lucide-react';
import { useQuotes } from '@/hooks/useQuotes';
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
const baseNavigation = [{
  name: 'Tableau de bord',
  href: '/dashboard',
  icon: BarChart3
}, {
  name: 'Dossiers SAV',
  href: '/sav',
  icon: FileText
}, {
  name: 'Stock pièces',
  href: '/parts',
  icon: Package
}, {
  name: 'Devis',
  href: '/quotes',
  icon: FileText
}, {
  name: 'Commandes',
  href: '/orders',
  icon: Package
}, {
  name: 'Clients',
  href: '/customers',
  icon: Users
}, {
  name: 'Chat clients',
  href: '/client-chats',
  icon: MessageSquare
}];
export function Sidebar({
  isOpen,
  onClose
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cases
  } = useSAVCases();
  const {
    profile
  } = useProfile();
  const {
    shop
  } = useShop();
  const { getStatusInfo, statuses } = useShopSAVStatuses();
  const { savWithUnreadMessages } = useSAVUnreadMessages();
  const totalUnread = (savWithUnreadMessages || []).reduce((sum, s) => sum + s.unread_count, 0);
  const awaitingCount = (savWithUnreadMessages || []).filter((s: any) => s.awaiting_reply).length;
  const {
    quotes
  } = useQuotes();
  const quoteCounts = (quotes || []).reduce((acc, q) => {
    if (q.status === 'accepted') acc.accepted++;else if (q.status === 'rejected') acc.rejected++;else acc.inProgress++;
    return acc;
  }, {
    inProgress: 0,
    accepted: 0,
    rejected: 0
  });

  // Créer la navigation dynamique selon les paramètres du magasin
  const navigation = [...baseNavigation];

  // Calculate counts for statuses that should be shown in sidebar
  const sidebarStatusCounts = statuses
    .filter(status => status.show_in_sidebar)
    .map(status => {
      const count = (cases || []).filter(savCase => savCase.status === status.status_key).length;
      return {
        label: status.status_label,
        count,
        color: status.status_color,
        key: status.status_key
      };
    });

  // Calculate late SAV cases count
  const lateSAVCount = (cases || []).filter(savCase => {
    // Only count non-completed SAV cases (exclude delivered, cancelled, and ready)
    if (['delivered', 'cancelled', 'ready'].includes(savCase.status)) {
      return false;
    }

    // Check if current status pauses the timer
    const statusInfo = getStatusInfo(savCase.status);
    if (statusInfo.pause_timer) {
      return false; // Don't count as late if timer is paused
    }

    const createdDate = new Date(savCase.created_at);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    // Use appropriate delay based on SAV type
    let maxDays: number;
    if (savCase.sav_type === 'client') {
      maxDays = shop?.max_sav_processing_days_client || 7;
    } else if (savCase.sav_type === 'external') {
      maxDays = shop?.max_sav_processing_days_external || 9;
    } else {
      maxDays = shop?.max_sav_processing_days_internal || 5;
    }

    return daysDiff > maxDays;
  }).length;

  // Get detailed info about late SAV cases for tooltip
  const getLateSAVInfo = () => {
    const lateSAVs = (cases || []).filter(savCase => {
      // Only count non-completed SAV cases (exclude delivered, cancelled, and ready)
      if (['delivered', 'cancelled', 'ready'].includes(savCase.status)) {
        return false;
      }

      // Check if current status pauses the timer
      const statusInfo = getStatusInfo(savCase.status);
      if (statusInfo.pause_timer) {
        return false; // Don't count as late if timer is paused
      }

      const createdDate = new Date(savCase.created_at);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      // Use appropriate delay based on SAV type
      let maxDays: number;
      if (savCase.sav_type === 'client') {
        maxDays = shop?.max_sav_processing_days_client || 7;
      } else if (savCase.sav_type === 'external') {
        maxDays = shop?.max_sav_processing_days_external || 9;
      } else {
        maxDays = shop?.max_sav_processing_days_internal || 5;
      }

      return daysDiff > maxDays;
    });

    return {
      count: lateSAVs.length,
      description: 'SAV non terminés en retard sur les délais',
      cases: lateSAVs
    };
  };
  return <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div className={cn('fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0', isOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 md:hidden">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <TooltipProvider>
              <nav className="space-y-2">
                {navigation.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return <Button key={item.name} variant={isActive ? 'default' : 'ghost'} className={cn('w-full justify-start', isActive && 'bg-primary text-primary-foreground')} onClick={() => {
                  navigate(item.href);
                  onClose();
                }}>
                      <Icon className="mr-3 h-5 w-5" />
                      <span>{item.name}</span>
                      {item.href === '/client-chats' && awaitingCount > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs">{awaitingCount}</Badge>
                      )}
                    </Button>;
              })}
                
                {/* Super Admin Link */}
                {profile?.role === 'super_admin' && <Button variant={location.pathname === '/super-admin' ? 'default' : 'ghost'} className={cn('w-full justify-start', location.pathname === '/super-admin' && 'bg-primary text-primary-foreground')} onClick={() => {
                navigate('/super-admin');
                onClose();
              }}>
                    <Shield className="mr-3 h-5 w-5" />
                    Super Admin
                  </Button>}
              </nav>

              <div className="mt-8 p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Statuts SAV
                </h3>
                <div className="space-y-2">
                  {sidebarStatusCounts.map(statusCount => (
                    <div key={statusCount.key} className="flex justify-between text-sm items-center">
                      <span className="flex items-center">
                        <div 
                          className="w-2 h-2 rounded-full mr-2" 
                          style={{ backgroundColor: statusCount.color }}
                        />
                        {statusCount.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{statusCount.count}</span>
                        {statusCount.count > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="hover:bg-accent p-1 rounded-sm">
                                <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-sm">
                              <div className="space-y-2">
                                <p className="font-medium">SAV avec le statut "{statusCount.label}"</p>
                                <p className="text-sm">Nombre: {statusCount.count}</p>
                                <div className="text-xs space-y-1">
                                  <p className="font-medium">Dossiers:</p>
                                  {(cases || [])
                                    .filter(savCase => savCase.status === statusCount.key)
                                    .slice(0, 8)
                                    .map((savCase) => (
                                      <button
                                        key={savCase.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/sav/${savCase.id}`);
                                          onClose();
                                        }}
                                        className="block text-primary hover:underline text-left w-full"
                                      >
                                        {savCase.case_number} - {savCase.device_brand} {savCase.device_model}
                                      </button>
                                    ))}
                                  {(cases || []).filter(savCase => savCase.status === statusCount.key).length > 8 && (
                                    <p className="text-muted-foreground">
                                      +{(cases || []).filter(savCase => savCase.status === statusCount.key).length - 8} autres...
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs italic">Cliquer sur un SAV pour le voir</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}
                  {sidebarStatusCounts.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Aucun statut configuré pour la sidebar
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-destructive">
                    SAV en retard
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="hover:bg-accent p-1 rounded-sm">
                        <Info className="h-4 w-4 text-destructive hover:text-destructive/80" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-sm">
                      <div className="space-y-2">
                        <p className="font-medium">{getLateSAVInfo().description}</p>
                        <p className="text-sm">Nombre de SAV: {getLateSAVInfo().count}</p>
                        {getLateSAVInfo().cases.length > 0 && (
                          <div className="text-xs space-y-1">
                            <p className="font-medium">SAV concernés:</p>
                            {getLateSAVInfo().cases.slice(0, 8).map((savCase) => (
                              <button
                                key={savCase.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/sav/${savCase.id}`);
                                  onClose();
                                }}
                                className="block text-primary hover:underline text-left w-full"
                              >
                                {savCase.case_number} - {savCase.device_brand} {savCase.device_model} - <span className="text-muted-foreground">({getStatusInfo(savCase.status).label})</span>
                              </button>
                            ))}
                            {getLateSAVInfo().cases.length > 8 && (
                              <p className="text-muted-foreground">
                                +{getLateSAVInfo().cases.length - 8} autres...
                              </p>
                            )}
                          </div>
                        )}
                        {getLateSAVInfo().cases.length === 0 && (
                          <p className="text-sm text-muted-foreground">Aucun SAV en retard actuellement</p>
                        )}
                        <p className="text-xs italic">Cliquer sur un SAV pour le voir</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-destructive font-medium">Non terminés en retard</span>
                  <span className="font-bold text-destructive">{lateSAVCount}</span>
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
                </div>
              </div>
            </TooltipProvider>
          </ScrollArea>

          <div className="p-4 border-t border-border">
            <Button variant="ghost" className="w-full justify-start mb-2" onClick={() => {
            navigate('/support');
            onClose();
          }}>
              <HelpCircle className="mr-3 h-5 w-5" />
              Support
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => {
            navigate('/settings');
            onClose();
          }}>
              <Settings className="mr-3 h-5 w-5" />
              Paramètres
            </Button>
          </div>
        </div>
      </div>
    </>;
}