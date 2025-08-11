import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SMSPackage {
  id: string;
  name: string;
  description: string;
  sms_count: number;
  price_cents: number;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  stripe_price_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function SMSPackagesManager() {
  const [packages, setPackages] = useState<SMSPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SMSPackage | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sms_count: 0,
    price_cents: 0,
    subscription_tier: 'free' as 'free' | 'premium' | 'enterprise',
    stripe_price_id: '',
    is_active: true,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_packages')
        .select('*')
        .order('subscription_tier', { ascending: true })
        .order('price_cents', { ascending: true });

      if (error) throw error;
      setPackages((data || []) as SMSPackage[]);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les packs SMS",
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
      sms_count: 0,
      price_cents: 0,
      subscription_tier: 'free',
      stripe_price_id: '',
      is_active: true,
    });
    setEditingPackage(null);
  };

  const handleCreatePackage = async () => {
    try {
      const { error } = await supabase
        .from('sms_packages')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Pack SMS créé avec succès",
      });

      setDialogOpen(false);
      resetForm();
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditPackage = (pkg: SMSPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      sms_count: pkg.sms_count,
      price_cents: pkg.price_cents,
      subscription_tier: pkg.subscription_tier,
      stripe_price_id: pkg.stripe_price_id || '',
      is_active: pkg.is_active,
    });
    setDialogOpen(true);
  };

  const handleUpdatePackage = async () => {
    if (!editingPackage) return;

    try {
      const { error } = await supabase
        .from('sms_packages')
        .update(formData)
        .eq('id', editingPackage.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Pack SMS mis à jour avec succès",
      });

      setDialogOpen(false);
      resetForm();
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePackage = async () => {
    if (!packageToDelete) return;

    try {
      const { error } = await supabase
        .from('sms_packages')
        .delete()
        .eq('id', packageToDelete);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Pack SMS supprimé avec succès",
      });

      setDeleteDialogOpen(false);
      setPackageToDelete(null);
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatPrice = (priceCents: number) => {
    return (priceCents / 100).toFixed(2);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'premium': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedPackages = packages.reduce((acc, pkg) => {
    if (!acc[pkg.subscription_tier]) {
      acc[pkg.subscription_tier] = [];
    }
    acc[pkg.subscription_tier].push(pkg);
    return acc;
  }, {} as Record<string, SMSPackage[]>);

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Packs SMS</h2>
          <p className="text-muted-foreground">
            Configurez les packs SMS disponibles pour chaque plan d'abonnement
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Pack
        </Button>
      </div>

      {Object.entries(groupedPackages).map(([tier, tierPackages]) => (
        <Card key={tier}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Plan {tier.charAt(0).toUpperCase() + tier.slice(1)}
              <Badge className={getTierColor(tier)}>
                {tierPackages.length} pack{tierPackages.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tierPackages.map((pkg) => (
                <Card key={pkg.id} className="relative">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPackage(pkg)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPackageToDelete(pkg.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Prix:</span>
                      <span className="font-medium">{formatPrice(pkg.price_cents)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">SMS:</span>
                      <span className="font-medium">{pkg.sms_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Prix/SMS:</span>
                      <span className="font-medium">
                        {(pkg.price_cents / 100 / pkg.sms_count).toFixed(3)}€
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Statut:</span>
                      <Badge variant={pkg.is_active ? "default" : "secondary"}>
                        {pkg.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog de création/modification */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Modifier le pack SMS' : 'Créer un nouveau pack SMS'}
            </DialogTitle>
            <DialogDescription>
              Configurez les détails du pack SMS pour un plan d'abonnement spécifique.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du pack</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Pack 100 SMS"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Pack de 100 SMS supplémentaires"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sms_count">Nombre de SMS</Label>
                <Input
                  id="sms_count"
                  type="number"
                  value={formData.sms_count}
                  onChange={(e) => setFormData({ ...formData, sms_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="price_cents">Prix (centimes)</Label>
                <Input
                  id="price_cents"
                  type="number"
                  value={formData.price_cents}
                  onChange={(e) => setFormData({ ...formData, price_cents: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="subscription_tier">Plan d'abonnement</Label>
              <Select
                value={formData.subscription_tier}
                onValueChange={(value: 'free' | 'premium' | 'enterprise') => 
                  setFormData({ ...formData, subscription_tier: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuit</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="stripe_price_id">ID Prix Stripe (optionnel)</Label>
              <Input
                id="stripe_price_id"
                value={formData.stripe_price_id}
                onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                placeholder="price_xxxxx"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Pack actif</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button onClick={editingPackage ? handleUpdatePackage : handleCreatePackage}>
              {editingPackage ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le pack SMS</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce pack SMS ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPackageToDelete(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePackage}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}