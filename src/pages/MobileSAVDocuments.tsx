import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, FileUp, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { checkMobileUpload } from '@/lib/mobileDocs';

type Item = { name: string; preview?: string; status: 'sending' | 'ok' | 'error'; error?: string };

const toDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f);
});

export default function MobileSAVDocuments() {
  const { token } = useParams();
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading');
  const [items, setItems] = useState<Item[]>([]);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('mobile_sav_open' as any, { p_token: token });
      setState((data as any)?.ok ? 'ok' : 'invalid');
    })();
  }, [token]);

  const send = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const idx = items.length;
      const check = checkMobileUpload(f.type, f.size);
      const preview = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined;
      if (check.ok === false) { setItems((p) => [...p, { name: f.name, preview, status: 'error', error: check.error }]); continue; }
      let pos = 0;
      setItems((p) => { pos = p.length; return [...p, { name: f.name, preview, status: 'sending' }]; });
      const { data, error } = await supabase.functions.invoke('mobile-sav-upload', { body: { file: await toDataUrl(f), token, append: true } });
      const ok = !error && !data?.error && data?.path;
      setItems((p) => p.map((it, i) => i === pos ? { ...it, status: ok ? 'ok' : 'error', error: ok ? undefined : (data?.error || 'Envoi impossible') } : it));
      void idx;
    }
  };

  if (state === 'loading') return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (state === 'invalid') return <div className="min-h-screen grid place-items-center p-6 text-center">Lien expiré ou déjà utilisé. Générez un nouveau QR code sur l'ordinateur.</div>;

  const sent = items.filter((i) => i.status === 'ok').length;
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Ajouter des documents</h1>
      <p className="text-sm text-muted-foreground">Chaque fichier est envoyé tout de suite au SAV ouvert sur l'ordinateur.</p>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { send(e.target.files); e.target.value = ''; }} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="hidden" onChange={(e) => { send(e.target.files); e.target.value = ''; }} />
      <Button className="w-full h-16 text-lg gap-2" onClick={() => camRef.current?.click()}><Camera className="h-6 w-6" /> Prendre une photo</Button>
      <Button variant="outline" className="w-full h-16 text-lg gap-2" onClick={() => fileRef.current?.click()}><FileUp className="h-6 w-6" /> Choisir un fichier (photo ou PDF)</Button>
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((it, i) => (
            <div key={i} className="relative aspect-square rounded-md border overflow-hidden grid place-items-center bg-muted">
              {it.preview ? <img src={it.preview} alt="" className="h-full w-full object-cover" /> : <FileText className="h-8 w-8 text-muted-foreground" />}
              <div className="absolute bottom-0 inset-x-0 bg-background/80 text-[10px] p-1 flex items-center gap-1">
                {it.status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
                {it.status === 'ok' && <CheckCircle2 className="h-3 w-3 text-primary" />}
                <span className={it.status === 'error' ? 'text-destructive' : ''}>{it.status === 'error' ? it.error : it.status === 'ok' ? 'Envoyé' : 'Envoi…'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {sent > 0 && <p className="text-center text-sm font-medium text-primary">{sent} fichier{sent > 1 ? 's' : ''} envoyé{sent > 1 ? 's' : ''} à l'ordinateur. Vous pouvez en ajouter d'autres ou fermer cette page.</p>}
    </div>
  );
}
