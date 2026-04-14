import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useShopLimits } from '@/hooks/useShopLimits';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SMSCreditsTab } from './SMSCreditsTab';
import { BotConversationsViewer } from './BotConversationsViewer';
import {
  Crown,
  CreditCard,
  MessageSquare,
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  Zap,
  AlertTriangle,
  Unlock,
  Lock,
  UserPlus,
  Trash2,
  Key,
  Mail,
  Shield,
  Clock,
  MapPin
} from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  invite_code: string;
  logo_url: string;
  website_enabled: boolean;
  website_title: string;
  website_description: string;
  slug: string;
  subscription_tier: string;
  subscription_plan_id?: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  active_sav_count: number;
  subscription_menu_visible: boolean;
  subscription_end?: string;
  created_at: string;
  total_users?: number;
  total_sav_cases?: number;
  total_revenue?: number;
  is_blocked?: boolean;
  custom_sav_limit?: number;
  custom_sms_limit?: number;
  admin_added_sms_credits?: number;
}

interface ShopManagementDialogProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ShopManagementDialog({ shop, isOpen, onClose, onUpdate }: ShopManagementDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshShopLimits, forceUnlockShop } = useShopLimits();
  const [loading, setLoading] = useState(false);
  const [smsCreditsToAdd, setSmsCreditsToAdd] = useState('');
  const [newSubscriptionTier, setNewSubscriptionTier] = useState(shop?.subscription_tier || 'free');
  const [isBlocked, setIsBlocked] = useState(shop?.is_blocked || false);
  const [subscriptionMenuVisible, setSubscriptionMenuVisible] = useState(shop?.subscription_menu_visible ?? true);
  const [users, setUsers] = useState<any[]>([]);
  const [userAuthStats, setUserAuthStats] = useState<Record<string, string | null>>({});
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'technician'>('technician');
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [customSmsLimit, setCustomSmsLimit] = useState('');
  const [customSavLimit, setCustomSavLimit] = useState('');
  const [forcedFeatures, setForcedFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (shop?.id) {
      fetchUsers();
      fetchSubscriptionPlans();
      setSubscriptionMenuVisible(shop.subscription_menu_visible ?? true);
      setForcedFeatures((shop as any).forced_features || {});
      // Synchroniser avec le plan par défaut si pas de plan spécifique
      syncWithDefaultPlan();
    }
  }, [shop?.id, shop?.subscription_menu_visible]);

  if (!shop) return null;

  const currentTier = subscriptionPlans.find(plan => 
    shop.subscription_plan_id ? plan.id === shop.subscription_plan_id : plan.name.toLowerCase() === shop.subscription_tier?.toLowerCase()
  );

  const syncWithDefaultPlan = async () => {
    if (!shop || shop.subscription_plan_id) return; // Ne sync que si pas de plan spécifique
    
    const defaultTier = subscriptionPlans.find(plan => 
      plan.name.toLowerCase() === shop.subscription_tier?.toLowerCase()
    );
    
    if (defaultTier && (shop.sms_credits_allocated !== defaultTier.sms_limit)) {
      try {
        const { error } = await supabase
          .from('shops')
          .update({
            sms_credits_allocated: defaultTier.sms_limit,
            subscription_plan_id: defaultTier.id
          })
          .eq('id', shop.id);

        if (!error) {
          onUpdate();
        }
      } catch (error) {
        console.error('Error syncing with default plan:', error);
      }
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price');

      if (error) throw error;
      setSubscriptionPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching subscription plans:', error);
    }
  };

  const fetchUsers = async () => {
    if (!shop) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('shop_id', shop.id);

      if (error) throw error;
      setUsers(data || []);

      // Fetch auth stats for this shop's users
      try {
        const { data: authData, error: authError } = await supabase.functions.invoke('admin-user-management', {
          body: { action: 'get_shop_auth_stats' }
        });
        if (!authError && authData?.shop_stats?.[shop.id]?.users) {
          setUserAuthStats(authData.shop_stats[shop.id].users);
        }
      } catch (e) {
        console.warn('Could not fetch user auth stats:', e);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    }
  };

  const handleCreateOrInvite = async () => {
    if (!newUserEmail) {
      toast({
        title: "Erreur",
        description: "Email requis",
        variant: "destructive",
      });
      return;
    }

    // Si mot de passe renseigné → création directe
    if (newUserPassword) {
      if (newUserPassword.length < 6) {
        toast({
          title: "Erreur",
          description: "Le mot de passe doit contenir au moins 6 caractères",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('admin-user-management', {
          body: {
            action: 'create',
            email: newUserEmail,
            password: newUserPassword,
            first_name: newUserFirstName,
            last_name: newUserLastName,
            role: newUserRole,
            shop_id: shop.id
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({
          title: "Succès",
          description: `Utilisateur ${newUserEmail} créé avec succès`,
        });

        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserFirstName('');
        setNewUserLastName('');
        setNewUserRole('technician');
        fetchUsers();
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Sinon → invitation par email (comportement existant)
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('send-invitation', {
          body: {
            email: newUserEmail,
            firstName: newUserFirstName,
            lastName: newUserLastName,
            phone: '',
            role: newUserRole
          }
        });

        if (error) throw error;

        if (data.success) {
          toast({
            title: "Succès",
            description: `Invitation envoyée à ${newUserEmail}`,
          });

          setNewUserEmail('');
          setNewUserFirstName('');
          setNewUserLastName('');
          setNewUserRole('technician');
          fetchUsers();
        } else {
          throw new Error(data.error);
        }
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'technician' | 'super_admin' | 'shop_admin') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rôle mis à jour",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: "nouveaumotdepasse123"
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Mot de passe réinitialisé à 'nouveaumotdepasse123'",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Utilisateur supprimé",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!shop) return;
    
    setLoading(true);
    try {
      const selectedPlan = subscriptionPlans.find(plan => plan.name.toLowerCase() === newSubscriptionTier.toLowerCase());
      
      // Nettoyer les forced_features redondantes avec le nouveau plan
      const newPlanMenuConfig = selectedPlan?.menu_config || {};
      const cleanedForced: Record<string, boolean> = {};
      Object.keys(forcedFeatures).forEach(key => {
        if (!newPlanMenuConfig[key]) {
          cleanedForced[key] = true;
        }
      });

      const { error } = await supabase
        .from('shops')
        .update({
          subscription_tier: newSubscriptionTier,
          sms_credits_allocated: selectedPlan?.sms_limit || 15,
          subscription_end: newSubscriptionTier === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          forced_features: cleanedForced
        })
        .eq('id', shop.id);

      if (error) throw error;

      setForcedFeatures(cleanedForced);

      toast({
        title: "Succès",
        description: `Abonnement mis à jour vers ${selectedPlan?.name || newSubscriptionTier}`,
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSmsCredits = async () => {
    if (!shop || !smsCreditsToAdd) return;
    
    const creditsToAdd = parseInt(smsCreditsToAdd);
    if (isNaN(creditsToAdd)) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nombre valide",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Ajouter les crédits dans admin_added_sms_credits (crédits permanents du plan)
      const currentAdminCredits = shop.admin_added_sms_credits || 0;
      
      const { error } = await supabase
        .from('shops')
        .update({
          admin_added_sms_credits: currentAdminCredits + creditsToAdd
        })
        .eq('id', shop.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${creditsToAdd} crédits SMS ajoutés au plan`,
      });
      
      setSmsCreditsToAdd('');
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSmsUsage = async () => {
    if (!shop) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({ sms_credits_used: 0 })
        .eq('id', shop.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Utilisation SMS réinitialisée",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!shop) return;
    
    setLoading(true);
    try {
      // Pour l'instant, on peut simuler le blocage en modifiant un champ
      // Dans une vraie implémentation, on ajouterait un champ is_blocked à la table shops
      
      setIsBlocked(!isBlocked);
      
      toast({
        title: "Succès",
        description: isBlocked ? "Magasin débloqué" : "Magasin bloqué",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscriptionMenu = async () => {
    if (!shop) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({ subscription_menu_visible: !subscriptionMenuVisible })
        .eq('id', shop.id);

      if (error) throw error;

      setSubscriptionMenuVisible(!subscriptionMenuVisible);
      
      toast({
        title: "Succès",
        description: `Menu abonnement ${!subscriptionMenuVisible ? 'activé' : 'désactivé'}`,
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSmsLimit = async () => {
    if (!shop || !customSmsLimit) return;
    
    const newLimit = parseInt(customSmsLimit);
    if (isNaN(newLimit) || newLimit < 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nombre valide",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Mettre à jour directement la limite personnalisée du magasin
      const { error } = await supabase
        .from('shops')
        .update({ 
          custom_sms_limit: newLimit,
          sms_credits_allocated: newLimit
        })
        .eq('id', shop.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Limite SMS personnalisée mise à jour: ${newLimit}`,
      });
      
      setCustomSmsLimit('');
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSavLimit = async () => {
    if (!shop || !customSavLimit) return;
    
    const newLimit = parseInt(customSavLimit);
    if (isNaN(newLimit) || newLimit < 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nombre valide",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Mettre à jour directement la limite personnalisée du magasin
      const { error } = await supabase
        .from('shops')
        .update({ 
          custom_sav_limit: newLimit
        })
        .eq('id', shop.id);

      if (error) throw error;

      // Mettre à jour l'état local pour affichage immédiat
      if (shop) {
        const updatedShop = { ...shop, custom_sav_limit: newLimit };
        // Trigger une re-render avec les nouvelles données
        onUpdate();
      }

      toast({
        title: "Succès",
        description: `Limite SAV personnalisée mise à jour: ${newLimit}`,
      });
      
      // S'assurer que subscription_forced est désactivé pour que les nouvelles limites s'appliquent
      const { error: resetError } = await supabase
        .from('shops')
        .update({ subscription_forced: false })
        .eq('id', shop.id);
      
      if (resetError) {
        console.error('Erreur lors du reset du subscription_forced:', resetError);
      }
      
      setCustomSavLimit('');
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleForcedFeature = async (feature: string, enabled: boolean) => {
    if (!shop) return;
    
    setLoading(true);
    try {
      const newForced = { ...forcedFeatures };
      
      if (enabled) {
        newForced[feature] = true;
      } else {
        delete newForced[feature];
      }
      
      const { error } = await supabase
        .from('shops')
        .update({ forced_features: newForced })
        .eq('id', shop.id);

      if (error) throw error;

      // Mettre à jour l'état local immédiatement
      setForcedFeatures(newForced);

      // Invalider le cache React Query pour que le magasin voit les changements immédiatement
      queryClient.invalidateQueries({ queryKey: ['shop'] });

      toast({
        title: "Succès",
        description: `Fonctionnalité ${feature} ${enabled ? 'forcée' : 'retirée'}`,
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWithPlan = async () => {
    if (!shop || !currentTier) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({
          sms_credits_allocated: currentTier.sms_limit,
          subscription_plan_id: currentTier.id,
          custom_sav_limit: null, // Réinitialiser les limites personnalisées
          custom_sms_limit: null
        })
        .eq('id', shop.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Limites synchronisées avec le plan par défaut. Limites personnalisées supprimées.",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Gestion du magasin : {shop.name}
          </DialogTitle>
          <DialogDescription>
            Gérez l'abonnement, les crédits SMS et les restrictions pour ce magasin
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
          <TabsTrigger value="sms">Crédits SMS</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
          <TabsTrigger value="overrides">Forcer l'accès</TabsTrigger>
        </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Utilisateurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{shop.total_users || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    SAV Actifs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{shop.active_sav_count}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Revenus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{shop.total_revenue?.toFixed(2) || '0.00'}€</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS Utilisés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {shop.sms_credits_used}/{shop.sms_credits_allocated}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Email:</strong> {shop.email}</div>
                <div><strong>Téléphone:</strong> {shop.phone}</div>
                <div><strong>Adresse:</strong> {shop.address}</div>
                <div><strong>Slug:</strong> {shop.slug}</div>
                <div><strong>Créé le:</strong> {new Date(shop.created_at).toLocaleDateString()}</div>
                <div className="flex items-center gap-2">
                  <strong>Abonnement:</strong>
                  <Badge variant={shop.subscription_tier === 'free' ? 'secondary' : 'default'}>
                    {currentTier?.name}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Gestion de l'abonnement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Abonnement actuel</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={shop.subscription_tier === 'free' ? 'secondary' : 'default'}>
                      {currentTier?.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {currentTier?.monthly_price}€/mois
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Changer d'abonnement (forcé)</Label>
                  <Select value={newSubscriptionTier} onValueChange={setNewSubscriptionTier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionPlans.map(plan => (
                        <SelectItem key={plan.id} value={plan.name.toLowerCase()}>
                          {plan.name} - {plan.monthly_price}€/mois
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleUpdateSubscription}
                  disabled={loading || newSubscriptionTier === shop.subscription_tier}
                  className="w-full"
                >
                  {loading ? "Mise à jour..." : "Mettre à jour l'abonnement"}
                </Button>

                <div className="text-sm text-muted-foreground bg-amber-50 p-3 rounded">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Cette action modifie l'abonnement sans passer par Stripe. 
                  Utilisez avec précaution.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <SMSCreditsTab 
              shop={shop} 
              loading={loading}
              smsCreditsToAdd={smsCreditsToAdd}
              setSmsCreditsToAdd={setSmsCreditsToAdd}
              handleAddSmsCredits={handleAddSmsCredits}
              handleResetSmsUsage={handleResetSmsUsage}
              onUpdate={onUpdate}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestion des utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Code d'invitation pour ce magasin :</h4>
                    <div className="flex items-center gap-2">
                      <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                        {shop?.slug || 'Non défini'}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (shop?.slug) {
                            navigator.clipboard.writeText(shop.slug);
                            toast({
                              title: "Copié !",
                              description: "Code d'invitation copié dans le presse-papiers",
                            });
                          }
                        }}
                      >
                        Copier
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Partagez ce code avec vos collaborateurs pour qu'ils puissent rejoindre votre magasin lors de leur inscription.
                    </p>
                  </div>
                  
                  <Label>Ajouter un nouvel utilisateur</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Prénom"
                      value={newUserFirstName}
                      onChange={(e) => setNewUserFirstName(e.target.value)}
                    />
                    <Input
                      placeholder="Nom"
                      value={newUserLastName}
                      onChange={(e) => setNewUserLastName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      type="email"
                      placeholder="Email *"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                    <Select value={newUserRole} onValueChange={(value: 'admin' | 'technician') => setNewUserRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">Technicien</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="password"
                    placeholder="Mot de passe (optionnel)"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    {newUserPassword 
                      ? "L'utilisateur sera créé directement avec ce mot de passe" 
                      : "Sans mot de passe, une invitation sera envoyée par email"}
                  </p>
                  <Button onClick={handleCreateOrInvite} disabled={loading || !newUserEmail} className="w-full">
                    {newUserPassword ? <UserPlus className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                    {loading ? "En cours..." : (newUserPassword ? "Créer l'utilisateur" : "Envoyer l'invitation")}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Utilisateurs existants</Label>
                  <div className="space-y-3">
                    {users.map((user) => (
                      <Card key={user.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span className="font-medium">
                                {user.first_name} {user.last_name}
                              </span>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' ? 'Admin' : 'Technicien'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {user.user_id}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {userAuthStats[user.user_id] 
                                ? `Dernière connexion : ${new Date(userAuthStats[user.user_id]!).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                : 'Jamais connecté'}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {user.last_login_city || user.last_login_country
                                ? `${user.last_login_city || ''}${user.last_login_city && user.last_login_country ? ', ' : ''}${user.last_login_country || ''}`
                                : 'Localisation inconnue'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={user.role} 
                              onValueChange={(value: 'admin' | 'technician' | 'super_admin' | 'shop_admin') => 
                                handleUpdateUserRole(user.user_id, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technician">Technicien</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetPassword(user.user_id, user.email)}
                              disabled={loading}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.user_id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {users.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        Aucun utilisateur trouvé
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Gestion des restrictions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bloquer le magasin</Label>
                    <p className="text-sm text-muted-foreground">
                      Empêche l'accès à toutes les fonctionnalités
                    </p>
                  </div>
                  <Switch
                    checked={isBlocked}
                    onCheckedChange={handleToggleBlock}
                    disabled={loading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Menu Abonnement</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher ou masquer le menu abonnement dans la sidebar du magasin
                    </p>
                  </div>
                  <Switch
                    checked={subscriptionMenuVisible}
                    onCheckedChange={handleToggleSubscriptionMenu}
                    disabled={loading}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label>Limites par défaut du plan "{currentTier?.name || shop.subscription_tier}"</Label>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>SAV simultanés: {currentTier?.sav_limit || 'Illimité'}</div>
                      <div>SMS par mois: {currentTier?.sms_limit || 15}</div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Limites actuelles du magasin</Label>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>SAV simultanés: {shop.active_sav_count}/{shop.custom_sav_limit || currentTier?.sav_limit || 'Illimité'}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Nouvelle limite SAV"
                            value={customSavLimit}
                            onChange={(e) => setCustomSavLimit(e.target.value)}
                            className="w-32"
                          />
                          <Button
                            size="sm"
                            onClick={handleUpdateSavLimit}
                            disabled={loading || !customSavLimit}
                          >
                            Appliquer
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>SMS par mois: {shop.sms_credits_allocated}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Nouvelle limite SMS"
                            value={customSmsLimit}
                            onChange={(e) => setCustomSmsLimit(e.target.value)}
                            className="w-32"
                          />
                          <Button
                            size="sm"
                            onClick={handleUpdateSmsLimit}
                            disabled={loading || !customSmsLimit}
                          >
                            Appliquer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    variant="outline"
                    onClick={handleSyncWithPlan}
                    disabled={loading}
                    className="w-full"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Synchroniser avec les limites du plan par défaut
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        
        <TabsContent value="overrides" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlock className="h-5 w-5" />
                Accès aux fonctionnalités
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                État effectif de chaque fonctionnalité. Le forçage permet d'activer une feature non incluse dans le plan.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const planMenuConfig = currentTier?.menu_config || {};
                
                const allFeatures = [
                  { key: 'dashboard', label: 'Tableau de bord', group: 'menu' },
                  { key: 'sav', label: 'Dossiers SAV', group: 'menu' },
                  { key: 'parts', label: 'Stock pièces', group: 'menu' },
                  { key: 'quotes', label: 'Devis', group: 'menu' },
                  { key: 'orders', label: 'Commandes', group: 'menu' },
                  { key: 'customers', label: 'Clients', group: 'menu' },
                  { key: 'chats', label: 'Chat clients', group: 'menu' },
                  { key: 'statistics', label: 'Statistiques', group: 'menu' },
                  { key: 'sidebar_late_sav', label: 'SAV en retard', group: 'sidebar' },
                  { key: 'sidebar_sav_types', label: 'Types de SAV', group: 'sidebar' },
                  { key: 'sidebar_sav_statuses', label: 'Statuts SAV', group: 'sidebar' },
                ];

                const menuFeatures = allFeatures.filter(f => f.group === 'menu');
                const sidebarFeatures = allFeatures.filter(f => f.group === 'sidebar');

                const renderFeatureRow = (feature: { key: string; label: string }) => {
                  const includedInPlan = planMenuConfig[feature.key] === true;
                  const isForced = forcedFeatures[feature.key] === true;
                  const effectivelyActive = includedInPlan || isForced;

                  return (
                    <div key={feature.key} className="flex items-center justify-between py-2 px-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${effectivelyActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">{feature.label}</span>
                        {includedInPlan ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                            Inclus dans le plan
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Non inclus
                          </Badge>
                        )}
                        {isForced && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">
                            Forcé
                          </Badge>
                        )}
                      </div>
                      <Switch
                        checked={isForced}
                        onCheckedChange={(checked) => handleToggleForcedFeature(feature.key, checked)}
                        disabled={loading || includedInPlan}
                      />
                    </div>
                  );
                };

                return (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Menus principaux</Label>
                      <div className="space-y-2">
                        {menuFeatures.map(renderFeatureRow)}
                      </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Zones sidebar</Label>
                      <div className="space-y-2">
                        {sidebarFeatures.map(renderFeatureRow)}
                      </div>
                    </div>

                    <Separator />

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                        Vert = fonctionnalité active (incluse dans le plan ou forcée)
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
                        Rouge = fonctionnalité inactive (non incluse et non forcée)
                      </p>
                      <p className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Inclus</Badge>
                        = le switch est grisé car déjà actif via le plan
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!shop || !currentTier) return;
                        setLoading(true);
                        try {
                          const cleanedForced: Record<string, boolean> = {};
                          Object.keys(forcedFeatures).forEach(key => {
                            if (!planMenuConfig[key]) {
                              cleanedForced[key] = true;
                            }
                          });
                          const { error } = await supabase
                            .from('shops')
                            .update({ forced_features: cleanedForced })
                            .eq('id', shop.id);
                          if (error) throw error;
                          setForcedFeatures(cleanedForced);
                          queryClient.invalidateQueries({ queryKey: ['shop'] });
                          toast({ title: "Succès", description: "Forçages synchronisés avec le plan" });
                          onUpdate();
                        } catch (error: any) {
                          toast({ title: "Erreur", description: error.message, variant: "destructive" });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Synchroniser les forçages avec le plan
                    </Button>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </DialogContent>
    </Dialog>
  );
}