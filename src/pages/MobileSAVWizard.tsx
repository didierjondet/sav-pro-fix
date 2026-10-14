import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, ArrowRight, Camera, Check, Plus, Minus, Trash2, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSettings } from '@/hooks/useShopSettings';
import { useAllCustomers } from '@/hooks/useAllCustomers';
import { useCustomers } from '@/hooks/useCustomers';
import { useParts } from '@/hooks/useParts';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { FileUpload } from '@/components/parts/FileUpload';
import { AITextReformulator } from '@/components/sav/AITextReformulator';
import { ProductHistoryBanner } from '@/components/sav/ProductHistoryBanner';
import { SecurityCodesSection, type SecurityCodes } from '@/components/sav/SecurityCodesSection';
import { multiWordSearch } from '@/utils/searchUtils';
import { isMobileSessionUsable, isValidImei, filterPartsForDevice } from '@/lib/mobileSav';

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
  { value: 'A', label: 'A', desc: 'Excellent état' },
  { value: 'B', label: 'B', desc: 'Bon état' },
  { value: 'C', label: 'C', desc: 'État moyen' },
  { value: 'D', label: 'D', desc: 'Mauvais état' },
];

type Part = { key: string; part_id: string | null; name: string; reference?: string; quantity: number; unitPrice: number; isCustom: boolean };

interface Draft {
  savType: string;
  customerId: string | null;
  newCustomer: { firstName: string; lastName: string; phone: string; email: string };
  brand: string; model: string; imei: string; sku: string;
  color: string; grade: string; photos: string[];
  problem: string;
  accessories: { charger: boolean; case: boolean; screen_protector: boolean; other: string };
  codes: SecurityCodes; noCode: boolean;
  parts: Part[];
  initials: string;
  step: number;
}

const emptyDraft = (type: string): Draft => ({
  savType: type, customerId: null,
  newCustomer: { firstName: '', lastName: '', phone: '', email: '' },
  brand: '', model: '', imei: '', sku: '', color: '', grade: '', photos: [], problem: '',
  accessories: { charger: false, case: false, screen_protector: false, other: '' },
  codes: { unlock_code: '', icloud_id: '', icloud_password: '', sim_pin: '', email_id: '', email_password: '' },
  noCode: false, parts: [], initials: '', step: 0,
});

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
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const { getAllStatuses } = useShopSAVStatuses();
  const { settings: shopSettings } = useShopSettings();
  const { customers } = useAllCustomers();
  const { createCustomer } = useCustomers();
  const { parts: stock } = useParts();
  const { createCase } = useSAVCases();

  const [session, setSession] = useState<any>(null);
  const [sessionState, setSessionState] = useState<'loading' | 'ok' | 'invalid'>('loading');
  const [done, setDone] = useState<{ caseNumber: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const [showAllParts, setShowAllParts] = useState(false);
  const [customPart, setCustomPart] = useState({ name: '', price: '' });
  const [history, setHistory] = useState<{ brands: string[]; models: string[] }>({ brands: [], models: [] });
  const ocrInput = useRef<HTMLInputElement>(null);

  const types = getAllTypes();
  const draftKey = `fixway_mobile_sav_${token}`;
  const [d, setD] = useState<Draft>(() => {
    try { const raw = localStorage.getItem(`fixway_mobile_sav_${token}`); if (raw) return JSON.parse(raw); } catch { /* */ }
    return emptyDraft('');
  });
  const set = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }));

  useEffect(() => { try { localStorage.setItem(draftKey, JSON.stringify(d)); } catch { /* */ } }, [d, draftKey]);
  useEffect(() => { if (!d.savType && types[0]) set({ savType: types[0].value }); /* eslint-disable-next-line */ }, [types.length]);

  // Validation de la session (RLS : même magasin uniquement)
  useEffect(() => {
    if (!user || !token) return;
    (async () => {
      const { data } = await supabase.from('mobile_sav_sessions' as any).select('*').eq('token', token).maybeSingle();
      if (!data || !isMobileSessionUsable(data as any)) { setSessionState('invalid'); return; }
      setSession(data);
      setSessionState('ok');
      if ((data as any).status === 'waiting') {
        await supabase.from('mobile_sav_sessions' as any).update({ status: 'connected' } as any).eq('id', (data as any).id);
      }
    })();
  }, [user, token]);

  // Suggestions marque / modèle depuis l'historique du magasin
  useEffect(() => {
    if (!profile?.shop_id) return;
    supabase.from('sav_cases').select('device_brand, device_model').eq('shop_id', profile.shop_id)
      .order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => {
        const brands = new Set<string>(), models = new Set<string>();
        (data || []).forEach((r: any) => { if (r.device_brand) brands.add(r.device_brand); if (r.device_model) models.add(r.device_model); });
        setHistory({ brands: [...brands], models: [...models] });
      });
  }, [profile?.shop_id]);

  const typeInfo = getTypeInfo(d.savType);
  const collectInitials = shopSettings?.collect_technician_initials ?? false;

  const steps = useMemo(() => [
    { key: 'type', label: 'Type de SAV' },
    ...(typeInfo?.show_customer_info ? [{ key: 'client', label: 'Client' }] : []),
    { key: 'product', label: 'Produit' },
    { key: 'codes', label: 'IMEI, SKU, n° de série' },
    { key: 'color', label: 'Couleur' },
    { key: 'grade', label: 'État du produit' },
    { key: 'problem', label: 'Panne' },
    { key: 'accessories', label: 'Accessoires & codes' },
    { key: 'parts', label: 'Pièces détachées' },
    { key: 'initials', label: 'Initiales & validation' },
  ], [typeInfo?.show_customer_info]);

  const step = Math.min(d.step, steps.length - 1);
  const key = steps[step]?.key;

  if (!authLoading && !user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(`/m/sav/nouveau/${token}`)}`} replace />;
  }

  const selectedCustomer = customers.find((c) => c.id === d.customerId) || null;

  const validate = (): string | null => {
    switch (key) {
      case 'type': return d.savType ? null : 'Choisissez un type de SAV';
      case 'client':
        if (d.customerId) return null;
        if (!d.newCustomer.firstName.trim() || !d.newCustomer.lastName.trim()) return 'Sélectionnez ou créez un client (nom et prénom)';
        return null;
      case 'product': return d.brand.trim() && d.model.trim() ? null : 'Renseignez la marque et le modèle';
      case 'problem': return d.problem.trim() ? null : 'Décrivez la panne';
      case 'initials': return collectInitials && !d.initials.trim() ? 'Saisissez vos initiales' : null;
      default: return null;
    }
  };

  const next = () => {
    const err = validate();
    if (err) { toast({ title: err, variant: 'destructive' }); return; }
    set({ step: step + 1 });
    window.scrollTo({ top: 0 });
  };
  const back = () => { if (step > 0) { set({ step: step - 1 }); window.scrollTo({ top: 0 }); } };

  const runOcr = async (file: File) => {
    setOcrLoading(true);
    try {
      const image = await fileToDataUrl(file);
      const { data, error } = await supabase.functions.invoke('ai-read-device-codes', { body: { image } });
      if (error || data?.error) throw new Error(data?.error || 'Lecture impossible, saisissez le code à la main.');
      const patch: Partial<Draft> = {};
      if (data.imei) patch.imei = data.imei;
      else if (data.serial) patch.imei = data.serial;
      if (data.sku) patch.sku = data.sku;
      if (!patch.imei && !patch.sku) throw new Error('Aucun code lisible sur la photo.');
      set(patch);
      toast({ title: 'Codes lus', description: 'Vérifiez-les avant de continuer.' });
    } catch (e: any) {
      toast({ title: 'Lecture IA', description: e.message, variant: 'destructive' });
    } finally {
      setOcrLoading(false);
    }
  };

  const addPart = (p: any) => {
    const existing = d.parts.find((x) => x.part_id === p.id);
    if (existing) { set({ parts: d.parts.map((x) => x.part_id === p.id ? { ...x, quantity: x.quantity + 1 } : x) }); return; }
    set({ parts: [...d.parts, { key: crypto.randomUUID(), part_id: p.id, name: p.name, reference: p.reference, quantity: 1, unitPrice: p.selling_price || 0, isCustom: false }] });
  };

  const submit = async () => {
    const err = validate();
    if (err) { toast({ title: err, variant: 'destructive' }); return; }
    if (!profile?.shop_id || !session) return;
    setSubmitting(true);
    try {
      // Revalider la session juste avant création (usage unique)
      const { data: fresh } = await supabase.from('mobile_sav_sessions' as any).select('status, expires_at').eq('id', session.id).maybeSingle();
      if (!isMobileSessionUsable(fresh as any)) throw new Error('Ce lien a expiré ou a déjà été utilisé. Générez un nouveau QR code.');

      let customerId: string | null = null;
      if (typeInfo?.show_customer_info) {
        customerId = d.customerId;
        if (!customerId) {
          const { data: c, error } = await createCustomer({
            first_name: d.newCustomer.firstName.trim(), last_name: d.newCustomer.lastName.trim(),
            phone: d.newCustomer.phone.trim(), email: d.newCustomer.email.trim(), address: '', shop_id: profile.shop_id,
          } as any);
          if (error || !c) throw error || new Error('Création du client impossible');
          customerId = (c as any).id;
        }
      }

      const total = d.parts.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
      const hasCodes = Object.values(d.codes).some((v) => (v || '').trim());
      const { data: newCase, error } = await createCase({
        sav_type: d.savType, customer_id: customerId,
        device_brand: d.brand.toUpperCase().trim(), device_model: d.model.toUpperCase().trim(),
        device_imei: d.imei.trim() || null, sku: d.sku.trim() || null,
        device_color: d.color || null, device_grade: d.grade || null,
        problem_description: d.problem.trim(),
        total_time_minutes: 0, total_cost: d.savType === 'internal' ? 0 : total, deposit_amount: 0,
        status: (getAllStatuses()[0]?.value || 'pending') as any, shop_id: profile.shop_id,
        attachments: d.photos, accessories: d.accessories,
        unlock_pattern: null,
        security_codes: hasCodes ? {
          unlock_code: !d.noCode ? (d.codes.unlock_code || null) : null,
          icloud_id: d.codes.icloud_id || null, icloud_password: d.codes.icloud_password || null,
          sim_pin: d.codes.sim_pin || null, email_id: d.codes.email_id || null, email_password: d.codes.email_password || null,
        } : null,
        taken_over_by: d.initials.trim() ? d.initials.trim().toUpperCase() : null,
      } as any);
      if (error || !newCase) throw error || new Error('Création du SAV impossible');

      if (d.parts.length > 0) {
        const short = d.parts.filter((p) => !p.isCustom && p.part_id).map((p) => {
          const s = stock.find((x) => x.id === p.part_id);
          const avail = s ? Math.max(0, (s.quantity || 0) - (s.reserved_quantity || 0)) : 0;
          return { ...p, missing: Math.max(0, p.quantity - avail) };
        }).filter((p) => p.missing > 0);
        const { error: pe } = await supabase.from('sav_parts').insert(d.parts.map((p) => ({
          sav_case_id: newCase.id, part_id: p.isCustom ? null : p.part_id,
          custom_part_name: p.isCustom ? p.name : null, quantity: p.quantity, unit_price: p.unitPrice, time_minutes: 0,
          purchase_price: p.isCustom ? 0 : (stock.find((x) => x.id === p.part_id)?.purchase_price || 0),
        })) as any);
        if (!pe && short.length > 0) {
          await supabase.from('order_items').insert(short.map((p) => ({
            shop_id: profile.shop_id, sav_case_id: newCase.id, part_id: p.part_id, part_name: p.name,
            part_reference: p.reference, quantity_needed: p.missing, reason: 'sav_stock_zero', priority: 'high',
          })) as any);
          await supabase.from('sav_cases').update({ status: 'parts_to_order' } as any).eq('id', newCase.id);
        }
      }

      await supabase.from('mobile_sav_sessions' as any).update({ status: 'submitted', sav_case_id: newCase.id } as any).eq('id', session.id);
      localStorage.removeItem(draftKey);
      setDone({ caseNumber: (newCase as any).case_number });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Une erreur est survenue', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ------- Écrans d'état -------
  if (authLoading || sessionState === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="text-2xl font-bold">SAV n° {done.caseNumber} créé</h1>
        <p className="text-muted-foreground">L'impression continue sur l'ordinateur.</p>
      </div>
    );
  }
  if (sessionState === 'invalid') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Lien expiré ou invalide</h1>
        <p className="text-muted-foreground">Sur l'ordinateur, cliquez sur « Nouveau SAV » puis « Avec mon smartphone » pour générer un nouveau QR code. Le téléphone doit être connecté au même magasin.</p>
      </div>
    );
  }

  const filteredCustomers = customerSearch.trim().length >= 2
    ? customers.filter((c) => multiWordSearch(customerSearch, c.first_name, c.last_name, c.phone, c.email)).slice(0, 8)
    : [];
  const deviceParts = filterPartsForDevice(stock, d.brand, d.model);
  const shownParts = (showAllParts || deviceParts.length === 0)
    ? (partSearch.trim() ? stock.filter((p) => multiWordSearch(partSearch, p.name, p.reference, p.sku)).slice(0, 30) : [])
    : deviceParts.filter((p) => !partSearch.trim() || multiWordSearch(partSearch, p.name, p.reference, p.sku)).slice(0, 50);
  const imeiDigits = /^\d+$/.test(d.imei.replace(/\s/g, ''));

  const big = 'h-14 text-lg';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{steps[step]?.label}</span>
          <span className="text-muted-foreground">{step + 1}/{steps.length}</span>
        </div>
        <Progress value={((step + 1) / steps.length) * 100} className="h-2" />
      </header>

      <main className="flex-1 px-4 py-5 space-y-4 pb-32">
        {key === 'type' && (
          <div className="grid gap-3">
            {types.map((t) => (
              <button key={t.value} type="button" onClick={() => set({ savType: t.value, step: step + 1 })}
                className={`rounded-xl border-2 p-5 text-left text-lg font-semibold transition ${d.savType === t.value ? 'border-primary' : 'border-border'}`}
                style={{ backgroundColor: `${t.color}26` }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {key === 'client' && (
          <div className="space-y-4">
            {selectedCustomer ? (
              <div className="rounded-xl border-2 border-primary p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
                <Button variant="ghost" onClick={() => set({ customerId: null })}>Changer</Button>
              </div>
            ) : !createMode ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-4 h-5 w-5 text-muted-foreground" />
                  <Input className={`${big} pl-10`} placeholder="Nom ou téléphone" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                </div>
                <div className="space-y-2">
                  {filteredCustomers.map((c) => (
                    <button key={c.id} type="button" onClick={() => set({ customerId: c.id })} className="w-full rounded-lg border p-3 text-left">
                      <p className="font-medium">{c.first_name} {c.last_name}</p>
                      <p className="text-sm text-muted-foreground">{c.phone}</p>
                    </button>
                  ))}
                </div>
                <Button variant="outline" className={`w-full ${big}`} onClick={() => setCreateMode(true)}><Plus className="h-5 w-5 mr-2" /> Nouveau client</Button>
              </>
            ) : (
              <div className="space-y-3">
                <Input className={big} placeholder="Prénom *" value={d.newCustomer.firstName} onChange={(e) => set({ newCustomer: { ...d.newCustomer, firstName: e.target.value } })} />
                <Input className={big} placeholder="Nom *" value={d.newCustomer.lastName} onChange={(e) => set({ newCustomer: { ...d.newCustomer, lastName: e.target.value } })} />
                <Input className={big} type="tel" inputMode="tel" placeholder="Téléphone" value={d.newCustomer.phone} onChange={(e) => set({ newCustomer: { ...d.newCustomer, phone: e.target.value } })} />
                <Input className={big} type="email" inputMode="email" placeholder="E-mail" value={d.newCustomer.email} onChange={(e) => set({ newCustomer: { ...d.newCustomer, email: e.target.value } })} />
                <Button variant="ghost" onClick={() => setCreateMode(false)}>Rechercher un client existant</Button>
              </div>
            )}
          </div>
        )}

        {key === 'product' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base">Marque *</Label>
              <Input className={big} list="m-brands" autoCapitalize="characters" value={d.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="ex. APPLE" />
              <datalist id="m-brands">{history.brands.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">Modèle *</Label>
              <Input className={big} list="m-models" autoCapitalize="characters" value={d.model} onChange={(e) => set({ model: e.target.value })} placeholder="ex. IPHONE 13" />
              <datalist id="m-models">{history.models.filter((m) => !d.model || m.toLowerCase().includes(d.model.toLowerCase())).slice(0, 30).map((m) => <option key={m} value={m} />)}</datalist>
            </div>
          </div>
        )}

        {key === 'codes' && (
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
              <Input className={`${big} font-mono`} autoCapitalize="characters" value={d.imei} onChange={(e) => set({ imei: e.target.value.toUpperCase() })} />
              {d.imei && imeiDigits && !isValidImei(d.imei) && (
                <p className="text-xs text-destructive">Cet IMEI semble incorrect (15 chiffres attendus) — vérifiez.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-base">SKU / référence</Label>
              <Input className={`${big} font-mono`} autoCapitalize="characters" value={d.sku} onChange={(e) => set({ sku: e.target.value.toUpperCase() })} />
            </div>
            <ProductHistoryBanner shopId={profile?.shop_id} imei={d.imei} sku={d.sku} brand={d.brand} model={d.model} />
          </div>
        )}

        {key === 'color' && (
          <div className="grid grid-cols-3 gap-3">
            {COLORS.map((c) => (
              <button key={c.value} type="button" onClick={() => set({ color: c.value, step: step + 1 })}
                className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 ${d.color === c.value ? 'border-primary' : 'border-border'}`}>
                <span className="h-10 w-10 rounded-full border" style={{ backgroundColor: c.color }} />
                <span className="text-sm">{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {key === 'grade' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {GRADES.map((g) => (
                <button key={g.value} type="button" onClick={() => set({ grade: g.value })}
                  className={`rounded-xl border-2 p-4 text-center ${d.grade === g.value ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <p className="text-2xl font-bold">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.desc}</p>
                </button>
              ))}
            </div>
            <FileUpload files={d.photos} onFilesChange={(photos) => set({ photos })} partId="sav-mobile" label="Photos de l'état du produit" />
          </div>
        )}

        {key === 'problem' && (
          <div className="space-y-2">
            <Textarea rows={6} className="text-base" value={d.problem} onChange={(e) => set({ problem: e.target.value })} placeholder="Décrivez la panne…" />
            <AITextReformulator text={d.problem} context="problem_description" onReformulated={(t) => set({ problem: t })} />
          </div>
        )}

        {key === 'accessories' && (
          <div className="space-y-4">
            {([['charger', 'Chargeur'], ['case', 'Coque'], ['screen_protector', 'Protection écran']] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-3 rounded-lg border p-4 text-base">
                <Checkbox checked={d.accessories[k]} onCheckedChange={(v) => set({ accessories: { ...d.accessories, [k]: !!v } })} className="h-6 w-6" />
                {l}
              </label>
            ))}
            <Input className={big} placeholder="Autre accessoire" value={d.accessories.other} onChange={(e) => set({ accessories: { ...d.accessories, other: e.target.value } })} />
            <SecurityCodesSection codes={d.codes} onChange={(codes) => set({ codes })} noCode={d.noCode} onNoCodeChange={(noCode) => set({ noCode })} />
          </div>
        )}

        {key === 'parts' && (
          <div className="space-y-4">
            {d.parts.length > 0 && (
              <div className="space-y-2">
                {d.parts.map((p) => (
                  <div key={p.key} className="rounded-lg border p-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.unitPrice.toFixed(2)} €{p.isCustom ? ' · pièce libre' : ''}</p>
                    </div>
                    <Button size="icon" variant="outline" onClick={() => set({ parts: d.parts.map((x) => x.key === p.key ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x) })}><Minus className="h-4 w-4" /></Button>
                    <span className="w-6 text-center">{p.quantity}</span>
                    <Button size="icon" variant="outline" onClick={() => set({ parts: d.parts.map((x) => x.key === p.key ? { ...x, quantity: x.quantity + 1 } : x) })}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => set({ parts: d.parts.filter((x) => x.key !== p.key) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {showAllParts || deviceParts.length === 0
                ? 'Recherche dans tout le stock'
                : `${deviceParts.length} pièce(s) pour ${d.brand} ${d.model}`}
            </p>
            <Input className={big} placeholder={showAllParts || deviceParts.length === 0 ? 'Rechercher une pièce…' : 'Affiner…'} value={partSearch} onChange={(e) => setPartSearch(e.target.value)} />
            <div className="space-y-2">
              {shownParts.map((p) => {
                const avail = Math.max(0, (p.quantity || 0) - (p.reserved_quantity || 0));
                return (
                  <button key={p.id} type="button" onClick={() => addPart(p)} className="w-full rounded-lg border p-3 text-left flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{(p.selling_price || 0).toFixed(2)} € · stock {avail}</p>
                    </div>
                    <Plus className="h-5 w-5 text-primary" />
                  </button>
                );
              })}
            </div>
            {deviceParts.length > 0 && (
              <Button variant="outline" className="w-full" onClick={() => { setShowAllParts(!showAllParts); setPartSearch(''); }}>
                {showAllParts ? `Revenir aux pièces ${d.model}` : 'Chercher autre chose'}
              </Button>
            )}
            <div className="rounded-lg border border-dashed p-3 space-y-2">
              <Label>Ajouter une pièce libre</Label>
              <Input placeholder="Nom de la pièce" value={customPart.name} onChange={(e) => setCustomPart({ ...customPart, name: e.target.value })} />
              <div className="flex gap-2">
                <Input type="number" inputMode="decimal" placeholder="Prix €" value={customPart.price} onChange={(e) => setCustomPart({ ...customPart, price: e.target.value })} />
                <Button disabled={!customPart.name.trim()} onClick={() => {
                  set({ parts: [...d.parts, { key: crypto.randomUUID(), part_id: null, name: customPart.name.trim(), quantity: 1, unitPrice: Number(customPart.price) || 0, isCustom: true }] });
                  setCustomPart({ name: '', price: '' });
                }}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}

        {key === 'initials' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base">Vos initiales {collectInitials && '*'}</Label>
              <Input className={`${big} uppercase text-center tracking-widest`} maxLength={5} autoCapitalize="characters" value={d.initials} onChange={(e) => set({ initials: e.target.value })} />
            </div>
            <div className="rounded-lg border p-4 text-sm space-y-1">
              <p><span className="text-muted-foreground">Type :</span> {typeInfo?.label}</p>
              {(selectedCustomer || d.newCustomer.lastName) && (
                <p><span className="text-muted-foreground">Client :</span> {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : `${d.newCustomer.firstName} ${d.newCustomer.lastName}`}</p>
              )}
              <p><span className="text-muted-foreground">Appareil :</span> {d.brand} {d.model}</p>
              {d.imei && <p><span className="text-muted-foreground">IMEI / série :</span> {d.imei}</p>}
              <p><span className="text-muted-foreground">Panne :</span> {d.problem}</p>
              <p><span className="text-muted-foreground">Pièces :</span> {d.parts.length}</p>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-background border-t p-3 flex gap-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Button variant="outline" className="h-14 flex-1 text-base" onClick={back} disabled={step === 0 || submitting}>
          <ArrowLeft className="h-5 w-5 mr-1" /> Retour
        </Button>
        {key === 'initials' ? (
          <Button className="h-14 flex-[2] text-base" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />} Valider le SAV
          </Button>
        ) : (
          <Button className="h-14 flex-[2] text-base" onClick={next}>
            Suivant <ArrowRight className="h-5 w-5 ml-1" />
          </Button>
        )}
      </footer>
    </div>
  );
}
