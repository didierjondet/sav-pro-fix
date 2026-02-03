import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Trash2, Check, X, Clock } from 'lucide-react';
import { useAppointments, Appointment, AppointmentType, CreateAppointmentData, UpdateAppointmentData } from '@/hooks/useAppointments';
import { useWorkingHours } from '@/hooks/useWorkingHours';
import { useCustomers } from '@/hooks/useCustomers';
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
  const { getAvailableSlots } = useWorkingHours();
  const { customers } = useCustomers();

  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate || new Date());
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(30);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('deposit');
  const [customerId, setCustomerId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const isEditing = !!appointment;
  const availableSlots = getAvailableSlots(selectedDate, 30);

  useEffect(() => {
    if (appointment) {
      const aptDate = new Date(appointment.start_datetime);
      setSelectedDate(aptDate);
      setSelectedTime(format(aptDate, 'HH:mm'));
      setDuration(appointment.duration_minutes);
      setAppointmentType(appointment.appointment_type);
      setCustomerId(appointment.customer_id || '');
      setNotes(appointment.notes || '');
    } else {
      setSelectedDate(defaultDate || new Date());
      setSelectedTime('09:00');
      setDuration(30);
      setAppointmentType('deposit');
      setCustomerId('');
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

          {/* Customer (only for new appointments) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Client (optionnel)</Label>
            <Select value={customerId || "none"} onValueChange={(v) => setCustomerId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun client</SelectItem>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
