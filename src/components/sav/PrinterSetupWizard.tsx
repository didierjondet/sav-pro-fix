import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, ChevronLeft, ChevronRight, Lightbulb, AlertTriangle } from 'lucide-react';
import { getSetupSteps, type LabelPrinterSpec } from '@/lib/labelPrinters';
import { setupDoneStorageKey } from './printerSetupState';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  spec: LabelPrinterSpec;
  widthMm: number;
  heightMm: number;
  onDoneChange?: (done: boolean) => void;
}

export function PrinterSetupWizard({ open, onOpenChange, spec, widthMm, heightMm, onDoneChange }: Props) {
  const steps = useMemo(() => getSetupSteps(spec, { widthMm, heightMm }), [spec, widthMm, heightMm]);
  const [index, setIndex] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const isLast = index === steps.length - 1;
  const current = steps[index];

  const handleFinish = () => {
    if (confirmed) {
      localStorage.setItem(setupDoneStorageKey(spec.id), '1');
      onDoneChange?.(true);
    }
    setIndex(0);
    setConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setIndex(0); setConfirmed(false); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assistant de configuration Windows</DialogTitle>
          <DialogDescription>
            {spec.brand} {spec.model} — format {widthMm}×{heightMm} mm. Suivez ces étapes une fois par poste, puis cochez « Terminé ».
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-orange-400/40 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-xs">
            <strong>Pourquoi cette étape ?</strong> Chrome sous Windows ne peut pas imposer la taille de papier au pilote.
            Si le format papier n'est pas correctement configuré côté Windows, l'imprimante déroule une longue bande vide
            et saute plusieurs étiquettes physiques entre chaque impression.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Étape {index + 1} / {steps.length}
          </div>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full ${i === index ? 'bg-primary' : i < index ? 'bg-primary/60' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 min-h-[180px]">
          <h3 className="text-base font-semibold">{current.title}</h3>
          <p className="text-sm leading-relaxed whitespace-pre-line">{current.body}</p>
          {current.tip && (
            <div className="rounded-md border bg-muted/40 p-2.5 text-xs flex gap-2">
              <Lightbulb className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <span className="leading-relaxed">{current.tip}</span>
            </div>
          )}
        </div>

        {isLast && (
          <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
            <Checkbox
              id="setup-done"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="setup-done" className="text-sm leading-snug cursor-pointer">
              J'ai terminé la configuration sur ce poste. Ne plus afficher le rappel avant impression pour cette imprimante.
            </label>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          {isLast ? (
            <Button type="button" onClick={handleFinish}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Terminer
            </Button>
          ) : (
            <Button type="button" onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
