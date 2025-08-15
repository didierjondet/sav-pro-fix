import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Plus, Minus, Store, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ShopSMSCredits {
  id: string;
  name: string;
  subscription_tier: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  custom_sms_limit: number | null;
  purchased_sms: number;
  manual_allocation: number;
  total_available: number;
  remaining_credits: number;
}

export function ShopSMSCreditsManager() {
  const [shops, setShops] = useState<ShopSMSCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState<string | null>(null);
  const [allocationAmounts, setAllocationAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchShopsWithSMSCredits();
  }, []);

  const fetchShopsWithSMSCredits = async () => {
    setLoading(true);
    try {
      // Récupérer tous les magasins avec leurs crédits
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select(`
          id,
          name,
          subscription_tier,
          sms_credits_allocated,
          sms_credits_used,
          custom_sms_limit
        `);

      if (shopsError) throw shopsError;

      // Pour chaque magasin, calculer les crédits achetés
      const shopsWithCredits: ShopSMSCredits[] = [];
      
      for (const shop of shopsData || []) {
        // Calculer les SMS achetés via packages
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('sms_package_purchases')
          .select('sms_count')
          .eq('shop_id', shop.id)
          .eq('status', 'completed');

        const purchasedSMS = purchasesData?.reduce((total, purchase) => total + purchase.sms_count, 0) || 0;

        // Récupérer le plan par défaut pour ce tier
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('sms_limit')
          .ilike('name', shop.subscription_tier)
          .eq('is_active', true)
          .single();

        const planSMSLimit = planData?.sms_limit || 15; // Fallback sur le plan gratuit
        const manualAllocation = shop.sms_credits_allocated || 0;
        const totalAvailable = planSMSLimit + purchasedSMS + manualAllocation;
        const remainingCredits = totalAvailable - (shop.sms_credits_used || 0);

        shopsWithCredits.push({
          id: shop.id,
          name: shop.name,
          subscription_tier: shop.subscription_tier || 'free',
          sms_credits_allocated: manualAllocation,
          sms_credits_used: shop.sms_credits_used || 0,
          custom_sms_limit: shop.custom_sms_limit,
          purchased_sms: purchasedSMS,
          manual_allocation: manualAllocation,
          total_available: totalAvailable,
          remaining_credits: remainingCredits
        });
      }

      setShops(shopsWithCredits);
    } catch (error) {
      console.error('Erreur lors de la récupération des crédits SMS:', error);
      toast.error('Erreur lors de la récupération des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateCredits = async (shopId: string, amount: number) => {
    if (amount === 0) return;

    setAllocating(shopId);
    try {
      const shop = shops.find(s => s.id === shopId);
      if (!shop) return;

      const newAllocation = Math.max(0, shop.manual_allocation + amount);

      // Mettre à jour l'allocation manuelle
      const { error } = await supabase
        .from('shops')
        .update({ sms_credits_allocated: newAllocation })
        .eq('id', shopId);

      if (error) throw error;

      // Si on ajoute des crédits, décrémenter des crédits globaux
      if (amount > 0) {
        // Récupérer les crédits globaux actuels
        const { data: globalCredits, error: globalError } = await supabase
          .from('global_sms_credits')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();

        if (globalError) throw globalError;

        if (globalCredits && globalCredits.remaining_credits < amount) {
          throw new Error('Crédits globaux insuffisants');
        }

        // Mettre à jour les crédits globaux
        const { error: updateGlobalError } = await supabase
          .from('global_sms_credits')
          .update({
            used_credits: globalCredits.used_credits + amount,
            remaining_credits: globalCredits.remaining_credits - amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', '00000000-0000-0000-0000-000000000001');

        if (updateGlobalError) throw updateGlobalError;
      }

      toast.success(`${amount > 0 ? 'Ajout' : 'Retrait'} de ${Math.abs(amount)} crédits SMS effectué`);
      setAllocationAmounts(prev => ({ ...prev, [shopId]: '' }));
      await fetchShopsWithSMSCredits();
    } catch (error: any) {
      console.error('Erreur lors de l\'allocation:', error);
      toast.error(error.message || 'Erreur lors de l\'allocation des crédits');
    } finally {
      setAllocating(null);
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'free': return 'secondary';
      case 'premium': return 'default';
      case 'enterprise': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" />
            Gestion des Crédits SMS par Magasin
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchShopsWithSMSCredits}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Calcul des crédits :</strong> Plan de base + SMS achetés + Allocation manuelle = Total disponible<br />
            Les allocations manuelles sont décomptées de vos crédits globaux Twilio.
          </AlertDescription>
        </Alert>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Magasin</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Plan SMS</TableHead>
                <TableHead>SMS Achetés</TableHead>
                <TableHead>Allocation Manuelle</TableHead>
                <TableHead>Total Disponible</TableHead>
                <TableHead>Utilisés</TableHead>
                <TableHead>Restants</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shops.map((shop) => (
                <TableRow key={shop.id}>
                  <TableCell className="font-medium">{shop.name}</TableCell>
                  <TableCell>
                    <Badge variant={getTierBadgeVariant(shop.subscription_tier)}>
                      {shop.subscription_tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {shop.total_available - shop.purchased_sms - shop.manual_allocation} SMS
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{shop.purchased_sms} SMS</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={shop.manual_allocation > 0 ? "default" : "secondary"}>
                      {shop.manual_allocation} SMS
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {shop.total_available} SMS
                  </TableCell>
                  <TableCell>
                    <Badge variant={shop.sms_credits_used > shop.total_available ? "destructive" : "outline"}>
                      {shop.sms_credits_used} SMS
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={shop.remaining_credits < 0 ? "destructive" : 
                                  shop.remaining_credits < 5 ? "secondary" : "default"}>
                      {shop.remaining_credits} SMS
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Quantité"
                        value={allocationAmounts[shop.id] || ''}
                        onChange={(e) => setAllocationAmounts(prev => ({
                          ...prev,
                          [shop.id]: e.target.value
                        }))}
                        className="w-20"
                        min="1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const amount = parseInt(allocationAmounts[shop.id] || '0');
                          if (amount > 0) handleAllocateCredits(shop.id, amount);
                        }}
                        disabled={allocating === shop.id || !allocationAmounts[shop.id]}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const amount = parseInt(allocationAmounts[shop.id] || '0');
                          if (amount > 0) handleAllocateCredits(shop.id, -amount);
                        }}
                        disabled={allocating === shop.id || !allocationAmounts[shop.id]}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {shops.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun magasin trouvé
          </div>
        )}
      </CardContent>
    </Card>
  );
}