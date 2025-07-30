import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  Eye,
  ExternalLink,
  Euro,
  Clock
} from 'lucide-react';

interface ShopService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
  visible: boolean;
  display_order: number;
}

interface WebsiteSettings {
  website_enabled: boolean;
  website_title: string;
  website_description: string;
}

export default function ShopWebsiteManager() {
  const { shop, updateShop } = useShop();
  const { toast } = useToast();
  
  const [services, setServices] = useState<ShopService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<ShopService | null>(null);
  
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>({
    website_enabled: false,
    website_title: '',
    website_description: ''
  });
  
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: 0,
    duration_minutes: 30,
    category: '',
    visible: true,
    display_order: 0
  });

  const categories = [
    'Réparation Smartphones',
    'Réparation Tablettes',
    'Réparation Ordinateurs',
    'Réparation Consoles',
    'Accessoires',
    'Autres'
  ];

  useEffect(() => {
    if (shop) {
      setWebsiteSettings({
        website_enabled: shop.website_enabled || false,
        website_title: shop.website_title || shop.name,
        website_description: shop.website_description || ''
      });
      fetchServices();
    }
  }, [shop]);

  const fetchServices = async () => {
    if (!shop) return;
    
    try {
      const { data, error } = await supabase
        .from('shop_services')
        .select('*')
        .eq('shop_id', shop.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWebsiteSettings = async () => {
    if (!shop) return;
    
    try {
      await updateShop(websiteSettings);
      toast({
        title: "Succès",
        description: "Paramètres du site web mis à jour",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createService = async () => {
    if (!shop) return;
    
    try {
      const { data, error } = await supabase
        .from('shop_services')
        .insert([{
          ...newService,
          shop_id: shop.id
        }])
        .select()
        .single();

      if (error) throw error;

      setServices([...services, data]);
      setIsCreateServiceOpen(false);
      setNewService({
        name: '',
        description: '',
        price: 0,
        duration_minutes: 30,
        category: '',
        visible: true,
        display_order: 0
      });
      
      toast({
        title: "Succès",
        description: "Service créé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateService = async () => {
    if (!editingService) return;
    
    try {
      const { data, error } = await supabase
        .from('shop_services')
        .update(newService)
        .eq('id', editingService.id)
        .select()
        .single();

      if (error) throw error;

      setServices(services.map(service => 
        service.id === editingService.id ? data : service
      ));
      setIsEditServiceOpen(false);
      setEditingService(null);
      
      toast({
        title: "Succès",
        description: "Service mis à jour avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('shop_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      setServices(services.filter(service => service.id !== serviceId));
      
      toast({
        title: "Succès",
        description: "Service supprimé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const editService = (service: ShopService) => {
    setEditingService(service);
    setNewService({
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration_minutes: service.duration_minutes,
      category: service.category,
      visible: service.visible,
      display_order: service.display_order
    });
    setIsEditServiceOpen(true);
  };

  const getWebsiteUrl = () => {
    if (!shop?.slug) return '';
    return `https://www.fixway.fr/${shop.slug}`;
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Paramètres du site web */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuration du Site Web
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="website-enabled">Activer le site web</Label>
              <p className="text-sm text-muted-foreground">
                Rendre votre site web public avec votre URL personnalisée
              </p>
            </div>
            <Switch
              id="website-enabled"
              checked={websiteSettings.website_enabled}
              onCheckedChange={(checked) => 
                setWebsiteSettings(prev => ({ ...prev, website_enabled: checked }))
              }
            />
          </div>

          {websiteSettings.website_enabled && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="font-medium">URL de votre site:</span>
              </div>
              <p className="text-sm font-mono bg-background p-2 rounded border">
                {getWebsiteUrl()}
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href={getWebsiteUrl()} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le site
                </a>
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="website-title">Titre du site</Label>
            <Input
              id="website-title"
              value={websiteSettings.website_title}
              onChange={(e) => 
                setWebsiteSettings(prev => ({ ...prev, website_title: e.target.value }))
              }
              placeholder="Ex: Réparation Express"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-description">Description</Label>
            <Textarea
              id="website-description"
              value={websiteSettings.website_description}
              onChange={(e) => 
                setWebsiteSettings(prev => ({ ...prev, website_description: e.target.value }))
              }
              placeholder="Décrivez votre magasin et vos services..."
              rows={3}
            />
          </div>

          <Button onClick={updateWebsiteSettings}>
            Sauvegarder les paramètres
          </Button>
        </CardContent>
      </Card>

      {/* Gestion des services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Services et Tarifs</CardTitle>
            <Dialog open={isCreateServiceOpen} onOpenChange={setIsCreateServiceOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau Service</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouveau service à votre catalogue
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-name">Nom du service</Label>
                    <Input
                      id="service-name"
                      value={newService.name}
                      onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Remplacement d'écran iPhone"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="service-category">Catégorie</Label>
                    <Select
                      value={newService.category}
                      onValueChange={(value) => setNewService(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-description">Description</Label>
                    <Textarea
                      id="service-description"
                      value={newService.description}
                      onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description du service..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="service-price">Prix (€)</Label>
                      <Input
                        id="service-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newService.price}
                        onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="service-duration">Durée (min)</Label>
                      <Input
                        id="service-duration"
                        type="number"
                        min="0"
                        value={newService.duration_minutes}
                        onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="service-visible"
                      checked={newService.visible}
                      onCheckedChange={(checked) => setNewService(prev => ({ ...prev, visible: checked }))}
                    />
                    <Label htmlFor="service-visible">Visible sur le site</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateServiceOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={createService}>
                    Créer le service
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun service configuré. Ajoutez votre premier service pour commencer.
            </p>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{service.name}</h4>
                      {!service.visible && (
                        <Badge variant="secondary">Masqué</Badge>
                      )}
                      <Badge variant="outline">{service.category}</Badge>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Euro className="h-4 w-4" />
                        <span>{service.price.toFixed(2)} €</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{service.duration_minutes} min</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => editService(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le service</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer "{service.name}" ? Cette action ne peut pas être annulée.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteService(service.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-service-name">Nom du service</Label>
              <Input
                id="edit-service-name"
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-service-category">Catégorie</Label>
              <Select
                value={newService.category}
                onValueChange={(value) => setNewService(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-service-description">Description</Label>
              <Textarea
                id="edit-service-description"
                value={newService.description}
                onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-service-price">Prix (€)</Label>
                <Input
                  id="edit-service-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newService.price}
                  onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-service-duration">Durée (min)</Label>
                <Input
                  id="edit-service-duration"
                  type="number"
                  min="0"
                  value={newService.duration_minutes}
                  onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-service-visible"
                checked={newService.visible}
                onCheckedChange={(checked) => setNewService(prev => ({ ...prev, visible: checked }))}
              />
              <Label htmlFor="edit-service-visible">Visible sur le site</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditServiceOpen(false)}>
              Annuler
            </Button>
            <Button onClick={updateService}>
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}