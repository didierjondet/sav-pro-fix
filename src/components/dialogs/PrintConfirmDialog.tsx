import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Check, MessageSquare, AlertTriangle } from 'lucide-react';
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
  requireUnlockPattern?: boolean; // Nouveau prop pour exiger le code
  /** @deprecated use hasUnlockMethod */
  hasUnlockPattern?: boolean;
  /** True si un schéma OU un code numérique OU "n'a pas de code" est défini */
  hasUnlockMethod?: boolean;
  /**
   * Si fourni, persiste le SAV avant Imprimer/Valider/SMS.
   * Doit retourner le SAV créé (avec tracking_slug, case_number, customer) ou null en cas d'échec.
   */
  onPersistBeforeAction?: () => Promise<any | null>;
}

export function PrintConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel, 
  savCaseNumber,
  savCase,
  requireUnlockPattern = false,
  hasUnlockPattern = false,
  hasUnlockMethod,
  onPersistBeforeAction,
}: PrintConfirmDialogProps) {
  const [sendingSMS, setSendingSMS] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const { sendSMS } = useSMS();
  const { toast } = useToast();
  const { settings } = useShopSettings();

  // Compatibilité ascendante : si hasUnlockMethod n'est pas fourni, on retombe sur hasUnlockPattern
  const unlockOk = hasUnlockMethod !== undefined ? hasUnlockMethod : hasUnlockPattern;

  const validateBeforeAction = (): boolean => {
    if (requireUnlockPattern && !unlockOk) {
      toast({
        title: "Code de déverrouillage manquant",
        description: "Saisissez un code, un schéma, ou cochez « N'a pas de code ».",
        variant: "destructive",
      });
      return false;
    }
    if (settings?.sav_warning_enabled && !warningAcknowledged) {
      toast({
        title: "Vérification requise",
        description: "Veuillez confirmer que vous avez effectué les vérifications nécessaires",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validateBeforeAction()) return;
    if (onPersistBeforeAction) {
      setPersisting(true);
      try {
        const persisted = await onPersistBeforeAction();
        if (!persisted) {
          setPersisting(false);
          return;
        }
      } finally {
        setPersisting(false);
      }
    }
    onConfirm();
    onClose();
  };

  const handleCancel = async () => {
    if (!validateBeforeAction()) return;
    if (onPersistBeforeAction) {
      setPersisting(true);
      try {
        const persisted = await onPersistBeforeAction();
        if (!persisted) {
          setPersisting(false);
          return;
        }
      } finally {
        setPersisting(false);
      }
    }
    onCancel();
    onClose();
  };

  const handleSendSMS = async () => {
    if (!validateBeforeAction()) return;

    let activeCase = savCase;
    if (onPersistBeforeAction) {
      setPersisting(true);
      try {
        const persisted = await onPersistBeforeAction();
        if (!persisted) {
          setPersisting(false);
          return;
        }
        activeCase = persisted;
      } finally {
        setPersisting(false);
      }
    }

    if (!activeCase?.customer?.phone || !activeCase?.tracking_slug) {
      toast({
        title: "Impossible d'envoyer le SMS",
        description: "Numéro de téléphone ou lien de suivi manquant",
        variant: "destructive",
      });
      return;
    }

    setSendingSMS(true);
    try {
      const trackingUrl = generateShortTrackingUrl(activeCase.tracking_slug);
      const customerName = `${activeCase.customer.first_name} ${activeCase.customer.last_name}`.trim();
      const message = `Bonjour ${customerName}, votre dossier SAV ${activeCase.case_number || savCaseNumber} a été créé. Suivez son évolution : ${trackingUrl}`;
      
      const success = await sendSMS({
        toNumber: activeCase.customer.phone,
        message,
        type: 'sav_notification',
        recordId: activeCase.id
      });

      if (success) {
        toast({
          title: "SMS envoyé",
          description: "Le lien de suivi a été envoyé par SMS",
        });
        onCancel();
        onClose();
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

  // Pour le bouton SMS : on peut afficher si on a déjà un SAV persisté ET le téléphone, OU si on a un onPersistBeforeAction (la persistance se fera au clic)
  const phoneAvailable = !!savCase?.customer?.phone;
  const showSmsButton = phoneAvailable && (savCase?.tracking_slug || !!onPersistBeforeAction);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Validation du dossier SAV
          </DialogTitle>
          <DialogDescription className="text-base">
            {savCaseNumber ? (
              <>Le dossier SAV <span className="font-semibold">{savCaseNumber}</span> a été créé avec succès.<br />Souhaitez-vous l'imprimer maintenant ?</>
            ) : (
              <>Vérifiez les informations puis cliquez sur <strong>Valider</strong>, <strong>Imprimer</strong> ou <strong>Envoyer SMS</strong> pour créer le dossier.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {requireUnlockPattern && !unlockOk && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    ⚠️ Code de déverrouillage manquant
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 break-words">
                    Saisissez un <strong>code numérique</strong>, un <strong>schéma</strong>, ou cochez <strong>« N'a pas de code »</strong> avant de continuer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {settings?.sav_warning_enabled && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Vérifications importantes
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3 break-words">
                    Avez-vous bien déconnecté l'iCloud ou les comptes Gmail/Samsung/etc... et/ou pris le code de déverrouillage ?
                  </p>
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="warning-acknowledgment"
                      checked={warningAcknowledged}
                      onCheckedChange={(checked) => setWarningAcknowledged(checked === true)}
                      className="mt-0.5"
                    />
                    <label 
                      htmlFor="warning-acknowledgment" 
                      className="text-sm font-medium text-amber-800 dark:text-amber-200 cursor-pointer leading-5"
                    >
                      J'ai effectué toutes les vérifications nécessaires
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-3 pt-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {showSmsButton && (
              <Button 
                variant="secondary" 
                onClick={handleSendSMS}
                disabled={sendingSMS || persisting}
                className="w-full sm:flex-1 order-2 sm:order-1"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {sendingSMS ? 'Envoi...' : persisting ? 'Création...' : 'Envoyer SMS'}
              </Button>
            )}
            
            <Button onClick={handleConfirm} disabled={persisting || sendingSMS} className="w-full sm:flex-1 order-1 sm:order-2">
              <Printer className="h-4 w-4 mr-2" />
              {persisting ? 'Création...' : 'Imprimer'}
            </Button>
          </div>
          
          <Button variant="outline" onClick={handleCancel} disabled={persisting || sendingSMS} className="w-full order-3">
            <Check className="h-4 w-4 mr-2" />
            {persisting ? 'Création...' : 'Valider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
