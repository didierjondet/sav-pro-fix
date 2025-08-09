import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, MessageSquare, AlertTriangle, CreditCard, Euro } from 'lucide-react';

interface SAVStatusManagerProps {
  savCase: {
    id: string;
    case_number: string;
    status: string;
    sav_type: 'client' | 'internal' | 'external';
    total_cost: number;
    taken_over?: boolean;
    partial_takeover?: boolean;
    takeover_amount?: number;
    shop_id: string;
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
  
  // États pour la prise en charge
  const [partialTakeover, setPartialTakeover] = useState(savCase.partial_takeover || false);
  const [takeoverAmount, setTakeoverAmount] = useState(savCase.takeover_amount || 0);
  const [updatingTakeover, setUpdatingTakeover] = useState(false);
  
  // Alerte lorsque l'on passe en "Prêt" sans pièces / prix d'achat
  const [showReadyWarning, setShowReadyWarning] = useState(false);
  const [readyWarningInfo, setReadyWarningInfo] = useState<{ noParts: boolean; noPurchase: boolean }>({ noParts: false, noPurchase: false });
  
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

      // Envoi automatique de demande d'avis si le statut passe à "ready" et que c'est activé
      console.log('Vérification envoi automatique d\'avis:', {
        selectedStatus,
        currentStatus: savCase.status,
        savType: savCase.sav_type,
        shouldSend: selectedStatus === 'ready' && savCase.status !== 'ready' && savCase.sav_type === 'client'
      });
      
      if (selectedStatus === 'ready' && savCase.status !== 'ready' && savCase.sav_type === 'client') {
        console.log('Envoi de la demande d\'avis automatique...');
        await sendAutomaticReviewRequest();
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

  const sendAutomaticReviewRequest = async () => {
    try {
      // Vérifier si l'envoi automatique est activé
      console.log('Récupération des paramètres de boutique pour l\'avis...');
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('auto_review_enabled, review_link, name')
        .eq('id', savCase.shop_id)
        .single();

      if (shopError || !shopData) {
        console.log('Impossible de récupérer les paramètres de boutique pour l\'envoi automatique d\'avis', shopError);
        return;
      }

      console.log('Paramètres boutique pour avis:', shopData);

      // Si l'envoi automatique n'est pas activé ou pas de lien d'avis configuré, ne rien faire
      if (!shopData.auto_review_enabled || !shopData.review_link) {
        console.log('Envoi automatique désactivé ou pas de lien d\'avis configuré');
        return;
      }

      const customerName = `${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim();
      
      const reviewMessage = `Bonjour ${customerName || 'cher client'} ! 👋

Votre réparation est maintenant terminée ! Si vous avez été satisfait(e) de notre service, nous vous serions reconnaissants de prendre un moment pour nous laisser un avis.

⭐ Laisser un avis : ${shopData.review_link}

Votre retour nous aide à continuer d'améliorer nos services.

Merci pour votre confiance ! 😊

L'équipe ${shopData.name || 'de réparation'}`;

      // Envoyer le message dans le chat SAV
      console.log('Envoi du message d\'avis dans le chat SAV...');
      const { error } = await supabase
        .from('sav_messages')
        .insert([{
          sav_case_id: savCase.id,
          shop_id: savCase.shop_id,
          sender_type: 'shop',
          sender_name: shopData.name || 'Équipe SAV',
          message: reviewMessage,
          read_by_shop: true,
          read_by_client: false
        }]);

      if (error) {
        console.error('Erreur lors de l\'envoi automatique de demande d\'avis:', error);
        return;
      }

      console.log('Message d\'avis envoyé avec succès');
      toast({
        title: "Demande d'avis envoyée",
        description: "Une demande d'avis automatique a été envoyée au client.",
      });

    } catch (error) {
      console.error('Erreur lors de l\'envoi automatique de demande d\'avis:', error);
    }
  };
  
  // Validation avant passage au statut "Prêt"
  const validateReadyConstraints = async (): Promise<{ ok: boolean; noParts: boolean; noPurchase: boolean }> => {
    try {
      const { data, error } = await supabase
        .from('sav_parts')
        .select('quantity, purchase_price')
        .eq('sav_case_id', savCase.id);
      if (error) throw error;
      const parts = data || [];
      const noParts = parts.length === 0;
      const totalPurchase = parts.reduce((sum, p: any) => sum + (Number(p.purchase_price) || 0) * (Number(p.quantity) || 0), 0);
      const noPurchase = totalPurchase <= 0;
      // Bloquer uniquement si aucune pièce ET aucun prix d'achat
      return { ok: !(noParts && noPurchase), noParts, noPurchase };
    } catch {
      // En cas d'erreur de vérification, ne pas bloquer mais avertir
      return { ok: true, noParts: false, noPurchase: false };
    }
  };

  // Procéder à la demande de changement de statut (avec logique SMS)
  const proceedWithStatusChange = async () => {
    if (savCase.customer?.phone && selectedStatus !== savCase.status) {
      setPendingStatusData({ status: selectedStatus, notes: notes.trim() });
      setShowSMSDialog(true);
    } else {
      await handleUpdateStatus(false);
    }
  };

  const handleStatusChangeRequest = async () => {
    if (selectedStatus === savCase.status && !notes.trim()) return;
    
    // Si on passe en "Prêt", vérifier la présence de pièces et de prix d'achat
    if (selectedStatus === 'ready' && selectedStatus !== savCase.status) {
      const { ok, noParts, noPurchase } = await validateReadyConstraints();
      if (!ok) {
        setReadyWarningInfo({ noParts, noPurchase });
        setShowReadyWarning(true);
        return;
      }
    }
    
    await proceedWithStatusChange();
  };

  const handleSMSChoice = async (sendSMS: boolean) => {
    if (pendingStatusData) {
      setSelectedStatus(pendingStatusData.status);
      setNotes(pendingStatusData.notes);
      await handleUpdateStatus(sendSMS);
    }
  };

  // Fonction pour mettre à jour la prise en charge
  const updateTakeover = async () => {
    if (savCase.sav_type !== 'client') return;
    
    setUpdatingTakeover(true);
    try {
      const { error } = await supabase
        .from('sav_cases')
        .update({
          partial_takeover: partialTakeover,
          takeover_amount: partialTakeover ? takeoverAmount : 0
        })
        .eq('id', savCase.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Prise en charge mise à jour avec succès",
      });

      onStatusUpdated?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setUpdatingTakeover(false);
    }
  };

  const hasChanges = selectedStatus !== savCase.status || notes.trim();
  const hasTakeoverChanges = partialTakeover !== (savCase.partial_takeover || false) || 
                            takeoverAmount !== (savCase.takeover_amount || 0);
  const limits = checkLimits('sms');
  const canSendSMS = limits.allowed && savCase.customer?.phone && savCase.tracking_slug;

  // Calculer le montant à payer par le client
  const clientAmount = partialTakeover ? 
    Math.max(0, savCase.total_cost - takeoverAmount) : 
    (savCase.taken_over ? 0 : savCase.total_cost);

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

        {/* Section Prise en charge - Uniquement pour les SAV clients */}
        {savCase.sav_type === 'client' && (
          <>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Euro className="h-5 w-5" />
                <h3 className="text-lg font-medium">Prise en charge financière</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="partial-takeover">Prise en charge partielle</Label>
                    <p className="text-sm text-muted-foreground">
                      Le magasin prend en charge une partie du coût du SAV
                    </p>
                  </div>
                  <Switch
                    id="partial-takeover"
                    checked={partialTakeover}
                    onCheckedChange={setPartialTakeover}
                  />
                </div>

                {partialTakeover && (
                  <div className="space-y-2">
                    <Label htmlFor="takeover-amount">Montant pris en charge par le magasin (€)</Label>
                    <Input
                      id="takeover-amount"
                      type="number"
                      min="0"
                      max={savCase.total_cost}
                      step="0.01"
                      value={takeoverAmount}
                      onChange={(e) => setTakeoverAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    <p className="text-sm text-muted-foreground">
                      Coût total du SAV : {savCase.total_cost.toFixed(2)}€
                    </p>
                  </div>
                )}

                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span>Montant à payer par le client :</span>
                    <span className="font-bold text-lg">
                      {clientAmount.toFixed(2)}€
                    </span>
                  </div>
                  {partialTakeover && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Magasin prend en charge : {takeoverAmount.toFixed(2)}€
                    </div>
                  )}
                </div>

                <Button
                  onClick={updateTakeover}
                  disabled={!hasTakeoverChanges || updatingTakeover}
                  variant="outline"
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatingTakeover ? 'Mise à jour...' : 'Sauvegarder prise en charge'}
                </Button>
              </div>
            </div>
          </>
        )}

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

        {/* Alerte: pas de pièces / pas de prix d'achat */}
        <Dialog open={showReadyWarning} onOpenChange={setShowReadyWarning}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Vérification avant passage en "Prêt"</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-orange-700">
                  Ce dossier semble incomplet.
                </AlertDescription>
              </Alert>
              <ul className="list-disc pl-5 text-sm">
                {readyWarningInfo.noParts && <li>Ce SAV n'a aucune pièce liée.</li>}
                {readyWarningInfo.noPurchase && <li>Aucun prix d'achat n'est renseigné pour les pièces.</li>}
              </ul>
              <p className="text-sm text-muted-foreground">
                Vous pouvez revenir pour ajouter des pièces ou forcer le statut en "Prêt".
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowReadyWarning(false)}>
                Revenir pour ajouter une pièce
              </Button>
              <Button onClick={async () => { setShowReadyWarning(false); await proceedWithStatusChange(); }}>
                Forcer le statut "Prêt"
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}