import { useEffect, useState } from 'react';
import { isShopNameAvailable, isDuplicateShopNameError, isPlaceholderShopName, DUPLICATE_SHOP_NAME_MESSAGE } from '@/lib/shopName';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Store, Sparkles } from 'lucide-react';
import { SHOP_ACTIVITIES, type ShopActivity } from '@/lib/activityTemplates';

interface ShopNamePromptDialogProps {
  shopId: string;
  onSaved: () => void;
}

export function ShopNamePromptDialog({ shopId, onSaved }: ShopNamePromptDialogProps) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'name' | 'activity'>('name');
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
      toast({ title: 'Nom enregistré', description: 'Choisissez maintenant votre activité.' });
      setStep('activity');
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const chooseActivity = async (activity: ShopActivity) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('seed_demo_shop', { _activity: activity });
      if (error) throw error;
      if (data?.demo) {
        toast({ title: 'Mode découverte activé', description: 'Votre magasin est prêt avec des exemples fictifs. Explorez librement !' });
      }
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'activity') {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Quelle est votre activité ?
            </DialogTitle>
            <DialogDescription>
              Nous préparons votre magasin avec des statuts, types de SAV et des exemples fictifs (clients, SAV en cours…) adaptés à votre métier.
              C'est <strong>temporaire</strong> : quand vous serez prêt, un bouton effacera les exemples pour passer à votre vraie boutique.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SHOP_ACTIVITIES.map(a => (
              <button
                key={a.key}
                type="button"
                disabled={loading}
                onClick={() => chooseActivity(a.key)}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">{a.emoji}</span>
                <span>
                  <span className="block text-sm font-medium text-foreground">{a.label}</span>
                  <span className="block text-xs text-muted-foreground">{a.example}</span>
                </span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={loading} onClick={() => chooseActivity('none')}>
              Je préfère partir de zéro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
