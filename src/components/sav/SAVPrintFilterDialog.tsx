import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer } from 'lucide-react';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';

interface SAVPrintFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (selectedTypes: string[], statusFilter: string) => void;
}

export function SAVPrintFilterDialog({ isOpen, onClose, onPrint }: SAVPrintFilterDialogProps) {
  const { getAllTypes } = useShopSAVTypes();
  const { statuses } = useShopSAVStatuses();
  const allTypes = getAllTypes();

  const [selectedTypes, setSelectedTypes] = useState<string[]>(allTypes.map(t => t.value));
  const [statusFilter, setStatusFilter] = useState('all-except-ready');

  const toggleType = (typeValue: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeValue)
        ? prev.filter(t => t !== typeValue)
        : [...prev, typeValue]
    );
  };

  const selectAllTypes = () => setSelectedTypes(allTypes.map(t => t.value));
  const deselectAllTypes = () => setSelectedTypes([]);

  const handlePrint = () => {
    if (selectedTypes.length === 0) return;
    onPrint(selectedTypes, statusFilter);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimer la liste SAV
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les types de SAV et le statut à inclure dans l'impression.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Types de SAV */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Types de SAV</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllTypes}>
                  Tout
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={deselectAllTypes}>
                  Aucun
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allTypes.map(type => (
                <label
                  key={type.value}
                  className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedTypes.includes(type.value)}
                    onCheckedChange={() => toggleType(type.value)}
                  />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filtre statut */}
          <div className="space-y-2">
            <span className="text-sm font-semibold">Statut</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="all-except-ready">Masquer les prêts</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                {statuses
                  .filter(s => s.is_active)
                  .sort((a, b) => a.display_order - b.display_order)
                  .map(s => (
                    <SelectItem key={s.status_key} value={s.status_key}>
                      {s.status_label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handlePrint} disabled={selectedTypes.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer ({selectedTypes.length} type{selectedTypes.length > 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
