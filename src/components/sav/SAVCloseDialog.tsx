import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { generateSAVRestitutionPDF } from '@/utils/pdfGenerator';
import { useSAVMessages } from '@/hooks/useSAVMessages';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useProfile } from '@/hooks/useProfile';
import { FileText, Download, Printer, MessageSquare } from 'lucide-react';
import { SAVCase } from '@/hooks/useSAVCases';
import { Shop } from '@/hooks/useShop';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';

interface SAVCloseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  savCase: SAVCase;
  shop?: Shop;
}

export function SAVCloseDialog({ isOpen, onClose, onConfirm, savCase, shop }: SAVCloseDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPrintingDocument, setIsPrintingDocument] = useState(false);
  const [technicianComments, setTechnicianComments] = useState(savCase.technician_comments || '');
  const { sendMessage } = useSAVMessages(savCase.id);
  const { updateTechnicianComments } = useSAVCases();
  const { profile } = useProfile();

  const handleConfirm = async () => {
    setIsProcessing(true);
    
    try {
      // Sauvegarder les commentaires technicien s'ils ont été modifiés
      if (technicianComments !== savCase.technician_comments) {
        await updateTechnicianComments(savCase.id, technicianComments);
      }
      
      // Confirmer la clôture (passer au statut "prêt")
      onConfirm();
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintDocument = async () => {
    setIsPrintingDocument(true);
    
    try {
      // Générer et imprimer le PDF
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
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error);
    } finally {
      setIsPrintingDocument(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Clôture du dossier SAV
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vous êtes sur le point de clôturer le dossier SAV <strong>{savCase.case_number}</strong> et le passer au statut <strong>"Prêt"</strong>.
          </p>

          <div className="space-y-2">
            <Label htmlFor="technician-comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Commentaire pour le client
            </Label>
            <Textarea
              id="technician-comments"
              placeholder="Décrivez l'intervention réalisée, les problèmes rencontrés ou les recommandations pour le client..."
              value={technicianComments}
              onChange={(e) => setTechnicianComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Ce commentaire sera imprimé sur le bon de restitution remis au client.
            </p>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Download className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Document de restitution disponible</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6 mb-3">
              <li>• Informations du magasin et du client</li>
              <li>• Détail des pièces remplacées avec prix</li>
              <li>• Commentaires technicien</li>
              <li>• Prises en charge et remises éventuelles</li>
              <li>• Coût final à régler</li>
              <li>• Récapitulatif de l'intervention</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Le document sera archivé dans la discussion du SAV si généré.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing || isPrintingDocument}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || isPrintingDocument}
            className="w-full sm:w-auto"
          >
            {isProcessing ? 'Traitement...' : 'Clôturer le dossier'}
          </Button>
          <Button
            onClick={handlePrintDocument}
            disabled={isProcessing || isPrintingDocument}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrintingDocument ? 'Génération...' : 'Imprimer le document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}