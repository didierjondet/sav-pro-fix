import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Smartphone } from 'lucide-react';
import { SAVPrintButton } from '@/components/sav/SAVPrint';

/** Fenêtre d'impression affichée sur l'ordinateur quand le SAV vient d'être saisi sur smartphone. */
export function MobileCreatedPrintDialog({ savCase }: { savCase: any }) {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('from') === 'mobile');
  const close = () => {
    setOpen(false);
    params.delete('from');
    setParams(params, { replace: true });
  };
  if (!savCase) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> SAV {savCase.case_number} créé</DialogTitle>
          <DialogDescription>Saisi depuis le smartphone. Imprimez les documents de prise en charge.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center" onClick={() => setTimeout(close, 500)}>
          <SAVPrintButton savCase={savCase} size="lg" variant="default" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
