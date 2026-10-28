import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Loader2, CheckCircle2, PackageCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { checkMobileUpload } from '@/lib/mobileDocs';

type Info = { status: 'active' | 'returned' | 'not_found'; returned_at?: string; loaned_at?: string; deposit_amount?: number | null; name?: string; brand?: string; model?: string; color?: string; imei?: string; serial_number?: string };
type Photo = { preview: string; path?: string; status: 'sending' | 'ok' | 'error'; error?: string };

const toDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f);
});

/** Page publique (QR du document de restitution) : valider le retour d'un matériel prêté, sans connexion. */
export default function LoanerReturn() {
  const { token } = useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('loaner_return_open' as any, { p_token: token });
      setInfo((data as Info) || { status: 'not_found' });
    })();
  }, [token]);

  const send = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const preview = URL.createObjectURL(f);
      const check = checkMobileUpload(f.type, f.size);
      if (check.ok === false || f.type === 'application/pdf') {
        setPhotos((p) => [...p, { preview, status: 'error', error: check.ok === false ? check.error : 'Photos uniquement' }]);
        continue;
      }
      let pos = 0;
      setPhotos((p) => { pos = p.length; return [...p, { preview, status: 'sending' }]; });
      const { data, error } = await supabase.functions.invoke('mobile-sav-upload', { body: { file: await toDataUrl(f), loan_token: token } });
      const ok = !error && !data?.error && data?.path;
      setPhotos((p) => p.map((it, i) => i === pos ? { ...it, status: ok ? 'ok' : 'error', path: ok ? data.path : undefined, error: ok ? undefined : (data?.error || 'Envoi impossible') } : it));
    }
  };

  const submit = async () => {
    setSubmitting(true); setError('');
    const paths = photos.filter((p) => p.status === 'ok' && p.path).map((p) => p.path!);
    const { data, error } = await supabase.rpc('loaner_return_submit' as any, { p_token: token, p_condition: condition, p_notes: notes, p_photos: paths });
    setSubmitting(false);
    const st = (data as any)?.status;
    if (error || (st !== 'ok' && st !== 'returned')) { setError('Validation impossible. Réessayez.'); return; }
    setDone(true);
  };

  if (!info) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (info.status === 'not_found') return <div className="min-h-screen grid place-items-center p-6 text-center">Ce lien de retour n'est pas valide.</div>;
  if (info.status === 'returned' && !done) return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div className="space-y-2"><CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
        <p className="font-semibold">Ce matériel a déjà été restitué{info.returned_at ? ` le ${new Date(info.returned_at).toLocaleDateString('fr-FR')}` : ''}.</p></div>
    </div>
  );
  if (done) return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div className="space-y-2"><CheckCircle2 className="h-14 w-14 mx-auto text-primary" />
        <p className="text-lg font-semibold">Retour enregistré</p>
        <p className="text-sm text-muted-foreground">Le prêt est marqué rendu dans Fixway. Vous pouvez fermer cette page.</p></div>
    </div>
  );

  const sending = photos.some((p) => p.status === 'sending');
  const desc = [info.brand, info.model].filter(Boolean).join(' ');
  return (
    <div className="min-h-screen bg-background p-4 space-y-5 max-w-md mx-auto">
      <h1 className="text-xl font-bold flex items-center gap-2"><PackageCheck className="h-6 w-6" /> Retour du matériel prêté</h1>

      <section className="rounded-lg border-2 border-destructive/60 bg-destructive/5 p-3 space-y-1">
        <p className="text-xs uppercase text-muted-foreground font-semibold">1. Vérifiez le matériel</p>
        <p className="text-lg font-semibold">{info.name}{desc ? ` — ${desc}` : ''}{info.color ? ` (${info.color})` : ''}</p>
        {info.imei && <p className="font-mono text-sm">IMEI : {info.imei}</p>}
        {info.serial_number && <p className="font-mono text-sm">N° série : {info.serial_number}</p>}
        {info.loaned_at && <p className="text-sm">Prêté le {new Date(info.loaned_at).toLocaleDateString('fr-FR')}</p>}
        <p className="text-sm font-semibold">{info.deposit_amount ? `Caution : ${Number(info.deposit_amount).toFixed(2).replace('.', ',')} € à rendre` : 'Aucune caution'}</p>
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase text-muted-foreground font-semibold">2. Photos du matériel rendu</p>
        <input ref={camRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { send(e.target.files); e.target.value = ''; }} />
        <Button className="w-full h-14 text-base gap-2" variant="outline" onClick={() => camRef.current?.click()}><Camera className="h-5 w-5" /> Prendre une photo</Button>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-md border overflow-hidden bg-muted">
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Retirer" className="absolute top-1 right-1 rounded-full bg-background/80 p-1" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                <div className="absolute bottom-0 inset-x-0 bg-background/80 text-[10px] p-1 flex items-center gap-1">
                  {p.status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {p.status === 'ok' && <CheckCircle2 className="h-3 w-3 text-primary" />}
                  <span className={p.status === 'error' ? 'text-destructive' : ''}>{p.status === 'error' ? p.error : p.status === 'ok' ? 'Envoyée' : 'Envoi…'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Ces photos serviront de référence pour le prochain prêt.</p>
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase text-muted-foreground font-semibold">3. État au retour (facultatif)</p>
        <div><Label>État</Label><Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Ex. : bon état, rayure écran…" /></div>
        <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full h-16 text-lg" disabled={submitting || sending} onClick={submit}>
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : '4. Valider le retour'}
      </Button>
    </div>
  );
}
