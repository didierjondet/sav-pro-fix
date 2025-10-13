import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useSMS } from '@/hooks/useSMS';
import { useLimitDialogContext } from '@/contexts/LimitDialogContext';
import { generateShortTrackingUrl } from '@/utils/trackingUtils';
import { supabase } from '@/integrations/supabase/client';
import { AITextReformulator } from '@/components/sav/AITextReformulator';
import { useShop } from '@/hooks/useShop';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  const [trackingSlug, setTrackingSlug] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [smsType, setSmsType] = useState<'status' | 'review' | 'custom'>('status');
  const { sendSMS, sendSAVNotification, sendQuoteNotification, sendReviewRequestSMS, loading } = useSMS();
  const { checkAndShowLimitDialog } = useLimitDialogContext();
  const { shop } = useShop();

  // Mettre à jour le message quand le type change
  useEffect(() => {
    if (isOpen) {
      setCustomMessage(getDefaultMessage());
    }
  }, [smsType, isOpen, trackingSlug, shop]);

  // Récupérer le tracking_slug si c'est un SAV
  useEffect(() => {
    if (caseId) {
      const fetchTrackingSlug = async () => {
        const { data } = await supabase
          .from('sav_cases')
          .select('tracking_slug')
          .eq('id', caseId)
          .single();
        
        if (data?.tracking_slug) {
          setTrackingSlug(data.tracking_slug);
        }
      };
      fetchTrackingSlug();
    }
  }, [caseId]);

  const handleOpenDialog = async () => {
    // Vérifier les limites SMS dès l'ouverture
    if (!checkAndShowLimitDialog('sms')) {
      return; // Limite atteinte, le dialog de limite s'affichera
    }
    
    // Si pas de limite, ouvrir le dialog de composition SMS
    setIsOpen(true);
  };

  const handleSendSMS = async () => {
    if (!customPhone.trim() || sending || loading) return;

    setSending(true);
    let success = false;

    try {
      if (smsType === 'review') {
        // Envoi d'une demande d'avis Google avec le message personnalisable
        if (!shop?.review_link) {
          setSending(false);
          return;
        }
        success = await sendReviewRequestSMS(
          customPhone,
          customerName || 'Client',
          caseNumber || '',
          shop.review_link,
          customMessage.trim(),
          caseId
        );
      } else if (smsType === 'status' && caseNumber && caseId) {
        // Notification SAV avec message personnalisable
        success = await sendSMS({
          toNumber: customPhone,
          message: customMessage.trim(),
          type: 'sav_notification',
          recordId: caseId,
        });
      } else if (smsType === 'custom' && customMessage.trim()) {
        // Message personnalisé
        const shortUrl = trackingSlug ? generateShortTrackingUrl(trackingSlug) : '';
        let smsWarning = "\n\n⚠️ Ne répondez pas à ce SMS.";
        if (shortUrl) {
          smsWarning += ` Pour échanger avec nous, consultez votre SAV : ${shortUrl}`;
        } else {
          smsWarning += " Contactez-nous directement pour toute question.";
        }
        const messageWithWarning = customMessage + smsWarning;
        
        success = await sendSMS({
          toNumber: customPhone,
          message: messageWithWarning,
          type: 'manual',
          recordId: caseId,
        });
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
        setSmsType('status');
      }
    } finally {
      setSending(false);
    }
  };

  const handleAIReformulation = (reformulatedText: string) => {
    setCustomMessage(reformulatedText);
  };

  const getDefaultMessage = () => {
    const shortUrl = trackingSlug ? generateShortTrackingUrl(trackingSlug) : '';
    
    if (smsType === 'review' && shop) {
      const defaultReviewMsg = shop.custom_review_sms_message || 
        `Bonjour ${customerName}, votre réparation ${caseNumber} est terminée ! 🎉\n\nSi vous êtes satisfait(e), laissez-nous un avis : ${shop.review_link}\n\nMerci pour votre confiance ! ⭐\n${shop.name}`;
      return defaultReviewMsg
        .replace('{customer_name}', customerName || 'Client')
        .replace('{case_number}', caseNumber || '')
        .replace('{review_link}', shop.review_link || '')
        .replace('{shop_name}', shop.name || '');
    }
    
    if (smsType === 'status' && shop && caseNumber) {
      const defaultStatusMsg = (shop as any).custom_status_sms_message || 
        `Bonjour ${customerName || 'Client'}, votre dossier SAV ${caseNumber} a été mis à jour. ⚠️ Ne répondez pas à ce SMS. Pour échanger avec nous, consultez votre SAV : ${shortUrl}`;
      return defaultStatusMsg
        .replace('{customer_name}', customerName || 'Client')
        .replace('{case_number}', caseNumber || '')
        .replace('{tracking_url}', shortUrl);
    }
    
    if (caseNumber && shortUrl) {
      return `Bonjour ${customerName || 'Client'}, votre dossier SAV ${caseNumber} a été mis à jour. ⚠️ Ne répondez pas à ce SMS. Pour échanger avec nous, consultez votre SAV : ${shortUrl}`;
    }
    if (quoteNumber) {
      return `Bonjour ${customerName || 'Client'}, votre devis ${quoteNumber} est prêt ! Consultez-le en ligne ou contactez-nous.`;
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
        <Button variant={variant} size={size} disabled={disabled} onClick={handleOpenDialog}>
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
            <div>
              <Label>Type de SMS</Label>
              <RadioGroup value={smsType} onValueChange={(value: any) => setSmsType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="status" id="status" />
                  <Label htmlFor="status" className="font-normal cursor-pointer">
                    📱 Notification de statut
                  </Label>
                </div>
                {shop?.review_link && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="review" id="review" />
                    <Label htmlFor="review" className="font-normal cursor-pointer">
                      ⭐ Demande d'avis Google
                    </Label>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-normal cursor-pointer">
                    ✍️ Message personnalisé
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div>
            <Label htmlFor="message">Message</Label>
            <div className="relative">
              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Tapez votre message ici..."
                rows={6}
                className="pr-12"
              />
              <div className="absolute right-2 top-2">
                <AITextReformulator
                  text={customMessage}
                  context="sms_message"
                  onReformulated={handleAIReformulation}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {customMessage.length}/160 caractères
              {smsType !== 'custom' && ' (modifiable)'}
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
            disabled={loading || sending || !customPhone.trim() || !customMessage.trim() || (smsType === 'review' && !shop?.review_link)}
          >
            {loading || sending ? 'Envoi...' : 'Envoyer SMS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}