import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

interface PrintConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  savCaseNumber: string;
}

export function PrintConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel, 
  savCaseNumber 
}: PrintConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Impression du dossier SAV
          </DialogTitle>
          <DialogDescription>
            Le dossier SAV <span className="font-semibold">{savCaseNumber}</span> a été créé avec succès.
            <br />
            Souhaitez-vous l'imprimer maintenant ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Non, merci
          </Button>
          <Button onClick={handleConfirm}>
            <Printer className="h-4 w-4 mr-2" />
            Oui, imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}