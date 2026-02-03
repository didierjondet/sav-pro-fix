import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { AgendaCalendar } from '@/components/agenda/AgendaCalendar';
import { AppointmentDialog } from '@/components/agenda/AppointmentDialog';
import { WorkingHoursConfig } from '@/components/agenda/WorkingHoursConfig';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, Calendar as CalendarIcon } from 'lucide-react';
import { useAppointments, Appointment } from '@/hooks/useAppointments';

export default function Agenda() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('week');

  const { appointments, loading } = useAppointments(viewType, selectedDate);

  const handleNewAppointment = (date?: Date) => {
    setSelectedAppointment(null);
    if (date) {
      setSelectedDate(date);
    }
    setIsDialogOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAppointment(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <CalendarIcon className="h-6 w-6 text-primary" />
                  Agenda
                </h1>
                <p className="text-muted-foreground">
                  Gérez vos rendez-vous clients
                </p>
              </div>
              
              <Button onClick={() => handleNewAppointment()}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau RDV
              </Button>
            </div>

            {/* Main content */}
            <Tabs defaultValue="calendar" className="space-y-4">
              <TabsList>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Calendrier
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Horaires
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="space-y-4">
                <AgendaCalendar
                  appointments={appointments}
                  loading={loading}
                  viewType={viewType}
                  selectedDate={selectedDate}
                  onViewChange={setViewType}
                  onDateChange={setSelectedDate}
                  onSlotClick={handleNewAppointment}
                  onAppointmentClick={handleEditAppointment}
                />
              </TabsContent>

              <TabsContent value="settings">
                <WorkingHoursConfig />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      <Footer />

      <AppointmentDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        appointment={selectedAppointment}
        defaultDate={selectedDate}
      />
    </div>
  );
}
