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
import { useUnifiedSMSCredits } from '@/hooks/useUnifiedSMSCredits';
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
  PhoneOff,
  Star,
  ExternalLink
} from 'lucide-react';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { SAVCase } from '@/hooks/useSAVCases';
import { Shop } from '@/hooks/useShop';
import { AITextReformulator } from '@/components/sav/AITextReformulator';

interface SAVCloseUnifiedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalStatus: string) => void;
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
  selectedStatus: string;
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
  selectedStatus
}: SAVCloseUnifiedDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [technicianComments, setTechnicianComments] = useState(savCase.technician_comments || '');
  const [privateComments, setPrivateComments] = useState(savCase.private_comments || '');
  const [sendSMS, setSendSMS] = useState(false);
  const [sendSatisfaction, setSendSatisfaction] = useState(false);
  const [warnings, setWarnings] = useState<WarningInfo>({ noParts: false, noPurchase: false });
  const [forceClose, setForceClose] = useState(false);
  const [documentGenerated, setDocumentGenerated] = useState(false);
  const [printAttachments, setPrintAttachments] = useState(false);

  const { sendMessage } = useSAVMessages(savCase.id);
  const { updateTechnicianComments } = useSAVCases();
  const { profile } = useProfile();
  const { credits } = useUnifiedSMSCredits();
  const { getStatusInfo } = useShopSAVStatuses();
  const { getTypeInfo } = useShopSAVTypes();
  const { toast } = useToast();

  // Vérifier si le type SAV permet les enquêtes de satisfaction
  const savTypeInfo = getTypeInfo(savCase.sav_type);
  const showSatisfactionSurvey = savTypeInfo?.show_satisfaction_survey ?? true;

  // Vérifier les avertissements et recharger les commentaires frais à l'ouverture
  useEffect(() => {
    if (isOpen) {
      checkWarnings();
      // Recharger les commentaires depuis la base pour éviter l'état stale
      const fetchFreshComments = async () => {
        const { data } = await supabase
          .from('sav_cases')
          .select('technician_comments, private_comments, repair_notes')
          .eq('id', savCase.id)
          .single();
        if (data) {
          setTechnicianComments(data.technician_comments || '');
          setPrivateComments(data.private_comments || '');
        }
      };
      fetchFreshComments();
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
  const canSendSMS = savCase.customer?.phone && credits && !credits.is_exhausted;
  const smsCreditsRemaining = credits?.total_remaining || 0;

  const fetchClientMessages = async () => {
    const { data } = await supabase
      .from('sav_messages')
      .select('*')
      .eq('sav_case_id', savCase.id)
      .eq('sender_type', 'client')
      .order('created_at', { ascending: true });
    return data || [];
  };

  const handleGenerateDocument = async () => {
    try {
      setIsProcessing(true);
      
      // Sauvegarder les commentaires technicien s'ils ont été modifiés
      if (technicianComments !== savCase.technician_comments) {
        await updateTechnicianComments(savCase.id, technicianComments);
      }

      // Récupérer les données fraîches du SAV (avec closure_history à jour)
      const { data: freshCase } = await supabase
        .from('sav_cases')
        .select('*, customers(*)')
        .eq('id', savCase.id)
        .single();

      const caseForPDF = freshCase ? { ...savCase, closure_history: (freshCase.closure_history || []) as any, customer: (freshCase as any).customers || savCase.customer, technician_comments: technicianComments, private_comments: privateComments } as SAVCase : { ...savCase, technician_comments: technicianComments, private_comments: privateComments };

      // Récupérer les messages client et générer le PDF
      const clientMessages = await fetchClientMessages();
      await generateSAVRestitutionPDF(caseForPDF, shop, { includeAttachments: printAttachments, clientMessages });

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

      // Sauvegarder les commentaires privés s'ils ont été modifiés
      if (privateComments !== savCase.private_comments) {
        const { error: updateError } = await supabase
          .from('sav_cases')
          .update({ private_comments: privateComments })
          .eq('id', savCase.id);
        
        if (updateError) throw updateError;
      }

      // Envoyer SMS si demandé
      if (sendSMS && canSendSMS && savCase.customer?.phone && savCase.tracking_slug) {
        const customerName = `${savCase.customer.first_name} ${savCase.customer.last_name}`;
        const shortTrackingUrl = generateShortTrackingUrl(savCase.tracking_slug);
        const statusInfo = getStatusInfo(selectedStatus);
        
        // Utiliser le message personnalisé si configuré, sinon utiliser le message par défaut
        let message = '';
        if (shop?.custom_review_sms_message && shop?.review_link) {
          // Remplacer les variables dans le message personnalisé
          message = shop.custom_review_sms_message
            .replace('{customer_name}', customerName)
            .replace('{case_number}', savCase.case_number)
            .replace('{status}', statusInfo.label)
            .replace('{review_link}', shop.review_link)
            .replace('{shop_name}', shop.name || 'notre équipe');
        } else {
          // Message par défaut
          message = `Bonjour ${customerName}, votre dossier de réparation ${savCase.case_number} a été mis à jour : ${statusInfo.label}. Suivez l'évolution : ${shortTrackingUrl}`;
        }
        
        try {
          const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              shopId: savCase.shop_id,
              toNumber: savCase.customer.phone,
              message: message,
              type: 'status_change',
              recordId: savCase.id
            }
          });

          if (smsError || !smsData?.success) {
            console.error('SMS envoi échoué:', smsError?.message || smsData?.error);
            toast({
              title: "⚠️ SMS non envoyé",
              description: "Le SAV a été clôturé mais le SMS n'a pas pu être envoyé. Vous pouvez le renvoyer manuellement.",
              variant: "destructive",
            });
          }
        } catch (smsErr: any) {
          console.error('Erreur envoi SMS clôture:', smsErr);
          toast({
            title: "⚠️ SMS non envoyé",
            description: "Le SAV a été clôturé mais le SMS n'a pas pu être envoyé.",
            variant: "destructive",
          });
        }
      }

      // Envoyer enquête satisfaction si demandé
      if (sendSatisfaction && canSendSMS && savCase.customer?.phone) {
        try {
          // Générer un token unique pour l'enquête
          const accessToken = crypto.randomUUID();
          const customerName = `${savCase.customer.first_name} ${savCase.customer.last_name}`;
          
          // Créer l'enquête dans la base de données
          const { error: surveyError } = await supabase.from('satisfaction_surveys').insert({
            shop_id: savCase.shop_id,
            sav_case_id: savCase.id,
            customer_id: savCase.customer_id,
            access_token: accessToken,
            sent_via: 'sms',
            sent_at: new Date().toISOString()
          });
          
          if (surveyError) throw surveyError;
          
          // Construire l'URL de satisfaction
          const satisfactionUrl = `${window.location.origin}/satisfaction/${accessToken}`;
          const satisfactionMessage = `Bonjour ${customerName}, comment s'est passée votre réparation chez ${shop?.name || 'nous'} ? Notez-nous en 30 secondes : ${satisfactionUrl}`;
          
          // Envoyer le SMS
          const { data: satisfactionSmsData, error: satisfactionSmsError } = await supabase.functions.invoke('send-sms', {
            body: {
              shopId: savCase.shop_id,
              toNumber: savCase.customer.phone,
              message: satisfactionMessage,
              type: 'satisfaction',
              recordId: savCase.id
            }
          });

          if (satisfactionSmsError || !satisfactionSmsData?.success) {
            throw new Error(satisfactionSmsError?.message || satisfactionSmsData?.error || 'Erreur lors de l\'envoi du SMS de satisfaction');
          }
          
          toast({
            title: "Enquête envoyée",
            description: "L'enquête de satisfaction a été envoyée au client",
          });
        } catch (error) {
          console.error('Erreur envoi satisfaction:', error);
          toast({
            title: "Erreur",
            description: "Erreur lors de l'envoi de l'enquête de satisfaction",
            variant: "destructive",
          });
        }
      }

      // Confirmer la clôture
      onConfirm(selectedStatus);
      
      // Générer et imprimer automatiquement le document de restitution
      try {
        // Petit délai pour laisser la clôture s'enregistrer en base
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Récupérer les données fraîches du SAV (avec closure_history à jour)
        const { data: freshCase } = await supabase
          .from('sav_cases')
          .select('*, customers(*)')
          .eq('id', savCase.id)
          .single();

        const caseForPDF = freshCase ? { ...savCase, closure_history: (freshCase.closure_history || []) as any, customer: (freshCase as any).customers || savCase.customer, technician_comments: technicianComments, private_comments: privateComments } as SAVCase : { ...savCase, technician_comments: technicianComments, private_comments: privateComments };

        const clientMessages = await fetchClientMessages();
        await generateSAVRestitutionPDF(caseForPDF, shop, { includeAttachments: printAttachments, clientMessages });
        
        if (sendMessage && profile) {
          const senderName = `${profile.first_name} ${profile.last_name}`.trim() || 'Équipe SAV';
          await sendMessage(
            `📄 Document de restitution généré pour la clôture du dossier SAV ${savCase.case_number}.`,
            senderName,
            'shop'
          );
        }
      } catch (docError) {
        console.error('Erreur génération document:', docError);
      }
      
      toast({
        title: "Dossier clôturé",
        description: sendSMS ? "Dossier clôturé, SMS envoyé et document généré" : "Dossier clôturé et document généré",
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

            {/* SMS de clôture + avis Google */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  {canSendSMS ? (
                    <Phone className="h-4 w-4 text-blue-600" />
                  ) : (
                    <PhoneOff className="h-4 w-4 text-gray-400" />
                  )}
                  SMS de clôture + avis Google
                </CardTitle>
                <CardDescription>
                  Informe le client et l'invite à laisser un avis Google
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {savCase.customer?.phone ? (
                  <>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Client : {savCase.customer.first_name} {savCase.customer.last_name}</p>
                      <p>Téléphone : {savCase.customer.phone}</p>
                      <p className="text-xs">SMS restants : {smsCreditsRemaining}</p>
                    </div>
                    
                    {shop?.review_link ? (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span>Lien avis Google : configuré</span>
                        <a href={shop.review_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Lien avis Google non configuré (Paramètres → Boutique)</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="send-sms"
                        checked={sendSMS}
                        onCheckedChange={setSendSMS}
                        disabled={!canSendSMS}
                      />
                      <Label htmlFor="send-sms" className="text-sm font-medium">
                        {canSendSMS ? 
                          "Envoyer SMS de clôture et demande d'avis" : 
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

            {/* Enquête de satisfaction interne */}
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  Enquête de satisfaction interne
                </CardTitle>
                <CardDescription>
                  Envoyez une demande de notation par étoiles (1-5) pour vos statistiques
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {savCase.customer?.phone ? (
                  <>
                    {!showSatisfactionSurvey && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Désactivé pour ce type de SAV</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="send-satisfaction"
                        checked={sendSatisfaction}
                        onCheckedChange={setSendSatisfaction}
                        disabled={!canSendSMS || !showSatisfactionSurvey}
                      />
                      <Label htmlFor="send-satisfaction" className="text-sm font-medium">
                        Envoyer le questionnaire de satisfaction
                      </Label>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      ⭐ Le client notera de 1 à 5 étoiles et pourra laisser un commentaire.
                      Ces données alimentent vos statistiques internes.
                    </p>
                    
                    {sendSatisfaction && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Utilise 1 crédit SMS supplémentaire
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun numéro de téléphone renseigné pour ce client.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Option d'impression des pièces jointes */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-purple-600" />
                  Documents et photos joints
                </CardTitle>
                <CardDescription>
                  Inclure les pièces jointes du SAV dans le document de restitution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="print-attachments"
                    checked={printAttachments}
                    onCheckedChange={setPrintAttachments}
                  />
                  <Label htmlFor="print-attachments" className="text-sm font-medium">
                    Imprimer les documents et photos joints
                  </Label>
                </div>
                {printAttachments && (
                  <p className="text-xs text-muted-foreground mt-2">
                    📎 Les images et documents attachés au SAV seront ajoutés au document de restitution
                  </p>
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
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="technician-comments">Commentaires</Label>
                  <AITextReformulator
                    text={technicianComments}
                    context="technician_comments"
                    onReformulated={(reformulatedText) => setTechnicianComments(reformulatedText)}
                  />
                </div>
                <Textarea
                  id="technician-comments"
                  placeholder="Décrivez l'intervention réalisée, les problèmes rencontrés ou les recommandations pour le client..."
                  value={technicianComments}
                  onChange={(e) => setTechnicianComments(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Commentaires privés */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Commentaires privés (optionnel)
                </CardTitle>
                <CardDescription>
                  Commentaires internes JAMAIS visibles sur les documents clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="private-comments">Commentaires internes</Label>
                  <AITextReformulator
                    text={privateComments}
                    context="private_comments"
                    onReformulated={(reformulatedText) => setPrivateComments(reformulatedText)}
                  />
                </div>
                <Textarea
                  id="private-comments"
                  placeholder="Notes privées, historique interne, détails confidentiels..."
                  value={privateComments}
                  onChange={(e) => setPrivateComments(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Ces commentaires ne seront jamais imprimés sur les documents de restitution
                </p>
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