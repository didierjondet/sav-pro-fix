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
  ExternalLink
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: 'month' | 'year';
  sav_limit: number | null;
  sms_limit: number;
  sms_cost: number;
  features: string[];
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
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
    price: 0,
    currency: 'EUR',
    billing_interval: 'month' as 'month' | 'year',
    sav_limit: null as number | null,
    sms_limit: 15,
    sms_cost: 0.10,
    features: '',
    stripe_price_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      // Pour l'instant, on utilise des données locales
      // Dans une vraie implémentation, on aurait une table subscription_plans
      const mockPlans: SubscriptionPlan[] = [
        {
          id: '1',
          name: 'Gratuit',
          description: 'Plan de base pour découvrir la plateforme',
          price: 0,
          currency: 'EUR',
          billing_interval: 'month',
          sav_limit: 15,
          sms_limit: 15,
          sms_cost: 0.12,
          features: ['15 SAV maximum', '15 SMS par mois', 'Support email'],
          stripe_price_id: null,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Premium',
          description: 'Plan professionnel pour les petites entreprises',
          price: 29,
          currency: 'EUR',
          billing_interval: 'month',
          sav_limit: 10,
          sms_limit: 100,
          sms_cost: 0.08,
          features: ['10 SAV simultanés', '100 SMS par mois', 'Support prioritaire', 'Rapports avancés'],
          stripe_price_id: 'price_premium_monthly',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Enterprise',
          description: 'Plan enterprise pour les grandes organisations',
          price: 99,
          currency: 'EUR',
          billing_interval: 'month',
          sav_limit: null,
          sms_limit: 400,
          sms_cost: 0.05,
          features: ['SAV illimités', '400 SMS par mois', 'Support 24/7', 'API personnalisée'],
          stripe_price_id: 'price_enterprise_monthly',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      
      setPlans(mockPlans);
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
      price: 0,
      currency: 'EUR',
      billing_interval: 'month',
      sav_limit: null,
      sms_limit: 15,
      sms_cost: 0.10,
      features: '',
      stripe_price_id: '',
      is_active: true
    });
  };

  const handleCreatePlan = async () => {
    try {
      // Dans une vraie implémentation, on créerait le plan en base
      const newPlan: SubscriptionPlan = {
        id: Date.now().toString(),
        ...formData,
        features: formData.features.split('\n').filter(f => f.trim()),
        created_at: new Date().toISOString()
      };
      
      setPlans([...plans, newPlan]);
      setIsCreateOpen(false);
      resetForm();
      
      toast({
        title: "Succès",
        description: "Plan d'abonnement créé avec succès",
      });
    } catch (error: any) {
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
      features: plan.features.join('\n')
    });
    setIsEditOpen(true);
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    
    try {
      const updatedPlan: SubscriptionPlan = {
        ...editingPlan,
        ...formData,
        features: formData.features.split('\n').filter(f => f.trim())
      };
      
      setPlans(plans.map(plan => plan.id === editingPlan.id ? updatedPlan : plan));
      setIsEditOpen(false);
      setEditingPlan(null);
      resetForm();
      
      toast({
        title: "Succès",
        description: "Plan d'abonnement mis à jour avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
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
    toast({
      title: "Info",
      description: "Synchronisation avec Stripe en cours de développement",
    });
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
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
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
                  <Label>Coût SMS (€)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.sms_cost}
                    onChange={(e) => setFormData({ ...formData, sms_cost: parseFloat(e.target.value) || 0 })}
                    placeholder="ex: 0.08"
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
                    {plan.price}€
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
                  SMS: {plan.sms_limit} par mois ({plan.sms_cost}€/SMS)
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

      {/* Dialog d'édition */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le plan d'abonnement</DialogTitle>
            <DialogDescription>
              Modifiez les caractéristiques de votre plan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
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
                <Label>Coût SMS (€)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.sms_cost}
                  onChange={(e) => setFormData({ ...formData, sms_cost: parseFloat(e.target.value) || 0 })}
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
            
            <div>
              <Label>ID Prix Stripe</Label>
              <Input
                value={formData.stripe_price_id}
                onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
              />
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
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdatePlan}>
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}