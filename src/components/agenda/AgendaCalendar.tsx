import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Appointment, AppointmentStatus } from '@/hooks/useAppointments';
import { useWorkingHours, WorkingHours } from '@/hooks/useWorkingHours';
import { cn } from '@/lib/utils';

interface AgendaCalendarProps {
  appointments: Appointment[];
  loading: boolean;
  viewType: 'day' | 'week' | 'month';
  selectedDate: Date;
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  onDateChange: (date: Date) => void;
  onSlotClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h - 20h

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  proposed: 'bg-amber-500',
  confirmed: 'bg-emerald-500',
  counter_proposed: 'bg-orange-500',
  cancelled: 'bg-destructive',
  completed: 'bg-muted',
  no_show: 'bg-destructive/50',
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  proposed: 'Proposé',
  confirmed: 'Confirmé',
  counter_proposed: 'Contre-proposé',
  cancelled: 'Annulé',
  completed: 'Terminé',
  no_show: 'Absent',
};

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Dépôt',
  pickup: 'Récupération',
  diagnostic: 'Diagnostic',
  repair: 'Réparation',
};

export function AgendaCalendar({
  appointments,
  loading,
  viewType,
  selectedDate,
  onViewChange,
  onDateChange,
  onSlotClick,
  onAppointmentClick,
}: AgendaCalendarProps) {
  const { workingHours, getWorkingHoursForDay, hasWorkingHours } = useWorkingHours();
  
  const navigatePrevious = () => {
    switch (viewType) {
      case 'day':
        onDateChange(addDays(selectedDate, -1));
        break;
      case 'week':
        onDateChange(addWeeks(selectedDate, -1));
        break;
      case 'month':
        onDateChange(addMonths(selectedDate, -1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewType) {
      case 'day':
        onDateChange(addDays(selectedDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(selectedDate, 1));
        break;
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Check if a day is closed (shop not open)
  const isDayClosed = (date: Date): boolean => {
    if (!hasWorkingHours) return false;
    const dayOfWeek = date.getDay();
    const hours = getWorkingHoursForDay(dayOfWeek);
    return !hours || !hours.is_open;
  };

  // Check if a specific hour is outside working hours or in break
  const isHourOff = (date: Date, hour: number): boolean => {
    if (!hasWorkingHours) return false;
    const dayOfWeek = date.getDay();
    const hours = getWorkingHoursForDay(dayOfWeek);
    
    if (!hours || !hours.is_open) return true;
    
    const [startHour] = hours.start_time.split(':').map(Number);
    const [endHour] = hours.end_time.split(':').map(Number);
    
    // Outside working hours
    if (hour < startHour || hour >= endHour) return true;
    
    // During break
    if (hours.break_start && hours.break_end) {
      const [breakStartH] = hours.break_start.split(':').map(Number);
      const [breakEndH] = hours.break_end.split(':').map(Number);
      if (hour >= breakStartH && hour < breakEndH) return true;
    }
    
    return false;
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.start_datetime), date)
    );
  };

  const getAppointmentsForHour = (date: Date, hour: number) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_datetime);
      return isSameDay(aptDate, date) && aptDate.getHours() === hour;
    });
  };

  const renderDateHeader = () => {
    let dateText = '';
    switch (viewType) {
      case 'day':
        dateText = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
        break;
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 6);
        dateText = `${format(weekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;
        break;
      case 'month':
        dateText = format(selectedDate, 'MMMM yyyy', { locale: fr });
        break;
    }
    return dateText.charAt(0).toUpperCase() + dateText.slice(1);
  };

  const renderAppointmentCard = (appointment: Appointment, compact = false) => (
    <div
      key={appointment.id}
      onClick={(e) => {
        e.stopPropagation();
        onAppointmentClick(appointment);
      }}
      className={cn(
        "rounded-md p-2 cursor-pointer transition-opacity hover:opacity-80",
        STATUS_COLORS[appointment.status],
        "text-white"
      )}
    >
      <div className="font-medium text-sm truncate">
        {appointment.customer 
          ? `${appointment.customer.first_name} ${appointment.customer.last_name}`
          : 'Client inconnu'}
      </div>
      {!compact && (
        <>
          <div className="text-xs opacity-90">
            {format(new Date(appointment.start_datetime), 'HH:mm')} - 
            {TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type}
          </div>
          {appointment.sav_case && (
            <div className="text-xs opacity-75 truncate">
              SAV: {appointment.sav_case.case_number}
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderDayView = () => {
    const dayIsClosed = isDayClosed(selectedDate);
    
    if (dayIsClosed) {
      return (
        <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg">
          <div className="text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">Fermé</p>
            <p className="text-sm">La boutique est fermée ce jour</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        {HOURS.map(hour => {
          const hourAppointments = getAppointmentsForHour(selectedDate, hour);
          const hourIsOff = isHourOff(selectedDate, hour);
          
          return (
            <div 
              key={hour} 
              className={cn(
                "flex border-b border-border min-h-[60px]",
                hourIsOff 
                  ? "bg-muted/40 cursor-not-allowed" 
                  : "hover:bg-accent/50 cursor-pointer"
              )}
              onClick={() => {
                if (hourIsOff) return;
                const slotDate = new Date(selectedDate);
                slotDate.setHours(hour, 0, 0, 0);
                onSlotClick(slotDate);
              }}
            >
              <div className={cn(
                "w-16 flex-shrink-0 p-2 text-sm border-r",
                hourIsOff ? "text-muted-foreground/50" : "text-muted-foreground"
              )}>
                {hour}:00
              </div>
              <div className="flex-1 p-1 space-y-1">
                {hourIsOff && hourAppointments.length === 0 && (
                  <span className="text-xs text-muted-foreground/50 italic">Fermé</span>
                )}
                {hourAppointments.map(apt => renderAppointmentCard(apt))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header row with days */}
        <div className="flex border-b">
          <div className="w-16 flex-shrink-0" />
          {weekDays.map(day => {
            const dayIsClosed = isDayClosed(day);
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "flex-1 p-2 text-center border-l",
                  isToday(day) && !dayIsClosed && "bg-primary/10",
                  dayIsClosed && "bg-destructive/10 border-destructive/20"
                )}
              >
                <div className={cn(
                  "text-sm font-medium",
                  dayIsClosed && "text-destructive/70"
                )}>
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div className={cn(
                  "text-lg",
                  isToday(day) && !dayIsClosed && "text-primary font-bold",
                  dayIsClosed && "text-destructive/70"
                )}>
                  {format(day, 'd')}
                </div>
                {dayIsClosed && (
                  <div className="text-xs font-medium text-destructive bg-destructive/20 rounded px-1 py-0.5 mt-1">
                    FERMÉ
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        {HOURS.map(hour => (
          <div key={hour} className="flex border-b min-h-[60px]">
            <div className="w-16 flex-shrink-0 p-2 text-sm text-muted-foreground border-r">
              {hour}:00
            </div>
            {weekDays.map(day => {
              const hourAppointments = getAppointmentsForHour(day, hour);
              const hourIsOff = isHourOff(day, hour);
              const dayIsClosed = isDayClosed(day);
              
              // Check if this hour is during a break
              const hours = getWorkingHoursForDay(day.getDay());
              const isDuringBreak = hours && hours.break_start && hours.break_end && 
                hour >= parseInt(hours.break_start.split(':')[0]) && 
                hour < parseInt(hours.break_end.split(':')[0]);
              
              return (
                <div 
                  key={day.toISOString()}
                  className={cn(
                    "flex-1 p-1 border-l relative",
                    isToday(day) && !hourIsOff && "bg-primary/5",
                    hourIsOff && dayIsClosed && "bg-destructive/10",
                    hourIsOff && !dayIsClosed && isDuringBreak && "bg-orange-500/15 border-l-2 border-l-orange-400",
                    hourIsOff && !dayIsClosed && !isDuringBreak && "bg-muted/60",
                    hourIsOff ? "cursor-not-allowed" : "hover:bg-accent/50 cursor-pointer"
                  )}
                  onClick={() => {
                    if (hourIsOff) return;
                    const slotDate = new Date(day);
                    slotDate.setHours(hour, 0, 0, 0);
                    onSlotClick(slotDate);
                  }}
                >
                  {/* Visual indicator for closed/break periods */}
                  {hourIsOff && hourAppointments.length === 0 && (
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      "text-xs font-medium opacity-60"
                    )}>
                      {dayIsClosed ? (
                        <span className="text-destructive/50">✕</span>
                      ) : isDuringBreak ? (
                        <span className="text-orange-500/70 text-[10px]">PAUSE</span>
                      ) : (
                        <span className="text-muted-foreground/50 text-[10px]">—</span>
                      )}
                    </div>
                  )}
                  {hourAppointments.map(apt => renderAppointmentCard(apt, true))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const renderMonthView = () => {
    // Get the first day of the month grid (may include days from previous month)
    const firstDayOfMonth = startOfMonth(selectedDate);
    const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
    const days = Array.from({ length: 42 }, (_, i) => addDays(startDate, i)); // 6 weeks
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b">
            {week.map(day => {
              const dayAppointments = getAppointmentsForDay(day);
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              
              const dayIsClosed = isDayClosed(day);
              
              return (
                <div 
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[100px] p-1 border-l first:border-l-0",
                    !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                    isToday(day) && !dayIsClosed && "bg-primary/10",
                    dayIsClosed 
                      ? "bg-muted/50 cursor-not-allowed" 
                      : "hover:bg-accent/50 cursor-pointer"
                  )}
                  onClick={() => !dayIsClosed && onSlotClick(day)}
                >
                  <div className={cn(
                    "text-sm mb-1 flex items-center gap-1",
                    isToday(day) && "font-bold text-primary",
                    dayIsClosed && "text-muted-foreground/70"
                  )}>
                    {format(day, 'd')}
                    {dayIsClosed && <span className="text-xs font-normal">(Fermé)</span>}
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map(apt => (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(apt);
                        }}
                        className={cn(
                          "text-xs p-1 rounded truncate cursor-pointer",
                          STATUS_COLORS[apt.status],
                          "text-white"
                        )}
                      >
                        {format(new Date(apt.start_datetime), 'HH:mm')} {apt.customer?.last_name || 'RDV'}
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayAppointments.length - 3} autres
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg ml-2">
              {renderDateHeader()}
            </CardTitle>
          </div>

          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewType === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('day')}
            >
              Jour
            </Button>
            <Button
              variant={viewType === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('week')}
            >
              Semaine
            </Button>
            <Button
              variant={viewType === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('month')}
            >
              Mois
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <Badge 
              key={status} 
              variant="outline"
              className={cn("text-white border-0", STATUS_COLORS[status as AppointmentStatus])}
            >
              {label}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            {viewType === 'day' && renderDayView()}
            {viewType === 'week' && renderWeekView()}
            {viewType === 'month' && renderMonthView()}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
