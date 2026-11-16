import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function DemoModeBanner() {
  const { shop } = useShop();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [keepParts, setKeepParts] = useState(false);
  const [keepSuppliers, setKeepSuppliers] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!(shop as any)?.demo_mode) return null;

  const exit = async () => {
    setLoading(true);
    try {
      const { error } = await (supabase.rpc as any)('exit_demo_mode', { _keep_parts: keepParts, _keep_suppliers: keepSuppliers });
      if (error) throw error;
      await qc.invalidateQueries();
      setOpen(false);
      toast({ title: 'Bienvenue dans votre vraie boutique !', description: 'Les exemples ont été effacés. Le bot vous guide pour finir la configuration.' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2 bg-accent px-3 py-2 text-sm text-accent-foreground">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span><strong>Mode découverte</strong> : ces clients et SAV sont fictifs. Explorez librement, aucun SMS n'est envoyé.</span>
        <Button size="sm" className="h-7" onClick={() => setOpen(true)}>Passer à ma vraie boutique</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Passer à ma vraie boutique</DialogTitle>
            <DialogDescription>
              Les clients et SAV d'exemple seront définitivement effacés. Vos statuts, types de SAV et familles de produits sont conservés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="keepParts" checked={keepParts} onCheckedChange={v => setKeepParts(!!v)} />
              <Label htmlFor="keepParts">Garder les pièces d'exemple dans mon stock</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="keepSup" checked={keepSuppliers} onCheckedChange={v => setKeepSuppliers(!!v)} />
              <Label htmlFor="keepSup">Garder le fournisseur d'exemple</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={exit} disabled={loading}>{loading ? 'Passage en cours…' : 'Effacer les exemples et démarrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
