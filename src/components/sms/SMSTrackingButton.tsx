import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, AlertTriangle, CreditCard } from 'lucide-react';

interface SMSTrackingButtonProps {
  recipientPhone?: string;
  recipientName?: string;
  trackingUrl: string;
  type: 'tracking' | 'status_change';
  recordId: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onSMSSent?: () => void;
}

export function SMSTrackingButton({ 
  recipientPhone = '', 
  recipientName = '', 
  trackingUrl,
  type,
  recordId, 
  variant = 'outline',
  size = 'sm',
  className,
  onSMSSent
}: SMSTrackingButtonProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(recipientPhone);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { subscription, checkLimits } = useSubscription();

  const generateDefaultMessage = () => {
    const name = recipientName || 'Madame/Monsieur';
    if (type === 'tracking') {
      return `Bonjour ${name}, vous pouvez suivre l'état de votre réparation ici : ${trackingUrl} Cordialement.`;
    } else {
      return `Bonjour ${name}, votre dossier de réparation a été mis à jour. Consultez le suivi : ${trackingUrl} Cordialement.`;
    }
  };

  const handleSendSMS = async () => {
    if (!phone.trim() || !message.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le numéro de téléphone et le message",
        variant: "destructive",
      });
      return;
    }

    // Vérifier les limites SMS
    const limits = checkLimits('sms');
    if (!limits.allowed) {
      toast({
        title: "Crédits SMS insuffisants",
        description: limits.reason,
        variant: "destructive",
        action: (
          <Button 
            size="sm" 
            onClick={() => window.location.href = '/settings?tab=sms'}
            className="ml-2"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Acheter des SMS
          </Button>
        ),
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phone,
          message: message,
          type: type,
          recordId: recordId
        }
      });

      if (error) throw error;

      toast({
        title: "SMS envoyé",
        description: `SMS de suivi envoyé avec succès à ${phone}`,
      });

      setOpen(false);
      setMessage('');
      onSMSSent?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le SMS",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleOpenDialog = () => {
    if (!message) {
      setMessage(generateDefaultMessage());
    }
    setOpen(true);
  };

  // Vérifier les crédits avant d'ouvrir le dialog
  const limits = checkLimits('sms');
  const hasCredits = limits.allowed;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          onClick={hasCredits ? handleOpenDialog : () => {
            toast({
              title: "Crédits SMS insuffisants",
              description: limits.reason,
              variant: "destructive",
              action: (
                <Button 
                  size="sm" 
                  onClick={() => window.location.href = '/settings?tab=sms'}
                  className="ml-2"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Acheter
                </Button>
              ),
            });
          }}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {type === 'tracking' ? 'Envoyer lien de suivi' : 'SMS notification'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'tracking' ? 'Envoyer le lien de suivi par SMS' : 'Notifier le client par SMS'}
          </DialogTitle>
        </DialogHeader>
        
        {!hasCredits && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-orange-700">
              {limits.reason}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33612345678"
            />
          </div>
          
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message..."
              rows={4}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/160 caractères
            </p>
          </div>

          {subscription && (
            <div className="text-xs text-muted-foreground">
              SMS restants ce mois : {subscription.sms_credits_allocated - subscription.sms_credits_used}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSendSMS} disabled={sending || !hasCredits}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Envoi...' : 'Envoyer SMS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}