import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSAVCases } from '@/hooks/useSAVCases';
import { Settings, Save } from 'lucide-react';

interface SAVStatusManagerProps {
  savCase: {
    id: string;
    case_number: string;
    status: string;
  };
  onStatusUpdated?: () => void;
}

const statusConfig = {
  pending: { label: 'En attente', variant: 'secondary' as const },
  in_progress: { label: 'En cours', variant: 'default' as const },
  testing: { label: 'Tests', variant: 'default' as const },
  ready: { label: 'Prêt', variant: 'default' as const },
  delivered: { label: 'Livré', variant: 'default' as const },
  cancelled: { label: 'Annulé', variant: 'destructive' as const },
};

const statusOptions = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'testing', label: 'Tests' },
  { value: 'ready', label: 'Prêt' },
  { value: 'delivered', label: 'Livré' },
  { value: 'cancelled', label: 'Annulé' },
];

export function SAVStatusManager({ savCase, onStatusUpdated }: SAVStatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState(savCase.status);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const { updateCaseStatus } = useSAVCases();

  const handleUpdateStatus = async () => {
    if (selectedStatus === savCase.status && !notes.trim()) return;
    
    setUpdating(true);
    await updateCaseStatus(savCase.id, selectedStatus as any, notes.trim() || undefined);
    setNotes('');
    setUpdating(false);
    onStatusUpdated?.();
  };

  const hasChanges = selectedStatus !== savCase.status || notes.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Gestion du statut - Dossier {savCase.case_number}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Statut actuel</label>
            <div className="mt-1">
              <Badge variant={statusConfig[savCase.status as keyof typeof statusConfig]?.variant || 'secondary'}>
                {statusConfig[savCase.status as keyof typeof statusConfig]?.label || savCase.status}
              </Badge>
            </div>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium">Nouveau statut</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Notes (optionnel)</label>
          <Textarea
            placeholder="Ajoutez des notes sur le changement de statut..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1"
          />
        </div>

        <Button
          onClick={handleUpdateStatus}
          disabled={!hasChanges || updating}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {updating ? 'Mise à jour...' : 'Mettre à jour le statut'}
        </Button>
      </CardContent>
    </Card>
  );
}