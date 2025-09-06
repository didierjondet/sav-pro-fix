import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { generateSAVRestitutionPDF } from '@/utils/pdfGenerator';
import { generateShortTrackingUrl } from '@/utils/trackingUtils';
import { useSAVMessages } from '@/hooks/useSAVMessages';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useProfile } from '@/hooks/useProfile';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle,
  Printer,
  Download,
  User,
  Euro,
  Phone,
  PhoneOff
} from 'lucide-react';
import { SAVCase } from '@/hooks/useSAVCases';
import { Shop } from '@/hooks/useShop';

interface SAVCloseUnifiedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  savCase: SAVCase & {
    customer?: {
      first_name: string;
      last_name: string;
      phone?: string;
    };
    tracking_slug?: string;
  };
  shop?: Shop;
  subscription?: {
    sms_credits_allocated: number;
    sms_credits_used: number;
  };
  notes?: string;
}

interface WarningInfo {
  noParts: boolean;
  noPurchase: boolean;
}

export function SAVCloseUnifiedDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  savCase, 
  shop, 
  subscription,
  notes = ''
}: SAVCloseUnifiedDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [technicianComments, setTechnicianComments] = useState(savCase.technician_comments || '');
  const [statusNotes, setStatusNotes] = useState(notes);
  const [sendSMS, setSendSMS] = useState(false);
  const [warnings, setWarnings] = useState<WarningInfo>({ noParts: false, noPurchase: false });
  const [forceClose, setForceClose] = useState(false);
  const [documentGenerated, setDocumentGenerated] = useState(false);

  const { sendMessage } = useSAVMessages(savCase.id);
  const { updateTechnicianComments } = useSAVCases();
  const { profile } = useProfile();
  const { getStatusInfo } = useShopSAVStatuses();
  const { toast } = useToast();

  // Vérifier les avertissements au chargement
  useEffect(() => {
    if (isOpen) {
      checkWarnings();
    }
  }, [isOpen, savCase.id]);

  const checkWarnings = async () => {
    try {
      const { data: parts, error } = await supabase
        .from('sav_parts')
        .select('id, part_id, purchase_price, parts(purchase_price)')
        .eq('sav_case_id', savCase.id);

      if (error) throw error;

      const noParts = !parts || parts.length === 0;
      const noPurchase = parts?.some(part => 
        !part.purchase_price && (!part.parts || !part.parts.purchase_price)
      ) || false;

      setWarnings({ noParts, noPurchase });
    } catch (error) {
      console.error('Erreur lors de la vérification des avertissements:', error);
    }
  };

  const hasWarnings = warnings.noParts || warnings.noPurchase;
  const canSendSMS = savCase.customer?.phone && subscription && 
    (subscription.sms_credits_used < subscription.sms_credits_allocated);
  const smsCreditsRemaining = subscription ? 
    (subscription.sms_credits_allocated - subscription.sms_credits_used) : 0;

  const handleGenerateDocument = async () => {
    try {
      setIsProcessing(true);
      
      // Sauvegarder les commentaires technicien s'ils ont été modifiés
      if (technicianComments !== savCase.technician_comments) {
        await updateTechnicianComments(savCase.id, technicianComments);
      }

      // Générer et télécharger le PDF
      generateSAVRestitutionPDF(savCase, shop);

      if (sendMessage && profile) {
        // Ajouter un message dans le SAV pour indiquer la génération du document
        const senderName = `${profile.first_name} ${profile.last_name}`.trim() || 'Équipe SAV';
        await sendMessage(
          `📄 Document de restitution généré pour la clôture du dossier SAV ${savCase.case_number}.`,
          senderName,
          'shop'
        );
      }

      setDocumentGenerated(true);
      toast({
        title: "Document généré",
        description: "Le document de restitution a été généré avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (hasWarnings && !forceClose) {
      toast({
        title: "Attention",
        description: "Veuillez résoudre les avertissements ou cocher 'Forcer la clôture'",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Sauvegarder les commentaires technicien s'ils ont été modifiés
      if (technicianComments !== savCase.technician_comments) {
        await updateTechnicianComments(savCase.id, technicianComments);
      }

      // Envoyer SMS si demandé
      if (sendSMS && canSendSMS && savCase.customer?.phone && savCase.tracking_slug) {
        const customerName = `${savCase.customer.first_name} ${savCase.customer.last_name}`;
        const shortTrackingUrl = generateShortTrackingUrl(savCase.tracking_slug);
        const statusInfo = getStatusInfo('ready');
        
        const message = `Bonjour ${customerName}, votre dossier de réparation ${savCase.case_number} a été mis à jour : ${statusInfo.label}. Suivez l'évolution : ${shortTrackingUrl}`;
        
        await supabase.functions.invoke('send-sms', {
          body: {
            shopId: savCase.shop_id,
            toNumber: savCase.customer.phone,
            message: message,
            type: 'status_change',
            recordId: savCase.id
          }
        });
      }

      // Confirmer la clôture
      onConfirm();
      
      toast({
        title: "Dossier clôturé",
        description: sendSMS ? "Dossier clôturé et SMS envoyé" : "Dossier clôturé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la clôture du dossier",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Clôture du dossier SAV {savCase.case_number}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne gauche - Informations et avertissements */}
          <div className="space-y-4">
            {/* Avertissements */}
            {hasWarnings && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-4 w-4" />
                    Vérifications requises
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {warnings.noParts && (
                    <div className="flex items-center gap-2 text-sm text-orange-700">
                      <AlertTriangle className="h-3 w-3" />
                      Ce SAV n'a aucune pièce liée
                    </div>
                  )}
                  {warnings.noPurchase && (
                    <div className="flex items-center gap-2 text-sm text-orange-700">
                      <Euro className="h-3 w-3" />
                      Aucun prix d'achat renseigné pour les pièces
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="force-close"
                      checked={forceClose}
                      onCheckedChange={setForceClose}
                    />
                    <Label htmlFor="force-close" className="text-sm font-medium">
                      Forcer la clôture malgré les avertissements
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notification SMS */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  {canSendSMS ? (
                    <Phone className="h-4 w-4 text-green-600" />
                  ) : (
                    <PhoneOff className="h-4 w-4 text-gray-400" />
                  )}
                  Notification client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {savCase.customer?.phone ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      <p>Client : {savCase.customer.first_name} {savCase.customer.last_name}</p>
                      <p>Téléphone : {savCase.customer.phone}</p>
                      {subscription && (
                        <p className="text-xs">
                          SMS restants : {smsCreditsRemaining}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="send-sms"
                        checked={sendSMS}
                        onCheckedChange={setSendSMS}
                        disabled={!canSendSMS}
                      />
                      <Label htmlFor="send-sms" className="text-sm font-medium">
                        {canSendSMS ? 
                          "Envoyer un SMS de notification" : 
                          "Pas de crédit SMS disponible"
                        }
                      </Label>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun numéro de téléphone renseigné pour ce client.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Document de restitution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Document de restitution
                </CardTitle>
                <CardDescription>
                  Générez le document final à remettre au client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateDocument}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Génération...' : 'Générer et télécharger'}
                </Button>
                
                {documentGenerated && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Document généré avec succès
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Commentaires */}
          <div className="space-y-4">
            {/* Commentaires technicien */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Commentaire pour le client
                </CardTitle>
                <CardDescription>
                  Ce commentaire sera visible sur le document de restitution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Décrivez l'intervention réalisée, les problèmes rencontrés ou les recommandations pour le client..."
                  value={technicianComments}
                  onChange={(e) => setTechnicianComments(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Notes de statut (optionnel) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Notes internes (optionnel)
                </CardTitle>
                <CardDescription>
                  Notes visibles uniquement par votre équipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Notes internes sur la clôture du dossier..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Résumé du dossier */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Résumé du dossier</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Numéro :</span>
                  <Badge variant="outline">{savCase.case_number}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Type :</span>
                  <Badge variant="secondary">{savCase.sav_type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Coût total :</span>
                  <span className="font-medium">{savCase.total_cost?.toFixed(2)} €</span>
                </div>
                {savCase.taken_over && (
                  <div className="flex justify-between">
                    <span>Prise en charge :</span>
                    <span className="font-medium text-green-600">
                      {savCase.partial_takeover ? 
                        `${savCase.takeover_amount?.toFixed(2)} €` : 
                        'Totale'
                      }
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="sm:w-auto"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || (hasWarnings && !forceClose)}
            className="sm:w-auto"
          >
            {isProcessing ? 'Traitement...' : 'Clôturer le dossier'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}