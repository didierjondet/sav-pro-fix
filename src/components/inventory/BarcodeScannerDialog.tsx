import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff, RefreshCw, Keyboard, X, ScanLine, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
  lastScanLabel?: string | null;
}

function beep() {
  try {
    const Ctx: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
    setTimeout(() => ctx.close().catch(() => {}), 250);
  } catch { /* noop */ }
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
  title = 'Scanner un code-barres',
  subtitle,
  lastScanLabel,
}: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [cameraOn, setCameraOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ready, setReady] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const stopAll = useCallback(() => {
    try { controlsRef.current?.stop?.(); } catch { /* noop */ }
    controlsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { /* noop */ } });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try { (videoRef.current as any).srcObject = null; } catch { /* noop */ }
    }
    setReady(false);
  }, []);

  const emit = useCallback((raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const now = Date.now();
    if (
      lastCodeRef.current &&
      lastCodeRef.current.code === code &&
      now - lastCodeRef.current.at < 800
    ) return;
    lastCodeRef.current = { code, at: now };
    beep();
    if (navigator.vibrate) navigator.vibrate(60);
    onScan(code);
  }, [onScan]);

  const startCamera = useCallback(async (preferredDeviceId?: string) => {
    setError(null);
    setStarting(true);
    setReady(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Votre navigateur ne supporte pas l\'accès caméra.');
      }
      if (!window.isSecureContext) {
        throw new Error('La caméra nécessite une connexion sécurisée (HTTPS).');
      }

      // Stop previous
      stopAll();

      // Ask permission first; this also unlocks device labels
      const constraints: MediaStreamConstraints = preferredDeviceId
        ? { video: { deviceId: { exact: preferredDeviceId } }, audio: false }
        : { video: { facingMode: { ideal: 'environment' } }, audio: false };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('Lecteur vidéo indisponible.');
      }
      (video as any).srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play().catch(() => { /* ignored */ });

      // List devices now that permission is granted (labels available)
      try {
        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(list);
        if (!preferredDeviceId) {
          const currentTrack = stream.getVideoTracks()[0];
          const settings = currentTrack?.getSettings?.();
          const activeId = settings?.deviceId
            || list.find((d) => /back|rear|environment/i.test(d.label))?.deviceId
            || list[0]?.deviceId;
          if (activeId) setDeviceId(activeId);
        } else {
          setDeviceId(preferredDeviceId);
        }
      } catch { /* noop */ }

      // Start ZXing decoding on the already-attached video element
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      const controls = await readerRef.current.decodeFromVideoElement(video, (result) => {
        if (result) emit(result.getText());
      });
      controlsRef.current = controls;
      setReady(true);
    } catch (e: any) {
      const name = e?.name || '';
      let msg = e?.message || 'Impossible de démarrer la caméra.';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        msg = 'Permission caméra refusée. Autorisez l\'accès dans les réglages du navigateur puis réessayez.';
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        msg = 'Aucune caméra compatible détectée sur cet appareil.';
      } else if (name === 'NotReadableError') {
        msg = 'La caméra est déjà utilisée par une autre application.';
      }
      setError(msg);
      stopAll();
    } finally {
      setStarting(false);
    }
  }, [emit, stopAll]);

  // Launch when opened / cameraOn re-enabled
  useEffect(() => {
    if (open && cameraOn) {
      startCamera(deviceId);
    }
    return () => {
      if (!open) stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cameraOn]);

  // Stop when closing
  useEffect(() => {
    if (!open) stopAll();
  }, [open, stopAll]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    emit(code);
    setManualCode('');
  };

  const switchCamera = async () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(idx + 1) % devices.length];
    setDeviceId(next.deviceId);
    await startCamera(next.deviceId);
  };

  const captureNow = async () => {
    const video = videoRef.current;
    if (!video || !readerRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const result = await readerRef.current.decodeFromCanvas(canvas);
      if (result) emit(result.getText());
    } catch {
      setError('Aucun code détecté sur l\'image. Rapprochez-vous et réessayez.');
      setTimeout(() => setError(null), 2500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopAll(); onOpenChange(o); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden sm:rounded-lg h-[100svh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader className="p-3 border-b shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">{title}</DialogTitle>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)} aria-label="Fermer">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="relative bg-black aspect-[3/4] sm:aspect-video w-full">
            <video
              ref={videoRef}
              className={cn('absolute inset-0 w-full h-full object-cover', !cameraOn && 'hidden')}
              muted
              playsInline
              autoPlay
            />
            {cameraOn && !error && ready && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-4/5 h-1/3 border-2 border-primary rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            )}
            {cameraOn && starting && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                Démarrage de la caméra…
              </div>
            )}
            {!cameraOn && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                Caméra désactivée
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-sm text-white">
                <p>{error}</p>
                <Button size="sm" variant="secondary" onClick={() => startCamera(deviceId)}>
                  <RotateCw className="h-4 w-4 mr-1" /> Réessayer
                </Button>
              </div>
            )}
          </div>

          <div className="p-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={captureNow}
                disabled={!ready}
              >
                <ScanLine className="h-4 w-4" /> Capturer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCameraOn((v) => !v)}
              >
                {cameraOn ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                {cameraOn ? 'Pause' : 'Activer caméra'}
              </Button>
              {devices.length > 1 && (
                <Button size="sm" variant="outline" onClick={switchCamera}>
                  <RefreshCw className="h-4 w-4" />Changer caméra
                </Button>
              )}
            </div>

            {lastScanLabel && (
              <div className="rounded-md border bg-success/10 border-success/30 px-3 py-2 text-sm">
                <span className="font-medium text-success">Dernier scan :</span> {lastScanLabel}
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Keyboard className="h-3.5 w-3.5" /> Saisie manuelle / douchette
              </div>
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Tapez ou scannez un code"
                  autoFocus={false}
                />
                <Button type="submit" disabled={!manualCode.trim()}>OK</Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
