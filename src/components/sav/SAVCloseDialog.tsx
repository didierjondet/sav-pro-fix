import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { generateSAVRestitutionPDF } from '@/utils/pdfGenerator';
import { useSAVMessages } from '@/hooks/useSAVMessages';
import { useProfile } from '@/hooks/useProfile';
import { FileText, Download } from 'lucide-react';
import { SAVCase } from '@/hooks/useSAVCases';
import { Shop } from '@/hooks/useShop';

interface SAVCloseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  savCase: SAVCase;
  shop?: Shop;
}

export function SAVCloseDialog({ isOpen, onClose, onConfirm, savCase, shop }: SAVCloseDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { sendMessage } = useSAVMessages(savCase.id);
  const { profile } = useProfile();

  const handleConfirm = async () => {
    setIsProcessing(true);
    
    try {
      // Confirmer la clôture directement
      onConfirm();
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintDocument = async () => {
    try {
      // Générer le PDF et obtenir l'URL
      const pdfUrl = await generateSAVRestitutionPDF(savCase, shop);
      
      if (pdfUrl && sendMessage && profile) {
        // Ajouter le lien PDF dans les messages SAV
        const senderName = `${profile.first_name} ${profile.last_name}`.trim() || 'Équipe SAV';
        await sendMessage(
          `📄 Document de restitution généré pour le dossier SAV ${savCase.case_number}.\n\nConsultez le document : ${pdfUrl}`,
          senderName,
          'shop'
        );
      }
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Clôture du dossier SAV
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vous êtes sur le point de clôturer le dossier SAV <strong>{savCase.case_number}</strong>.
          </p>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Document de restitution disponible</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>• Informations du magasin</li>
              <li>• Détail des pièces remplacées</li>
              <li>• Prises en charge éventuelles</li>
              <li>• Coût final à régler</li>
              <li>• Récapitulatif de l'intervention</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Le document sera archivé dans la discussion du SAV lors de l'impression.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Traitement...' : 'Clôturer le dossier'}
          </Button>
          <Button
            onClick={handlePrintDocument}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Imprimer le document de restitution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}