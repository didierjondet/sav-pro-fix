import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Smartphone,
  Store,
  CalendarClock,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AppointmentData {
  id: string;
  start_datetime: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  notes: string | null;
  device_info: any;
  counter_proposal_datetime: string | null;
  counter_proposal_message: string | null;
  shop: {
    name: string;
    phone: string | null;
    address: string | null;
    logo_url: string | null;
  };
  sav_case: {
    case_number: string;
    device_brand: string | null;
    device_model: string | null;
  } | null;
  customer: {
    first_name: string;
    last_name: string;
  } | null;
}

const appointmentTypeLabels: Record<string, string> = {
  deposit: 'Dépôt',
  pickup: 'Récupération',
  diagnostic: 'Diagnostic',
  repair: 'Réparation'
};

const statusLabels: Record<string, { label: string; color: string }> = {
  proposed: { label: 'En attente de confirmation', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-800' },
  counter_proposed: { label: 'Nouveau créneau proposé', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Terminé', color: 'bg-gray-100 text-gray-800' },
  no_show: { label: 'Absent', color: 'bg-orange-100 text-orange-800' }
};

export default function AppointmentConfirm() {
  const { token } = useParams<{ token: string }>();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCounterProposal, setShowCounterProposal] = useState(false);
  const [counterDate, setCounterDate] = useState<string>('');
  const [counterTime, setCounterTime] = useState<string>('10:00');
  const [counterMessage, setCounterMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchAppointment();
    }
  }, [token]);

  const fetchAppointment = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_datetime,
          duration_minutes,
          appointment_type,
          status,
          notes,
          device_info,
          counter_proposal_datetime,
          counter_proposal_message,
          shop:shops(name, phone, address, logo_url),
          sav_case:sav_cases(case_number, device_brand, device_model),
          customer:customers(first_name, last_name)
        `)
        .eq('confirmation_token', token)
        .single();

      if (error) throw error;
      
      setAppointment(data as unknown as AppointmentData);
      
      // Préremplir la date pour la contre-proposition
      if (data) {
        const appointmentDate = new Date(data.start_datetime);
        setCounterDate(format(addDays(appointmentDate, 1), 'yyyy-MM-dd'));
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du rendez-vous",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!appointment) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointment.id);

      if (error) throw error;

      // Créer une notification pour le magasin
      if (appointment.sav_case) {
        await supabase.from('sav_messages').insert({
          sav_case_id: appointment.sav_case.case_number, // Récupérer l'ID réel
          message: `✅ Le client a confirmé le rendez-vous du ${format(new Date(appointment.start_datetime), "EEEE d MMMM à HH'h'mm", { locale: fr })}`,
          sender_type: 'client',
          sender_name: `${appointment.customer?.first_name || 'Client'}`,
          shop_id: '' // Sera rempli côté serveur
        });
      }

      setAppointment({ ...appointment, status: 'confirmed' });
      
      toast({
        title: "RDV confirmé !",
        description: "Votre rendez-vous a été confirmé avec succès"
      });
    } catch (error) {
      console.error('Error confirming appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de confirmer le rendez-vous",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCounterProposal = async () => {
    if (!appointment || !counterDate || !counterTime) return;
    
    setSubmitting(true);
    try {
      const [hours, minutes] = counterTime.split(':').map(Number);
      const counterDateTime = setMinutes(setHours(new Date(counterDate), hours), minutes);

      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'counter_proposed',
          counter_proposal_datetime: counterDateTime.toISOString(),
          counter_proposal_message: counterMessage || null
        })
        .eq('id', appointment.id);

      if (error) throw error;

      setAppointment({ 
        ...appointment, 
        status: 'counter_proposed',
        counter_proposal_datetime: counterDateTime.toISOString(),
        counter_proposal_message: counterMessage
      });
      
      toast({
        title: "Proposition envoyée",
        description: "Votre proposition de nouveau créneau a été envoyée au magasin"
      });
      
      setShowCounterProposal(false);
    } catch (error) {
      console.error('Error counter proposing:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre proposition",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Générer les créneaux horaires
  const timeSlots = [];
  for (let hour = 8; hour < 19; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Lien invalide</h1>
            <p className="text-muted-foreground">
              Ce lien de confirmation n'est plus valide ou a expiré.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.start_datetime);
  const statusInfo = statusLabels[appointment.status] || statusLabels.proposed;
  const isEditable = appointment.status === 'proposed';

  return (
    <div className="min-h-screen bg-background">
      {/* Header magasin */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            {appointment.shop?.logo_url ? (
              <img 
                src={appointment.shop.logo_url} 
                alt={`Logo ${appointment.shop.name}`}
                className="h-16 w-16 object-contain"
              />
            ) : (
              <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Store className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary">
                {appointment.shop?.name || "Votre réparateur"}
              </h1>
              <p className="text-sm text-muted-foreground">Confirmation de rendez-vous</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Statut */}
        <div className="text-center">
          <Badge className={`text-lg px-4 py-2 ${statusInfo.color}`}>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Détails du RDV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Détails du rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <CalendarClock className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-lg">
                    {format(appointmentDate, "EEEE d MMMM", { locale: fr })}
                  </p>
                  <p className="text-primary font-bold text-xl">
                    {format(appointmentDate, "HH'h'mm", { locale: fr })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Durée estimée</p>
                  <p className="font-semibold">{appointment.duration_minutes} minutes</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Type de rendez-vous</p>
              <p className="font-semibold">
                {appointmentTypeLabels[appointment.appointment_type] || appointment.appointment_type}
              </p>
            </div>

            {appointment.sav_case && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Votre appareil</span>
                </div>
                <p className="font-semibold">
                  {appointment.sav_case.device_brand} {appointment.sav_case.device_model}
                </p>
                <p className="text-sm text-muted-foreground">
                  Dossier n° {appointment.sav_case.case_number}
                </p>
              </div>
            )}

            {appointment.notes && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Note du magasin</span>
                </div>
                <p className="text-sm">{appointment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {isEditable && (
          <Card>
            <CardHeader>
              <CardTitle>Ce créneau vous convient-il ?</CardTitle>
              <CardDescription>
                Confirmez ou proposez un autre créneau si celui-ci ne vous arrange pas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showCounterProposal ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1" 
                    size="lg"
                    onClick={handleConfirm}
                    disabled={submitting}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {submitting ? 'Confirmation...' : 'Confirmer ce créneau'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    size="lg"
                    onClick={() => setShowCounterProposal(true)}
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Proposer un autre créneau
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date souhaitée</Label>
                      <Input
                        type="date"
                        value={counterDate}
                        onChange={(e) => setCounterDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Heure souhaitée</Label>
                      <Select value={counterTime} onValueChange={setCounterTime}>
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
                  
                  <div className="space-y-2">
                    <Label>Message (optionnel)</Label>
                    <Textarea
                      placeholder="Précisez vos disponibilités ou contraintes..."
                      value={counterMessage}
                      onChange={(e) => setCounterMessage(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      className="flex-1"
                      onClick={handleCounterProposal}
                      disabled={submitting}
                    >
                      {submitting ? 'Envoi...' : 'Envoyer ma proposition'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowCounterProposal(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Si confirmé */}
        {appointment.status === 'confirmed' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-green-800 mb-2">Rendez-vous confirmé !</h2>
              <p className="text-green-700">
                Nous vous attendons le {format(appointmentDate, "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
              </p>
              {appointment.shop?.address && (
                <p className="text-sm text-green-600 mt-2">
                  📍 {appointment.shop.address}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Si contre-proposition */}
        {appointment.status === 'counter_proposed' && appointment.counter_proposal_datetime && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6 text-center">
              <CalendarClock className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-blue-800 mb-2">Proposition envoyée</h2>
              <p className="text-blue-700">
                Vous avez proposé le {format(new Date(appointment.counter_proposal_datetime), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
              </p>
              <p className="text-sm text-blue-600 mt-2">
                Le magasin reviendra vers vous pour confirmer.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Coordonnées du magasin */}
        {appointment.shop && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Coordonnées du magasin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{appointment.shop.name}</p>
              {appointment.shop.address && (
                <p className="text-muted-foreground">📍 {appointment.shop.address}</p>
              )}
              {appointment.shop.phone && (
                <p className="text-muted-foreground">📞 {appointment.shop.phone}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="bg-muted/30 border-t mt-12">
        <div className="max-w-2xl mx-auto p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Propulsé par <span className="font-semibold text-primary">FixWay Pro</span>
          </p>
        </div>
      </div>
    </div>
  );
}
