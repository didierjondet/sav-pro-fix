import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, ShieldAlert } from 'lucide-react';
import { InventoryManager } from '@/components/settings/inventory/InventoryManager';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useProfile } from '@/hooks/useProfile';

export default function Inventory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { rolePermissions, loading } = useRolePermissions();
  const { profile } = useProfile();

  const isSuperAdmin = profile?.role === 'super_admin';
  const canAccess = isSuperAdmin || (rolePermissions as any)?.settings_inventory === true;
  const canApplyStock = isSuperAdmin || (rolePermissions as any)?.inventory_apply_stock === true;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Inventaire</h1>
                  <p className="text-sm text-muted-foreground">
                    Gérez vos sessions d'inventaire, comptez et ajustez vos stocks.
                  </p>
                </div>
              </div>

              {loading ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Chargement…
                  </CardContent>
                </Card>
              ) : !canAccess ? (
                <Card>
                  <CardContent className="py-12 text-center space-y-3">
                    <ShieldAlert className="h-10 w-10 mx-auto text-destructive" />
                    <p className="font-medium">Accès non autorisé</p>
                    <p className="text-sm text-muted-foreground">
                      Vous n'avez pas la permission d'accéder à l'inventaire.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <InventoryManager canApplyStock={canApplyStock} />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
