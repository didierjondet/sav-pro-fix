import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Plus, RotateCcw, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShopCreditsDetail {
  shop_id: string;
  shop_name: string;
  subscription_tier: string;
  monthly_allocated: number;
  monthly_used: number;
  monthly_remaining: number;
  purchased_total: number;
  admin_added: number;
  purchasable_used: number;
  purchasable_remaining: number;
  total_available: number;
  total_remaining: number;
  overall_usage_percent: number;
}

interface SMSCreditManagerProps {
  onUpdate: () => void;
}

export function SMSCreditManager({ onUpdate }: SMSCreditManagerProps) {
  const [shopCredits, setShopCredits] = useState<ShopCreditsDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState<{ [key: string]: number }>({});
  const [buttonLoading, setButtonLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  // Récupérer les données détaillées des boutiques avec le même format que DetailedSMSCreditsView
  const fetchShopsCreditsDetails = async () => {
    setLoading(true);
    try {
      const { data: shops, error } = await supabase
        .from('shops')
        .select(`
          id,
          name,
          subscription_tier,
          sms_credits_allocated,
          monthly_sms_used,
          admin_added_sms_credits,
          purchased_sms_credits
        `)
        .order('name');

      if (error) throw error;

      // Pour chaque shop, récupérer les détails des crédits
      const shopsWithCredits = await Promise.all(
        shops.map(async (shop) => {
          // Récupérer les SMS achetés
          const { data: packages } = await supabase
            .from('sms_package_purchases')
            .select('sms_count')
            .eq('shop_id', shop.id)
            .eq('status', 'completed');

          const purchased_total = packages?.reduce((sum, pkg) => sum + pkg.sms_count, 0) || 0;
          const admin_added = shop.admin_added_sms_credits || 0;
          const monthly_allocated = shop.sms_credits_allocated || 0;
          const monthly_used = shop.monthly_sms_used || 0;
          const purchasable_used = shop.purchased_sms_credits || 0;

          const monthly_remaining = Math.max(0, monthly_allocated - monthly_used);
          const purchasable_total = purchased_total + admin_added;
          const purchasable_remaining = Math.max(0, purchasable_total - purchasable_used);
          
          const total_available = monthly_allocated + purchasable_total;
          const total_remaining = monthly_remaining + purchasable_remaining;
          const total_used = monthly_used + purchasable_used;

          const overall_usage_percent = total_available > 0 
            ? Math.round((total_used / total_available) * 100)
            : 0;

          return {
            shop_id: shop.id,
            shop_name: shop.name,
            subscription_tier: shop.subscription_tier,
            monthly_allocated,
            monthly_used,
            monthly_remaining,
            purchased_total,
            admin_added,
            purchasable_used,
            purchasable_remaining,
            total_available,
            total_remaining,
            overall_usage_percent
          };
        })
      );

      setShopCredits(shopsWithCredits);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails des crédits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopsCreditsDetails();
  }, []);

  const handleAddCredits = async (shopId: string) => {
    const credits = creditsToAdd[shopId];
    if (!credits || credits <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nombre de crédits valide",
        variant: "destructive",
      });
      return;
    }

    setButtonLoading(prev => ({ ...prev, [shopId]: true }));

    try {
      // Récupérer les crédits actuels
      const { data: currentShop, error: fetchError } = await supabase
        .from('shops')
        .select('admin_added_sms_credits')
        .eq('id', shopId)
        .single();

      if (fetchError) throw fetchError;

      // Ajouter aux crédits ajoutés par admin (épuisables)
      const { error } = await supabase
        .from('shops')
        .update({
          admin_added_sms_credits: (currentShop.admin_added_sms_credits || 0) + credits
        })
        .eq('id', shopId);

      if (error) throw error;

      toast({
        title: "Crédits ajoutés",
        description: `${credits} crédits SMS épuisables ajoutés avec succès`,
      });

      setCreditsToAdd(prev => ({ ...prev, [shopId]: 0 }));
      await fetchShopsCreditsDetails(); // Actualiser les données locales
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout des crédits:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les crédits SMS",
        variant: "destructive",
      });
    } finally {
      setButtonLoading(prev => ({ ...prev, [shopId]: false }));
    }
  };

  const handleResetUsage = async (shopId: string) => {
    setButtonLoading(prev => ({ ...prev, [shopId]: true }));

    try {
      const { error } = await supabase
        .from('shops')
        .update({ 
          sms_credits_used: 0,
          monthly_sms_used: 0,
          purchased_sms_credits: 0
        })
        .eq('id', shopId);

      if (error) throw error;

      toast({
        title: "Utilisation réinitialisée",
        description: "L'utilisation des crédits SMS a été remise à zéro",
      });

      await fetchShopsCreditsDetails(); // Actualiser les données locales
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser l'utilisation",
        variant: "destructive",
      });
    } finally {
      setButtonLoading(prev => ({ ...prev, [shopId]: false }));
    }
  };

  const getUsageColor = (used: number, allocated: number) => {
    const percentage = (used / allocated) * 100;
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'secondary';
    return 'default';
  };

  const getPlanBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'default';
      case 'premium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Répartition Crédits SMS - Magasins du Réseau
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Chargement des données...</p>
            </div>
          ) : (
            <>
              {/* Statistiques globales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{shopCredits.length}</div>
                    <p className="text-sm text-muted-foreground">Boutiques actives</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {shopCredits.reduce((sum, shop) => sum + shop.total_available, 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Crédits totaux disponibles</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {shopCredits.reduce((sum, shop) => sum + (shop.monthly_used + shop.purchasable_used), 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Crédits utilisés (total)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {shopCredits.reduce((sum, shop) => sum + shop.total_remaining, 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Crédits restants (total)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Table des boutiques */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Boutique</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Plan Mensuel</TableHead>
                    <TableHead>SMS Achetés</TableHead>
                    <TableHead>Admin Ajoutés</TableHead>
                    <TableHead>Total Disponible</TableHead>
                    <TableHead>Utilisés</TableHead>
                    <TableHead>Restants</TableHead>
                    <TableHead>Ajouter Crédits</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shopCredits.map((shop) => (
                    <TableRow key={shop.shop_id}>
                      <TableCell className="font-medium">{shop.shop_name}</TableCell>
                      <TableCell>
                        <Badge variant={getPlanBadgeColor(shop.subscription_tier)}>
                          {shop.subscription_tier.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{shop.monthly_remaining} / {shop.monthly_allocated}</div>
                          <div className="text-muted-foreground">mensuel</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{shop.purchased_total}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{shop.admin_added}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{shop.total_available}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Mensuel: {shop.monthly_used}</div>
                          <div>Épuisables: {shop.purchasable_used}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={shop.total_remaining < 0 ? "destructive" : 
                                     shop.total_remaining < 5 ? "secondary" : "default"}>
                          {shop.total_remaining}
                        </Badge>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({shop.overall_usage_percent}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="0"
                            value={creditsToAdd[shop.shop_id] || ''}
                            onChange={(e) => setCreditsToAdd(prev => ({ 
                              ...prev, 
                              [shop.shop_id]: parseInt(e.target.value) || 0 
                            }))}
                            className="w-20"
                            min="0"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddCredits(shop.shop_id)}
                            disabled={buttonLoading[shop.shop_id] || !creditsToAdd[shop.shop_id]}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetUsage(shop.shop_id)}
                          disabled={buttonLoading[shop.shop_id]}
                          title="Remettre à zéro l'utilisation mensuelle"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {!loading && shopCredits.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune boutique trouvée
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}