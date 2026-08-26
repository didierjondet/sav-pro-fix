import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Printer, Tags, ListChecks, Building2 } from 'lucide-react';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useSAVProviders } from '@/hooks/useSAVProviders';

export interface SAVPrintSelection {
  types: string[];
  statuses: string[];
  /** Ids de prestataires + 'none' pour « sans prestataire » */
  providers: string[];
}

interface SAVPrintFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (selection: SAVPrintSelection) => void;
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  total,
  onAll,
  onNone,
}: {
  icon: any;
  title: string;
  count: number;
  total: number;
  onAll: () => void;
  onNone: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{title}</span>
        <Badge variant="secondary" className="text-[11px]">{count}/{total}</Badge>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAll}>Tout</Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onNone}>Aucun</Button>
      </div>
    </div>
  );
}

export function SAVPrintFilterDialog({ isOpen, onClose, onPrint }: SAVPrintFilterDialogProps) {
  const { getAllTypes } = useShopSAVTypes();
  const { statuses } = useShopSAVStatuses();
  const { providers } = useSAVProviders();
  const allTypes = getAllTypes();
  const activeStatuses = statuses
    .filter(s => s.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  const activeProviders = providers.filter(p => p.is_active !== false);

  const [selectedTypes, setSelectedTypes] = useState<string[]>(allTypes.map(t => t.value));
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const handlePrint = () => {
    if (selectedTypes.length === 0) return;
    onPrint({
      types: selectedTypes,
      statuses: selectedStatuses,
      providers: selectedProviders,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimer la liste SAV
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les types, statuts et prestataires à inclure. Une section vide = aucun filtre sur ce critère.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-3">
          <div className="space-y-5 pb-2">
            {/* Types de SAV */}
            <div className="space-y-2.5">
              <SectionHeader
                icon={Tags}
                title="Types de SAV"
                count={selectedTypes.length}
                total={allTypes.length}
                onAll={() => setSelectedTypes(allTypes.map(t => t.value))}
                onNone={() => setSelectedTypes([])}
              />
              <div className="grid grid-cols-2 gap-2">
                {allTypes.map(type => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={() => toggle(selectedTypes, setSelectedTypes, type.value)}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm truncate">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Statuts */}
            <div className="space-y-2.5">
              <SectionHeader
                icon={ListChecks}
                title="Statuts"
                count={selectedStatuses.length}
                total={activeStatuses.length}
                onAll={() => setSelectedStatuses(activeStatuses.map(s => s.status_key))}
                onNone={() => setSelectedStatuses([])}
              />
              <p className="text-xs text-muted-foreground -mt-1">
                Aucun statut coché = tous les statuts.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {activeStatuses.map(s => (
                  <label
                    key={s.status_key}
                    className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedStatuses.includes(s.status_key)}
                      onCheckedChange={() => toggle(selectedStatuses, setSelectedStatuses, s.status_key)}
                    />
                    <span className="text-sm truncate">{s.status_label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Prestataires */}
            <div className="space-y-2.5">
              <SectionHeader
                icon={Building2}
                title="Prestataires"
                count={selectedProviders.length}
                total={activeProviders.length + 1}
                onAll={() => setSelectedProviders(['none', ...activeProviders.map(p => p.id)])}
                onNone={() => setSelectedProviders([])}
              />
              <p className="text-xs text-muted-foreground -mt-1">
                Aucun prestataire coché = tous les dossiers.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors">
                  <Checkbox
                    checked={selectedProviders.includes('none')}
                    onCheckedChange={() => toggle(selectedProviders, setSelectedProviders, 'none')}
                  />
                  <span className="text-sm truncate">Sans prestataire</span>
                </label>
                {activeProviders.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedProviders.includes(p.id)}
                      onCheckedChange={() => toggle(selectedProviders, setSelectedProviders, p.id)}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-sm truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handlePrint} disabled={selectedTypes.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
