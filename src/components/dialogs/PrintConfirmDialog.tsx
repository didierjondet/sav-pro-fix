import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, MessageSquare, AlertTriangle } from 'lucide-react';
import { useSMS } from '@/hooks/useSMS';
import { generateShortTrackingUrl } from '@/utils/trackingUtils';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useShopSettings } from '@/hooks/useShopSettings';
import { Checkbox } from '@/components/ui/checkbox';

interface PrintConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  savCaseNumber: string;
  savCase?: any; // Ajouter les données complètes du SAV
}

export function PrintConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel, 
  savCaseNumber,
  savCase 
}: PrintConfirmDialogProps) {
  const [sendingSMS, setSendingSMS] = useState(false);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const { sendSMS } = useSMS();
  const { toast } = useToast();
  const { settings } = useShopSettings();

  const handleConfirm = () => {
    if (settings?.sav_warning_enabled && !warningAcknowledged) {
      toast({
        title: "Vérification requise",
        description: "Veuillez confirmer que vous avez effectué les vérifications nécessaires",
        variant: "destructive",
      });
      return;
    }
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  const handleSendSMS = async () => {
    if (settings?.sav_warning_enabled && !warningAcknowledged) {
      toast({
        title: "Vérification requise",
        description: "Veuillez confirmer que vous avez effectué les vérifications nécessaires",
        variant: "destructive",
      });
      return;
    }

    if (!savCase?.customer?.phone || !savCase?.tracking_slug) {
      toast({
        title: "Impossible d'envoyer le SMS",
        description: "Numéro de téléphone ou lien de suivi manquant",
        variant: "destructive",
      });
      return;
    }

    setSendingSMS(true);
    try {
      const trackingUrl = generateShortTrackingUrl(savCase.tracking_slug);
      const customerName = `${savCase.customer.first_name} ${savCase.customer.last_name}`.trim();
      
      const message = `Bonjour ${customerName}, votre dossier SAV ${savCaseNumber} a été créé. Suivez son évolution : ${trackingUrl}`;
      
      const success = await sendSMS({
        toNumber: savCase.customer.phone,
        message,
        type: 'sav_notification',
        recordId: savCase.id
      });

      if (success) {
        toast({
          title: "SMS envoyé",
          description: "Le lien de suivi a été envoyé par SMS",
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du SMS:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le SMS",
        variant: "destructive",
      });
    } finally {
      setSendingSMS(false);
    }
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

        {settings?.sav_warning_enabled && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Vérifications importantes
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  Avez-vous bien déconnecté l'iCloud ou les comptes Gmail/Samsung/etc... et/ou pris le code de déverrouillage ?
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="warning-acknowledgment"
                    checked={warningAcknowledged}
                    onCheckedChange={(checked) => setWarningAcknowledged(checked === true)}
                  />
                  <label 
                    htmlFor="warning-acknowledgment" 
                    className="text-sm font-medium text-amber-800 dark:text-amber-200 cursor-pointer"
                  >
                    J'ai effectué toutes les vérifications nécessaires
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={handleCancel} className="order-3 sm:order-1">
            <X className="h-4 w-4 mr-2" />
            Non, merci
          </Button>
          
          <div className="flex gap-2 order-1 sm:order-2">
            {savCase?.customer?.phone && savCase?.tracking_slug && (
              <Button 
                variant="secondary" 
                onClick={handleSendSMS}
                disabled={sendingSMS}
                className="flex-1 sm:flex-none"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {sendingSMS ? 'Envoi...' : 'Envoyer SMS'}
              </Button>
            )}
            
            <Button onClick={handleConfirm} className="flex-1 sm:flex-none">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}