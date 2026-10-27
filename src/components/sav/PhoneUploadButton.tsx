import { useEffect, useMemo, useRef, useState } from 'react';
import bwipjs from 'bwip-js/browser';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Camera, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { getPublicAppOrigin } from '@/utils/trackingUtils';

type Session = { id: string; token: string; status: string };

/** Bouton « Depuis mon téléphone » : QR code → photos/PDF ajoutés en direct aux documents du SAV. */
export function PhoneUploadButton({ onFiles }: { onFiles: (paths: string[]) => void }) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [received, setReceived] = useState<string[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    if (!session?.id) return;
    const channel = supabase
      .channel(`mobile-docs-${session.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mobile_sav_sessions', filter: `id=eq.${session.id}` },
        (p) => {
          const row = p.new as any;
          setSession((prev) => (prev ? { ...prev, status: row.status } : prev));
          const photos: string[] = Array.isArray(row?.payload?.photos) ? row.payload.photos : [];
          if (photos.length) { setReceived(photos); onFilesRef.current(photos); }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  // Miniatures des photos reçues
  useEffect(() => {
    const missing = received.filter((p) => !thumbs[p] && !p.toLowerCase().endsWith('.pdf'));
    if (!missing.length) return;
    supabase.storage.from('part-attachments').createSignedUrls(missing, 900).then(({ data }) => {
      if (!data) return;
      setThumbs((t) => { const n = { ...t }; data.forEach((d) => { if (d.path && d.signedUrl) n[d.path] = d.signedUrl; }); return n; });
    });
  }, [received, thumbs]);

  const start = async () => {
    setOpen(true);
    if (session || !profile?.shop_id) return;
    setCreating(true);
    const { data, error } = await supabase.from('mobile_sav_sessions' as any)
      .insert({ shop_id: profile.shop_id } as any).select('id, token, status').single();
    setCreating(false);
    if (error || !data) { toast({ title: 'Impossible de préparer le QR code', description: error?.message, variant: 'destructive' }); setOpen(false); return; }
    setSession(data as any);
  };

  const url = session ? `${getPublicAppOrigin()}/m/sav/documents/${session.token}` : '';
  const qrSvg = useMemo(() => {
    if (!url) return '';
    try { return bwipjs.toSVG({ bcid: 'qrcode', text: url, scale: 4, eclevel: 'M' } as any); } catch { return ''; }
  }, [url]);

  return (
    <>
      <button type="button" onClick={start} title="Envoyer des photos ou PDF depuis le téléphone"
        className="relative isolate flex items-center gap-3 rounded-full bg-destructive px-4 py-2 text-destructive-foreground shadow-lg hover:opacity-90 motion-safe:animate-wiggle">
        <span className="absolute -inset-1 rounded-full bg-destructive/40 motion-safe:animate-ping -z-10" />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-destructive-foreground/20">
          <Smartphone className="h-5 w-5" />
          <Camera className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-destructive p-0.5" />
        </span>
        <span className="text-sm font-semibold">Photos / PDF depuis mon téléphone</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter des photos ou PDF</DialogTitle>
            <DialogDescription>Scannez ce QR code avec votre téléphone.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {creating || !qrSvg ? <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              : <div className="rounded-lg border bg-card p-3 [&_svg]:h-56 [&_svg]:w-56" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
            <div className="flex items-center gap-2 text-sm font-medium">
              {received.length > 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {received.length > 0 ? `${received.length} fichier${received.length > 1 ? 's' : ''} reçu${received.length > 1 ? 's' : ''}`
                : session?.status === 'connected' ? 'Téléphone connecté…' : 'En attente du scan…'}
            </div>
            {received.length > 0 && (
              <div className="grid w-full grid-cols-4 gap-2">
                {received.map((p) => (
                  <div key={p} className="relative aspect-square overflow-hidden rounded-md border bg-muted grid place-items-center">
                    {p.toLowerCase().endsWith('.pdf') ? <div className="flex flex-col items-center text-[10px] text-muted-foreground"><FileText className="h-6 w-6 text-destructive" />PDF</div>
                      : thumbs[p] ? <img src={thumbs[p]} alt="" className="h-full w-full object-cover" />
                      : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <CheckCircle2 className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-background text-primary" />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Valable 15 minutes, sans connexion sur le téléphone. Les fichiers s'ajoutent automatiquement au SAV.
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
