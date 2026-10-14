import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, ArrowRight, Camera, Send, AlertTriangle, CheckCircle2, ImagePlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { AITextReformulator } from '@/components/sav/AITextReformulator';
import { isValidImei, type MobileSavPayload } from '@/lib/mobileSav';

const COLORS = [
  { value: 'black', label: 'Noir', color: 'hsl(0 0% 0%)' },
  { value: 'white', label: 'Blanc', color: 'hsl(0 0% 100%)' },
  { value: 'grey', label: 'Gris', color: 'hsl(0 0% 50%)' },
  { value: 'blue', label: 'Bleu', color: 'hsl(217 91% 60%)' },
  { value: 'red', label: 'Rouge', color: 'hsl(0 84% 60%)' },
  { value: 'gold', label: 'Or', color: 'hsl(45 100% 51%)' },
  { value: 'silver', label: 'Argent', color: 'hsl(0 0% 75%)' },
  { value: 'green', label: 'Vert', color: 'hsl(142 71% 45%)' },
  { value: 'pink', label: 'Rose', color: 'hsl(330 81% 60%)' },
  { value: 'purple', label: 'Violet', color: 'hsl(271 91% 65%)' },
  { value: 'other', label: 'Autre', color: 'hsl(0 0% 42%)' },
];
const GRADES = [
  { value: 'A', desc: 'Excellent état' },
  { value: 'B', desc: 'Bon état' },
  { value: 'C', desc: 'État moyen' },
  { value: 'D', desc: 'Mauvais état' },
];
const STEPS = ['Produit', 'IMEI, SKU, n° de série', 'Couleur', 'État du produit', 'Panne', 'Accessoires & code'];

type Draft = MobileSavPayload & { step: number; previews: string[] };
const empty: Draft = {
  brand: '', model: '', imei: '', sku: '', color: '', grade: '', photos: [], previews: [], problem: '',
  accessories: { charger: false, case: false, screen_protector: false, other: '' },
  unlock_code: '', no_code: false, step: 0,
};

const fileToDataUrl = (file: File, max = 1600): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });

export default function MobileSAVWizard() {
  const { token = '' } = useParams<{ token: string }>();
  const { toast } = useToast();
  const draftKey = `fixway_mobile_sav_${token}`;
  const [state, setState] = useState<'loading' | 'ok' | 'invalid' | 'sent'>('loading');
  const [d, setD] = useState<Draft>(() => {
    try { const raw = localStorage.getItem(draftKey); if (raw) return { ...empty, ...JSON.parse(raw) }; } catch { /* */ }
    return empty;
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const ocrInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }));

  useEffect(() => { try { localStorage.setItem(draftKey, JSON.stringify(d)); } catch { /* */ } }, [d, draftKey]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('mobile_sav_open' as any, { p_token: token });
      setState((data as any)?.ok ? 'ok' : 'invalid');
    })();
  }, [token]);

  const step = d.step;
  const go = (n: number) => { set({ step: n }); window.scrollTo({ top: 0 }); };
  const next = () => {
    if (step === 0 && (!d.brand.trim() || !d.model.trim())) { toast({ title: 'Renseignez la marque et le modèle', variant: 'destructive' }); return; }
    if (step === 4 && !d.problem.trim()) { toast({ title: 'Décrivez la panne', variant: 'destructive' }); return; }
    go(step + 1);
  };

  const runOcr = async (file: File) => {
    setOcrLoading(true);
    try {
      const image = await fileToDataUrl(file);
      const { data, error } = await supabase.functions.invoke('ai-read-device-codes', { body: { image, token } });
      if (error || data?.error) throw new Error(data?.error || 'Lecture impossible, saisissez le code à la main.');
      const patch: Partial<Draft> = {};
      if (data.imei) patch.imei = data.imei; else if (data.serial) patch.imei = data.serial;
      if (data.sku) patch.sku = data.sku;
      if (!patch.imei && !patch.sku) throw new Error('Aucun code lisible sur la photo.');
      set(patch);
      toast({ title: 'Codes lus', description: 'Vérifiez-les avant de continuer.' });
    } catch (e: any) {
      toast({ title: 'Lecture IA', description: e.message, variant: 'destructive' });
    } finally { setOcrLoading(false); }
  };

  const addPhotos = async (files: FileList) => {
    setUploading(true);
    try {
      const paths: string[] = [], previews: string[] = [];
      for (const f of Array.from(files)) {
        const image = await fileToDataUrl(f, 1400);
        const { data, error } = await supabase.functions.invoke('mobile-sav-upload', { body: { image, token } });
        if (error || data?.error || !data?.path) { toast({ title: 'Photo non envoyée', description: data?.error, variant: 'destructive' }); continue; }
        paths.push(data.path);
        previews.push(await fileToDataUrl(f, 200));
      }
      setD((p) => ({ ...p, photos: [...p.photos, ...paths], previews: [...p.previews, ...previews] }));
    } finally { setUploading(false); }
  };

  const send = async () => {
    setSending(true);
    const { previews, step: _s, ...payload } = d;
    const { data, error } = await supabase.rpc('mobile_sav_submit' as any, { p_token: token, p_payload: payload as any });
    setSending(false);
    if (error || !(data as any)?.ok) {
      toast({ title: 'Envoi impossible', description: 'Le lien a expiré. Générez un nouveau QR code sur l\'ordinateur.', variant: 'destructive' });
      return;
    }
    localStorage.removeItem(draftKey);
    setState('sent');
  };

  if (state === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (state === 'sent') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="text-2xl font-bold">C'est envoyé !</h1>
        <p className="text-muted-foreground">Terminez la création du SAV sur l'ordinateur (type, client, pièces, impression).</p>
      </div>
    );
  }
  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Lien expiré ou déjà utilisé</h1>
        <p className="text-muted-foreground">Sur l'ordinateur, cliquez sur « Nouveau SAV » puis « Avec mon smartphone » pour générer un nouveau QR code.</p>
      </div>
    );
  }

  const big = 'h-14 text-lg';
  const imeiDigits = /^\d+$/.test(d.imei);
  const last = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{STEPS[step]}</span>
          <span className="text-muted-foreground">{step + 1}/{STEPS.length}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />
      </header>

      <main className="flex-1 px-4 py-5 space-y-4 pb-32">
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base">Marque *</Label>
              <Input className={big} autoCapitalize="characters" value={d.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="ex. APPLE" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">Modèle *</Label>
              <Input className={big} autoCapitalize="characters" value={d.model} onChange={(e) => set({ model: e.target.value })} placeholder="ex. IPHONE 13" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <input ref={ocrInput} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) runOcr(f); }} />
            <Button className={`w-full ${big}`} onClick={() => ocrInput.current?.click()} disabled={ocrLoading}>
              {ocrLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Camera className="h-5 w-5 mr-2" />}
              {ocrLoading ? 'Lecture en cours…' : "Photographier l'étiquette"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">L'IA lit les codes de la photo. Vérifiez-les ensuite.</p>
            <div className="space-y-1.5">
              <Label className="text-base">IMEI ou n° de série</Label>
              <Input className={`${big} font-mono`} autoCapitalize="characters" value={d.imei} onChange={(e) => set({ imei: e.target.value.toUpperCase().replace(/\s/g, '') })} />
              {d.imei && imeiDigits && !isValidImei(d.imei) && <p className="text-xs text-destructive">Cet IMEI semble incorrect (15 chiffres attendus) — vérifiez.</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">SKU / référence</Label>
              <Input className={`${big} font-mono`} autoCapitalize="characters" value={d.sku} onChange={(e) => set({ sku: e.target.value.toUpperCase() })} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-3 gap-3">
            {COLORS.map((c) => (
              <button key={c.value} type="button" onClick={() => { set({ color: c.value }); go(step + 1); }}
                className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 ${d.color === c.value ? 'border-primary' : 'border-border'}`}>
                <span className="h-10 w-10 rounded-full border" style={{ backgroundColor: c.color }} />
                <span className="text-sm">{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {GRADES.map((g) => (
                <button key={g.value} type="button" onClick={() => set({ grade: g.value })}
                  className={`rounded-xl border-2 p-4 text-center ${d.grade === g.value ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <p className="text-2xl font-bold">{g.value}</p>
                  <p className="text-xs text-muted-foreground">{g.desc}</p>
                </button>
              ))}
            </div>
            <input ref={photoInput} type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => { const f = e.target.files; if (f?.length) addPhotos(f); e.target.value = ''; }} />
            <Button variant="outline" className={`w-full ${big}`} onClick={() => photoInput.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <ImagePlus className="h-5 w-5 mr-2" />}
              Photos de l'état du produit
            </Button>
            {d.previews.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {d.previews.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="" className="aspect-square w-full rounded object-cover" />
                    <button type="button" aria-label="Retirer la photo" className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1"
                      onClick={() => set({ photos: d.photos.filter((_, j) => j !== i), previews: d.previews.filter((_, j) => j !== i) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2">
            <Textarea rows={6} className="text-base" value={d.problem} onChange={(e) => set({ problem: e.target.value })} placeholder="Décrivez la panne…" />
            <AITextReformulator text={d.problem} context="problem_description" onReformulated={(t) => set({ problem: t })} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            {([['charger', 'Chargeur'], ['case', 'Coque'], ['screen_protector', 'Protection écran']] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-3 rounded-lg border p-4 text-base">
                <Checkbox checked={d.accessories[k]} onCheckedChange={(v) => set({ accessories: { ...d.accessories, [k]: !!v } })} className="h-6 w-6" />
                {l}
              </label>
            ))}
            <Input className={big} placeholder="Autre accessoire" value={d.accessories.other} onChange={(e) => set({ accessories: { ...d.accessories, other: e.target.value } })} />
            <div className="space-y-1.5">
              <Label className="text-base">Code de déverrouillage</Label>
              <Input className={`${big} font-mono`} autoComplete="off" disabled={d.no_code} value={d.unlock_code} onChange={(e) => set({ unlock_code: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={d.no_code} onCheckedChange={(v) => set({ no_code: !!v, unlock_code: v ? '' : d.unlock_code })} />
                L'appareil n'a pas de code
              </label>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-background border-t p-3 flex gap-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Button variant="outline" className="h-14 flex-1 text-base" onClick={() => go(step - 1)} disabled={step === 0 || sending}>
          <ArrowLeft className="h-5 w-5 mr-1" /> Retour
        </Button>
        {last ? (
          <Button className="h-14 flex-[2] text-base" onClick={send} disabled={sending || uploading}>
            {sending ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Send className="h-5 w-5 mr-2" />} Envoyer à l'ordinateur
          </Button>
        ) : (
          <Button className="h-14 flex-[2] text-base" onClick={next}>Suivant <ArrowRight className="h-5 w-5 ml-1" /></Button>
        )}
      </footer>
    </div>
  );
}
