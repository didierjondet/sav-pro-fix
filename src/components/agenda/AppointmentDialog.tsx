import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Trash2, Check, X, Clock, ChevronsUpDown, User, AlertTriangle } from 'lucide-react';
import { useAppointments, Appointment, AppointmentType, CreateAppointmentData, UpdateAppointmentData } from '@/hooks/useAppointments';
import { useWorkingHours } from '@/hooks/useWorkingHours';
import { useAllCustomers } from '@/hooks/useAllCustomers';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface AppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  defaultDate?: Date;
  savCaseId?: string;
}

const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'deposit', label: 'Dépôt appareil' },
  { value: 'pickup', label: 'Récupération' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'repair', label: 'Réparation sur place' },
];

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 heure' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 heures' },
];

export function AppointmentDialog({ open, onClose, appointment, defaultDate, savCaseId }: AppointmentDialogProps) {
  const { createAppointment, updateAppointment, deleteAppointment, confirmAppointment, cancelAppointment, isCreating, isUpdating, isDeleting } = useAppointments();
  const { getAvailableSlots, getWorkingHoursForDay, hasWorkingHours } = useWorkingHours();
  const { customers } = useAllCustomers();

  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate || new Date());
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(30);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('deposit');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [notes, setNotes] = useState<string>('');

  const isEditing = !!appointment;
  const availableSlots = getAvailableSlots(selectedDate, 30);

  // Check if the selected slot is during closed hours
  const isClosedPeriodWarning = useMemo(() => {
    if (!hasWorkingHours) return false;
    
    const dayOfWeek = selectedDate.getDay();
    const hours = getWorkingHoursForDay(dayOfWeek);
    
    if (!hours || !hours.is_open) {
      return { type: 'day_closed', message: 'La boutique est fermée ce jour' };
    }
    
    const [selectedHour, selectedMin] = selectedTime.split(':').map(Number);
    const selectedMinutes = selectedHour * 60 + selectedMin;
    
    const [startHour, startMin] = hours.start_time.split(':').map(Number);
    const [endHour, endMin] = hours.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Outside working hours
    if (selectedMinutes < startMinutes || selectedMinutes >= endMinutes) {
      return { 
        type: 'outside_hours', 
        message: `Ce créneau est en dehors des horaires d'ouverture (${hours.start_time} - ${hours.end_time})` 
      };
    }
    
    // During break
    if (hours.break_start && hours.break_end) {
      const [breakStartH, breakStartM] = hours.break_start.split(':').map(Number);
      const [breakEndH, breakEndM] = hours.break_end.split(':').map(Number);
      const breakStartMinutes = breakStartH * 60 + breakStartM;
      const breakEndMinutes = breakEndH * 60 + breakEndM;
      
      if (selectedMinutes >= breakStartMinutes && selectedMinutes < breakEndMinutes) {
        return { 
          type: 'during_break', 
          message: `Ce créneau est pendant la pause (${hours.break_start} - ${hours.break_end})` 
        };
      }
    }
    
    return false;
  }, [selectedDate, selectedTime, hasWorkingHours, getWorkingHoursForDay]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(customer => 
      customer.first_name?.toLowerCase().includes(search) ||
      customer.last_name?.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
    );
  }, [customers, customerSearch]);

  // Get selected customer info
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === customerId);
  }, [customers, customerId]);

  useEffect(() => {
    if (appointment) {
      const aptDate = new Date(appointment.start_datetime);
      setSelectedDate(aptDate);
      setSelectedTime(format(aptDate, 'HH:mm'));
      setDuration(appointment.duration_minutes);
      setAppointmentType(appointment.appointment_type);
      setCustomerId(appointment.customer_id || '');
      setCustomerSearch('');
      setNotes(appointment.notes || '');
    } else {
      setSelectedDate(defaultDate || new Date());
      setSelectedTime('09:00');
      setDuration(30);
      setAppointmentType('deposit');
      setCustomerId('');
      setCustomerSearch('');
      setNotes('');
    }
  }, [appointment, defaultDate, open]);

  const handleSubmit = async () => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startDatetime = new Date(selectedDate);
    startDatetime.setHours(hours, minutes, 0, 0);

    if (isEditing && appointment) {
      const updateData: UpdateAppointmentData = {
        start_datetime: startDatetime.toISOString(),
        duration_minutes: duration,
        appointment_type: appointmentType,
        notes: notes || undefined,
      };
      await updateAppointment({ id: appointment.id, data: updateData });
    } else {
      const createData: CreateAppointmentData = {
        start_datetime: startDatetime.toISOString(),
        duration_minutes: duration,
        appointment_type: appointmentType,
        customer_id: customerId || undefined,
        sav_case_id: savCaseId,
        notes: notes || undefined,
      };
      await createAppointment(createData);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (appointment) {
      await deleteAppointment(appointment.id);
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (appointment) {
      await confirmAppointment(appointment.id);
      onClose();
    }
  };

  const handleCancel = async () => {
    if (appointment) {
      await cancelAppointment(appointment.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={fr}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label>Heure</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner l'heure" />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.length > 0 ? (
                  availableSlots.map(slot => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))
                ) : (
                  // Fallback slots if working hours not configured
                  Array.from({ length: 20 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 8;
                    const minute = (i % 2) * 30;
                    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                  }).map(slot => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Durée
            </Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Durée du RDV" />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map(d => (
                  <SelectItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type de rendez-vous</Label>
            <Select value={appointmentType} onValueChange={(v) => setAppointmentType(v as AppointmentType)}>
              <SelectTrigger>
                <SelectValue placeholder="Type de RDV" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer search (only for new appointments) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Client (optionnel)
              </Label>
              <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedCustomer 
                      ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                      : "Rechercher un client..."
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-50" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Rechercher par nom, téléphone, email..." 
                      value={customerSearch}
                      onValueChange={setCustomerSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setCustomerId('');
                            setCustomerSearch('');
                            setCustomerPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !customerId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground">Aucun client</span>
                        </CommandItem>
                        {filteredCustomers.map(customer => (
                          <CommandItem
                            key={customer.id}
                            value={customer.id}
                            onSelect={() => {
                              setCustomerId(customer.id);
                              setCustomerSearch('');
                              setCustomerPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                customerId === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.first_name} {customer.last_name}</span>
                              {customer.phone && (
                                <span className="text-xs text-muted-foreground">{customer.phone}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes supplémentaires..."
              rows={3}
            />
          </div>

          {/* Warning for closed period */}
          {isClosedPeriodWarning && (
            <Alert variant="destructive" className="border-orange-500 bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-orange-600">
                <strong>Attention :</strong> {isClosedPeriodWarning.message}.
                <br />
                <span className="text-sm">Le RDV sera créé malgré tout si vous confirmez.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Status info for existing appointments */}
          {appointment && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>Statut :</strong> {appointment.status}</p>
              {appointment.counter_proposal_datetime && (
                <p className="mt-1">
                  <strong>Contre-proposition :</strong>{' '}
                  {format(new Date(appointment.counter_proposal_datetime), 'PPP à HH:mm', { locale: fr })}
                </p>
              )}
              {appointment.counter_proposal_message && (
                <p className="mt-1 text-muted-foreground">
                  "{appointment.counter_proposal_message}"
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {isEditing && appointment && (
            <div className="flex gap-2 mr-auto">
              {appointment.status === 'proposed' && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleConfirm}
                  disabled={isUpdating}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirmer
                </Button>
              )}
              {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4 mr-1" />
                  Annuler RDV
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer le rendez-vous ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Le rendez-vous sera définitivement supprimé.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isCreating || isUpdating}
            >
              {isEditing ? 'Enregistrer' : 'Créer le RDV'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
