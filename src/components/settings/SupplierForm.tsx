import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Supplier, SupplierInput, useSuppliersDirectory } from '@/hooks/useSuppliersDirectory';

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Supplier | null;
  /** Called with the created/updated supplier after successful save. */
  onSaved?: (supplier: Supplier) => void;
}

const empty = (): SupplierInput => ({
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  notes: '',
  is_active: true,
});

export function SupplierForm({ open, onOpenChange, initial, onSaved }: SupplierFormProps) {
  const { createSupplier, updateSupplier } = useSuppliersDirectory();
  const [form, setForm] = useState<SupplierInput>(empty());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            name: initial.name,
            contact_name: initial.contact_name || '',
            email: initial.email || '',
            phone: initial.phone || '',
            website: initial.website || '',
            address: initial.address || '',
            notes: initial.notes || '',
            is_active: initial.is_active,
          }
        : empty());
    }
  }, [open, initial]);

  const set = <K extends keyof SupplierInput>(k: K, v: SupplierInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (initial) {
        await updateSupplier({ id: initial.id, ...form });
        onSaved?.({ ...initial, ...form } as Supplier);
      } else {
        const created = await createSupplier(form);
        onSaved?.(created);
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
          <DialogTitle>{initial ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="sup-name">Nom *</Label>
            <Input id="sup-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sup-contact">Contact</Label>
              <Input id="sup-contact" value={form.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sup-phone">Téléphone</Label>
              <Input id="sup-phone" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sup-email">Email</Label>
              <Input id="sup-email" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sup-web">Site web</Label>
              <Input id="sup-web" placeholder="https://..." value={form.website || ''} onChange={(e) => set('website', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="sup-addr">Adresse</Label>
            <Input id="sup-addr" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sup-notes">Notes</Label>
            <Textarea id="sup-notes" rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="sup-active" checked={form.is_active ?? true} onCheckedChange={(v) => set('is_active', v)} />
            <Label htmlFor="sup-active">Fournisseur actif</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Enregistrement...' : (initial ? 'Mettre à jour' : 'Créer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
