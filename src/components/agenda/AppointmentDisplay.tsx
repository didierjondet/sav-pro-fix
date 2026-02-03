import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CalendarCheck, CalendarX, ArrowRight } from 'lucide-react';

interface AppointmentDisplayProps {
  savCaseId: string;
  trackingSlug?: string;
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  proposed: { 
    label: 'En attente de confirmation', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <Calendar className="h-4 w-4" />
  },
  confirmed: { 
    label: 'Confirmé', 
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: <CalendarCheck className="h-4 w-4" />
  },
  counter_proposed: { 
    label: 'Nouveau créneau proposé', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <Calendar className="h-4 w-4" />
  },
  cancelled: { 
    label: 'Annulé', 
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: <CalendarX className="h-4 w-4" />
  },
  completed: { 
    label: 'Terminé', 
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: <CalendarCheck className="h-4 w-4" />
  },
  no_show: { 
    label: 'Absent', 
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: <CalendarX className="h-4 w-4" />
  }
};

const appointmentTypeLabels: Record<string, string> = {
  deposit: 'Dépôt',
  pickup: 'Récupération',
  diagnostic: 'Diagnostic',
  repair: 'Réparation'
};

export function AppointmentDisplay({ savCaseId, trackingSlug }: AppointmentDisplayProps) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['sav-appointments', savCaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, start_datetime, duration_minutes, appointment_type, status, notes, confirmation_token')
        .eq('sav_case_id', savCaseId)
        .order('start_datetime', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!savCaseId,
  });

  if (isLoading || !appointments?.length) {
    return null;
  }

  // Filtrer pour ne montrer que les RDV actifs (pas annulés, terminés ou no_show)
  const activeAppointments = appointments.filter(
    apt => !['cancelled', 'completed', 'no_show'].includes(apt.status)
  );

  if (!activeAppointments.length) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Vos rendez-vous
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeAppointments.map((appointment) => {
          const appointmentDate = new Date(appointment.start_datetime);
          const statusInfo = statusLabels[appointment.status] || statusLabels.proposed;
          const isActionable = appointment.status === 'proposed';
          
          return (
            <div 
              key={appointment.id}
              className={`p-4 rounded-lg border-2 ${statusInfo.color}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {statusInfo.icon}
                    <Badge variant="outline" className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">
                      {format(appointmentDate, "EEEE d MMMM", { locale: fr })}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(appointmentDate, "HH'h'mm", { locale: fr })}
                      </span>
                      <span>•</span>
                      <span>{appointment.duration_minutes} min</span>
                      <span>•</span>
                      <span>{appointmentTypeLabels[appointment.appointment_type] || appointment.appointment_type}</span>
                    </div>
                  </div>

                  {appointment.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      {appointment.notes}
                    </p>
                  )}
                </div>

                {isActionable && (
                  <Button 
                    size="sm"
                    onClick={() => window.open(`/rdv/${appointment.confirmation_token}`, '_blank')}
                  >
                    Répondre
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
