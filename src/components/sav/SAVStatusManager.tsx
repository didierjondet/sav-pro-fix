import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateShortTrackingUrl, generateFullTrackingUrl } from '@/utils/trackingUtils';
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
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, MessageSquare, AlertTriangle, CreditCard, Euro } from 'lucide-react';
import { SMSButton } from '@/components/sav/SMSButton';
import { SAVCloseUnifiedDialog } from './SAVCloseUnifiedDialog';
import { useShop } from '@/hooks/useShop';

interface SAVStatusManagerProps {
  savCase: {
    id: string;
    case_number: string;
    status: string;
    sav_type: string; // Changé vers string pour supporter les types dynamiques
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

export function SAVStatusManager({ savCase, onStatusUpdated }: SAVStatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState(savCase.status);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // États pour la prise en charge
  const [partialTakeover, setPartialTakeover] = useState(savCase.partial_takeover || false);
  const [takeoverAmount, setTakeoverAmount] = useState(savCase.takeover_amount || 0);
  const [updatingTakeover, setUpdatingTakeover] = useState(false);
  
  // État pour le dialog de clôture SAV unifié
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  
  const { updateCaseStatus } = useSAVCases();
  const { subscription } = useSubscription();
  const { shop } = useShop();
  const { toast } = useToast();
  const { getStatusInfo, getAllStatuses, isReadyStatus } = useShopSAVStatuses();
  const { getTypeInfo } = useShopSAVTypes();

  const generateTrackingUrl = () => {
    if (!savCase.tracking_slug) return '';
    return generateFullTrackingUrl(savCase.tracking_slug);
  };

  const handleUpdateStatus = async (sendSMS = false) => {
    // Logique normale pour les changements de statut (sauf passage à "ready")
    if (selectedStatus === savCase.status && !notes.trim()) return;
    
    setUpdating(true);
    
    try {
      await updateCaseStatus(savCase.id, selectedStatus as any, notes.trim() || undefined);
      
      toast({
        title: "Statut mis à jour",
        description: "Le statut du dossier a été mis à jour avec succès",
      });

      // Envoi automatique de demande d'avis si le statut passe à "ready" et que le type nécessite des infos client
      const typeInfo = getTypeInfo(savCase.sav_type);
      if (isReadyStatus(selectedStatus) && !isReadyStatus(savCase.status) && typeInfo.show_customer_info) {
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
    }
  };

  const handleCloseConfirm = async (finalStatus: string) => {
    setShowCloseDialog(false);
    setUpdating(true);
    
    try {
      await updateCaseStatus(savCase.id, finalStatus as any, notes.trim() || undefined);
      
      // Envoi automatique de demande d'avis si c'est activé et que le type nécessite des infos client
      const typeInfo = getTypeInfo(savCase.sav_type);
      if (isReadyStatus(finalStatus) && typeInfo.show_customer_info) {
        await sendAutomaticReviewRequest();
      }
      
      setNotes('');
      setSelectedStatus(finalStatus);
      onStatusUpdated?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
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

  const handleStatusChangeRequest = async () => {
    if (selectedStatus === savCase.status && !notes.trim()) return;
    
    // Vérifier si c'est un statut "prêt" avec les statuts personnalisés
    if (isReadyStatus(selectedStatus) && !isReadyStatus(savCase.status)) {
      setShowCloseDialog(true);
      return;
    }
    
    // Pour les autres statuts, mise à jour directe
    await handleUpdateStatus(false);
  };

  // Fonction pour mettre à jour la prise en charge
  const updateTakeover = async () => {
    if (savCase.sav_type === 'internal') return;
    
    // Validation: notes privées obligatoires si prise en charge appliquée
    if (partialTakeover && takeoverAmount > 0 && !notes.trim()) {
      toast({
        title: "Notes privées requises",
        description: "Veuillez ajouter des notes privées pour justifier la prise en charge",
        variant: "destructive",
      });
      return;
    }
    
    setUpdatingTakeover(true);
    try {
      const previousTakeoverAmount = savCase.takeover_amount || 0;
      const newTakeoverAmount = partialTakeover ? takeoverAmount : 0;
      
      // Mise à jour des données du SAV avec les notes privées
      const updateData: any = {
        partial_takeover: partialTakeover,
        takeover_amount: newTakeoverAmount
      };
      
      // Ajouter les notes privées si elles existent ou si une prise en charge est appliquée
      if (notes.trim() || (partialTakeover && takeoverAmount > 0)) {
        updateData.private_comments = notes;
      }
      
      const { error } = await supabase
        .from('sav_cases')
        .update(updateData)
        .eq('id', savCase.id);

      if (error) throw error;

      // Envoyer un message automatique si la prise en charge a changé
      if (previousTakeoverAmount !== newTakeoverAmount) {
        const currentUser = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', currentUser.data.user?.id)
          .single();

        const senderName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Système';
        
        let message = '';
        const contactType = savCase.sav_type === 'client' ? 'votre' : 'la';
        
        if (partialTakeover) {
          const clientAmount = savCase.total_cost - newTakeoverAmount;
          message = `💰 Prise en charge appliquée :\n` +
                   `• Montant total : ${savCase.total_cost.toFixed(2)}€\n` +
                   `• Prise en charge : ${newTakeoverAmount.toFixed(2)}€\n` +
                   `• Montant restant à ${contactType} charge : ${clientAmount.toFixed(2)}€`;
        } else {
          message = `❌ Prise en charge supprimée\n` +
                   `• Montant total à ${contactType} charge : ${savCase.total_cost.toFixed(2)}€`;
        }

        // Envoyer le message automatique
        await supabase
          .from('sav_messages')
          .insert([{
            sav_case_id: savCase.id,
            sender_type: 'shop',
            sender_name: senderName,
            message: message,
            shop_id: savCase.shop_id
          }]);
      }

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
              <Badge style={getStatusInfo(savCase.status).color ? {
                backgroundColor: `${getStatusInfo(savCase.status).color}20`,
                color: getStatusInfo(savCase.status).color,
                borderColor: getStatusInfo(savCase.status).color
              } : undefined}>
                {getStatusInfo(savCase.status).label}
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
                {getAllStatuses().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: option.color }}
                      />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>


        <Button
          onClick={handleStatusChangeRequest}
          disabled={!hasChanges || updating}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {updating ? 'Mise à jour...' : 'Mettre à jour le statut'}
        </Button>

        {/* Section Prise en charge - Pour les SAV clients et externes */}
        {savCase.sav_type !== 'internal' && (
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

                <div>
                  <label className="text-sm font-medium">
                    Notes privées {partialTakeover && takeoverAmount > 0 ? '(obligatoire)' : '(optionnel)'}
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    ⚠️ {partialTakeover && takeoverAmount > 0 
                      ? 'Notes obligatoires pour justifier la prise en charge - non visibles par le client' 
                      : 'Ces notes sont privées et ne seront pas visibles par le client'}
                  </p>
                  <Textarea
                    placeholder={partialTakeover && takeoverAmount > 0 
                      ? "Justification obligatoire de la prise en charge..." 
                      : "Ajoutez des notes privées sur le changement de statut..."}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className={`mt-1 ${partialTakeover && takeoverAmount > 0 && !notes.trim() ? 'border-destructive' : ''}`}
                    required={partialTakeover && takeoverAmount > 0}
                  />
                  {partialTakeover && takeoverAmount > 0 && !notes.trim() && (
                    <p className="text-xs text-destructive mt-1">
                      Notes obligatoires pour justifier la prise en charge
                    </p>
                  )}
                </div>

                <Button
                  onClick={updateTakeover}
                  disabled={!hasTakeoverChanges || updatingTakeover || (partialTakeover && takeoverAmount > 0 && !notes.trim())}
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

        {/* Dialog de clôture SAV unifié */}
        <SAVCloseUnifiedDialog
          isOpen={showCloseDialog}
          onClose={() => setShowCloseDialog(false)}
          onConfirm={handleCloseConfirm}
          savCase={savCase as any}
          shop={shop}
          subscription={subscription}
          selectedStatus={selectedStatus}
        />
      </CardContent>
    </Card>
  );
}