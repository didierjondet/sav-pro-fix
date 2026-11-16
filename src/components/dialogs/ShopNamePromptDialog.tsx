import { useEffect, useState } from 'react';
import { isShopNameAvailable, isDuplicateShopNameError, isPlaceholderShopName, DUPLICATE_SHOP_NAME_MESSAGE } from '@/lib/shopName';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Store } from 'lucide-react';

interface ShopNamePromptDialogProps {
  shopId: string;
  onSaved: () => void;
}

export function ShopNamePromptDialog({ shopId, onSaved }: ShopNamePromptDialogProps) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [taken, setTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    const n = name.trim();
    setTaken(false);
    if (n.length < 2 || isPlaceholderShopName(n)) return;
    setChecking(true);
    const t = setTimeout(async () => {
      const ok = await isShopNameAvailable(n, shopId);
      setTaken(!ok);
      setChecking(false);
    }, 350);
    return () => { clearTimeout(t); setChecking(false); };
  }, [name, shopId]);
  const isValid = name.trim().length >= 2 && !isPlaceholderShopName(name) && !taken && !checking;

  const handleSave = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('shops').update({ name: name.trim() }).eq('id', shopId);
      if (error) {
        if (isDuplicateShopNameError(error)) { setTaken(true); throw new Error(DUPLICATE_SHOP_NAME_MESSAGE); }
        throw error;
      }
      toast({ title: 'Nom enregistré', description: 'Le nom de votre magasin a été mis à jour.' });
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Donnez un nom à votre magasin
          </DialogTitle>
          <DialogDescription>
            Veuillez donner un nom à votre magasin pour mieux l'identifier. Vous pourrez le modifier plus tard dans les paramètres.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="shopNamePrompt">Nom du magasin</Label>
          <Input
            id="shopNamePrompt"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: TechRepair Paris"
            onKeyDown={(e) => e.key === 'Enter' && isValid && handleSave()}
          />
          {taken && <p className="text-sm text-destructive">{DUPLICATE_SHOP_NAME_MESSAGE}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!isValid || loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
