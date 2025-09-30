import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, DollarSign, RotateCcw, TestTube, Plus, Bell } from 'lucide-react';
import { useTwilioCredits } from '@/hooks/useTwilioCredits';
import { useGlobalSMSCredits } from '@/hooks/useGlobalSMSCredits';
import { useState, useEffect } from 'react';
import { DetailedSMSCreditsView } from './DetailedSMSCreditsView';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';


export function TwilioCreditsManager() {
  const { balance, loading: twilioLoading, fetchTwilioBalance, purchaseCredits, syncCreditsWithShops, testTwilioAuth, purchasing } = useTwilioCredits();
  const { globalCredits, loading: globalLoading, fetchGlobalCredits } = useGlobalSMSCredits();
  const [purchaseAmount, setPurchaseAmount] = useState(10);
  const [shopCredits, setShopCredits] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const { toast } = useToast();
  const [alertThreshold, setAlertThreshold] = useState(100);
  const [alertPhone, setAlertPhone] = useState('');
  const [savingAlert, setSavingAlert] = useState(false);

  // Récupérer les données détaillées des boutiques
  const fetchShopsCreditsDetails = async () => {
    setLoadingShops(true);
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

          const monthly_usage_percent = monthly_allocated > 0 
            ? Math.round((monthly_used / monthly_allocated) * 100)
            : 0;
          
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
            monthly_usage_percent,
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
      setLoadingShops(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    fetchShopsCreditsDetails();
    fetchAlertSettings();
  }, []);

  const fetchAlertSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('twilio_alert_config')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (data) {
        setAlertThreshold(data.threshold_sms || 100);
        setAlertPhone(data.alert_phone || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres d\'alerte:', error);
    }
  };

  const handleSaveAlert = async () => {
    setSavingAlert(true);
    try {
      const { error } = await supabase
        .from('twilio_alert_config')
        .update({
          threshold_sms: alertThreshold,
          alert_phone: alertPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Configuration d\'alerte sauvegardée',
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la configuration',
        variant: 'destructive',
      });
    } finally {
      setSavingAlert(false);
    }
  };

  const refreshAllData = async () => {
    await Promise.all([
      fetchTwilioBalance(),
      fetchGlobalCredits(),
      fetchShopsCreditsDetails()
    ]);
  };

  const handlePurchase = async () => {
    try {
      await purchaseCredits(purchaseAmount);
      await refreshAllData();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSync = async () => {
    try {
      await syncCreditsWithShops();
      await refreshAllData();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="details">Détails par boutique</TabsTrigger>
          <TabsTrigger value="twilio">Gestion Twilio</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Solde Twilio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Solde Twilio Global
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Solde actuel</p>
                  <p className="text-2xl font-bold">
                    ${balance?.balance?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Équivalent SMS</p>
                  <p className="text-xl font-semibold">
                    ≈ {balance ? Math.floor(balance.balance / 0.08) : 0} SMS
                  </p>
                  <p className="text-xs text-muted-foreground">($0.08 par SMS)</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge variant={balance ? "default" : "destructive"}>
                    {balance ? "Connecté" : "Déconnecté"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Crédits globaux */}
          {globalCredits && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Distribution Globale SMS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total alloué</p>
                    <p className="text-xl font-bold">{globalCredits.total_credits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Utilisés</p>
                    <p className="text-xl font-bold">{globalCredits.used_credits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Restants</p>
                    <p className="text-xl font-bold">{globalCredits.remaining_credits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dernière sync</p>
                    <p className="text-sm">
                      {globalCredits.last_sync_at 
                        ? new Date(globalCredits.last_sync_at).toLocaleString()
                        : 'Jamais'
                      }
                    </p>
                    <Badge variant={globalCredits.sync_status === 'completed' ? "default" : "secondary"}>
                      {globalCredits.sync_status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <DetailedSMSCreditsView 
            shopCredits={shopCredits} 
            loading={loadingShops}
          />
        </TabsContent>

        <TabsContent value="twilio" className="space-y-6">
          {/* Achats de crédits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Acheter des Crédits Twilio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <label htmlFor="purchase-amount" className="block text-sm font-medium mb-2">
                    Montant en USD
                  </label>
                  <Input
                    id="purchase-amount"
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                    placeholder="Montant en USD"
                    min="1"
                    step="1"
                  />
                </div>
                <Button 
                  onClick={handlePurchase}
                  disabled={purchasing || twilioLoading || purchaseAmount <= 0}
                  className="whitespace-nowrap"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {purchasing ? 'Achat...' : `Acheter $${purchaseAmount}`}
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {[5, 10, 25, 50, 100].map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setPurchaseAmount(amount)}
                    disabled={purchasing || twilioLoading}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Synchronisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Synchroniser les crédits Twilio avec toutes les boutiques du réseau.
                </p>
                <Button 
                  onClick={handleSync}
                  disabled={twilioLoading || globalLoading}
                  className="w-full"
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Synchroniser les crédits
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test de connexion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tester la connexion avec l'API Twilio.
                </p>
                <Button 
                  onClick={testTwilioAuth}
                  disabled={twilioLoading}
                  className="w-full"
                  variant="outline"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Tester la connexion
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Configuration des alertes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alerte de Solde Twilio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alert-threshold">
                  Seuil d'alerte (nombre minimum de SMS)
                </Label>
                <Input
                  id="alert-threshold"
                  type="number"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  placeholder="100"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">
                  Une alerte sera envoyée si le solde descend sous ce nombre de SMS
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-phone">
                  Numéro de téléphone pour l'alerte
                </Label>
                <Input
                  id="alert-phone"
                  type="tel"
                  value={alertPhone}
                  onChange={(e) => setAlertPhone(e.target.value)}
                  placeholder="+33612345678"
                />
                <p className="text-xs text-muted-foreground">
                  Format international requis (ex: +33612345678)
                </p>
              </div>

              <Button 
                onClick={handleSaveAlert}
                disabled={savingAlert || !alertPhone}
                className="w-full"
              >
                <Bell className="h-4 w-4 mr-2" />
                {savingAlert ? 'Enregistrement...' : 'Enregistrer la configuration'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}