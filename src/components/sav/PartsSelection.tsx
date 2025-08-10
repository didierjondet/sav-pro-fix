import { useState } from 'react';
import { multiWordSearch } from '@/utils/searchUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Search, AlertTriangle } from 'lucide-react';
import { Part, useParts } from '@/hooks/useParts';
import { useNotifications } from '@/hooks/useNotifications';
import { useOrders } from '@/hooks/useOrders';
import { FileUpload } from '@/components/parts/FileUpload';

interface SelectedPart {
  part_id: string;
  part_name: string;
  part_reference?: string;
  quantity: number;
  time_minutes: number;
  unit_price: number;
  available_stock: number;
  attachments?: string[];
}

interface PartsSelectionProps {
  selectedParts: SelectedPart[];
  onPartsChange: (parts: SelectedPart[]) => void;
  savCaseId?: string;
}

export function PartsSelection({ selectedParts, onPartsChange, savCaseId }: PartsSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showStockWarnings, setShowStockWarnings] = useState<string[]>([]);
  
  const { parts } = useParts();
  const { createStockAlert } = useNotifications();
  const { addToOrder } = useOrders();

  const filteredParts = parts.filter(part =>
    multiWordSearch(searchTerm, part.name, part.reference)
  );

  const addPart = (part: Part) => {
    const existingPart = selectedParts.find(p => p.part_id === part.id);
    
    if (existingPart) {
      // Increment quantity
      const updatedParts = selectedParts.map(p =>
        p.part_id === part.id ? { ...p, quantity: p.quantity + 1 } : p
      );
      onPartsChange(updatedParts);
    } else {
      // Add new part
      const newPart: SelectedPart = {
        part_id: part.id,
        part_name: part.name,
        part_reference: part.reference,
        quantity: 1,
        time_minutes: 0,
        unit_price: part.selling_price || 0,
        available_stock: part.quantity,
        attachments: [],
      };
      onPartsChange([...selectedParts, newPart]);
    }

    // Check stock and create alerts if needed
    checkStockAndCreateAlerts(part);
    setSearchTerm('');
  };

  const checkStockAndCreateAlerts = async (part: Part) => {
    const selectedPart = selectedParts.find(p => p.part_id === part.id);
    const totalQuantityNeeded = (selectedPart?.quantity || 0) + 1;

    if (part.quantity === 0 || part.quantity < totalQuantityNeeded) {
      // Create notification alert
      await createStockAlert(part.id, part.name, savCaseId);
      
      // Add to orders if stock is zero
      if (part.quantity === 0) {
        await addToOrder({
          part_id: part.id,
          part_name: part.name,
          part_reference: part.reference,
          quantity_needed: totalQuantityNeeded - part.quantity,
          sav_case_id: savCaseId,
          reason: 'sav_stock_zero',
          priority: 'high'
        });
      }

      // Show warning in UI
      if (!showStockWarnings.includes(part.id)) {
        setShowStockWarnings([...showStockWarnings, part.id]);
      }
    }
  };

  const removePart = (partId: string) => {
    const updatedParts = selectedParts.filter(p => p.part_id !== partId);
    onPartsChange(updatedParts);
    setShowStockWarnings(showStockWarnings.filter(id => id !== partId));
  };

  const updatePart = (partId: string, field: keyof SelectedPart, value: string | number | string[]) => {
    const updatedParts = selectedParts.map(part =>
      part.part_id === partId ? { ...part, [field]: value } : part
    );
    onPartsChange(updatedParts);
  };

  const getStockStatus = (part: SelectedPart) => {
    if (part.available_stock === 0) {
      return { color: 'destructive' as const, text: 'Rupture' };
    } else if (part.quantity > part.available_stock) {
      return { color: 'destructive' as const, text: 'Insuffisant' };
    } else if (part.available_stock <= 5) {
      return { color: 'default' as const, text: 'Stock faible' };
    }
    return { color: 'default' as const, text: 'En stock' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pièces détachées</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche de pièces */}
        <div>
          <Label htmlFor="part-search">Rechercher une pièce</Label>
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
                <p className="p-3 text-sm text-muted-foreground">Aucune pièce trouvée</p>
              ) : (
                filteredParts.slice(0, 10).map((part) => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                    onClick={() => addPart(part)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{part.name}</div>
                      {part.reference && (
                        <div className="text-sm text-muted-foreground">Réf: {part.reference}</div>
                      )}
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

        <Separator />

        {/* Pièces sélectionnées */}
        <div>
          <h4 className="font-medium mb-3">Pièces sélectionnées</h4>
          {selectedParts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune pièce sélectionnée. Utilisez la recherche ci-dessus pour ajouter des pièces.
            </p>
          ) : (
            <div className="space-y-4">
              {selectedParts.map((part, index) => {
                const stockStatus = getStockStatus(part);
                const hasStockWarning = showStockWarnings.includes(part.part_id);
                
                return (
                  <div key={part.part_id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{part.part_name}</div>
                          {part.part_reference && (
                            <div className="text-sm text-muted-foreground">Réf: {part.part_reference}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={stockStatus.color}>
                            {stockStatus.text}
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removePart(part.part_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {hasStockWarning && (
                        <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-md">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">
                            {part.available_stock === 0 
                              ? 'Pièce en rupture de stock - commande automatiquement ajoutée'
                              : 'Stock insuffisant - vérifiez la disponibilité'
                            }
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`quantity-${part.part_id}`}>Quantité</Label>
                          <Input
                            id={`quantity-${part.part_id}`}
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => updatePart(part.part_id, 'quantity', parseInt(e.target.value) || 1)}
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            Stock disponible: {part.available_stock}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`time-${part.part_id}`}>Temps (minutes)</Label>
                          <Input
                            id={`time-${part.part_id}`}
                            type="number"
                            min="0"
                            value={part.time_minutes}
                            onChange={(e) => updatePart(part.part_id, 'time_minutes', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`price-${part.part_id}`}>Prix unitaire (€)</Label>
                          <Input
                            id={`price-${part.part_id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={part.unit_price}
                            onChange={(e) => updatePart(part.part_id, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      {/* Section pour les fichiers joints */}
                      <div className="mt-4">
                        <FileUpload
                          files={part.attachments || []}
                          onFilesChange={(files) => updatePart(part.part_id, 'attachments', files)}
                          partId={part.part_id}
                          label="Fichiers joints (photos, PDF)"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Résumé */}
        {selectedParts.length > 0 && (
          <>
            <Separator />
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total pièces: </span>
                  <span>{selectedParts.reduce((acc, part) => acc + part.quantity, 0)}</span>
                </div>
                <div>
                  <span className="font-medium">Temps total: </span>
                  <span>{selectedParts.reduce((acc, part) => acc + part.time_minutes, 0)} min</span>
                </div>
                <div>
                  <span className="font-medium">Coût total: </span>
                  <span className="font-bold">
                    {selectedParts.reduce((acc, part) => acc + (part.quantity * part.unit_price), 0).toFixed(2)}€
                  </span>
                </div>
                <div>
                  <span className="font-medium">Pièces en rupture: </span>
                  <span className="text-destructive font-bold">
                    {showStockWarnings.length}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}