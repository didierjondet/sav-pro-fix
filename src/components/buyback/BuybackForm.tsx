import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  BUYBACK_CATEGORIES,
  getQuestions,
  getPhotoGuides,
  getAccessories,
  getIssues,
  type BuybackQuestion,
  type PhotoGuide,
} from '@/lib/buyback';
import {
  Camera, Loader2, Sparkles, Check, ArrowLeft, ArrowRight, Globe2, Store, MapPin, Search, Trash2,
} from 'lucide-react';

export interface BuybackSubmitPayload {
  category: string;
  brand: string;
  model: string;
  answers: Record<string, string>;
  media: { path: string; type: string; slot?: string }[];
  customer: { name: string; email: string; phone: string; city: string; postal_code: string };
  /** Magasin destinataire choisi (null = toute la France) */
  shopId: string | null;
}

interface BuybackShop {
  shop_id: string;
  slug: string;
  name: string;
  city: string;
  postal_code: string;
  logo_url: string | null;
  categories: string[];
}

interface Props {
  allowedCategories: string[];
  storagePrefix: string;
  submitLabel?: string;
  /** Affiche l'étape de choix du destinataire (réseau national ou magasin précis) */
  allowDestinationChoice?: boolean;
  onSubmit: (payload: BuybackSubmitPayload) => Promise<void>;
}

const WORKING_STATES = [
  { id: 'ok', label: 'Il fonctionne à 100 %', hint: 'Aucun défaut, tout marche normalement.' },
  { id: 'partial', label: 'Il fonctionne partiellement', hint: 'Il démarre mais certaines fonctions posent problème.' },
  { id: 'ko', label: 'Il ne fonctionne pas', hint: 'Il ne s\'allume plus ou est inutilisable.' },
];

export function BuybackForm({
  allowedCategories,
  storagePrefix,
  submitLabel,
  allowDestinationChoice = false,
  onSubmit,
}: Props) {
  const { toast } = useToast();

  const totalSteps = 6;
  const [step, setStep] = useState(1);

  const [workingState, setWorkingState] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [uploaded, setUploaded] = useState<{ path: string; type: string; slot?: string }[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<string[]>([]);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', city: '', postal_code: '' });
  const [submitting, setSubmitting] = useState(false);

  const [destination, setDestination] = useState<'network' | 'shop'>('network');
  const [selectedShop, setSelectedShop] = useState<BuybackShop | null>(null);
  const [shopSearch, setShopSearch] = useState('');

  const [vision, setVision] = useState<any | null>(null);
  const [visionNote, setVisionNote] = useState('');
  const [visionLoading, setVisionLoading] = useState(false);

  const [aiQuestions, setAiQuestions] = useState<BuybackQuestion[]>([]);
  const [aiIssues, setAiIssues] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const hasIssue = workingState !== 'ok';

  const { data: shops = [] } = useQuery({
    queryKey: ['buyback-shops', shopSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_buyback_shops' as any, {
        p_category: category || null,
        p_search: shopSearch || null,
      });
      if (error) throw error;
      return (data ?? []) as unknown as BuybackShop[];
    },
    enabled: allowDestinationChoice && destination === 'shop',
    staleTime: 60_000,
  });

  const baseQuestions = useMemo(
    () => (category ? getQuestions(category).filter((q) => q.id !== 'panne' || hasIssue) : []),
    [category, hasIssue],
  );
  const photoGuides = useMemo(() => {
    if (!category) return [];
    const all = getPhotoGuides(category);
    const defaut = hasIssue ? all.filter((g) => g.id === 'defaut') : [];
    const others = all.filter((g) => g.id !== 'defaut');
    return [...others.slice(0, defaut.length ? 3 : 4), ...defaut];
  }, [category, hasIssue]);
  const issueList = useMemo(
    () => (category ? Array.from(new Set([...getIssues(category), ...aiIssues])) : []),
    [category, aiIssues],
  );
  const accessoryList = useMemo(() => (category ? getAccessories(category) : []), [category]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const uploadPhotos = async () => {
    if (uploaded.length > 0) return uploaded;
    const folder = `${storagePrefix}/${crypto.randomUUID()}`;
    const media: { path: string; type: string; slot?: string }[] = [];
    for (const [slot, file] of Object.entries(photos)) {
      const path = `${folder}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from('buyback-media').upload(path, file);
      if (error) throw error;
      media.push({ path, type: file.type.startsWith('video') ? 'video' : 'image', slot });
    }
    setUploaded(media);
    return media;
  };

  const runVision = async (paths: string[]) => {
    setVisionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('buyback-ai-vision', {
        body: {
          category,
          brand,
          model,
          working_state: WORKING_STATES.find((w) => w.id === workingState)?.label,
          paths,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setVision(data);
    } catch (e: any) {
      // L'analyse IA n'est jamais bloquante
      setVision(null);
      toast({ title: 'Analyse automatique indisponible', description: e.message });
    } finally {
      setVisionLoading(false);
    }
  };

  const runAiGuide = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('buyback-ai-guide', {
        body: { category, brand, model, answers },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiQuestions(((data as any).questions ?? []) as BuybackQuestion[]);
      setAiIssues(((data as any).issues ?? []) as string[]);
    } catch {
      setAiQuestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  const goNext = async () => {
    if (step === 1 && !workingState) {
      toast({ title: 'Indiquez si l\'appareil fonctionne', variant: 'destructive' });
      return;
    }
    if (step === 2) {
      if (!category) {
        toast({ title: 'Choisissez le type d\'appareil', variant: 'destructive' });
        return;
      }
      if (!brand.trim() || !model.trim()) {
        toast({ title: 'Marque et modèle requis', variant: 'destructive' });
        return;
      }
    }
    if (step === 3) {
      const missing = photoGuides.find((g) => g.required && !photos[g.id]);
      if (missing) {
        toast({ title: 'Photo manquante', description: missing.label, variant: 'destructive' });
        return;
      }
      setStep(4);
      try {
        const media = await uploadPhotos();
        await runVision(media.map((m) => m.path));
      } catch (e: any) {
        toast({ title: 'Envoi des photos impossible', description: e.message, variant: 'destructive' });
        setStep(3);
      }
      return;
    }
    if (step === 4 && aiQuestions.length === 0 && !aiLoading) {
      setStep(5);
      runAiGuide();
      return;
    }
    if (step === 5) {
      const missing = [...baseQuestions, ...aiQuestions].filter((q) => q.required && !answers[q.id]?.trim());
      if (missing.length > 0) {
        toast({ title: 'Complétez les champs obligatoires', description: missing[0].label, variant: 'destructive' });
        return;
      }
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allowDestinationChoice && destination === 'shop' && !selectedShop) {
      toast({ title: 'Choisissez le magasin destinataire', variant: 'destructive' });
      return;
    }
    if (!customer.name.trim() || !customer.phone.trim()) {
      toast({ title: 'Coordonnées incomplètes', description: 'Nom et téléphone requis', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const media = await uploadPhotos();

      const finalAnswers: Record<string, string> = {
        ...answers,
        etat_fonctionnement: WORKING_STATES.find((w) => w.id === workingState)?.label ?? '',
        appareil_en_panne: hasIssue ? 'Oui' : 'Non, appareil fonctionnel',
        points_en_panne: hasIssue ? issues.join(', ') : '',
        accessoires_fournis: accessories.join(', '),
        nb_accessoires: String(accessories.length),
        ...(vision?.etat_general ? { analyse_ia_etat: vision.etat_general } : {}),
        ...(vision?.points_constates?.length ? { analyse_ia_points: vision.points_constates.join(', ') } : {}),
        ...(visionNote.trim() ? { precisions_client: visionNote.trim() } : {}),
      };

      await onSubmit({
        category,
        brand,
        model,
        answers: finalAnswers,
        media,
        customer,
        shopId: allowDestinationChoice && destination === 'shop' ? selectedShop?.shop_id ?? null : null,
      });
    } catch (err: any) {
      toast({ title: 'Envoi impossible', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (q: BuybackQuestion) => (
    <div key={q.id} className="space-y-2">
      <Label htmlFor={q.id}>
        {q.label}
        {q.required && <span className="text-destructive"> *</span>}
      </Label>
      {q.type === 'select' ? (
        <Select value={answers[q.id] ?? ''} onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}>
          <SelectTrigger id={q.id}><SelectValue placeholder="Choisir…" /></SelectTrigger>
          <SelectContent>
            {(q.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : q.type === 'textarea' ? (
        <Textarea
          id={q.id}
          rows={3}
          placeholder={q.placeholder}
          value={answers[q.id] ?? ''}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
        />
      ) : (
        <Input
          id={q.id}
          placeholder={q.placeholder}
          value={answers[q.id] ?? ''}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
        />
      )}
    </div>
  );

  const stepTitles = [
    'Votre appareil fonctionne-t-il ?',
    'Quel appareil souhaitez-vous vendre ?',
    'Ajoutez les photos',
    'Analyse de vos photos',
    'Quelques précisions',
    allowDestinationChoice ? 'Destinataire et coordonnées' : 'Vos coordonnées',
  ];

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Étape {step} sur {totalSteps}</span>
          <span>{stepTitles[step - 1]}</span>
        </div>
        <Progress value={(step / totalSteps) * 100} />
      </div>

      {/* 1. État de fonctionnement */}
      {step === 1 && (
        <div className="space-y-3">
          {WORKING_STATES.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWorkingState(w.id)}
              className={`w-full rounded-lg border p-4 text-left transition ${workingState === w.id ? 'border-primary ring-1 ring-primary' : ''}`}
            >
              <p className="font-medium text-sm">{w.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{w.hint}</p>
            </button>
          ))}
        </div>
      )}

      {/* 2. Appareil */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type d'appareil</Label>
            <div className="flex flex-wrap gap-2">
              {allowedCategories.map((c) => {
                const cat = BUYBACK_CATEGORIES.find((x) => x.id === c);
                return (
                  <Button
                    key={c}
                    type="button"
                    size="sm"
                    variant={category === c ? 'default' : 'outline'}
                    onClick={() => {
                      setCategory(c);
                      setAnswers({});
                      setIssues([]);
                      setAccessories([]);
                      setPhotos({});
                      setUploaded([]);
                    }}
                  >
                    {cat ? `${cat.emoji} ${cat.label}` : c}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand">Marque *</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Apple, Samsung…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modèle *</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="iPhone 13, TV QLED 55…" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Photos */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Prenez les photos directement ou choisissez-les dans votre galerie.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {photoGuides.map((g: PhotoGuide) => (
              <div key={g.id} className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">
                  {g.label}
                  {g.required && <span className="text-destructive"> *</span>}
                </p>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPhotos((p) => ({ ...p, [g.id]: f }));
                      setUploaded([]);
                      setVision(null);
                    }
                  }}
                />
                {photos[g.id] && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="max-w-[70%] truncate">{photos[g.id].name}</Badge>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setPhotos((p) => {
                          const { [g.id]: _, ...rest } = p;
                          return rest;
                        });
                        setUploaded([]);
                        setVision(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Vos photos sont conservées de façon sécurisée puis supprimées automatiquement après 2 mois.
          </p>
        </div>
      )}

      {/* 4. Analyse IA */}
      {step === 4 && (
        <div className="space-y-3">
          {visionLoading ? (
            <div className="rounded-lg border p-6 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Analyse de vos photos en cours…</p>
            </div>
          ) : vision ? (
            <div className="rounded-lg border border-primary/30 p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />Ce que nous voyons
              </p>
              <p className="text-sm">{vision.etat_general}</p>
              <div className="grid gap-1 text-xs text-muted-foreground">
                {vision.ecran && <p><strong>Écran :</strong> {vision.ecran}</p>}
                {vision.chassis && <p><strong>Châssis :</strong> {vision.chassis}</p>}
                {vision.usure && <p><strong>Usure :</strong> {vision.usure}</p>}
              </div>
              {vision.points_constates?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {vision.points_constates.map((p: string) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              L'analyse automatique n'a pas pu être réalisée : vous pouvez continuer normalement.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="vision-note">Une correction ou une précision à apporter ?</Label>
            <Textarea
              id="vision-note"
              rows={3}
              placeholder="Ex : la rayure sur la photo est en réalité un reflet"
              value={visionNote}
              onChange={(e) => setVisionNote(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* 5. Questions adaptées */}
      {step === 5 && (
        <div className="space-y-4">
          {aiLoading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />Préparation des questions adaptées à votre {brand} {model}…
            </p>
          )}
          <div className="space-y-3">{baseQuestions.map(renderQuestion)}</div>
          {aiQuestions.length > 0 && (
            <div className="space-y-3 rounded-lg border border-primary/30 p-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Précisions sur votre {[brand, model].filter(Boolean).join(' ')}
              </p>
              {aiQuestions.map(renderQuestion)}
            </div>
          )}
          {hasIssue && (
            <div className="space-y-2">
              <Label>Points en panne ou qui posent problème</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {issueList.map((issue) => (
                  <label key={issue} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={issues.includes(issue)} onCheckedChange={() => toggle(issues, setIssues, issue)} />
                    {issue}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Accessoires fournis</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {accessoryList.map((acc) => (
                <label key={acc} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={accessories.includes(acc)} onCheckedChange={() => toggle(accessories, setAccessories, acc)} />
                  {acc}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Destination + compte */}
      {step === 6 && (
        <div className="space-y-5">
          {allowDestinationChoice && (
            <div className="space-y-3">
              <Label>À qui envoyer votre demande ?</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDestination('network')}
                  className={`rounded-lg border p-3 text-left transition ${destination === 'network' ? 'border-primary ring-1 ring-primary' : ''}`}
                >
                  <p className="font-medium text-sm flex items-center gap-2"><Globe2 className="h-4 w-4" />Toute la France</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les magasins du réseau chiffrent votre appareil, vous recevez les meilleures offres.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDestination('shop')}
                  className={`rounded-lg border p-3 text-left transition ${destination === 'shop' ? 'border-primary ring-1 ring-primary' : ''}`}
                >
                  <p className="font-medium text-sm flex items-center gap-2"><Store className="h-4 w-4" />Un magasin précis</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si le magasin refuse, vous pourrez ouvrir la demande à tout le réseau.
                  </p>
                </button>
              </div>

              {destination === 'shop' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Nom du magasin, ville ou code postal"
                      value={shopSearch}
                      onChange={(e) => setShopSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {shops.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucun magasin trouvé pour cette recherche.</p>
                    )}
                    {shops.map((s) => (
                      <button
                        key={s.shop_id}
                        type="button"
                        onClick={() => setSelectedShop(s)}
                        className={`w-full rounded-lg border p-3 text-left flex items-center gap-3 transition ${
                          selectedShop?.shop_id === s.shop_id ? 'border-primary ring-1 ring-primary' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[s.postal_code, s.city].filter(Boolean).join(' ') || 'Adresse non précisée'}
                          </p>
                        </div>
                        {selectedShop?.shop_id === s.shop_id && <Badge>Choisi</Badge>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="font-medium text-sm">Votre compte vendeur</p>
              <p className="text-xs text-muted-foreground">
                Pas de mot de passe : vous recevrez un lien personnel pour suivre toutes vos cotations.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom et prénom *</Label>
                <Input id="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input id="phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal">Code postal</Label>
                <Input id="postal" value={customer.postal_code} onChange={(e) => setCustomer({ ...customer, postal_code: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={submitting || visionLoading}>
            <ArrowLeft className="h-4 w-4 mr-1" />Retour
          </Button>
        )}
        {step < totalSteps ? (
          <Button type="button" className="flex-1" onClick={goNext} disabled={visionLoading}>
            Continuer<ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi…</>
            ) : (
              <><Check className="h-4 w-4 mr-2" />{submitLabel ?? 'Envoyer ma demande'}</>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
