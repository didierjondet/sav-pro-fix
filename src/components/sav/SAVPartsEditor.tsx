import { useState, useEffect, type ReactNode } from 'react';
import { multiWordSearch } from '@/utils/searchUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Search, Edit, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParts } from '@/hooks/useParts';
import { useToast } from '@/hooks/use-toast';

interface SAVPart {
  id: string;
  part_id: string | null;
  part_name: string;
  part_reference?: string;
  quantity: number;
  time_minutes: number;
  unit_price: number; // prix public
  purchase_price?: number; // prix d'achat
  available_stock?: number;
  isCustom: boolean;
}

interface SAVPartsEditorProps {
  savCaseId: string;
  onPartsUpdated: () => void;
  trigger?: ReactNode;
}

export function SAVPartsEditor({ savCaseId, onPartsUpdated, trigger }: SAVPartsEditorProps) {
  const [open, setOpen] = useState(false);
  const [savParts, setSavParts] = useState<SAVPart[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { parts } = useParts();
  const { toast } = useToast();

  // Filtrer les pièces en fonction de la recherche
  const filteredParts = parts.filter(part =>
    multiWordSearch(searchTerm, part.name, part.reference)
  );

  const fetchSAVParts = async () => {
    try {
      // Récupérer les pièces actuelles du dossier SAV avec les infos du stock
      const { data, error } = await supabase
        .from('sav_parts')
        .select(`
          id,
          part_id,
          quantity,
          time_minutes,
          unit_price,
          purchase_price,
          parts(name, reference, quantity, purchase_price)
        `)
        .eq('sav_case_id', savCaseId);

      if (error) throw error;

      const formattedParts: SAVPart[] = data?.map(item => ({
        id: item.id,
        part_id: item.part_id,
        part_name: item.parts?.name || 'Pièce personnalisée',
        part_reference: item.parts?.reference,
        quantity: item.quantity,
        time_minutes: item.time_minutes || 0,
unit_price: item.unit_price || 0,
available_stock: item.parts?.quantity,
purchase_price: item.parts?.purchase_price || 0,
isCustom: !item.part_id
      })) || [];

      setSavParts(formattedParts);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les pièces du dossier SAV",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchSAVParts();
    }
  }, [open, savCaseId]);

  const addPartFromStock = (part: any) => {
    const existingPart = savParts.find(p => p.part_id === part.id && !p.isCustom);
    
    if (existingPart) {
      // Incrémenter la quantité si la pièce existe déjà
      setSavParts(savParts.map(p =>
        p.id === existingPart.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      // Ajouter nouvelle pièce du stock
      const newPart: SAVPart = {
        id: `new-${Date.now()}`,
        part_id: part.id,
        part_name: part.name,
        part_reference: part.reference,
        quantity: 1,
        time_minutes: 0,
unit_price: part.selling_price || 0,
available_stock: part.quantity,
purchase_price: part.purchase_price || 0,
isCustom: false,
      };
      setSavParts([...savParts, newPart]);
    }
    setSearchTerm('');
  };

  const addCustomPart = () => {
    const newPart: SAVPart = {
      id: `new-custom-${Date.now()}`,
      part_id: null,
      part_name: '',
      quantity: 1,
      time_minutes: 0,
      unit_price: 0,
      isCustom: true,
    };
    setSavParts([...savParts, newPart]);
  };

  const removePart = (id: string) => {
    setSavParts(savParts.filter(part => part.id !== id));
  };

  const updatePart = (id: string, field: keyof SAVPart, value: string | number) => {
    setSavParts(savParts.map(part =>
      part.id === id ? { ...part, [field]: value } : part
    ));
  };

  const saveParts = async () => {
    setLoading(true);
    try {
      // Supprimer toutes les pièces existantes du dossier SAV
      const { error: deleteError } = await supabase
        .from('sav_parts')
        .delete()
        .eq('sav_case_id', savCaseId);

      if (deleteError) throw deleteError;

      // Insérer les nouvelles pièces
      if (savParts.length > 0) {
const partsToInsert = savParts.map(part => ({
  sav_case_id: savCaseId,
  part_id: part.part_id,
  quantity: part.quantity,
  time_minutes: part.time_minutes,
  unit_price: part.unit_price,
  purchase_price: part.purchase_price ?? null,
}));

        const { error: insertError } = await supabase
          .from('sav_parts')
          .insert(partsToInsert);

        if (insertError) throw insertError;
      }

      // Calculer et mettre à jour le coût total du dossier SAV
      const totalCost = savParts.reduce((acc, part) => acc + (part.quantity * part.unit_price), 0);
      const totalTime = savParts.reduce((acc, part) => acc + part.time_minutes, 0);

      const { error: updateError } = await supabase
        .from('sav_cases')
        .update({ 
          total_cost: totalCost,
          total_time_minutes: totalTime 
        })
        .eq('id', savCaseId);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "Les pièces ont été mises à jour avec succès",
      });

      setOpen(false);
      onPartsUpdated();
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

  const totalCost = savParts.reduce((acc, part) => acc + (part.quantity * part.unit_price), 0);
  const totalTime = savParts.reduce((acc, part) => acc + part.time_minutes, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Modifier les pièces
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier les pièces du dossier SAV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recherche de pièces en stock */}
          <div>
            <Label htmlFor="part-search">Rechercher une pièce en stock</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="part-search"
                placeholder="Nom ou référence de la pièce..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Résultats de recherche */}
            {searchTerm && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                {filteredParts.length === 0 ? (
                  <div className="p-3">
                    <p className="text-sm text-muted-foreground mb-2">Aucune pièce trouvée en stock</p>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={addCustomPart}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Ajouter "{searchTerm}" comme pièce personnalisée
                    </Button>
                  </div>
                ) : (
                  filteredParts.slice(0, 10).map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                      onClick={() => addPartFromStock(part)}
                    >
                      <div className="flex-1 flex items-center gap-3">
                        {part.photo_url && (
                          <img 
                            src={`${supabase.storage.from('part-photos').getPublicUrl(part.photo_url).data.publicUrl}`} 
                            alt={part.name}
                            className="w-12 h-12 object-cover rounded border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="font-medium">{part.name}</div>
                          {part.reference && (
                            <div className="text-sm text-muted-foreground">Réf: {part.reference}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={part.quantity === 0 ? 'destructive' : part.quantity <= 5 ? 'default' : 'secondary'}>
                          Stock: {part.quantity}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <Button type="button" onClick={addCustomPart} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter pièce personnalisée
            </Button>
          </div>

          <Separator />

          {/* Pièces sélectionnées */}
          <div>
            <h4 className="font-medium mb-3">Pièces du dossier SAV</h4>
            {savParts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucune pièce ajoutée. Utilisez la recherche ci-dessus ou ajoutez une pièce personnalisée.
              </p>
            ) : (
              <div className="space-y-4">
                {savParts.map((part, index) => (
                  <div key={part.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-3">
                           {!part.isCustom && (() => {
                             const stockPart = parts.find(p => p.id === part.part_id);
                             return stockPart?.photo_url && (
                               <img 
                                 src={`${supabase.storage.from('part-photos').getPublicUrl(stockPart.photo_url).data.publicUrl}`} 
                                 alt={part.part_name}
                                 className="w-8 h-8 object-cover rounded"
                                 onError={(e) => {
                                   (e.target as HTMLImageElement).style.display = 'none';
                                 }}
                               />
                             );
                           })()}
                          <div>
                            <div className="flex items-center gap-2">
                              {part.isCustom ? (
                                <Badge variant="outline">Pièce personnalisée</Badge>
                              ) : (
                                <Badge variant="secondary">En stock</Badge>
                              )}
                              {!part.isCustom && part.available_stock !== undefined && (
                                <Badge variant={part.available_stock === 0 ? 'destructive' : part.available_stock <= 5 ? 'default' : 'secondary'}>
                                  Stock: {part.available_stock}
                                </Badge>
                              )}
                            </div>
                            {part.part_reference && (
                              <div className="text-sm text-muted-foreground mt-1">Réf: {part.part_reference}</div>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removePart(part.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
  <div>
    <Label htmlFor={`part-name-${part.id}`}>Nom de la pièce</Label>
    <Input
      id={`part-name-${part.id}`}
      value={part.part_name}
      onChange={(e) => updatePart(part.id, 'part_name', e.target.value)}
      placeholder="Ex: Écran LCD"
      disabled={!part.isCustom}
    />
  </div>
  <div>
    <Label htmlFor={`part-qty-${part.id}`}>Quantité</Label>
    <Input
      id={`part-qty-${part.id}`}
      type="number"
      min="1"
      value={part.quantity}
      onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
    />
    {!part.isCustom && part.available_stock !== undefined && part.quantity > part.available_stock && (
      <div className="text-xs text-destructive mt-1">
        Quantité demandée supérieure au stock
      </div>
    )}
  </div>
  <div>
    <Label htmlFor={`part-time-${part.id}`}>Temps (min)</Label>
    <Input
      id={`part-time-${part.id}`}
      type="number"
      min="0"
      value={part.time_minutes}
      onChange={(e) => updatePart(part.id, 'time_minutes', parseInt(e.target.value) || 0)}
    />
  </div>
  <div>
    <Label htmlFor={`part-price-${part.id}`}>Prix public (€)</Label>
    <Input
      id={`part-price-${part.id}`}
      type="number"
      min="0"
      step="0.01"
      value={part.unit_price}
      onChange={(e) => updatePart(part.id, 'unit_price', parseFloat(e.target.value) || 0)}
    />
  </div>
  <div>
    <Label htmlFor={`part-price-purchase-${part.id}`}>Prix d'achat (€)</Label>
    <Input
      id={`part-price-purchase-${part.id}`}
      type="number"
      min="0"
      step="0.01"
      value={part.purchase_price ?? 0}
      onChange={(e) => updatePart(part.id, 'purchase_price', parseFloat(e.target.value) || 0)}
    />
  </div>
</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Résumé */}
          {savParts.length > 0 && (
            <>
              <Separator />
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total pièces: </span>
                    <span>{savParts.reduce((acc, part) => acc + part.quantity, 0)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Temps total: </span>
                    <span>{totalTime} min</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Coût total: </span>
                    <span className="font-bold text-lg">
                      {totalCost.toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={saveParts} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}