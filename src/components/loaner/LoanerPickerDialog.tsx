import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, PackageOpen, CheckCircle2 } from 'lucide-react';
import { LoanerEquipment, LOANER_CATEGORIES, useLoanerEquipment } from '@/hooks/useLoanerEquipment';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (equipment: LoanerEquipment) => void;
  selectedId?: string | null;
}

export function LoanerPickerDialog({ open, onOpenChange, onSelect, selectedId }: Props) {
  const { availableEquipment, isLoading } = useLoanerEquipment();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableEquipment;
    return availableEquipment.filter((e) =>
      [e.name, e.brand, e.model, e.imei, e.serial_number]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [availableEquipment, search]);

  const categoryLabel = (cat: string) =>
    LOANER_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5" /> Choisir le matériel à prêter
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <PackageOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Aucun matériel disponible.</p>
            <p className="text-xs mt-1">Ajoutez du matériel dans Paramètres → Matériel de prêt.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => {
              const isSelected = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => { onSelect(e); onOpenChange(false); }}
                  className={`w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{e.name}</span>
                      <Badge variant="outline" className="text-xs">{categoryLabel(e.category)}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[e.brand, e.model, e.color].filter(Boolean).join(' • ') || '—'}
                    </div>
                    {(e.imei || e.serial_number) && (
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">
                        {e.imei && <span>IMEI: {e.imei}</span>}
                        {e.imei && e.serial_number && <span> · </span>}
                        {e.serial_number && <span>SN: {e.serial_number}</span>}
                      </div>
                    )}
                  </div>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
