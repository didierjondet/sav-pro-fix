import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const handleSubmit = async () => {
    if (quantity <= 0) return;
    
    setLoading(true);
    try {
      const adjustment = adjustmentType === 'add' ? quantity : -quantity;
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
            Stock actuel: {part.quantity} unité(s)
            {part.reference && ` • Réf: ${part.reference}`}
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
            <Input
              id="quantity"
              type="number"
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

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Nouveau stock: </span>
              {adjustmentType === 'add' 
                ? part.quantity + quantity 
                : Math.max(0, part.quantity - quantity)
              } unité(s)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || quantity <= 0}>
            {loading ? 'Ajustement...' : `${adjustmentType === 'add' ? 'Ajouter' : 'Retirer'} ${quantity}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}