import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from "@/components/ui/number-input";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Check, Save, Search, X } from 'lucide-react';
import { INVENTORY_LINE_STATUS_LABELS, type InventorySessionItem } from './types';

export type InventoryReviewTab = 'counting' | 'discrepancies' | 'missing' | 'overwritten' | 'journal';

interface InventoryManualEditorProps {
  items: InventorySessionItem[];
  editable: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  draftQuantities: Record<string, string>;
  onDraftQuantityChange: (itemId: string, value: string) => void;
  draftNotes: Record<string, string>;
  onDraftNoteChange: (itemId: string, value: string) => void;
  onApplyQuantity: (item: InventorySessionItem) => Promise<unknown> | unknown;
  onMarkFound: (item: InventorySessionItem) => Promise<unknown> | unknown;
  onMarkMissing: (item: InventorySessionItem) => Promise<unknown> | unknown;
  activeFilter: 'all' | 'pending' | 'found' | 'missing' | 'adjusted';
  onActiveFilterChange: (value: 'all' | 'pending' | 'found' | 'missing' | 'adjusted') => void;
}

const filterLabels: Array<{ key: InventoryManualEditorProps['activeFilter']; label: string }> = [
  { key: 'all', label: 'Tout' },
  { key: 'pending', label: 'À traiter' },
  { key: 'found', label: 'Trouvés' },
  { key: 'missing', label: 'Manquants' },
  { key: 'adjusted', label: 'Écarts' },
];

export function InventoryManualEditor({
  items,
  editable,
  searchTerm,
  onSearchTermChange,
  draftQuantities,
  onDraftQuantityChange,
  draftNotes,
  onDraftNoteChange,
  onApplyQuantity,
  onMarkFound,
  onMarkMissing,
  activeFilter,
  onActiveFilterChange,
}: InventoryManualEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterLabels.map((filter) => (
            <Button
              key={filter.key}
              type="button"
              size="sm"
              variant={activeFilter === filter.key ? 'default' : 'outline'}
              onClick={() => onActiveFilterChange(filter.key)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full xl:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Rechercher une pièce, une référence ou un SKU"
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="h-[520px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pièce</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Théorique</TableHead>
              <TableHead className="text-right">Comptée</TableHead>
              <TableHead className="text-right">Delta</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const currentQuantity = draftQuantities[item.id] ?? (item.counted_quantity ?? '').toString();
              const currentNote = draftNotes[item.id] ?? item.notes ?? '';

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.part_name}</div>
                    <div className="text-xs text-muted-foreground">{item.part_reference || 'Sans référence'}</div>
                  </TableCell>
                  <TableCell>{item.part_sku || '—'}</TableCell>
                  <TableCell className="text-right">{item.expected_quantity}</TableCell>
                  <TableCell className="min-w-[140px] text-right">
                    <NumberInput
                      
                      min="0"
                      value={currentQuantity}
                      disabled={!editable}
                      onChange={(event) => onDraftQuantityChange(item.id, event.target.value)}
                      className="ml-auto max-w-[120px]"
                    />
                  </TableCell>
                  <TableCell className={cn('text-right font-medium', item.variance_quantity !== 0 && 'text-foreground')}>
                    {item.counted_quantity === null ? '—' : item.variance_quantity}
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    <Input
                      value={currentNote}
                      disabled={!editable}
                      onChange={(event) => onDraftNoteChange(item.id, event.target.value)}
                      placeholder="Note rapide"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.line_status === 'missing' ? 'destructive' : item.line_status === 'pending' ? 'outline' : 'secondary'}>
                      {INVENTORY_LINE_STATUS_LABELS[item.line_status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editable ? (
                      <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end">
                        <Button size="sm" onClick={() => onMarkFound(item)} className="bg-success text-success-foreground hover:bg-success/90">
                          <Check className="h-4 w-4" />
                          Valider
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onMarkMissing(item)}>
                          <X className="h-4 w-4" />
                          Non trouvé
                        </Button>
                        <Button size="sm" onClick={() => onApplyQuantity(item)} className="bg-warning text-warning-foreground hover:bg-warning/90">
                          <Save className="h-4 w-4" />
                          Ajuster
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Lecture seule</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
