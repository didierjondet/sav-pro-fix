import { useMemo, useState } from 'react';
import bwipjs from 'bwip-js/browser';
import { MapPin, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StorageZone, useStorageZones, zonePath } from '@/hooks/useStorageZones';
import { StorageZoneDialog } from './StorageZoneDialog';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Imprime une étiquette d'étagère (Code 128 du code de zone). */
export function printZoneLabels(list: StorageZone[], byId: Map<string, StorageZone>) {
  const labels = list.map((z) => {
    const canvas = document.createElement('canvas');
    try {
      bwipjs.toCanvas(canvas, { bcid: 'code128', text: z.code, scale: 3, height: 12, includetext: false, backgroundcolor: 'FFFFFF' });
    } catch { /* code non encodable */ }
    return `<div class="label"><div class="code">${esc(z.code)}</div><img src="${canvas.toDataURL('image/png')}"/><div class="name">${esc(zonePath(z, byId))}</div></div>`;
  }).join('');
  const win = window.open('', '_blank', 'width=480,height=400');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Étiquettes zones</title><style>
    @page { size: 60mm 40mm; margin: 2mm; }
    body { margin:0; font-family: Arial, sans-serif; }
    .label { width:56mm; height:36mm; display:flex; flex-direction:column; align-items:center; justify-content:center; page-break-after:always; box-sizing:border-box; }
    .code { font-size:20pt; font-weight:800; letter-spacing:1px; }
    img { width:100%; max-height:14mm; object-fit:contain; margin:1mm 0; }
    .name { font-size:8pt; text-align:center; max-height:8mm; overflow:hidden; }
  </style></head><body>${labels}<script>window.onload=()=>setTimeout(()=>window.print(),150)</script></body></html>`);
  win.document.close();
}

export function StorageZonesManager() {
  const { zones, loading, deleteZone } = useStorageZones();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StorageZone | null>(null);
  const [deleting, setDeleting] = useState<StorageZone | null>(null);
  const byId = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Zones de stockage</CardTitle>
          <CardDescription>Étagères, tiroirs, bacs… Attribuez une zone à chaque pièce pour la retrouver et faire l'inventaire par zone.</CardDescription>
        </div>
        <div className="flex gap-2 shrink-0">
          {zones.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => printZoneLabels(zones, byId)}>
              <Printer className="h-4 w-4" />Toutes les étiquettes
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />Nouvelle zone
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : zones.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucune zone. Créez par exemple « Étagère A – niveau 1 » avec le code A1.
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {zones.map((z) => (
              <div key={z.id} className="flex items-center gap-3 p-3">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                <span className="font-mono font-semibold w-20 shrink-0">{z.code}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{zonePath(z, byId)}</div>
                  {z.description && <div className="text-xs text-muted-foreground truncate">{z.description}</div>}
                </div>
                <Badge variant="secondary">{z.part_count ?? 0} pièce(s)</Badge>
                <Button variant="ghost" size="icon" title="Imprimer l'étiquette" onClick={() => printZoneLabels([z], byId)}><Printer className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Modifier" onClick={() => { setEditing(z); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Supprimer" onClick={() => setDeleting(z)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <StorageZoneDialog open={dialogOpen} onOpenChange={setDialogOpen} zone={editing} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la zone {deleting?.code} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.part_count
                ? `${deleting.part_count} pièce(s) passeront « Sans zone ». Aucune pièce n'est supprimée.`
                : 'Aucune pièce n’est rattachée à cette zone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleting) await deleteZone(deleting.id).catch(() => {}); setDeleting(null); }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
