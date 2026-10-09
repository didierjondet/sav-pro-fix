import { useEffect, useMemo, useRef, useState } from 'react';
import { printControllerSheet, stickTrailSvg } from '@/lib/controllerPrint';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Gamepad2, Printer, Check } from 'lucide-react';
import { ControllerDiagram } from './ControllerDiagram';
import {
  type ControllerModel, type ControllerReport, type ItemStatus,
  buttonsForModel, buildControllerSummary, buildUntestedList, compactTrail, computeDrift, detectModel, evaluateStick,
  MANUAL_CHECKS, MODEL_LABELS, TRIGGER_MIN_TRAVEL, buttonLabel, summaryToText, computeStability, STABILITY_THRESHOLD,
} from '@/lib/controllerTest';
import { hidSupported, readControllerIdentity } from '@/lib/controllerHid';

export interface ControllerTestResult {
  report: ControllerReport;
  brand: string;
  model: string;
  problemDescription: string;
  serial?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: (r: ControllerTestResult) => void;
}

const STEPS = ['Connexion', 'Boutons', 'Gâchettes', 'Joysticks', 'Vibrations', 'Vérifications', 'Résumé'];
const STATUS_BTNS: { v: ItemStatus; label: string }[] = [
  { v: 'ok', label: 'OK' }, { v: 'intermittent', label: 'Intermittent' }, { v: 'defect', label: 'Défaut' },
];

function StatusPicker({ value, onChange }: { value: ItemStatus; onChange: (v: ItemStatus) => void }) {
  return (
    <div className="flex gap-1">
      {STATUS_BTNS.map((s) => (
        <Button key={s.v} type="button" size="sm" variant={value === s.v ? (s.v === 'defect' ? 'destructive' : 'default') : 'outline'} onClick={() => onChange(s.v)}>
          {s.label}
        </Button>
      ))}
    </div>
  );
}

export function ControllerTestDialog({ open, onOpenChange, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [padIndex, setPadIndex] = useState<number | null>(null);
  const [padId, setPadId] = useState('');
  const [model, setModel] = useState<ControllerModel>('generic');
  const [pressed, setPressed] = useState<Record<string, boolean>>({});
  const [buttons, setButtons] = useState<Record<string, ItemStatus>>({});
  const [triggers, setTriggers] = useState({ l2: 0, r2: 0 });
  const [triggerOverride, setTriggerOverride] = useState<Record<string, ItemStatus>>({});
  const [axes, setAxes] = useState({ lx: 0, ly: 0, rx: 0, ry: 0 });
  const [maxR, setMaxR] = useState({ left: 0, right: 0 });
  const [drift, setDrift] = useState<{ left: { driftX: number; driftY: number; stability?: number }; right: { driftX: number; driftY: number; stability?: number } } | null>(null);
  const [stickOverride, setStickOverride] = useState<Record<string, ItemStatus>>({});
  const [measuring, setMeasuring] = useState(false);
  const [vibration, setVibration] = useState<ItemStatus>('untested');
  const [manual, setManual] = useState<Record<string, { status: ItemStatus; note?: string }>>({});
  const [notes, setNotes] = useState('');
  const samples = useRef<{ l: { x: number; y: number }[]; r: { x: number; y: number }[] } | null>(null);
  const trail = useRef<{ left: { x: number; y: number }[]; right: { x: number; y: number }[] }>({ left: [], right: [] });

  const supported = typeof navigator !== 'undefined' && 'getGamepads' in navigator;
  const list = useMemo(() => buttonsForModel(model), [model]);

  // Réinitialisation à l'ouverture
  useEffect(() => {
    if (!open) return;
    setStep(0); setPadIndex(null); setPadId(''); setModel('generic'); setButtons({}); setTriggers({ l2: 0, r2: 0 });
    setTriggerOverride({}); setMaxR({ left: 0, right: 0 }); setDrift(null); setStickOverride({}); setVibration('untested');
    setManual({}); setNotes(''); trail.current = { left: [], right: [] };
  }, [open]);

  // Boucle de lecture
  useEffect(() => {
    if (!open || !supported) return;
    let raf = 0;
    const loop = () => {
      const pads = navigator.getGamepads();
      let pad: Gamepad | null = null;
      if (padIndex !== null) pad = pads[padIndex] ?? null;
      else {
        for (const p of pads) if (p && (p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > 0.5))) { pad = p; break; }
        if (pad) { setPadIndex(pad.index); setPadId(pad.id); setModel(detectModel(pad.id)); }
      }
      if (pad) {
        const pr: Record<string, boolean> = {};
        buttonsForModel(detectModel(pad.id)).forEach((b) => { if (pad!.buttons[b.index]?.pressed) pr[b.key] = true; });
        setPressed((prev) => {
          const same = Object.keys(pr).length === Object.keys(prev).length && Object.keys(pr).every((k) => prev[k]);
          return same ? prev : pr;
        });
        if (Object.keys(pr).length) setButtons((prev) => {
          let changed = false; const n = { ...prev };
          for (const k of Object.keys(pr)) if (!n[k] || n[k] === 'untested') { n[k] = 'ok'; changed = true; }
          return changed ? n : prev;
        });
        const l2 = pad.buttons[6]?.value ?? 0, r2 = pad.buttons[7]?.value ?? 0;
        setTriggers((t) => (l2 > t.l2 || r2 > t.r2 ? { l2: Math.max(t.l2, l2), r2: Math.max(t.r2, r2) } : t));
        const [lx = 0, ly = 0, rx = 0, ry = 0] = pad.axes;
        setAxes({ lx, ly, rx, ry });
        const rl = Math.hypot(lx, ly), rr = Math.hypot(rx, ry);
        setMaxR((m) => (rl > m.left || rr > m.right ? { left: Math.max(m.left, rl), right: Math.max(m.right, rr) } : m));
        if (rl > 0.3) { trail.current.left.push({ x: lx, y: ly }); if (trail.current.left.length > 400) trail.current.left.shift(); }
        if (rr > 0.3) { trail.current.right.push({ x: rx, y: ry }); if (trail.current.right.length > 400) trail.current.right.shift(); }
        if (samples.current) { samples.current.l.push({ x: lx, y: ly }); samples.current.r.push({ x: rx, y: ry }); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open, supported, padIndex]);

  const measureDrift = () => {
    samples.current = { l: [], r: [] };
    setMeasuring(true);
    setTimeout(() => {
      const s = samples.current!; samples.current = null;
      setDrift({ left: { ...computeDrift(s.l), stability: computeStability(s.l) }, right: { ...computeDrift(s.r), stability: computeStability(s.r) } });
      setMeasuring(false);
    }, 2000);
  };

  const vibrate = async (strong: boolean) => {
    const pad = padIndex !== null ? navigator.getGamepads()[padIndex] : null;
    const act: any = (pad as any)?.vibrationActuator;
    try {
      await act?.playEffect?.('dual-rumble', { duration: 600, strongMagnitude: strong ? 1 : 0, weakMagnitude: strong ? 0 : 1 });
    } catch { /* non supporté */ }
  };

  const [serial, setSerial] = useState<{ serial: string; firmware?: string } | null>(null);
  const [serialMsg, setSerialMsg] = useState('');
  const [reading, setReading] = useState(false);
  const readSerial = async () => {
    setReading(true); setSerialMsg('');
    const r = await readControllerIdentity();
    setReading(false);
    if (r) setSerial(r); else setSerialMsg("Numéro non lisible pour cette manette (Xbox ou navigateur non compatible) : saisissez-le à la main dans le SAV.");
  };

  const report: ControllerReport = useMemo(() => {
    const btn: Record<string, ItemStatus> = {};
    list.forEach((b) => { if (b.key !== 'l2' && b.key !== 'r2') btn[b.key] = buttons[b.key] ?? 'untested'; });
    const trig = (k: 'l2' | 'r2') => ({ max: triggers[k], status: triggerOverride[k] ?? (triggers[k] < 0.05 ? 'untested' : triggers[k] >= TRIGGER_MIN_TRAVEL ? 'ok' : 'defect') as ItemStatus });
    const stick = (k: 'left' | 'right') => {
      const raw = drift?.[k];
      const d = raw ? { driftX: raw.driftX, driftY: raw.driftY } : { driftX: 0, driftY: 0 };
      let auto: ItemStatus = !drift && maxR[k] < 0.3 ? 'untested' : evaluateStick(d, drift ? maxR[k] : 1);
      if (auto === 'ok' && raw?.stability != null && raw.stability < STABILITY_THRESHOLD) auto = 'defect';
      return { ...d, stability: raw?.stability, maxRadius: Math.min(1, maxR[k]), status: stickOverride[k] ?? auto, trail: compactTrail(trail.current[k]) };
    };
    const man: Record<string, { status: ItemStatus; note?: string }> = {};
    MANUAL_CHECKS[model].forEach((m) => { man[m] = manual[m] ?? { status: 'untested' }; });
    return {
      model, gamepadId: padId, tested_at: new Date().toISOString(), buttons: btn,
      triggers: { l2: trig('l2'), r2: trig('r2') }, sticks: { left: stick('left'), right: stick('right') },
      vibration, manual: man, notes: notes.trim() || undefined,
      serial: serial?.serial, firmware: serial?.firmware,
    };
  }, [serial, list, buttons, triggers, triggerOverride, drift, maxR, stickOverride, model, manual, vibration, notes, padId]);

  const summary = useMemo(() => buildControllerSummary(report), [report]);
  const untested = useMemo(() => buildUntestedList(report), [report]);
  const diagramStatuses = useMemo(() => ({
    ...report.buttons, l2: report.triggers.l2.status, r2: report.triggers.r2.status,
    stick_left: report.sticks.left.status, stick_right: report.sticks.right.status,
  }), [report]);


  const finish = () => {
    onComplete({
      report, brand: MODEL_LABELS[model].brand, model: MODEL_LABELS[model].model,
      problemDescription: summaryToText(report), serial: serial?.serial,
    });
    onOpenChange(false);
  };

  const Stick = ({ side, x, y }: { side: 'left' | 'right'; x: number; y: number }) => (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="-110 -110 220 220" className="w-40 h-40">
        <circle r="100" fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
        <circle r={100 * 0.08} fill="none" stroke="hsl(var(--border))" strokeDasharray="3 3" />
        {trail.current[side].length > 1 && (
          <polyline points={trail.current[side].map((p) => `${p.x * 100},${p.y * 100}`).join(' ')} fill="none" stroke="hsl(var(--primary) / 0.5)" strokeWidth="2" />
        )}
        <circle cx={x * 100} cy={y * 100} r="8" fill="hsl(var(--primary))" />
      </svg>
      <span className="text-xs text-muted-foreground">
        {side === 'left' ? 'Gauche' : 'Droit'} · amplitude {Math.round(Math.min(1, maxR[side]) * 100)} %
        {drift && ` · dérive ${Math.round(Math.hypot(drift[side].driftX, drift[side].driftY) * 100)} % · stabilité ${drift[side].stability ?? 100} %`}
      </span>
      <StatusPicker value={report.sticks[side].status} onChange={(v) => setStickOverride((o) => ({ ...o, [side]: v }))} />
    </div>
  );

  const connected = padIndex !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Gamepad2 className="h-5 w-5" /> Test de manette — {STEPS[step]}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1 mb-2">
          {STEPS.map((s, i) => (
            <button key={s} type="button" disabled={!connected && i > 0} onClick={() => setStep(i)}
              className={`text-xs px-2 py-1 rounded ${i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            {!supported && <p className="text-destructive text-sm">Ce navigateur ne permet pas de lire les manettes. Utilisez Chrome ou Edge sur ordinateur.</p>}
            <p className="text-sm">Branchez la manette en USB (ou appairez-la en Bluetooth), puis <b>appuyez sur n'importe quel bouton</b>.</p>
            <div className={`p-4 rounded-md border text-sm ${connected ? 'border-primary' : 'border-dashed'}`}>
              {connected ? <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Manette détectée : {padId}</span> : 'En attente de la manette…'}
            </div>
            {hidSupported() && (
              <div className="space-y-1">
                <Button type="button" variant="outline" size="sm" onClick={readSerial} disabled={reading}>{reading ? 'Lecture…' : 'Lire le n° de série'}</Button>
                {serial && <p className="text-sm"><Check className="inline h-4 w-4 text-primary" /> N° lu : <b>{serial.serial}</b>{serial.firmware ? ` (logiciel ${serial.firmware})` : ''}</p>}
                {serialMsg && <p className="text-sm text-muted-foreground">{serialMsg}</p>}
              </div>
            )}
            {connected && (
              <div className="max-w-xs">
                <Label>Modèle</Label>
                <Select value={model} onValueChange={(v) => setModel(v as ControllerModel)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ps4">PlayStation 4 (DualShock 4)</SelectItem>
                    <SelectItem value="ps5">PlayStation 5 (DualSense)</SelectItem>
                    <SelectItem value="xbox">Xbox One / Series</SelectItem>
                    <SelectItem value="switch_pro">Switch Pro</SelectItem>
                    <SelectItem value="generic">Générique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-4">
            <ControllerDiagram model={model} statuses={diagramStatuses} pressed={pressed} className="w-full" />
            <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
              <p className="text-xs text-muted-foreground mb-2">Appuyez sur chaque bouton : il passe en OK automatiquement. Marquez manuellement les défauts.</p>
              {list.filter((b) => b.key !== 'l2' && b.key !== 'r2').map((b) => (
                <div key={b.key} className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${pressed[b.key] ? 'bg-primary/10' : ''}`}>
                  <span className="text-sm">{buttonLabel(model, b.key)}</span>
                  <StatusPicker value={buttons[b.key] ?? 'untested'} onChange={(v) => setButtons((p) => ({ ...p, [b.key]: v }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm">Enfoncez lentement chaque gâchette jusqu'au bout.</p>
            {(['l2', 'r2'] as const).map((k) => (
              <div key={k} className="space-y-2">
                <div className="flex justify-between text-sm"><span>{buttonLabel(model, k)}</span><span>{Math.round(triggers[k] * 100)} %</span></div>
                <Progress value={triggers[k] * 100} />
                <StatusPicker value={report.triggers[k].status} onChange={(v) => setTriggerOverride((o) => ({ ...o, [k]: v }))} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => { setTriggers({ l2: 0, r2: 0 }); setTriggerOverride({}); }}>Recommencer</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm">1. Lâchez les deux joysticks puis cliquez sur « Mesurer la dérive » (2 s). 2. Faites des cercles complets avec chaque stick.</p>
            <div className="flex gap-2">
              <Button type="button" onClick={measureDrift} disabled={measuring}>{measuring ? 'Mesure…' : 'Mesurer la dérive'}</Button>
              <Button type="button" variant="outline" onClick={() => { setMaxR({ left: 0, right: 0 }); trail.current = { left: [], right: [] }; }}>Effacer les cercles</Button>
            </div>
            <div className="flex flex-wrap justify-around gap-6">
              <Stick side="left" x={axes.lx} y={axes.ly} />
              <Stick side="right" x={axes.rx} y={axes.ry} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm">Lancez les vibrations et confirmez ce que vous ressentez. Si rien ne se passe, le navigateur peut ne pas le permettre pour ce modèle.</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => vibrate(true)}>Moteur gauche (fort)</Button>
              <Button type="button" variant="outline" onClick={() => vibrate(false)}>Moteur droit (léger)</Button>
            </div>
            <StatusPicker value={vibration} onChange={setVibration} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Points à vérifier à la main (non lisibles par le navigateur).</p>
            {MANUAL_CHECKS[model].map((m) => (
              <div key={m} className="flex flex-wrap items-center gap-2 border-b pb-2">
                <span className="text-sm flex-1 min-w-40">{m}</span>
                <StatusPicker value={manual[m]?.status ?? 'untested'} onChange={(v) => setManual((p) => ({ ...p, [m]: { ...p[m], status: v } }))} />
                <Input className="w-48 h-8" placeholder="Note" value={manual[m]?.note ?? ''} onChange={(e) => setManual((p) => ({ ...p, [m]: { status: p[m]?.status ?? 'untested', note: e.target.value } }))} />
              </div>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="grid md:grid-cols-2 gap-4">
            <ControllerDiagram model={model} statuses={diagramStatuses} className="w-full" />
            <div className="space-y-3">
              <h3 className="font-medium">Pannes constatées</h3>
              {summary.length ? (
                <ul className="list-disc pl-5 text-sm space-y-1">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
              ) : <p className="text-sm text-muted-foreground">Aucun défaut détecté.</p>}
              <h3 className="font-medium">Fonctions non testées</h3>
              {untested.length ? (
                <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">{untested.map((s) => <li key={s}>{s}</li>)}</ul>
              ) : <p className="text-sm text-muted-foreground">Tout a été testé.</p>}
              <h3 className="font-medium">Débattement des joysticks</h3>
              <div className="flex gap-4 flex-wrap">
                {(['left', 'right'] as const).map((k) => (
                  <div key={k} className="text-center text-xs text-muted-foreground">
                    <div dangerouslySetInnerHTML={{ __html: stickTrailSvg(report.sticks[k].trail, { x: report.sticks[k].driftX, y: report.sticks[k].driftY }, { bg: 'hsl(var(--muted))', border: 'hsl(var(--border))', line: 'hsl(var(--primary))', dot: 'hsl(var(--destructive))' }) }} />
                    {k === 'left' ? 'Gauche' : 'Droit'}
                  </div>
                ))}
              </div>
              <div>
                <Label>Remarque de l'opérateur</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
            {step === 0 ? 'Annuler' : 'Précédent'}
          </Button>
          <div className="flex gap-2">
            {step < 6
              ? <Button type="button" disabled={!connected} onClick={() => setStep(step + 1)}>Suivant</Button>
              : <Button type="button" onClick={finish}>Valider et revenir au SAV</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
