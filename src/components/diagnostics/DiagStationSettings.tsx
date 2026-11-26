import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, KeyRound, Loader2 } from 'lucide-react';
import { DIAG_INGEST_URL, generateApiKey, sha256Hex } from '@/lib/diagnostics';
import { DiagnosticsList } from './DiagnosticsList';

type Key = { id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };

export function DiagStationSettings() {
  const { shop } = useShop();
  const { toast } = useToast();
  const [keys, setKeys] = useState<Key[]>([]);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const db = supabase as any;

  const load = async () => {
    if (!shop?.id) return;
    const { data } = await db.from('diagnostic_api_keys').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false });
    setKeys(data ?? []);
  };
  useEffect(() => { load(); }, [shop?.id]);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast({ title: 'Copié' }); };

  const create = async () => {
    if (!shop?.id) return;
    setBusy(true);
    const key = generateApiKey();
    const { error } = await db.from('diagnostic_api_keys').insert({
      shop_id: shop.id, name: name.trim() || 'DiagStation', key_prefix: key.slice(0, 8), key_hash: await sha256Hex(key),
    });
    setBusy(false);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    setNewKey(key); setName(''); load();
  };

  const revoke = async (id: string) => {
    const { error } = await db.from('diagnostic_api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>DiagStation</CardTitle>
          <CardDescription>Connectez votre logiciel de diagnostic : ses rapports arrivent automatiquement dans Fixway, sont rattachés au SAV correspondant et consultables par QR code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">URL de l'API</p>
            <div className="flex gap-2"><Input readOnly value={DIAG_INGEST_URL} className="font-mono text-xs" /><Button variant="outline" size="icon" onClick={() => copy(DIAG_INGEST_URL)}><Copy className="h-4 w-4" /></Button></div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Nouvelle clé API</p>
            <div className="flex gap-2"><Input placeholder="Nom (ex : Poste comptoir)" value={name} onChange={(e) => setName(e.target.value)} /><Button onClick={create} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1" />}Générer une clé API</Button></div>
          </div>
          {newKey && (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium">Copiez cette clé maintenant : elle ne sera plus jamais affichée.</p>
              <div className="flex gap-2"><Input readOnly value={newKey} className="font-mono text-xs" /><Button size="icon" onClick={() => copy(newKey)}><Copy className="h-4 w-4" /></Button></div>
              <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>J'ai copié la clé</Button>
            </div>
          )}
          <div className="divide-y rounded-md border">
            {keys.length === 0 && <p className="p-3 text-sm text-muted-foreground">Aucune clé pour le moment.</p>}
            {keys.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div>
                  <p className="font-medium">{k.name} <span className="font-mono text-xs text-muted-foreground">{k.key_prefix}…</span></p>
                  <p className="text-xs text-muted-foreground">Dernière utilisation : {k.last_used_at ? new Date(k.last_used_at).toLocaleString('fr-FR') : 'jamais'}</p>
                </div>
                {k.revoked_at ? <span className="text-xs text-muted-foreground">Révoquée</span>
                  : <Button variant="outline" size="sm" onClick={() => revoke(k.id)}>Révoquer</Button>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <DiagnosticsList />
    </div>
  );
}
