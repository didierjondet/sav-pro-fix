import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarPlus, CalendarDays, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppointmentProposalDialog } from '@/components/agenda/AppointmentProposalDialog';

export interface SAVCaseAppointment {
  id: string;
  start_datetime: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  notes: string | null;
}

const ACTIVE_STATUSES = ['proposed', 'confirmed', 'counter_proposed'];

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Dépôt',
  pickup: 'Récupération',
  diagnostic: 'Diagnostic',
  repair: 'Réparation',
};

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposé',
  confirmed: 'Confirmé',
  counter_proposed: 'Contre-proposition',
  cancelled: 'Annulé',
  completed: 'Terminé',
  no_show: 'Absent',
};

export function useSAVCaseAppointments(savCaseId?: string) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['sav-case-appointments', savCaseId],
    queryFn: async (): Promise<SAVCaseAppointment[]> => {
      if (!savCaseId) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, start_datetime, duration_minutes, appointment_type, status, notes')
        .eq('sav_case_id', savCaseId)
        .order('start_datetime', { ascending: true });
      if (error) throw error;
      return (data || []) as SAVCaseAppointment[];
    },
    enabled: !!savCaseId,
    staleTime: 30_000,
  });

  const now = Date.now();
  const activeCount = data.filter(
    (a) => ACTIVE_STATUSES.includes(a.status) && new Date(a.start_datetime).getTime() >= now
  ).length;

  return { appointments: data, activeCount, isLoading };
}

interface SAVAgendaTabProps {
  savCaseId: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  caseNumber: string;
  deviceInfo?: { brand?: string | null; model?: string | null };
  canPropose?: boolean;
}

export function SAVAgendaTab({
  savCaseId,
  customerId,
  customerName,
  customerPhone,
  caseNumber,
  deviceInfo,
  canPropose = true,
}: SAVAgendaTabProps) {
  const { appointments, isLoading } = useSAVCaseAppointments(savCaseId);
  const now = Date.now();

  return (
    <div className="space-y-4">
      {canPropose && (
        <AppointmentProposalDialog
          savCaseId={savCaseId}
          customerId={customerId}
          customerName={customerName || 'Client'}
          customerPhone={customerPhone || undefined}
          caseNumber={caseNumber}
          deviceInfo={deviceInfo}
          trigger={
            <Button variant="outline" size="sm">
              <CalendarPlus className="h-4 w-4 mr-2" /> Proposer un RDV
            </Button>
          }
        />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Rendez-vous du dossier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {!isLoading && appointments.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous pour ce dossier.</p>
          )}
          {appointments.map((apt) => {
            const date = new Date(apt.start_datetime);
            const isActive = ACTIVE_STATUSES.includes(apt.status) && date.getTime() >= now;
            return (
              <div
                key={apt.id}
                className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border ${
                  isActive ? 'border-primary/40 bg-primary/5' : 'opacity-70'
                }`}
              >
                <span className="text-sm font-medium">
                  {format(date, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {apt.duration_minutes} min
                </span>
                <Badge variant="outline">{TYPE_LABELS[apt.appointment_type] || apt.appointment_type}</Badge>
                <Badge variant={isActive ? 'default' : 'secondary'} className="ml-auto">
                  {STATUS_LABELS[apt.status] || apt.status}
                </Badge>
                {apt.notes && (
                  <p className="w-full text-xs text-muted-foreground">{apt.notes}</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
