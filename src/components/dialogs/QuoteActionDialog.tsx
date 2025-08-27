import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, X, FileText } from 'lucide-react';

interface QuoteActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  onSendSMS: () => void;
  onSkip: () => void;
  onConvertToSAV: () => void;
  quoteNumber: string;
  hasPhone: boolean;
}

export function QuoteActionDialog({ 
  isOpen, 
  onClose, 
  onPrint, 
  onSendSMS,
  onSkip,
  onConvertToSAV,
  quoteNumber,
  hasPhone
}: QuoteActionDialogProps) {
  const handlePrint = () => {
    onPrint();
    onClose();
  };

  const handleSendSMS = () => {
    onSendSMS();
    onClose();
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  const handleConvertToSAV = () => {
    onConvertToSAV();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Devis créé
          </DialogTitle>
          <DialogDescription>
            Le devis <span className="font-semibold">{quoteNumber}</span> a été créé avec succès.
            <br />
            Que souhaitez-vous faire maintenant ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-3 sm:gap-2">
          <div className="flex flex-col gap-2 w-full">
            <Button onClick={handlePrint} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer le devis
            </Button>
            {hasPhone && (
              <Button onClick={handleSendSMS} variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Envoyer le PDF par SMS
              </Button>
            )}
            <Button onClick={handleConvertToSAV} variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Convertir en SAV
            </Button>
          </div>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Passer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}