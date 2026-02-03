import { useState } from 'react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, Send, MessageSquare, Phone, CalendarPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAppointments } from '@/hooks/useAppointments';
import { useSMS } from '@/hooks/useSMS';
import { useWorkingHours } from '@/hooks/useWorkingHours';
import { supabase } from '@/integrations/supabase/client';
import { AITextReformulator } from '@/components/sav/AITextReformulator';
import type { Database } from '@/integrations/supabase/types';

type AppointmentType = Database['public']['Enums']['appointment_type'];

interface AppointmentProposalDialogProps {
  savCaseId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  caseNumber: string;
  deviceInfo?: {
    brand?: string;
    model?: string;
  };
  trigger?: React.ReactNode;
}

export function AppointmentProposalDialog({
  savCaseId,
  customerId,
  customerName,
  customerPhone,
  caseNumber,
  deviceInfo,
  trigger
}: AppointmentProposalDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [duration, setDuration] = useState<number>(30);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('deposit');
  const [notes, setNotes] = useState('');
  const [sendViaSMS, setSendViaSMS] = useState(!!customerPhone);
  const [sendViaChat, setSendViaChat] = useState(true);
  
  const { toast } = useToast();
  const { createAppointment } = useAppointments();
  const { sendAppointmentSMS } = useSMS();
  const { workingHours } = useWorkingHours();

  // Générer les créneaux horaires disponibles
  const timeSlots = [];
  for (let hour = 8; hour < 19; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  const appointmentTypeLabels: Record<AppointmentType, string> = {
    deposit: 'Dépôt',
    pickup: 'Récupération',
    diagnostic: 'Diagnostic',
    repair: 'Réparation'
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date et une heure",
        variant: "destructive"
      });
      return;
    }

    if (!sendViaSMS && !sendViaChat) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un mode d'envoi",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Créer la date/heure du rendez-vous
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const appointmentDateTime = setMinutes(setHours(new Date(selectedDate), hours), minutes);

      // Créer le rendez-vous
      const appointment = await createAppointment({
        start_datetime: appointmentDateTime.toISOString(),
        duration_minutes: duration,
        appointment_type: appointmentType,
        status: 'proposed',
        sav_case_id: savCaseId,
        customer_id: customerId,
        notes,
        device_info: deviceInfo || {},
        proposed_by: 'shop'
      });

      if (!appointment) {
        throw new Error('Erreur lors de la création du RDV');
      }

      // Envoyer via Chat (créer un message dans le chat SAV)
      if (sendViaChat) {
        const formattedDate = format(appointmentDateTime, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr });
        const chatMessage = `📅 **Proposition de rendez-vous**

**Date :** ${formattedDate}
**Type :** ${appointmentTypeLabels[appointmentType]}
**Durée estimée :** ${duration} minutes

${notes ? `**Note :** ${notes}` : ''}

Confirmez votre RDV via le lien dans votre espace de suivi.`;

        await supabase.from('sav_messages').insert({
          sav_case_id: savCaseId,
          message: chatMessage,
          sender_type: 'shop',
          sender_name: '📅 Proposition RDV',
          shop_id: appointment.shop_id
        });
      }

      // Envoyer via SMS
      if (sendViaSMS && customerPhone) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const confirmUrl = `${baseUrl}/rdv/${appointment.confirmation_token}`;
        
        await sendAppointmentSMS(
          customerPhone,
          customerName,
          appointmentDateTime,
          appointmentTypeLabels[appointmentType],
          duration,
          confirmUrl,
          savCaseId
        );
      }

      toast({
        title: "RDV proposé",
        description: `La proposition de RDV a été envoyée${sendViaSMS ? ' par SMS' : ''}${sendViaSMS && sendViaChat ? ' et' : ''}${sendViaChat ? ' via le chat' : ''}`
      });

      setOpen(false);
      // Reset form
      setNotes('');
      setDuration(30);
      setAppointmentType('deposit');
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le rendez-vous",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <CalendarPlus className="h-4 w-4 mr-2" />
            Proposer RDV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Proposer un rendez-vous
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Info client */}
          <div className="bg-muted p-3 rounded-lg text-sm">
            <p><strong>Client :</strong> {customerName}</p>
            <p><strong>Dossier :</strong> {caseNumber}</p>
            {deviceInfo && (
              <p><strong>Appareil :</strong> {deviceInfo.brand} {deviceInfo.model}</p>
            )}
          </div>

          {/* Date et heure */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type et durée */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de RDV</Label>
              <Select value={appointmentType} onValueChange={(v) => setAppointmentType(v as AppointmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Dépôt</SelectItem>
                  <SelectItem value="pickup">Récupération</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="repair">Réparation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Durée estimée</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Notes (optionnel)</Label>
              <AITextReformulator
                text={notes}
                context="technician_comments"
                onReformulated={setNotes}
              />
            </div>
            <Textarea
              placeholder="Informations supplémentaires pour le client..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Options d'envoi */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-medium">Mode d'envoi</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-chat"
                checked={sendViaChat}
                onCheckedChange={(checked) => setSendViaChat(checked as boolean)}
              />
              <label htmlFor="send-chat" className="text-sm flex items-center gap-2 cursor-pointer">
                <MessageSquare className="h-4 w-4" />
                Envoyer via le chat SAV
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-sms"
                checked={sendViaSMS}
                onCheckedChange={(checked) => setSendViaSMS(checked as boolean)}
                disabled={!customerPhone}
              />
              <label 
                htmlFor="send-sms" 
                className={`text-sm flex items-center gap-2 cursor-pointer ${!customerPhone ? 'text-muted-foreground' : ''}`}
              >
                <Phone className="h-4 w-4" />
                Envoyer par SMS
                {!customerPhone && <span className="text-xs">(pas de téléphone)</span>}
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Envoi...' : 'Envoyer la proposition'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
