import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderItemWithPart } from '@/hooks/useOrders';

interface ReceiveOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantityReceived: number) => void;
  orderItem: OrderItemWithPart | null;
}

export function ReceiveOrderDialog({ isOpen, onClose, onConfirm, orderItem }: ReceiveOrderDialogProps) {
  const [quantityReceived, setQuantityReceived] = useState<number>(0);

  const handleConfirm = () => {
    if (quantityReceived > 0 && quantityReceived <= (orderItem?.quantity_needed || 0)) {
      onConfirm(quantityReceived);
      setQuantityReceived(0);
      onClose();
    }
  };

  const handleClose = () => {
    setQuantityReceived(0);
    onClose();
  };

  // Initialiser la quantité avec la quantité commandée quand le dialog s'ouvre
  useState(() => {
    if (orderItem) {
      setQuantityReceived(orderItem.quantity_needed);
    }
  });

  if (!orderItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Valider la réception</DialogTitle>
          <DialogDescription>
            Confirmez la quantité de pièces reçue pour "{orderItem.part_name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité commandée : {orderItem.quantity_needed}</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité reçue</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={orderItem.quantity_needed}
              value={quantityReceived}
              onChange={(e) => setQuantityReceived(parseInt(e.target.value) || 0)}
              placeholder="Entrez la quantité reçue"
            />
          </div>
          
          {orderItem.part_reference && (
            <div className="text-sm text-muted-foreground">
              Référence : {orderItem.part_reference}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm}
            disabled={quantityReceived <= 0 || quantityReceived > orderItem.quantity_needed}
          >
            Valider la réception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}