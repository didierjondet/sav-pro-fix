import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send } from 'lucide-react';

interface SendSMSButtonProps {
  recipientPhone?: string;
  recipientName?: string;
  type: 'quote' | 'sav';
  recordId: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function SendSMSButton({ 
  recipientPhone = '', 
  recipientName = '', 
  type, 
  recordId, 
  variant = 'outline',
  size = 'sm',
  className 
}: SendSMSButtonProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(recipientPhone);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSendSMS = async () => {
    if (!phone.trim() || !message.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le numéro de téléphone et le message",
        variant: "destructive",
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
        description: `SMS envoyé avec succès à ${phone}`,
      });

      setOpen(false);
      setMessage('');
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

  const generateDefaultMessage = () => {
    if (type === 'quote') {
      return `Bonjour ${recipientName || 'Madame/Monsieur'}, votre devis est prêt. Vous pouvez le consulter sur notre site. Cordialement.`;
    } else if (type === 'sav') {
      return `Bonjour ${recipientName || 'Madame/Monsieur'}, votre appareil est prêt à être récupéré. Cordialement.`;
    }
    return '';
  };

  const handleOpenDialog = () => {
    if (!message) {
      setMessage(generateDefaultMessage());
    }
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          onClick={handleOpenDialog}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Envoyer SMS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer un SMS</DialogTitle>
        </DialogHeader>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSendSMS} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}