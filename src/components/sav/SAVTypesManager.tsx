import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Plus, Info, Clock, Users, Sidebar, AlertTriangle, BarChart3, TrendingDown, TrendingUp, Star } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useShopSettings } from '@/hooks/useShopSettings';

export interface SAVType {
  id: string;
  shop_id: string;
  type_key: string;
  type_label: string;
  type_color: string;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  show_customer_info: boolean;
  max_processing_days?: number;
  pause_timer: boolean;
  show_in_sidebar: boolean;
  require_unlock_pattern: boolean;
  exclude_from_stats: boolean;
  exclude_purchase_costs: boolean;
  exclude_sales_revenue: boolean;
  show_satisfaction_survey: boolean;
  created_at: string;
  updated_at: string;
}

interface SAVTypesManagerProps {
  types: SAVType[];
  loading: boolean;
  onRefresh: () => void;
}

export default function SAVTypesManager({ types, loading, onRefresh }: SAVTypesManagerProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { settings, refetch: refetchSettings } = useShopSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<SAVType | null>(null);
  const [formData, setFormData] = useState({
    type_key: '',
    type_label: '',
    type_color: '#6b7280',
    show_customer_info: true,
    max_processing_days: 7,
    pause_timer: false,
    show_in_sidebar: true,
    require_unlock_pattern: false,
    exclude_from_stats: false,
    exclude_purchase_costs: false,
    exclude_sales_revenue: false,
    show_satisfaction_survey: true,
  });

  const resetForm = () => {
    setFormData({
      type_key: '',
      type_label: '',
      type_color: '#6b7280',
      show_customer_info: true,
      max_processing_days: 7,
      pause_timer: false,
      show_in_sidebar: true,
      require_unlock_pattern: false,
      exclude_from_stats: false,
      exclude_purchase_costs: false,
      exclude_sales_revenue: false,
      show_satisfaction_survey: true,
    });
    setEditingType(null);
  };

  const handleCreate = async () => {
    if (!profile?.shop_id) return;

    try {
      const maxOrder = Math.max(...types.map(t => t.display_order), 0);
      
        const { error } = await supabase
          .from('shop_sav_types')
          .insert({
            shop_id: profile.shop_id,
            type_key: formData.type_key,
            type_label: formData.type_label,
            type_color: formData.type_color,
            display_order: maxOrder + 1,
            show_customer_info: formData.show_customer_info,
            max_processing_days: formData.max_processing_days,
            pause_timer: formData.pause_timer,
            show_in_sidebar: formData.show_in_sidebar,
            require_unlock_pattern: formData.require_unlock_pattern,
            exclude_from_stats: formData.exclude_from_stats,
            exclude_purchase_costs: formData.exclude_purchase_costs,
            exclude_sales_revenue: formData.exclude_sales_revenue,
            show_satisfaction_survey: formData.show_satisfaction_survey,
          });

      if (error) throw error;

      toast({
        title: "Type SAV créé",
        description: "Le nouveau type de SAV a été créé avec succès.",
      });

      setDialogOpen(false);
      resetForm();
      onRefresh();
    } catch (error: any) {
      console.error('Error creating SAV type:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le type de SAV.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editingType) return;

    try {
      const { error } = await supabase
        .from('shop_sav_types')
        .update({
          type_key: formData.type_key,
          type_label: formData.type_label,
          type_color: formData.type_color,
          show_customer_info: formData.show_customer_info,
          max_processing_days: formData.max_processing_days,
          pause_timer: formData.pause_timer,
          show_in_sidebar: formData.show_in_sidebar,
          require_unlock_pattern: formData.require_unlock_pattern,
          exclude_from_stats: formData.exclude_from_stats,
          exclude_purchase_costs: formData.exclude_purchase_costs,
          exclude_sales_revenue: formData.exclude_sales_revenue,
          show_satisfaction_survey: formData.show_satisfaction_survey,
        })
        .eq('id', editingType.id);

      if (error) throw error;

      toast({
        title: "Type SAV modifié",
        description: "Le type de SAV a été modifié avec succès.",
      });

      setDialogOpen(false);
      resetForm();
      onRefresh();
    } catch (error: any) {
      console.error('Error updating SAV type:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le type de SAV.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (type: SAVType) => {
    if (type.is_default) {
      toast({
        title: "Suppression impossible",
        description: "Les types par défaut ne peuvent pas être supprimés.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('shop_sav_types')
        .delete()
        .eq('id', type.id);

      if (error) throw error;

      toast({
        title: "Type SAV supprimé",
        description: "Le type de SAV a été supprimé avec succès.",
      });

      onRefresh();
    } catch (error: any) {
      console.error('Error deleting SAV type:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le type de SAV.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (type: SAVType) => {
    setEditingType(type);
    setFormData({
      type_key: type.type_key,
      type_label: type.type_label,
      type_color: type.type_color,
      show_customer_info: type.show_customer_info,
      max_processing_days: type.max_processing_days || 7,
      pause_timer: type.pause_timer,
      show_in_sidebar: type.show_in_sidebar,
      require_unlock_pattern: type.require_unlock_pattern,
      exclude_from_stats: type.exclude_from_stats ?? false,
      exclude_purchase_costs: type.exclude_purchase_costs ?? false,
      exclude_sales_revenue: type.exclude_sales_revenue ?? false,
      show_satisfaction_survey: type.show_satisfaction_survey ?? true,
    });
    setDialogOpen(true);
  };

  const handleToggleHideEmpty = async (checked: boolean) => {
    if (!profile?.shop_id) return;
    
    try {
      const { error } = await supabase
        .from('shops')
        .update({ hide_empty_sav_types: checked })
        .eq('id', profile.shop_id);
        
      if (error) throw error;
      
      toast({
        title: "Paramètre mis à jour",
        description: checked 
          ? "Les types de SAV vides seront masqués dans la sidebar"
          : "Tous les types de SAV seront affichés dans la sidebar",
      });
      
      refetchSettings();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le paramètre",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Types de SAV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement des types de SAV...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Types de SAV
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editingType ? 'Modifier le type de SAV' : 'Nouveau type de SAV'}
                </DialogTitle>
                <DialogDescription>
                  Configurez les détails du type de SAV. La clé sera utilisée en interne.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div>
                  <Label htmlFor="type_key">Clé du type</Label>
                  <Input
                    id="type_key"
                    value={formData.type_key}
                    onChange={(e) => setFormData({ ...formData, type_key: e.target.value })}
                    placeholder="ex: reparation_ecran"
                    disabled={!!editingType?.is_default}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Utilisée en interne, ne peut pas être modifiée après création.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="type_label">Libellé</Label>
                  <Input
                    id="type_label"
                    value={formData.type_label}
                    onChange={(e) => setFormData({ ...formData, type_label: e.target.value })}
                    placeholder="ex: Réparation d'écran"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type_color">Couleur</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="type_color"
                      type="color"
                      value={formData.type_color}
                      onChange={(e) => setFormData({ ...formData, type_color: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.type_color}
                      onChange={(e) => setFormData({ ...formData, type_color: e.target.value })}
                      placeholder="#6b7280"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Options avancées</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Afficher les informations client
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permet de lier le SAV à un client existant ou d'en créer un nouveau
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_customer_info}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, show_customer_info: checked })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_processing_days" className="text-sm font-normal flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Délai maximum de traitement (jours)
                    </Label>
                    <Input
                      id="max_processing_days"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.max_processing_days}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        max_processing_days: parseInt(e.target.value) || undefined 
                      })}
                      placeholder="7"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Nombre de jours maximum pour traiter ce type de SAV
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Mettre en pause le timer de délai
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Le timer de délai est suspendu quand le SAV est dans ce type
                      </p>
                    </div>
                    <Switch
                      checked={formData.pause_timer}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, pause_timer: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal flex items-center gap-2">
                        <Sidebar className="w-4 h-4" />
                        Afficher dans la barre latérale
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Ce type apparaît dans les filtres de la barre latérale
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_in_sidebar}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, show_in_sidebar: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Code de déverrouillage obligatoire
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Exiger la saisie du code de déverrouillage pour ce type de SAV
                      </p>
                    </div>
                    <Switch
                      checked={formData.require_unlock_pattern}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, require_unlock_pattern: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal flex items-center gap-2">
                        <TrendingDown className="w-4 h-4" />
                        Exclure les coûts d'achat
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Les prix d'achat des pièces ne seront pas comptabilisés dans les dépenses
                      </p>
                    </div>
                    <Switch
                      checked={formData.exclude_purchase_costs}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, exclude_purchase_costs: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Exclure les revenus de vente
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Les prix de vente ne seront pas comptabilisés dans les revenus (pas de calcul de marge)
                      </p>
                    </div>
                    <Switch
                      checked={formData.exclude_sales_revenue}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, exclude_sales_revenue: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Afficher questionnaire satisfaction
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permet d'envoyer un questionnaire de satisfaction aux clients pour ce type de SAV
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_satisfaction_survey}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, show_satisfaction_survey: checked })
                      }
                    />
                  </div>

                  {(formData.exclude_purchase_costs !== formData.exclude_sales_revenue) && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ Note : La marge ne sera pas calculée si l'un des deux prix est exclu.
                    </p>
                  )}
                </div>
              </div>
              
              <DialogFooter className="flex-shrink-0 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={editingType ? handleEdit : handleCreate}>
                  {editingType ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Gérez les types de SAV disponibles dans votre magasin
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sidebar className="w-4 h-4" />
                Masquer les types de SAV vides
              </Label>
              <p className="text-xs text-muted-foreground">
                N'afficher dans la barre latérale que les types de SAV ayant au moins 1 SAV en cours
              </p>
            </div>
            <Switch
              checked={settings?.hide_empty_sav_types ?? false}
              onCheckedChange={handleToggleHideEmpty}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          {types.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun type de SAV configuré</p>
            </div>
          ) : (
            types.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: type.type_color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{type.type_label}</span>
                      {type.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Défaut
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Clé: {type.type_key}
                    </p>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center space-x-1 text-xs">
                        <Users className="w-3 h-3" />
                        <span className={type.show_customer_info ? "text-green-600" : "text-red-600"}>
                          {type.show_customer_info ? "Client obligatoire" : "Sans client"}
                        </span>
                      </div>
                      {type.max_processing_days && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{type.max_processing_days}j max</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1 text-xs">
                        <Clock className="w-3 h-3" />
                        <span className={type.pause_timer ? "text-orange-600" : "text-green-600"}>
                          {type.pause_timer ? "Timer suspendu" : "Timer actif"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs">
                        <Sidebar className="w-3 h-3" />
                        <span className={type.show_in_sidebar ? "text-green-600" : "text-muted-foreground"}>
                          {type.show_in_sidebar ? "Visible sidebar" : "Masqué sidebar"}
                        </span>
                      </div>
                      {type.exclude_purchase_costs && (
                        <div className="flex items-center space-x-1 text-xs">
                          <TrendingDown className="w-3 h-3" />
                          <span className="text-orange-600">
                            Coûts exclus
                          </span>
                        </div>
                      )}
                      {type.exclude_sales_revenue && (
                        <div className="flex items-center space-x-1 text-xs">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-orange-600">
                            Revenus exclus
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(type)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  {!type.is_default && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le type de SAV</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer le type "{type.type_label}" ?
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(type)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Types de SAV :</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Les types par défaut ne peuvent pas être supprimés</li>
                <li>La clé d'un type ne peut pas être modifiée après création</li>
                <li>Les couleurs sont utilisées dans l'interface pour identifier visuellement les types</li>
                <li>L'ordre d'affichage peut être modifié en réorganisant les types</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}