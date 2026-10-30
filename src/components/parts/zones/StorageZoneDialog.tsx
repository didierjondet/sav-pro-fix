import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StorageZone, useStorageZones, normalizeZoneCode } from '@/hooks/useStorageZones';

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#a855f7', '#eab308', '#14b8a6', '#64748b'];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  zone?: StorageZone | null;
  initialName?: string;
  onSaved?: (zone: StorageZone) => void;
}

/** Création / modification d'une zone, utilisable partout (fiche pièce, liste, paramètres). */
export function StorageZoneDialog({ open, onOpenChange, zone, initialName, onSaved }: Props) {
  const { zones, createZone, updateZone } = useStorageZones();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(zone?.name ?? initialName ?? '');
    setCode(zone?.code ?? '');
    setDescription(zone?.description ?? '');
    setColor(zone?.color ?? COLORS[zones.length % COLORS.length]);
    setParentId(zone?.parent_id ?? null);
    setCodeTouched(!!zone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, zone?.id]);

  // Suggestion de code à partir du nom (ex. "Étagère A niveau 2" -> "EA2")
  useEffect(() => {
    if (codeTouched) return;
    const words = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
    setCode(words.map((w) => (/^\d+$/.test(w) ? w : w[0])).join('').toUpperCase().slice(0, 8));
  }, [name, codeTouched]);

  const parents = zones.filter((z) => z.id !== zone?.id);
  const canSave = name.trim() && normalizeZoneCode(code);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const input = { name, code, description, color, parent_id: parentId };
      const saved = zone ? await updateZone({ id: zone.id, ...input }) : await createZone(input);
      onSaved?.(saved);
      onOpenChange(false);
    } catch {
      /* toast déjà affiché */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{zone ? 'Modifier la zone' : 'Nouvelle zone de stockage'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_110px] gap-2">
            <div>
              <Label>Nom</Label>
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Étagère A – niveau 2" />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={code}
                onChange={(e) => { setCodeTouched(true); setCode(e.target.value.toUpperCase()); }}
                placeholder="A2"
                className="font-mono"
              />
            </div>
          </div>
          <div>
            <Label>Dans la zone (facultatif)</Label>
            <Select value={parentId ?? 'none'} onValueChange={(v) => setParentId(v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune (zone principale)</SelectItem>
                {parents.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.code} — {z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Couleur</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Couleur ${c}`}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Description (facultatif)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Atelier, mur du fond…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={!canSave || saving}>{saving ? 'Enregistrement…' : zone ? 'Enregistrer' : 'Créer la zone'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
