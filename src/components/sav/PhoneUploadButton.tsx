import { useEffect, useMemo, useRef, useState } from 'react';
import bwipjs from 'bwip-js/browser';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
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
  const [received, setReceived] = useState(0);
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
          if (photos.length) { setReceived(photos.length); onFilesRef.current(photos); }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

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
      <Button type="button" variant="outline" onClick={start}
        className="border-primary text-primary gap-2 motion-safe:animate-wiggle">
        <Smartphone className="h-4 w-4" /> Depuis mon téléphone
      </Button>
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
              {received > 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {received > 0 ? `${received} fichier${received > 1 ? 's' : ''} reçu${received > 1 ? 's' : ''}`
                : session?.status === 'connected' ? 'Téléphone connecté…' : 'En attente du scan…'}
            </div>
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
