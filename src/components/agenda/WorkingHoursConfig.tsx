import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useWorkingHours, DAY_NAMES, WorkingHours } from '@/hooks/useWorkingHours';
import { Clock, Save } from 'lucide-react';

export function WorkingHoursConfig() {
  const { 
    workingHours, 
    loading, 
    hasWorkingHours, 
    initializeWorkingHours, 
    updateWorkingHours,
    isInitializing,
    isUpdating 
  } = useWorkingHours();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<WorkingHours>>({});

  const handleEdit = (hours: WorkingHours) => {
    setEditingId(hours.id);
    setEditData({
      start_time: hours.start_time,
      end_time: hours.end_time,
      is_open: hours.is_open,
      break_start: hours.break_start,
      break_end: hours.break_end,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    
    await updateWorkingHours({
      id: editingId,
      ...editData,
    });
    setEditingId(null);
    setEditData({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleToggleOpen = async (hours: WorkingHours) => {
    await updateWorkingHours({
      id: hours.id,
      is_open: !hours.is_open,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!hasWorkingHours) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Configuration des horaires
          </CardTitle>
          <CardDescription>
            Configurez les horaires d'ouverture de votre magasin pour l'agenda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Aucun horaire configuré. Initialisez les horaires par défaut pour commencer.
            </p>
            <Button 
              onClick={() => initializeWorkingHours()} 
              disabled={isInitializing}
            >
              {isInitializing ? 'Initialisation...' : 'Initialiser les horaires'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by day of week, starting from Monday (1)
  const sortedHours = [...workingHours].sort((a, b) => {
    const aDay = a.day_of_week === 0 ? 7 : a.day_of_week;
    const bDay = b.day_of_week === 0 ? 7 : b.day_of_week;
    return aDay - bDay;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horaires d'ouverture
        </CardTitle>
        <CardDescription>
          Définissez les horaires pendant lesquels les clients peuvent prendre rendez-vous
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedHours.map(hours => {
            const isEditing = editingId === hours.id;
            
            return (
              <div 
                key={hours.id} 
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg"
              >
                {/* Day name and toggle */}
                <div className="flex items-center gap-4 min-w-[140px]">
                  <Switch
                    checked={hours.is_open}
                    onCheckedChange={() => handleToggleOpen(hours)}
                    disabled={isUpdating}
                  />
                  <span className={`font-medium ${!hours.is_open ? 'text-muted-foreground' : ''}`}>
                    {DAY_NAMES[hours.day_of_week]}
                  </span>
                </div>

                {hours.is_open && (
                  <>
                    {isEditing ? (
                      // Edit mode
                      <div className="flex flex-wrap items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Ouverture</Label>
                          <Input
                            type="time"
                            value={editData.start_time || ''}
                            onChange={(e) => setEditData({ ...editData, start_time: e.target.value })}
                            className="w-28"
                          />
                        </div>
                        <span className="text-muted-foreground">-</span>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Fermeture</Label>
                          <Input
                            type="time"
                            value={editData.end_time || ''}
                            onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                            className="w-28"
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Label className="text-sm text-muted-foreground">Pause</Label>
                          <Input
                            type="time"
                            value={editData.break_start || ''}
                            onChange={(e) => setEditData({ ...editData, break_start: e.target.value || null })}
                            className="w-28"
                            placeholder="Début"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={editData.break_end || ''}
                            onChange={(e) => setEditData({ ...editData, break_end: e.target.value || null })}
                            className="w-28"
                            placeholder="Fin"
                          />
                        </div>
                        <div className="flex gap-2 ml-auto">
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            Annuler
                          </Button>
                          <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                            <Save className="h-4 w-4 mr-1" />
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex flex-wrap items-center gap-4 flex-1">
                        <div className="text-sm">
                          <span className="font-medium">{hours.start_time}</span>
                          <span className="text-muted-foreground"> - </span>
                          <span className="font-medium">{hours.end_time}</span>
                        </div>
                        {hours.break_start && hours.break_end && (
                          <div className="text-sm text-muted-foreground">
                            (Pause: {hours.break_start} - {hours.break_end})
                          </div>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="ml-auto"
                          onClick={() => handleEdit(hours)}
                        >
                          Modifier
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {!hours.is_open && (
                  <span className="text-sm text-muted-foreground">Fermé</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
