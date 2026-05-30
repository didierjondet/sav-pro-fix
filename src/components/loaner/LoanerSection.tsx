import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PackageOpen, X } from 'lucide-react';
import { LoanerEquipment, LOANER_CATEGORIES } from '@/hooks/useLoanerEquipment';
import { LoanerPickerDialog } from './LoanerPickerDialog';

export interface LoanerSelection {
  enabled: boolean;
  equipment: LoanerEquipment | null;
  expectedReturnAt: string;
  notes: string;
}

interface Props {
  value: LoanerSelection;
  onChange: (v: LoanerSelection) => void;
  compact?: boolean;
}

export const EMPTY_LOANER_SELECTION: LoanerSelection = {
  enabled: false,
  equipment: null,
  expectedReturnAt: '',
  notes: '',
};

export function LoanerSection({ value, onChange, compact }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const categoryLabel = (cat: string) =>
    LOANER_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <div className={`border rounded-lg p-3 space-y-3 ${value.enabled ? 'bg-primary/5 border-primary/30' : ''}`}>
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={value.enabled}
          onCheckedChange={(c) => onChange({ ...value, enabled: !!c, equipment: c ? value.equipment : null })}
        />
        <PackageOpen className="h-4 w-4 text-primary" />
        <span className="font-medium">Prêt de matériel</span>
        {value.equipment && (
          <Badge variant="secondary" className="ml-auto">{value.equipment.name}</Badge>
        )}
      </label>

      {value.enabled && (
        <div className="space-y-3 pl-6">
          {value.equipment ? (
            <div className="p-3 border rounded-md bg-background">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{value.equipment.name}</span>
                    <Badge variant="outline" className="text-xs">{categoryLabel(value.equipment.category)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {[value.equipment.brand, value.equipment.model, value.equipment.color].filter(Boolean).join(' • ') || '—'}
                  </div>
                  {(value.equipment.imei || value.equipment.serial_number) && (
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">
                      {value.equipment.imei && <span>IMEI: {value.equipment.imei}</span>}
                      {value.equipment.imei && value.equipment.serial_number && <span> · </span>}
                      {value.equipment.serial_number && <span>SN: {value.equipment.serial_number}</span>}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...value, equipment: null })}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setPickerOpen(true)}
                type="button"
              >
                Changer
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} type="button">
              <PackageOpen className="h-4 w-4 mr-2" /> Choisir un matériel à prêter
            </Button>
          )}

          {!compact && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date de retour prévue</Label>
                <Input
                  type="date"
                  value={value.expectedReturnAt}
                  onChange={(e) => onChange({ ...value, expectedReturnAt: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">État au prêt / notes</Label>
                <Input
                  value={value.notes}
                  onChange={(e) => onChange({ ...value, notes: e.target.value })}
                  placeholder="ex. avec chargeur, écran rayé…"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <LoanerPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(eq) => onChange({ ...value, equipment: eq })}
        selectedId={value.equipment?.id}
      />
    </div>
  );
}
