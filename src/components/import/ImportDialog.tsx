import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleImport } from './SimpleImport';
import { ImportCustomers } from './ImportCustomers';
import { ImportQuotes } from './ImportQuotes';
import { ImportSAVs } from './ImportSAVs';

interface ImportDialogProps {
  type: 'parts' | 'customers' | 'quotes' | 'savs';
  shopId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function ImportDialog({ type, shopId, onSuccess, onClose }: ImportDialogProps) {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');

  const titles = {
    parts: 'Importer des pièces',
    customers: 'Importer des clients',
    quotes: 'Importer des devis',
    savs: 'Importer des SAV'
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[type]}</DialogTitle>
        </DialogHeader>
        
        {mode === 'simple' ? (
          <SimpleImport
            type={type}
            shopId={shopId}
            onSuccess={onSuccess}
            onBack={onClose}
            onAdvancedMode={() => setMode('advanced')}
          />
        ) : (
          <div>
            {type === 'customers' && (
              <ImportCustomers onBack={onClose} onSuccess={onSuccess} />
            )}
            {type === 'quotes' && (
              <ImportQuotes onBack={onClose} onSuccess={onSuccess} />
            )}
            {type === 'savs' && (
              <ImportSAVs onBack={onClose} onSuccess={onSuccess} />
            )}
            {type === 'parts' && (
              <div className="text-center py-8 text-muted-foreground">
                Mode avancé non disponible pour les pièces. Veuillez utiliser le mode simple.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
