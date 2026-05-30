import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LoanerEquipment,
  LoanerEquipmentInput,
  LOANER_CATEGORIES,
  LOANER_STATUSES,
  useLoanerEquipment,
} from '@/hooks/useLoanerEquipment';
import { LoanerConditionPhotos } from './LoanerConditionPhotos';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: LoanerEquipment | null;
}

const EMPTY: LoanerEquipmentInput = {
  name: '',
  category: 'telephone',
  brand: '',
  model: '',
  imei: '',
  serial_number: '',
  color: '',
  notes: '',
  status: 'available',
  condition_photos: [],
};

export function LoanerEquipmentForm({ open, onOpenChange, initial }: Props) {
  const { createEquipment, updateEquipment } = useLoanerEquipment();
  const [form, setForm] = useState<LoanerEquipmentInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            name: initial.name,
            category: initial.category,
            brand: initial.brand || '',
            model: initial.model || '',
            imei: initial.imei || '',
            serial_number: initial.serial_number || '',
            color: initial.color || '',
            notes: initial.notes || '',
            status: initial.status,
            condition_photos: initial.condition_photos || [],
          }
        : EMPTY);
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (initial) {
        await updateEquipment({ id: initial.id, ...form });
      } else {
        await createEquipment(form);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Modifier le matériel' : 'Nouveau matériel de prêt'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ex. iPhone 11 de prêt #1"
              />
            </div>
            <div>
              <Label>Catégorie *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOANER_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOANER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marque</Label>
              <Input value={form.brand || ''} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
            </div>
            <div>
              <Label>Modèle</Label>
              <Input value={form.model || ''} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
            </div>
            <div>
              <Label>IMEI</Label>
              <Input value={form.imei || ''} onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))} />
            </div>
            <div>
              <Label>N° de série</Label>
              <Input value={form.serial_number || ''} onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Couleur</Label>
              <Input value={form.color || ''} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes || ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="État, accessoires fournis, etc."
              />
            </div>
            <div className="col-span-2">
              <LoanerConditionPhotos
                value={form.condition_photos || []}
                onChange={(next) => setForm((f) => ({ ...f, condition_photos: next }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
