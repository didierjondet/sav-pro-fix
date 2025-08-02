import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, MessageSquare, AlertTriangle, CreditCard } from 'lucide-react';

interface SAVStatusManagerProps {
  savCase: {
    id: string;
    case_number: string;
    status: string;
    customer?: {
      first_name: string;
      last_name: string;
      phone?: string;
    };
    tracking_slug?: string;
  };
  onStatusUpdated?: () => void;
}

const statusConfig = {
  pending: { label: 'En attente', variant: 'secondary' as const },
  in_progress: { label: 'En cours', variant: 'default' as const },
  testing: { label: 'Tests', variant: 'default' as const },
  parts_ordered: { label: 'Pièce commandée', variant: 'outline' as const },
  ready: { label: 'Prêt', variant: 'default' as const },
  cancelled: { label: 'Annulé', variant: 'destructive' as const },
};

const statusOptions = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'testing', label: 'Tests' },
  { value: 'parts_ordered', label: 'Pièce commandée' },
  { value: 'ready', label: 'Prêt' },
  { value: 'cancelled', label: 'Annulé' },
];

export function SAVStatusManager({ savCase, onStatusUpdated }: SAVStatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState(savCase.status);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [pendingStatusData, setPendingStatusData] = useState<{status: string, notes: string} | null>(null);
  const { updateCaseStatus } = useSAVCases();
  const { subscription, checkLimits } = useSubscription();
  const { toast } = useToast();

  const generateTrackingUrl = () => {
    if (!savCase.tracking_slug) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/track/${savCase.tracking_slug}`;
  };

  const handleUpdateStatus = async (sendSMS = false) => {
    if (selectedStatus === savCase.status && !notes.trim()) return;
    
    setUpdating(true);
    
    try {
      await updateCaseStatus(savCase.id, selectedStatus as any, notes.trim() || undefined);
      
      // Si on doit envoyer un SMS
      if (sendSMS && savCase.customer?.phone && savCase.tracking_slug) {
        const customerName = `${savCase.customer.first_name} ${savCase.customer.last_name}`;
        const trackingUrl = generateTrackingUrl();
        const statusLabel = statusConfig[selectedStatus as keyof typeof statusConfig]?.label || selectedStatus;
        
        const message = `Bonjour ${customerName}, votre dossier de réparation ${savCase.case_number} a été mis à jour : ${statusLabel}. Suivez l'évolution : ${trackingUrl}`;
        
        await supabase.functions.invoke('send-sms', {
          body: {
            to: savCase.customer.phone,
            message: message,
            type: 'status_change',
            recordId: savCase.id
          }
        });
        
        toast({
          title: "Statut mis à jour et SMS envoyé",
          description: `SMS de notification envoyé à ${savCase.customer.phone}`,
        });
      } else {
        toast({
          title: "Statut mis à jour",
          description: "Le statut du dossier a été mis à jour avec succès",
        });
      }
      
      setNotes('');
      onStatusUpdated?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
      setShowSMSDialog(false);
      setPendingStatusData(null);
    }
  };

  const handleStatusChangeRequest = async () => {
    if (selectedStatus === savCase.status && !notes.trim()) return;
    
    // Si le client a un téléphone et qu'on change vraiment le statut
    if (savCase.customer?.phone && selectedStatus !== savCase.status) {
      setPendingStatusData({ status: selectedStatus, notes: notes.trim() });
      setShowSMSDialog(true);
    } else {
      // Pas de téléphone ou pas de changement de statut
      await handleUpdateStatus(false);
    }
  };

  const handleSMSChoice = async (sendSMS: boolean) => {
    if (pendingStatusData) {
      setSelectedStatus(pendingStatusData.status);
      setNotes(pendingStatusData.notes);
      await handleUpdateStatus(sendSMS);
    }
  };

  const hasChanges = selectedStatus !== savCase.status || notes.trim();
  const limits = checkLimits('sms');
  const canSendSMS = limits.allowed && savCase.customer?.phone && savCase.tracking_slug;

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
          onClick={handleStatusChangeRequest}
          disabled={!hasChanges || updating}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {updating ? 'Mise à jour...' : 'Mettre à jour le statut'}
        </Button>

        {/* Dialog de confirmation SMS */}
        <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Notifier le client ?</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Le statut du dossier va passer de "{statusConfig[savCase.status as keyof typeof statusConfig]?.label}" 
                à "{statusConfig[selectedStatus as keyof typeof statusConfig]?.label}".
              </p>
              
              {savCase.customer?.phone ? (
                <div>
                  <p className="text-sm">
                    Voulez-vous envoyer un SMS de notification au client ?
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Destinataire : {savCase.customer.phone}
                  </p>
                  
                  {!canSendSMS && (
                    <Alert className="mt-2 border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-orange-700">
                        {limits.reason}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {subscription && (
                    <p className="text-xs text-muted-foreground mt-2">
                      SMS restants : {subscription.sms_credits_allocated - subscription.sms_credits_used}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun numéro de téléphone renseigné pour ce client.
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleSMSChoice(false)}>
                Non, juste mettre à jour
              </Button>
              {canSendSMS ? (
                <Button onClick={() => handleSMSChoice(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Oui, envoyer SMS
                </Button>
              ) : savCase.customer?.phone ? (
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/settings?tab=sms'}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Acheter des SMS
                </Button>
              ) : (
                <Button disabled>
                  Pas de téléphone
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}