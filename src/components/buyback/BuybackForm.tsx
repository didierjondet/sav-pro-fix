import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Camera, Loader2, Sparkles, Check } from 'lucide-react';

export interface BuybackSubmitPayload {
  category: string;
  brand: string;
  model: string;
  answers: Record<string, string>;
  media: { path: string; type: string; slot?: string }[];
  customer: { name: string; email: string; phone: string; city: string; postal_code: string };
}

interface Props {
  allowedCategories: string[];
  storagePrefix: string;
  submitLabel?: string;
  /** Rendu additionnel affiché avant le bouton d'envoi (choix du destinataire par ex.) */
  extraStep?: React.ReactNode;
  onSubmit: (payload: BuybackSubmitPayload) => Promise<void>;
}

export function BuybackForm({ allowedCategories, storagePrefix, submitLabel, extraStep, onSubmit }: Props) {
  const { toast } = useToast();

  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<string[]>([]);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', city: '', postal_code: '' });
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [aiQuestions, setAiQuestions] = useState<BuybackQuestion[]>([]);
  const [aiIssues, setAiIssues] = useState<string[]>([]);
  const [aiPhotos, setAiPhotos] = useState<PhotoGuide[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const baseQuestions = useMemo(() => (category ? getQuestions(category) : []), [category]);
  const photoGuides = useMemo(
    () => (category ? [...getPhotoGuides(category), ...aiPhotos] : []),
    [category, aiPhotos],
  );
  const issueList = useMemo(
    () => (category ? Array.from(new Set([...getIssues(category), ...aiIssues])) : []),
    [category, aiIssues],
  );
  const accessoryList = useMemo(() => (category ? getAccessories(category) : []), [category]);

  const resetCategory = (c: string) => {
    setCategory(c);
    setAnswers({});
    setIssues([]);
    setAccessories([]);
    setPhotos({});
    setAiQuestions([]);
    setAiIssues([]);
    setAiPhotos([]);
    setAiDone(false);
  };

  const runAiGuide = async () => {
    if (!category) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('buyback-ai-guide', {
        body: { category, brand, model, answers },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiQuestions(((data as any).questions ?? []) as BuybackQuestion[]);
      setAiIssues(((data as any).issues ?? []) as string[]);
      setAiPhotos(((data as any).photos ?? []) as PhotoGuide[]);
      setAiDone(true);
    } catch (e: any) {
      toast({ title: 'Assistant indisponible', description: e.message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const renderQuestion = (q: BuybackQuestion) => (
    <div key={q.id} className="space-y-2">
      <Label htmlFor={q.id}>
        {q.label}
        {q.required && <span className="text-destructive"> *</span>}
      </Label>
      {q.type === 'select' ? (
        <Select value={answers[q.id] ?? ''} onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}>
          <SelectTrigger id={q.id}>
            <SelectValue placeholder="Choisir…" />
          </SelectTrigger>
          <SelectContent>
            {(q.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast({ title: 'Choisissez une catégorie', variant: 'destructive' });
      return;
    }
    const missing = [...baseQuestions, ...aiQuestions].filter((q) => q.required && !answers[q.id]?.trim());
    if (missing.length > 0) {
      toast({ title: 'Complétez les champs obligatoires', description: missing[0].label, variant: 'destructive' });
      return;
    }
    if (!customer.name.trim() || (!customer.email.trim() && !customer.phone.trim())) {
      toast({ title: 'Coordonnées incomplètes', description: 'Nom et email ou téléphone requis', variant: 'destructive' });
      return;
    }
    const missingPhoto = photoGuides.find((g) => g.required && !photos[g.id]);
    if (missingPhoto) {
      toast({ title: 'Photo manquante', description: missingPhoto.label, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const media: { path: string; type: string; slot?: string }[] = [];
      const folder = `${storagePrefix}/${crypto.randomUUID()}`;

      const uploads: { file: File; slot?: string }[] = [
        ...Object.entries(photos).map(([slot, file]) => ({ file, slot })),
        ...extraFiles.map((file) => ({ file })),
      ];

      for (const { file, slot } of uploads) {
        const path = `${folder}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const { error } = await supabase.storage.from('buyback-media').upload(path, file);
        if (error) throw error;
        media.push({ path, type: file.type.startsWith('video') ? 'video' : 'image', slot });
      }

      const finalAnswers: Record<string, string> = {
        ...answers,
        points_en_panne: issues.join(', '),
        accessoires_fournis: accessories.join(', '),
        nb_accessoires: String(accessories.length),
      };

      await onSubmit({ category, brand, model, answers: finalAnswers, media, customer });
    } catch (err: any) {
      toast({ title: 'Envoi impossible', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Catégorie */}
      <div className="space-y-2">
        <Label>Que souhaitez-vous vendre ?</Label>
        <div className="flex flex-wrap gap-2">
          {allowedCategories.map((c) => {
            const cat = BUYBACK_CATEGORIES.find((x) => x.id === c);
            return (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={category === c ? 'default' : 'outline'}
                onClick={() => resetCategory(c)}
              >
                {cat ? `${cat.emoji} ${cat.label}` : c}
              </Button>
            );
          })}
        </div>
      </div>

      {category && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Apple, Samsung…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modèle</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="iPhone 13, TV QLED 55…" />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 flex flex-wrap items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm flex-1 min-w-[200px]">
              L'assistant adapte les questions et les photos à demander à votre appareil précis.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={runAiGuide} disabled={aiLoading}>
              {aiLoading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Analyse…</>
              ) : aiDone ? (
                <><Check className="h-4 w-4 mr-1" />Questions affinées</>
              ) : (
                'Affiner ma description'
              )}
            </Button>
          </div>

          <div className="space-y-3">{baseQuestions.map(renderQuestion)}</div>

          {aiQuestions.length > 0 && (
            <div className="space-y-3 rounded-lg border border-primary/30 p-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Précisions sur votre {[brand, model].filter(Boolean).join(' ') || 'appareil'}
              </p>
              {aiQuestions.map(renderQuestion)}
            </div>
          )}

          {/* Points en panne */}
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

          {/* Accessoires */}
          <div className="space-y-2">
            <Label>Accessoires fournis {accessories.length > 0 && <Badge variant="secondary">{accessories.length}</Badge>}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {accessoryList.map((acc) => (
                <label key={acc} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={accessories.includes(acc)}
                    onCheckedChange={() => toggle(accessories, setAccessories, acc)}
                  />
                  {acc}
                </label>
              ))}
            </div>
          </div>

          {/* Photos guidées */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photos guidées
            </Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {photoGuides.map((g) => (
                <div key={g.id} className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium">
                    {g.label}
                    {g.required && <span className="text-destructive"> *</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{g.hint}</p>
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setPhotos((p) => (f ? { ...p, [g.id]: f } : p));
                    }}
                  />
                  {photos[g.id] && (
                    <Badge variant="secondary" className="max-w-full truncate">
                      {photos[g.id].name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra-media">Photos ou vidéo supplémentaires</Label>
              <Input
                id="extra-media"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setExtraFiles(Array.from(e.target.files ?? []).slice(0, 4))}
              />
              <p className="text-xs text-muted-foreground">
                Vos médias sont conservés de façon sécurisée puis supprimés automatiquement après 2 mois.
              </p>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="space-y-3 border-t pt-4">
            <p className="font-medium text-sm">Vos coordonnées</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom et prénom *</Label>
                <Input id="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
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
                <Input
                  id="postal"
                  value={customer.postal_code}
                  onChange={(e) => setCustomer({ ...customer, postal_code: e.target.value })}
                />
              </div>
            </div>
          </div>

          {extraStep}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi…</> : submitLabel ?? 'Envoyer ma demande'}
          </Button>
        </>
      )}
    </form>
  );
}
