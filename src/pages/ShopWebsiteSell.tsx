import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BUYBACK_CATEGORIES, getQuestions } from '@/lib/buyback';
import { Camera, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ShopWebsiteSell() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [category, setCategory] = useState<string>('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', city: '', postal_code: '' });
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['shop-website', slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shop_website' as any, { p_slug: slug });
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || !data.config?.buyback_enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-3">
            <h1 className="text-xl font-semibold">Rachat indisponible</h1>
            <p className="text-sm text-muted-foreground">
              Ce professionnel ne reçoit pas de proposition de rachat pour le moment.
            </p>
            {data?.shop?.slug && (
              <Button asChild variant="outline"><Link to={`/${data.shop.slug}`}>Retour au site</Link></Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const acceptedCategories: string[] = data.config.buyback_categories ?? [];
  const questions = category ? getQuestions(category) : [];

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, 6);
    setFiles(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast({ title: 'Choisissez une catégorie', variant: 'destructive' });
      return;
    }
    const missing = questions.filter((q) => q.required && !answers[q.id]?.trim());
    if (missing.length > 0) {
      toast({ title: 'Champs manquants', description: missing[0].label, variant: 'destructive' });
      return;
    }
    if (!customer.name.trim() || (!customer.email.trim() && !customer.phone.trim())) {
      toast({ title: 'Coordonnées incomplètes', description: 'Nom et email ou téléphone requis', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const media: { path: string; type: string }[] = [];
      const folder = `${slug}/${crypto.randomUUID()}`;
      for (const file of files) {
        const path = `${folder}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const { error } = await supabase.storage.from('buyback-media').upload(path, file);
        if (error) throw error;
        media.push({ path, type: file.type.startsWith('video') ? 'video' : 'image' });
      }

      const { data: token, error } = await supabase.rpc('submit_buyback_request' as any, {
        p_slug: slug,
        p_category: category,
        p_brand: brand,
        p_model: model,
        p_answers: answers,
        p_media: media,
        p_customer_name: customer.name,
        p_customer_email: customer.email,
        p_customer_phone: customer.phone,
        p_customer_city: customer.city,
        p_customer_postal_code: customer.postal_code,
      });
      if (error) throw error;

      navigate(`/rachat/${token}`);
    } catch (err: any) {
      toast({ title: 'Envoi impossible', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <Helmet>
        <title>{`Vendre mon matériel — ${data.shop.name}`.slice(0, 60)}</title>
        <meta
          name="description"
          content={`Proposez votre appareil cassé ou défectueux au rachat par ${data.shop.name} et recevez une offre chiffrée.`.slice(0, 158)}
        />
      </Helmet>

      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/${data.shop.slug}`}><ArrowLeft className="h-4 w-4 mr-1" />Retour au site</Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Vendre mon matériel cassé ou défectueux</CardTitle>
            <p className="text-sm text-muted-foreground">
              {data.config.buyback_intro ||
                `Décrivez votre appareil, ajoutez des photos et ${data.shop.name} vous répondra avec une offre chiffrée.`}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-6">
              {/* Catégorie */}
              <div className="space-y-2">
                <Label>Que souhaitez-vous vendre ?</Label>
                <div className="flex flex-wrap gap-2">
                  {acceptedCategories.map((c) => {
                    const cat = BUYBACK_CATEGORIES.find((x) => x.id === c);
                    return (
                      <Button
                        key={c}
                        type="button"
                        size="sm"
                        variant={category === c ? 'default' : 'outline'}
                        onClick={() => { setCategory(c); setAnswers({}); }}
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

                  <div className="space-y-3">
                    {questions.map((q) => (
                      <div key={q.id} className="space-y-2">
                        <Label htmlFor={q.id}>
                          {q.label}{q.required && <span className="text-destructive"> *</span>}
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
                    ))}
                  </div>

                  {/* Médias */}
                  <div className="space-y-2">
                    <Label htmlFor="media">Photos ou courte vidéo (6 maximum)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="media"
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={(e) => handleFiles(e.target.files)}
                      />
                      <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {files.map((f, i) => (
                          <Badge key={i} variant="secondary" className="max-w-[180px] truncate">
                            {f.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Vos médias sont conservés de façon sécurisée puis supprimés automatiquement après 2 mois.
                    </p>
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
                        <Label htmlFor="cp">Code postal</Label>
                        <Input id="cp" value={customer.postal_code} onChange={(e) => setCustomer({ ...customer, postal_code: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Envoyer ma proposition
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
