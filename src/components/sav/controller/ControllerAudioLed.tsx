import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { hidSupported, setLightbar } from '@/lib/controllerHid';

async function listDevices(kind: MediaDeviceKind, askPermission: boolean) {
  if (askPermission) {
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()); } catch { /* refusé */ }
  }
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === kind);
}

function useDevices(kind: MediaDeviceKind) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const refresh = async (ask = false) => { try { setDevices(await listDevices(kind, ask)); } catch { setDevices([]); } };
  useEffect(() => { refresh(); }, []);
  const needsPermission = devices.length === 0 || devices.every((d) => !d.label);
  return { devices, refresh, needsPermission };
}

const isPad = (l: string) => /wireless controller|dualsense|dualshock|manette/i.test(l);

function DevicePicker({ kind, value, onChange }: { kind: MediaDeviceKind; value: string; onChange: (v: string) => void }) {
  const { devices, refresh, needsPermission } = useDevices(kind);
  useEffect(() => { const pad = devices.find((d) => isPad(d.label)); if (pad && !value) onChange(pad.deviceId); }, [devices]);
  if (needsPermission) return <Button type="button" size="sm" variant="outline" onClick={() => refresh(true)}>Autoriser l'audio</Button>;
  return (
    <Select value={value || 'default'} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Choisir" /></SelectTrigger>
      <SelectContent>
        {devices.map((d) => <SelectItem key={d.deviceId || 'default'} value={d.deviceId || 'default'}>{d.label || 'Par défaut'}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function SpeakerTest() {
  const [sink, setSink] = useState('');
  const [msg, setMsg] = useState('');
  const play = async () => {
    setMsg('');
    try {
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.4; o.connect(g).connect(dest);
      const audio = new Audio();
      audio.srcObject = dest.stream;
      if (sink && sink !== 'default') {
        if (typeof (audio as any).setSinkId === 'function') await (audio as any).setSinkId(sink);
        else setMsg("Ce navigateur ne permet pas de choisir la sortie : son joué sur l'ordinateur.");
      }
      await audio.play();
      o.start(); o.frequency.setValueAtTime(660, ctx.currentTime + 0.4); o.stop(ctx.currentTime + 1.2);
      o.onended = () => { audio.pause(); ctx.close(); };
    } catch { setMsg('Lecture impossible. Branchez la manette en USB (en Bluetooth, le son de la manette est inaccessible).'); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <span className="text-xs text-muted-foreground">Sortie audio :</span>
      <DevicePicker kind="audiooutput" value={sink} onChange={setSink} />
      <Button type="button" size="sm" variant="outline" onClick={play}>Jouer un son</Button>
      {msg && <span className="text-xs text-destructive w-full">{msg}</span>}
    </div>
  );
}

export function MicTest() {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState(0);
  const [state, setState] = useState<'idle' | 'rec' | 'done'>('idle');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);
  const record = async () => {
    setMsg(''); setUrl('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: input && input !== 'default' ? { deviceId: { exact: input } } : true });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      let raf = 0;
      const tick = () => { an.getByteTimeDomainData(buf); let m = 0; buf.forEach((v) => { m = Math.max(m, Math.abs(v - 128)); }); setLevel(Math.min(100, m * 1.6)); raf = requestAnimationFrame(tick); };
      tick();
      const rec = new MediaRecorder(stream); const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => { setUrl(URL.createObjectURL(new Blob(chunks))); setState('done'); };
      stop.current = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ctx.close().catch(() => {}); setLevel(0); };
      rec.start(); setState('rec');
      setTimeout(() => { rec.stop(); stop.current(); }, 3000);
    } catch { setMsg('Micro inaccessible : autorisez le micro et branchez la manette en USB.'); setState('idle'); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <span className="text-xs text-muted-foreground">Entrée micro :</span>
      <DevicePicker kind="audioinput" value={input} onChange={setInput} />
      <Button type="button" size="sm" variant="outline" onClick={record} disabled={state === 'rec'}>{state === 'rec' ? 'Parlez…' : 'Enregistrer 3 s'}</Button>
      <Progress value={level} className="w-32" />
      {url && <audio src={url} controls className="h-8" />}
      {msg && <span className="text-xs text-destructive w-full">{msg}</span>}
    </div>
  );
}

const COLORS: { label: string; rgb: [number, number, number] }[] = [
  { label: 'Rouge', rgb: [255, 0, 0] }, { label: 'Vert', rgb: [0, 255, 0] }, { label: 'Bleu', rgb: [0, 0, 255] },
  { label: 'Blanc', rgb: [255, 255, 255] }, { label: 'Éteint', rgb: [0, 0, 0] },
];

export function LedTest() {
  const [msg, setMsg] = useState('');
  if (!hidSupported()) return <span className="text-xs text-muted-foreground">Pilotage LED : Chrome/Edge sur ordinateur uniquement.</span>;
  const send = async (rgb: [number, number, number]) => {
    const ok = await setLightbar(...rgb);
    setMsg(ok ? '' : 'Impossible : manette PlayStation branchée en USB requise.');
  };
  return (
    <div className="flex flex-wrap items-center gap-1 w-full">
      <span className="text-xs text-muted-foreground mr-1">Allumer :</span>
      {COLORS.map((c) => <Button key={c.label} type="button" size="sm" variant="outline" onClick={() => send(c.rgb)}>{c.label}</Button>)}
      {msg && <span className="text-xs text-destructive w-full">{msg}</span>}
    </div>
  );
}
