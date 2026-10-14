import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bwipjs from 'bwip-js/browser';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { getPublicAppOrigin } from '@/utils/trackingUtils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ouvre le parcours habituel sur ordinateur */
  onComputer: () => void;
}

type Session = { id: string; token: string; status: string; sav_case_id: string | null; expires_at: string };

export function NewSAVModeDialog({ open, onOpenChange, onComputer }: Props) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (!open) setSession(null); }, [open]);

  // Suivi en direct de la session
  useEffect(() => {
    if (!session?.id) return;
    const channel = supabase
      .channel(`mobile-sav-${session.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mobile_sav_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession((prev) => (prev ? { ...prev, ...(payload.new as any) } : prev)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  useEffect(() => {
    if (session?.status === 'submitted' && session.sav_case_id) {
      const id = session.sav_case_id;
      onOpenChange(false);
      navigate(`/sav/${id}?from=mobile`);
    }
  }, [session?.status, session?.sav_case_id, navigate, onOpenChange]);

  const url = session ? `${getPublicAppOrigin()}/m/sav/nouveau/${session.token}` : '';
  const qrSvg = useMemo(() => {
    if (!url) return '';
    try { return bwipjs.toSVG({ bcid: 'qrcode', text: url, scale: 4, eclevel: 'M' } as any); } catch { return ''; }
  }, [url]);

  const startPhone = async () => {
    if (!profile?.shop_id) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('mobile_sav_sessions' as any)
      .insert({ shop_id: profile.shop_id } as any)
      .select('id, token, status, sav_case_id, expires_at')
      .single();
    setCreating(false);
    if (error || !data) {
      toast({ title: 'Impossible de préparer le QR code', description: error?.message, variant: 'destructive' });
      return;
    }
    setSession(data as any);
  };

  const statusLabel =
    session?.status === 'connected' ? 'Téléphone connecté — saisie en cours…'
    : session?.status === 'submitted' ? 'SAV créé !'
    : 'En attente du scan…';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau SAV</DialogTitle>
          <DialogDescription>
            {session ? 'Scannez ce QR code avec votre téléphone.' : 'Comment souhaitez-vous saisir ce SAV ?'}
          </DialogDescription>
        </DialogHeader>

        {!session ? (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-32 flex-col gap-2 text-base"
              onClick={() => { onOpenChange(false); onComputer(); }}>
              <Monitor className="h-8 w-8" />
              Avec l'ordinateur
            </Button>
            <Button variant="outline" className="h-32 flex-col gap-2 text-base border-primary/50" onClick={startPhone} disabled={creating}>
              {creating ? <Loader2 className="h-8 w-8 animate-spin" /> : <Smartphone className="h-8 w-8 text-primary" />}
              Avec mon smartphone
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-lg border bg-card p-3 [&_svg]:h-56 [&_svg]:w-56" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div className="flex items-center gap-2 text-sm font-medium">
              {session.status === 'submitted'
                ? <CheckCircle2 className="h-4 w-4 text-primary" />
                : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {statusLabel}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Lien à usage unique, valable 15 minutes. Votre téléphone doit être connecté à votre compte Fixway.
              Une fois le SAV validé sur le téléphone, il s'ouvrira ici pour l'impression.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSession(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
