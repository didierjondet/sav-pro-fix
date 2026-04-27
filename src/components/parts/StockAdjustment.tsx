import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from "@/components/ui/number-input";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Part } from '@/hooks/useParts';
import { Plus, Minus } from 'lucide-react';

interface StockAdjustmentProps {
  part: Part;
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (partId: string, adjustment: number, reason?: string) => Promise<{ error: any }>;
}

export function StockAdjustment({ part, isOpen, onClose, onAdjust }: StockAdjustmentProps) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');

  // 🛡️ PROTECTION 4: Calculer les quantités
  const reservedQty = part.reserved_quantity || 0;
  const availableStock = part.quantity - reservedQty;
  const maxRemovable = availableStock;

  const handleSubmit = async () => {
    if (quantity <= 0) return;
    
    const adjustment = adjustmentType === 'add' ? quantity : -quantity;
    
    // 🛡️ Vérification avant envoi
    if (adjustmentType === 'remove' && quantity > maxRemovable) {
      return; // Déjà bloqué par l'UI mais sécurité supplémentaire
    }
    
    setLoading(true);
    try {
      const { error } = await onAdjust(part.id, adjustment, reason);
      if (!error) {
        setQuantity(1);
        setReason('');
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuster le stock - {part.name}</DialogTitle>
          <DialogDescription>
            <div className="space-y-1">
              <div>Stock total: <strong>{part.quantity}</strong> unité(s)</div>
              {reservedQty > 0 && (
                <>
                  <div className="text-orange-600">
                    Réservé par SAV: <strong>{reservedQty}</strong> unité(s)
                  </div>
                  <div className="text-green-600">
                    Stock disponible: <strong>{availableStock}</strong> unité(s)
                  </div>
                </>
              )}
              {part.reference && <div>Réf: {part.reference}</div>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={adjustmentType === 'add' ? 'default' : 'outline'}
              onClick={() => setAdjustmentType('add')}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
            <Button
              type="button"
              variant={adjustmentType === 'remove' ? 'default' : 'outline'}
              onClick={() => setAdjustmentType('remove')}
              className="flex-1"
            >
              <Minus className="h-4 w-4 mr-2" />
              Retirer
            </Button>
          </div>

          <div>
            <Label htmlFor="quantity">Quantité</Label>
            <NumberInput
              id="quantity"
              
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="1"
            />
          </div>

          <div>
            <Label htmlFor="reason">Motif (optionnel)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Réception stock, Défaut de fabrication, Utilisation SAV..."
              rows={3}
            />
          </div>

          {adjustmentType === 'remove' && quantity > maxRemovable && (
            <div className="bg-destructive/10 border border-destructive p-3 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Impossible de retirer {quantity} pièce(s). Maximum disponible: {maxRemovable}
              </p>
            </div>
          )}

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Nouveau stock total: </span>
              {adjustmentType === 'add' 
                ? part.quantity + quantity 
                : Math.max(0, part.quantity - quantity)
              } unité(s)
            </p>
            {reservedQty > 0 && (
              <p className="text-sm text-orange-600 mt-1">
                <span className="font-medium">Stock disponible après: </span>
                {adjustmentType === 'add' 
                  ? availableStock + quantity 
                  : Math.max(0, availableStock - quantity)
                } unité(s)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              loading || 
              quantity <= 0 || 
              (adjustmentType === 'remove' && quantity > maxRemovable)
            }
          >
            {loading ? 'Ajustement...' : `${adjustmentType === 'add' ? 'Ajouter' : 'Retirer'} ${quantity}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}