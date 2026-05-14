import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileText, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { InventorySession } from './types';
import { printAggregateSummary, printPerSession } from '@/lib/inventoryPrintAggregate';

type DocType = 'aggregate' | 'detail_summary' | 'detail_missing';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: InventorySession[];
  preselectedIds?: string[];
  periodLabel?: string;
}

export function InventoryPrintDialog({ open, onOpenChange, sessions, preselectedIds, periodLabel }: Props) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [docType, setDocType] = useState<DocType>('aggregate');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(preselectedIds && preselectedIds.length ? preselectedIds : sessions.map((s) => s.id)));
      setDocType('aggregate');
    }
  }, [open, preselectedIds, sessions]);

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const allSelected = selectedIds.size === sessions.length && sessions.length > 0;
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(sessions.map((s) => s.id)));

  const chosen = useMemo(
    () => sessions.filter((s) => selectedIds.has(s.id)),
    [sessions, selectedIds],
  );

  const handlePrint = async () => {
    if (!chosen.length) {
      toast({ title: 'Aucun inventaire', description: 'Sélectionnez au moins un inventaire.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      if (docType === 'aggregate') {
        await printAggregateSummary(chosen, { periodLabel });
      } else if (docType === 'detail_summary') {
        await printPerSession(chosen, 'summary');
      } else {
        await printPerSession(chosen, 'missing');
      }
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Erreur impression', description: e instanceof Error ? e.message : 'Erreur', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Printer className="h-5 w-5" /> Imprimer des inventaires</DialogTitle>
          <DialogDescription>
            Sélectionnez les inventaires et le type de document à générer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Inventaires ({selectedIds.size}/{sessions.length})</Label>
              <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
            </div>
            <ScrollArea className="h-48 rounded-md border p-2">
              {sessions.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 text-center">Aucun inventaire dans la période.</div>
              ) : (
                <div className="space-y-1">
                  {sessions.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 rounded p-2 hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.applied_at || s.completed_at || s.created_at).toLocaleDateString('fr-FR')} · {s.status}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Type de document</Label>
            <RadioGroup value={docType} onValueChange={(v) => setDocType(v as DocType)} className="space-y-2">
              <label className="flex items-start gap-3 rounded border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="aggregate" />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Synthèse globale (1 PDF)</div>
                  <div className="text-xs text-muted-foreground">Tableau récapitulatif et totaux pour tous les inventaires sélectionnés.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="detail_summary" />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Synthèses détaillées (1 PDF par inventaire)</div>
                  <div className="text-xs text-muted-foreground">Document complet de chaque inventaire avec écarts et bilan financier.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="detail_missing" />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Produits manquants (1 PDF par inventaire)</div>
                  <div className="text-xs text-muted-foreground">Liste détaillée des références non retrouvées par inventaire.</div>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button onClick={handlePrint} disabled={busy || chosen.length === 0}>
            <Printer className="h-4 w-4" /> {busy ? 'Génération…' : 'Générer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
