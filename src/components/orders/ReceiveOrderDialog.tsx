import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderItemWithPart } from '@/hooks/useOrders';
import { AlertTriangle } from 'lucide-react';

interface ReceiveOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantityReceived: number) => void;
  onCancelOrder?: (itemId: string) => void;
  orderItem: OrderItemWithPart | null;
}

export function ReceiveOrderDialog({ isOpen, onClose, onConfirm, onCancelOrder, orderItem }: ReceiveOrderDialogProps) {
  const [quantityReceived, setQuantityReceived] = useState<number>(0);

  // Initialiser la quantité avec la quantité commandée quand le dialog s'ouvre
  useEffect(() => {
    if (orderItem) {
      setQuantityReceived(orderItem.quantity_needed);
    }
  }, [orderItem]);

  const handleConfirm = () => {
    if (quantityReceived > 0) {
      onConfirm(quantityReceived);
      setQuantityReceived(0);
      onClose();
    }
  };

  const handleCancelOrder = () => {
    if (orderItem && onCancelOrder) {
      onCancelOrder(orderItem.id);
      onClose();
    }
  };

  const handleClose = () => {
    if (orderItem) {
      setQuantityReceived(orderItem.quantity_needed);
    }
    onClose();
  };

  if (!orderItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Réception de la commande</DialogTitle>
          <DialogDescription>
            Confirmez la quantité reçue pour "{orderItem.part_name}" ou annulez cette commande
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Pièce commandée</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{orderItem.part_name}</div>
              {orderItem.part_reference && (
                <div className="text-sm text-muted-foreground">
                  Référence : {orderItem.part_reference}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Quantité commandée : {orderItem.quantity_needed}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité reçue *</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantityReceived}
              onChange={(e) => setQuantityReceived(parseInt(e.target.value) || 0)}
              placeholder="Entrez la quantité reçue"
            />
            <div className="text-xs text-muted-foreground">
              Vous pouvez recevoir une quantité différente de celle commandée
            </div>
          </div>

          {orderItem.sav_case_id && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">SAV lié</span>
              </div>
              <div className="text-blue-700 text-sm mt-1">
                Cette commande est liée à un dossier SAV. L'annulation libérera les pièces réservées.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2 order-2 sm:order-1">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="flex-1 sm:flex-none"
            >
              Fermer
            </Button>
            {onCancelOrder && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleCancelOrder}
                className="flex-1 sm:flex-none"
              >
                Annuler commande
              </Button>
            )}
          </div>
          
          <Button 
            type="button" 
            onClick={handleConfirm}
            disabled={quantityReceived < 0}
            className="order-1 sm:order-2"
          >
            Valider réception ({quantityReceived} pièce{quantityReceived > 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}