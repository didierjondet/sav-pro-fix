import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Wrench,
  Package,
  Users,
  BarChart3,
  FileText,
  Settings,
  X,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: BarChart3 },
  { name: 'Nouveau SAV', href: '/sav/new', icon: Plus },
  { name: 'Dossiers SAV', href: '/sav', icon: FileText },
  { name: 'Stock pièces', href: '/parts', icon: Package },
  { name: 'Clients', href: '/customers', icon: Users },
  { name: 'Réparations', href: '/repairs', icon: Wrench },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
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
                    {item.name}
                  </Button>
                );
              })}
            </nav>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Statut SAV
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>En attente</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>En cours</span>
                  <span className="font-medium">8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Terminés</span>
                  <span className="font-medium">156</span>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border">
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