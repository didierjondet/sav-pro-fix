import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Settings, User, Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useShop } from '@/hooks/useShop';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
    signOut
  } = useAuth();
  const {
    shop
  } = useShop();
  return <header className="bg-card border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            {shop?.logo_url ? <img src={shop.logo_url} alt="Logo du magasin" className="h-10 w-10 object-contain" /> : <img src="/lovable-uploads/3d99a913-9d52-4f6c-9a65-78b3bd561739.png" alt="Logo FixWay Pro" className="h-10 w-10 object-contain" />}
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-foreground">
                {shop?.name || 'FixWay Pro'}
              </h1>
              <span className="text-xs text-muted-foreground">Propulsé par FixWay.fr</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
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