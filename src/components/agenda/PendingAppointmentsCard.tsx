import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Clock, Calendar, MessageSquare, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePendingAppointments } from '@/hooks/usePendingAppointments';
import { cn } from '@/lib/utils';

export function PendingAppointmentsCard() {
  const { 
    pendingAppointments, 
    loading, 
    acceptCounterProposal, 
    rejectCounterProposal,
    isAccepting,
    isRejecting 
  } = usePendingAppointments();

  if (loading) {
    return (
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingAppointments.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-500/50 bg-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Contre-propositions clients
          <Badge variant="secondary" className="bg-orange-500 text-white">
            {pendingAppointments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn(pendingAppointments.length > 3 && "h-[300px]")}>
          <div className="space-y-3">
            {pendingAppointments.map(appointment => (
              <div 
                key={appointment.id} 
                className="p-3 rounded-lg bg-background border border-orange-500/30 space-y-2"
              >
                {/* Customer Info */}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {appointment.customer 
                      ? `${appointment.customer.first_name} ${appointment.customer.last_name}`
                      : 'Client inconnu'}
                  </span>
                  {appointment.sav_case && (
                    <Badge variant="outline" className="text-xs">
                      SAV: {appointment.sav_case.case_number}
                    </Badge>
                  )}
                </div>

                {/* Original vs Counter-proposal */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">Date proposée</div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(appointment.start_datetime), 'PPP à HH:mm', { locale: fr })}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-orange-500/10 border border-orange-500/30">
                    <div className="text-xs text-orange-600 font-medium mb-1">Contre-proposition</div>
                    <div className="flex items-center gap-1 text-orange-600">
                      <Calendar className="h-3 w-3" />
                      {appointment.counter_proposal_datetime
                        ? format(new Date(appointment.counter_proposal_datetime), 'PPP à HH:mm', { locale: fr })
                        : '-'
                      }
                    </div>
                  </div>
                </div>

                {/* Counter-proposal message */}
                {appointment.counter_proposal_message && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="italic">"{appointment.counter_proposal_message}"</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => acceptCounterProposal(appointment.id)}
                    disabled={isAccepting || isRejecting}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accepter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => rejectCounterProposal(appointment.id)}
                    disabled={isAccepting || isRejecting}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Refuser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
