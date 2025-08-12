import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useSMS } from '@/hooks/useSMS';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface SMSButtonProps {
  customerPhone?: string;
  customerName?: string;
  caseNumber?: string;
  caseId?: string;
  quoteNumber?: string;
  quoteId?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SMSButton({
  customerPhone,
  customerName,
  caseNumber,
  caseId,
  quoteNumber,
  quoteId,
  disabled = false,
  variant = 'outline',
  size = 'sm'
}: SMSButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customPhone, setCustomPhone] = useState(customerPhone || '');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const { sendSMS, sendSAVNotification, sendQuoteNotification, loading } = useSMS();
  const { checkLimits } = useSubscription();

  const handleSendSMS = async () => {
    if (!customPhone.trim()) return;

    // Vérifier les limites SMS avant envoi
    const smsLimits = checkLimits('sms');
    if (!smsLimits.allowed) {
      // Rediriger vers les paramètres avec l'onglet SMS si plus de crédits
      if (smsLimits.action === 'buy_sms_package') {
        window.location.href = '/settings?tab=sms&reason=no_credits';
        return;
      }
    }

    let success = false;

    if (useCustomMessage && customMessage.trim()) {
      // Envoi d'un message personnalisé
      success = await sendSMS({
        toNumber: customPhone,
        message: customMessage,
        type: 'manual',
        recordId: caseId, // Passer l'ID du SAV pour l'archivage
      });
    } else if (caseNumber && caseId) {
      // Notification SAV automatique
      success = await sendSAVNotification(
        customPhone,
        customerName || 'Client',
        caseNumber,
        'in_progress', // Statut par défaut
        caseId
      );
    } else if (quoteNumber && quoteId) {
      // Notification devis automatique
      success = await sendQuoteNotification(
        customPhone,
        customerName || 'Client',
        quoteNumber,
        quoteId
      );
    }

    if (success) {
      setIsOpen(false);
      setCustomMessage('');
      setUseCustomMessage(false);
    }
  };

  const getDefaultMessage = () => {
    if (caseNumber) {
      return `Bonjour ${customerName || 'Client'}, nous vous informons que votre dossier SAV ${caseNumber} a été mis à jour. Nous vous tiendrons informé de l'avancement.`;
    }
    if (quoteNumber) {
      return `Bonjour ${customerName || 'Client'}, votre devis ${quoteNumber} est prêt ! Consultez-le en ligne ou contactez-nous pour plus d'informations.`;
    }
    return '';
  };

  if (!customerPhone && !customPhone) {
    return (
      <Button variant={variant} size={size} disabled>
        <MessageSquare className="h-4 w-4" />
        Pas de téléphone
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Envoyer SMS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Envoyer un SMS</DialogTitle>
          <DialogDescription>
            {caseNumber && `Envoyer une notification SMS pour le dossier ${caseNumber}`}
            {quoteNumber && `Envoyer une notification SMS pour le devis ${quoteNumber}`}
            {!caseNumber && !quoteNumber && 'Envoyer un SMS personnalisé'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="+33123456789"
            />
          </div>

          {(caseNumber || quoteNumber) && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="custom-message"
                checked={useCustomMessage}
                onChange={(e) => setUseCustomMessage(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="custom-message">Utiliser un message personnalisé</Label>
            </div>
          )}

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={useCustomMessage ? customMessage : getDefaultMessage()}
              onChange={(e) => {
                if (useCustomMessage) {
                  setCustomMessage(e.target.value);
                }
              }}
              placeholder="Tapez votre message ici..."
              rows={4}
              disabled={!useCustomMessage && !!(caseNumber || quoteNumber)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {useCustomMessage || (!caseNumber && !quoteNumber) 
                ? `${customMessage.length}/160 caractères`
                : 'Message automatique généré'
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSendSMS}
            disabled={loading || !customPhone.trim() || (useCustomMessage && !customMessage.trim())}
          >
            {loading ? 'Envoi...' : 'Envoyer SMS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}