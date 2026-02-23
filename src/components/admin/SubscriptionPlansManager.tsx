import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Edit,
  Trash2,
  Crown,
  DollarSign,
  MessageSquare,
  Activity,
  ExternalLink,
  Menu,
  Sidebar,
  HardDrive
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  billing_interval: 'month' | 'year';
  sav_limit: number | null;
  sms_limit: number;
  storage_limit_gb: number;
  features: string[];
  stripe_price_id: string | null;
  contact_only: boolean;
  is_active: boolean;
  menu_config: any;
  created_at: string;
  updated_at: string;
}

export default function SubscriptionPlansManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthly_price: 0,
    billing_interval: 'month' as 'month' | 'year',
    sav_limit: null as number | null,
    sms_limit: 15,
    storage_limit_gb: 1,
    features: '',
    stripe_price_id: '',
    contact_only: false,
    is_active: true,
    menu_config: {
      dashboard: true,
      sav: true,
      parts: true,
      quotes: false,
      orders: false,
      customers: true,
      chats: false,
      sidebar_sav_types: true,
      sidebar_sav_statuses: true,
      sidebar_late_sav: true,
      statistics: false
    }
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('monthly_price');

      if (error) throw error;
      
      // Transform data to match our interface
      const transformedPlans = (data || []).map(plan => ({
        ...plan,
        description: plan.description || '',
        billing_interval: plan.billing_interval as 'month' | 'year',
        features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : [],
        stripe_price_id: plan.stripe_price_id || null,
        contact_only: plan.contact_only || false,
        menu_config: plan.menu_config || {
          dashboard: true,
          sav: true,
          parts: true,
          quotes: false,
          orders: false,
          customers: true,
          chats: false,
          sidebar_sav_types: true,
          sidebar_sav_statuses: true,
          sidebar_late_sav: true,
          statistics: false
        }
      }));
      
      setPlans(transformedPlans);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les plans d'abonnement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      monthly_price: 0,
      billing_interval: 'month',
      sav_limit: null,
      sms_limit: 15,
      storage_limit_gb: 1,
      features: '',
      stripe_price_id: '',
      contact_only: false,
      is_active: true,
      menu_config: {
        dashboard: true,
        sav: true,
        parts: true,
        quotes: false,
        orders: false,
        customers: true,
        chats: false,
        sidebar_sav_types: true,
        sidebar_sav_statuses: true,
        sidebar_late_sav: true,
        statistics: false
      }
    });
  };

  const handleCreatePlan = async () => {
    try {
      console.log('Creating plan with data:', formData);
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          name: formData.name,
          description: formData.description,
          monthly_price: formData.monthly_price,
          billing_interval: formData.billing_interval,
          sav_limit: formData.sav_limit,
          sms_limit: formData.sms_limit,
          storage_limit_gb: formData.storage_limit_gb,
          features: formData.features.split('\n').filter(f => f.trim()),
          stripe_price_id: formData.stripe_price_id || null,
          contact_only: formData.contact_only,
          is_active: formData.is_active,
          menu_config: formData.menu_config
        })
        .select()
        .single();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      setPlans([...plans, {
        ...data,
        description: data.description || '',
        billing_interval: data.billing_interval as 'month' | 'year',
        features: Array.isArray(data.features) ? data.features.map(f => String(f)) : [],
        stripe_price_id: data.stripe_price_id || null,
        contact_only: data.contact_only || false,
        menu_config: data.menu_config || formData.menu_config
      }]);
      setIsCreateOpen(false);
      resetForm();
      
      toast({
        title: "Succès",
        description: "Plan d'abonnement créé avec succès",
      });
    } catch (error: any) {
      console.error('Create plan error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      ...plan,
      features: plan.features.join('\n'),
      menu_config: plan.menu_config || {
        dashboard: true,
        sav: true,
        parts: true,
        quotes: false,
        orders: false,
        customers: true,
        chats: false,
        sidebar_sav_types: true,
        sidebar_sav_statuses: true,
        sidebar_late_sav: true,
        statistics: false
      }
    });
    setIsEditOpen(true);
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    
    try {
      console.log('🔄 Updating plan with ID:', editingPlan.id);
      console.log('📝 Form data before update:', formData);
      console.log('🏷️ Stripe Price ID being saved:', formData.stripe_price_id);
      
      const updateData = {
        name: formData.name,
        description: formData.description,
        monthly_price: formData.monthly_price,
        billing_interval: formData.billing_interval,
        sav_limit: formData.sav_limit,
        sms_limit: formData.sms_limit,
        storage_limit_gb: formData.storage_limit_gb,
        features: formData.features.split('\n').filter(f => f.trim()),
        stripe_price_id: formData.stripe_price_id || null,
        contact_only: formData.contact_only,
        is_active: formData.is_active,
        menu_config: formData.menu_config
      };
      
      console.log('🚀 Update payload:', updateData);

      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updateData)
        .eq('id', editingPlan.id)
        .select()
        .single();

      console.log('✅ Update result:', { data, error });

      if (error) {
        console.error('❌ Update error:', error);
        toast({
          title: "Erreur",
          description: `Erreur lors de la mise à jour: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }

      if (data) {
        console.log('📊 Updated plan data from DB:', data);
        console.log('🎯 Stripe Price ID in updated data:', data.stripe_price_id);
        
        setPlans(plans.map(plan => plan.id === editingPlan.id ? {
          ...data,
          description: data.description || '',
          billing_interval: data.billing_interval as 'month' | 'year',
          features: Array.isArray(data.features) ? data.features.map(f => String(f)) : [],
          stripe_price_id: data.stripe_price_id || null,
          contact_only: data.contact_only || false,
          menu_config: data.menu_config || formData.menu_config
        } : plan));
        setIsEditOpen(false);
        setEditingPlan(null);
        resetForm();
        
        toast({
          title: "Succès",
          description: "Plan d'abonnement mis à jour avec succès",
        });
      }
    } catch (error: any) {
      console.error('Update plan error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      setPlans(plans.filter(plan => plan.id !== planId));
      
      toast({
        title: "Succès",
        description: "Plan d'abonnement supprimé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const syncWithStripe = async (plan: SubscriptionPlan) => {
    console.log('🔄 [SYNC] Début de synchronisation pour le plan:', plan.name);
    console.log('📋 [SYNC] Plan ID:', plan.id);
    console.log('🏷️ [SYNC] Stripe Price ID actuel:', plan.stripe_price_id);
    
    if (!plan.stripe_price_id) {
      console.log('❌ [SYNC] Pas de Price ID Stripe configuré');
      toast({
        title: "Erreur",
        description: "Aucun Price ID Stripe configuré pour ce plan",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🚀 [SYNC] Appel de create-checkout pour vérification...');
      
      // Utiliser la fonction create-checkout existante avec un paramètre spécial pour la vérification
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          verify_price_only: true, 
          price_id: plan.stripe_price_id, 
          plan_id: plan.id 
        }
      });

      console.log('📊 [SYNC] Réponse de create-checkout:', { data, error });

      if (error) {
        console.log('❌ [SYNC] Erreur lors de la vérification:', error);
        throw error;
      }

      if (data.valid) {
        console.log('✅ [SYNC] Price ID valide, mise à jour des informations...');
        console.log('💰 [SYNC] Prix depuis Stripe:', data.amount, 'centimes');
        console.log('🔄 [SYNC] Intervalle de facturation:', data.interval);
        
        toast({
          title: "✅ Synchronisation réussie",
          description: `Prix valide: ${(data.amount / 100).toFixed(2)}€/${data.interval}`,
        });
        
        // Mettre à jour localement le plan avec les données Stripe
        setPlans(plans.map(p => p.id === plan.id ? {
          ...p,
          monthly_price: data.amount / 100,
          billing_interval: data.interval as 'month' | 'year'
        } : p));
      } else {
        console.log('❌ [SYNC] Price ID invalide:', data.error);
        toast({
          title: "❌ Price ID invalide",
          description: data.error || "Ce Price ID n'existe pas dans Stripe",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('💥 [SYNC] Erreur lors de la synchronisation:', error);
      toast({
        title: "Erreur de synchronisation",
        description: `Impossible de vérifier le Price ID: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Chargement des plans d'abonnement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des plans d'abonnement</h2>
          <p className="text-muted-foreground">
            Créez et gérez vos plans d'abonnement Stripe
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un nouveau plan d'abonnement</DialogTitle>
              <DialogDescription>
                Définissez les caractéristiques et le prix de votre nouveau plan
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom du plan</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Premium"
                  />
                </div>
                <div>
                  <Label>Prix</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.monthly_price}
                      onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                    />
                    <select
                      value={formData.billing_interval}
                      onChange={(e) => setFormData({ ...formData, billing_interval: e.target.value as 'month' | 'year' })}
                      className="px-3 py-2 border rounded"
                    >
                      <option value="month">/ mois</option>
                      <option value="year">/ an</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du plan..."
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Limite SAV (laissez vide pour illimité)</Label>
                  <Input
                    type="number"
                    value={formData.sav_limit || ''}
                    onChange={(e) => setFormData({ ...formData, sav_limit: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="ex: 10"
                  />
                </div>
                <div>
                  <Label>Limite SMS par mois</Label>
                  <Input
                    type="number"
                    value={formData.sms_limit}
                    onChange={(e) => setFormData({ ...formData, sms_limit: parseInt(e.target.value) || 0 })}
                    placeholder="ex: 100"
                  />
                </div>
                <div>
                  <Label>Stockage alloué (GB)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.storage_limit_gb}
                    onChange={(e) => setFormData({ ...formData, storage_limit_gb: parseFloat(e.target.value) || 1 })}
                    placeholder="ex: 5"
                  />
                </div>
              </div>
              
              <div>
                <Label>Fonctionnalités (une par ligne)</Label>
                <Textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="Support prioritaire&#10;Rapports avancés&#10;API personnalisée"
                  rows={4}
                />
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  Configuration des menus
                </Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Définissez quels menus sont disponibles pour ce plan
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Menus principaux</Label>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.dashboard}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, dashboard: checked }
                        })}
                      />
                      <Label className="text-sm">Tableau de bord</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.sav}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, sav: checked }
                        })}
                      />
                      <Label className="text-sm">Dossiers SAV</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.parts}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, parts: checked }
                        })}
                      />
                      <Label className="text-sm">Stock pièces</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.quotes}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, quotes: checked }
                        })}
                      />
                      <Label className="text-sm">Devis</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.orders}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, orders: checked }
                        })}
                      />
                      <Label className="text-sm">Commandes</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.customers}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, customers: checked }
                        })}
                      />
                      <Label className="text-sm">Clients</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.chats}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, chats: checked }
                        })}
                      />
                      <Label className="text-sm">Chat clients</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.statistics}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, statistics: checked }
                        })}
                      />
                      <Label className="text-sm">Statistiques</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Sidebar className="h-4 w-4" />
                      Zones sidebar
                    </Label>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.sidebar_late_sav}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, sidebar_late_sav: checked }
                        })}
                      />
                      <Label className="text-sm">SAV en retard</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.sidebar_sav_types}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, sidebar_sav_types: checked }
                        })}
                      />
                      <Label className="text-sm">Types de SAV</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.menu_config.sidebar_sav_statuses}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          menu_config: { ...formData.menu_config, sidebar_sav_statuses: checked }
                        })}
                      />
                      <Label className="text-sm">Statuts SAV</Label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>ID Prix Stripe (optionnel)</Label>
                <Input
                  value={formData.stripe_price_id}
                  onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                  placeholder="price_xxxxx"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.contact_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, contact_only: checked })}
                />
                <Label>Mode "Nous contacter" (remplace le paiement par un formulaire de contact)</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Plan actif</Label>
                </div>
              </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreatePlan}>
                Créer le plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-50' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {!plan.is_active && <Badge variant="secondary">Inactif</Badge>}
                  </CardTitle>
                  <div className="text-2xl font-bold text-primary">
                    {plan.monthly_price}€
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.billing_interval === 'month' ? 'mois' : 'an'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPlan(plan)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le plan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer le plan "{plan.name}" ?
                          Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4" />
                  SAV: {plan.sav_limit ? `${plan.sav_limit} maximum` : 'Illimité'}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4" />
                  SMS: {plan.sms_limit} par mois
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <HardDrive className="h-4 w-4" />
                  Stockage: {plan.storage_limit_gb} GB
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                {plan.features.map((feature, index) => (
                  <div key={index} className="text-sm flex items-center gap-2">
                    <div className="w-1 h-1 bg-primary rounded-full" />
                    {feature}
                  </div>
                ))}
              </div>
              
              {plan.stripe_price_id && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Stripe: {plan.stripe_price_id}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncWithStripe(plan)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Sync
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sheet d'édition */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Modifier le plan d'abonnement</SheetTitle>
            <SheetDescription>
              Modifiez les caractéristiques de votre plan
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du plan</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Prix</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.monthly_price}
                    onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                  />
                  <select
                    value={formData.billing_interval}
                    onChange={(e) => setFormData({ ...formData, billing_interval: e.target.value as 'month' | 'year' })}
                    className="px-3 py-2 border rounded"
                  >
                    <option value="month">/ mois</option>
                    <option value="year">/ an</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Limite SAV</Label>
                <Input
                  type="number"
                  value={formData.sav_limit || ''}
                  onChange={(e) => setFormData({ ...formData, sav_limit: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div>
                <Label>Limite SMS par mois</Label>
                <Input
                  type="number"
                  value={formData.sms_limit}
                  onChange={(e) => setFormData({ ...formData, sms_limit: parseInt(e.target.value) || 0 })}
                />
                </div>
                <div>
                  <Label>Stockage alloué (GB)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.storage_limit_gb}
                    onChange={(e) => setFormData({ ...formData, storage_limit_gb: parseFloat(e.target.value) || 1 })}
                  />
                </div>
              </div>
            
            <div>
              <Label>Fonctionnalités (une par ligne)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                rows={4}
              />
            </div>

            <Separator />

            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                <Menu className="h-4 w-4" />
                Configuration des menus
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Définissez quels menus sont disponibles pour ce plan
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Menus principaux</Label>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.dashboard}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, dashboard: checked }
                      })}
                    />
                    <Label className="text-sm">Tableau de bord</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.sav}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, sav: checked }
                      })}
                    />
                    <Label className="text-sm">Dossiers SAV</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.parts}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, parts: checked }
                      })}
                    />
                    <Label className="text-sm">Stock pièces</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.quotes}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, quotes: checked }
                      })}
                    />
                    <Label className="text-sm">Devis</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.orders}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, orders: checked }
                      })}
                    />
                    <Label className="text-sm">Commandes</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.customers}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, customers: checked }
                      })}
                    />
                    <Label className="text-sm">Clients</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.chats}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, chats: checked }
                      })}
                    />
                    <Label className="text-sm">Chat clients</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.statistics}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, statistics: checked }
                      })}
                    />
                    <Label className="text-sm">Statistiques</Label>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Sidebar className="h-4 w-4" />
                    Zones sidebar
                  </Label>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.sidebar_late_sav}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, sidebar_late_sav: checked }
                      })}
                    />
                    <Label className="text-sm">SAV en retard</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.sidebar_sav_types}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, sidebar_sav_types: checked }
                      })}
                    />
                    <Label className="text-sm">Types de SAV</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.menu_config.sidebar_sav_statuses}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        menu_config: { ...formData.menu_config, sidebar_sav_statuses: checked }
                      })}
                    />
                    <Label className="text-sm">Statuts SAV</Label>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <Label>ID Prix Stripe</Label>
              <Input
                value={formData.stripe_price_id}
                onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.contact_only}
                onCheckedChange={(checked) => setFormData({ ...formData, contact_only: checked })}
              />
              <Label>Mode "Nous contacter"</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Plan actif</Label>
            </div>
          </div>
          
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdatePlan}>
              Mettre à jour
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}