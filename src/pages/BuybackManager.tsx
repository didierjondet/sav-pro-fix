import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useBuyback, useBuybackAiEstimate, BuybackRequest, NetworkBuybackRequest } from '@/hooks/useBuyback';
import { BUYBACK_STATUS_LABELS, getCategoryEmoji, getCategoryLabel } from '@/lib/buyback';
import { useShop } from '@/hooks/useShop';
import { useSMS } from '@/hooks/useSMS';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Globe2, Loader2, Euro, ImageIcon, XCircle, Eye, MessageSquare, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';
import { BuybackMessageThread } from '@/components/buyback/BuybackMessageThread';

interface OfferTarget {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  answers: Record<string, string>;
  media: { path: string; type: string }[];
  isNetwork: boolean;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  publicToken?: string | null;
}

export default function BuybackManager() {
  const { requests, offers, networkRequests, loading, sendOffer, declineRequest, getSignedMediaUrl } = useBuyback();
  const aiEstimate = useBuybackAiEstimate();

  const [target, setTarget] = useState<OfferTarget | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [conditions, setConditions] = useState('');
  const [ai, setAi] = useState<{ low: number; mid: number; high: number; rationale: string } | null>(null);
  const [mediaUrls, setMediaUrls] = useState<{ url: string; type: string }[]>([]);
  const [contact, setContact] = useState<BuybackRequest | null>(null);
  const [sending, setSending] = useState<'sms' | 'email' | null>(null);
  const { shop } = useShop();
  const { sendSMS } = useSMS();
  const { toast } = useToast();

  const offersByRequest = useMemo(() => {
    const map = new Map<string, number>();
    offers.forEach((o) => map.set(o.request_id, Number(o.amount)));
    return map;
  }, [offers]);

  const openOffer = async (t: OfferTarget) => {
    setTarget(t);
    setAmount('');
    setMessage('');
    setConditions('');
    setAi(null);
    const urls: { url: string; type: string }[] = [];
    for (const m of t.media ?? []) {
      const url = await getSignedMediaUrl(m.path);
      if (url) urls.push({ url, type: m.type });
    }
    setMediaUrls(urls);
  };

  const runEstimate = async () => {
    if (!target) return;
    const result = await aiEstimate.mutateAsync({
      category: target.category,
      brand: target.brand,
      model: target.model,
      answers: target.answers ?? {},
    });
    setAi(result);
    if (!amount) setAmount(String(result.mid));
  };

  const offerText = () => {
    if (!target) return '';
    const device = [target.brand, target.model].filter(Boolean).join(' ') || getCategoryLabel(target.category);
    const link = `${window.location.origin}/mon-espace`;
    return [
      `Bonjour${target.customerName ? ` ${target.customerName}` : ''},`,
      `${shop?.name ?? 'Votre magasin'} vous propose ${Number(amount || 0).toFixed(2)} € pour le rachat de votre ${device}.`,
      message.trim(),
      conditions.trim() ? `Conditions : ${conditions.trim()}` : '',
      'Offre valable 7 jours.',
      `Retrouvez et acceptez l'offre dans votre espace Fixway : ${link}`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const saveOffer = async () => {
    if (!target) return;
    await sendOffer.mutateAsync({
      requestId: target.id,
      amount: Number(amount),
      message,
      conditions,
      isNetwork: target.isNetwork,
      ai: ai ? { low: ai.low, mid: ai.mid, high: ai.high } : undefined,
    });
  };

  const sendBySms = async () => {
    if (!target?.customerPhone) return;
    setSending('sms');
    try {
      await saveOffer();
      const ok = await sendSMS({
        toNumber: target.customerPhone,
        message: offerText(),
        type: 'manual',
        recordId: target.id,
      });
      if (ok) {
        toast({ title: 'Cotation envoyée par SMS' });
        setTarget(null);
      }
    } catch (e: any) {
      toast({ title: 'Envoi impossible', description: e.message, variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  const sendByEmail = async () => {
    if (!target?.customerEmail) return;
    setSending('email');
    try {
      await saveOffer();
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${offerText()
        .split('\n')
        .map((l) => `<p>${l}</p>`)
        .join('')}</div>`;
      const { data, error } = await supabase.functions.invoke('send-app-email', {
        body: {
          to: target.customerEmail,
          subject: `Votre offre de rachat — ${shop?.name ?? 'Fixway'}`,
          html,
          context: 'buyback_offer',
          shopId: shop?.id ?? null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Cotation envoyée par e-mail' });
      setTarget(null);
    } catch (e: any) {
      toast({ title: 'Envoi impossible', description: e.message, variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  const submit = async () => {
    if (!target) return;
    await sendOffer.mutateAsync({
      requestId: target.id,
      amount: Number(amount),
      message,
      conditions,
      isNetwork: target.isNetwork,
      ai: ai ? { low: ai.low, mid: ai.mid, high: ai.high } : undefined,
    });
    setTarget(null);
  };

  const renderAnswers = (answers: Record<string, string>) => (
    <div className="text-xs text-muted-foreground space-y-0.5">
      {Object.entries(answers ?? {}).filter(([, v]) => v).slice(0, 5).map(([k, v]) => (
        <p key={k}><span className="capitalize">{k.replace(/_/g, ' ')}</span> : {v}</p>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rachat de matériel</h1>
        <p className="text-muted-foreground text-sm">
          Propositions reçues depuis votre site internet et cotations ouvertes au réseau Fixway.
        </p>
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">
            Mes demandes
            {requests.filter((r) => r.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {requests.filter((r) => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="network">
            Cotations réseau
            {networkRequests.length > 0 && <Badge variant="secondary" className="ml-2">{networkRequests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-3 mt-4">
          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!loading && requests.length === 0 && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune proposition pour l'instant. Activez la page de rachat dans Réglages &gt; Votre site internet.
            </CardContent></Card>
          )}
          {requests.map((r: BuybackRequest) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">
                    {getCategoryEmoji(r.category)} {[r.brand, r.model].filter(Boolean).join(' ') || getCategoryLabel(r.category)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Demande du {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  <Button size="sm" variant="ghost" className="h-7 px-2 -ml-2" onClick={() => setContact(r)}>
                    <Eye className="h-4 w-4 mr-1" />Voir les coordonnées du client
                  </Button>
                  {renderAnswers(r.answers)}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'}>
                    {BUYBACK_STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                  {offersByRequest.has(r.id) && (
                    <Badge variant="outline"><Euro className="h-3 w-3 mr-1" />{offersByRequest.get(r.id)?.toFixed(2)}</Badge>
                  )}
                  {['pending', 'offered'].includes(r.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={declineRequest.isPending}
                      onClick={() => declineRequest.mutate({ requestId: r.id })}
                    >
                      <XCircle className="h-4 w-4 mr-1" />Refuser
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() =>
                      openOffer({
                        ...r,
                        isNetwork: false,
                        customerName: r.customer_name,
                        customerPhone: r.customer_phone,
                        customerEmail: r.customer_email,
                        publicToken: r.public_token,
                      })
                    }
                    disabled={['accepted', 'refused', 'refused_by_shop', 'network_closed'].includes(r.status)}
                  >
                    {offersByRequest.has(r.id) ? 'Modifier l\'offre' : 'Chiffrer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="network" className="space-y-3 mt-4">
          {networkRequests.length === 0 && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune cotation réseau ouverte pour vos catégories.
            </CardContent></Card>
          )}
          {networkRequests.map((r: NetworkBuybackRequest) => (
            <Card key={r.id} className="border-primary/40 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-primary" />
                  Cotation réseau — client
                  {r.customer_city ? ` de ${r.customer_city}` : ''}
                  {r.customer_postal_code ? ` (${r.customer_postal_code})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">
                    {getCategoryEmoji(r.category)} {[r.brand, r.model].filter(Boolean).join(' ') || getCategoryLabel(r.category)}
                  </p>
                  {renderAnswers(r.answers)}
                  {r.network_deadline && (
                    <p className="text-xs text-muted-foreground">
                      Réponse avant le {new Date(r.network_deadline).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.my_offer_amount != null && (
                    <Badge variant="outline"><Euro className="h-3 w-3 mr-1" />{Number(r.my_offer_amount).toFixed(2)}</Badge>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => openOffer({ ...r, isNetwork: true })}>
                    {r.my_offer_amount != null ? 'Modifier mon offre' : 'Faire une offre'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chiffrer {target ? [target.brand, target.model].filter(Boolean).join(' ') || getCategoryLabel(target.category) : ''}
            </DialogTitle>
          </DialogHeader>

          {target && (
            <div className="space-y-4">
              {Object.entries(target.answers ?? {}).filter(([, v]) => v).length > 0 && (
                <div className="rounded-lg border p-3 text-sm space-y-1">
                  {Object.entries(target.answers ?? {}).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="text-right">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaUrls.map((m, i) =>
                    m.type === 'video' ? (
                      <video key={i} src={m.url} controls className="h-24 w-full object-cover rounded border" />
                    ) : (
                      <a key={i} href={m.url} target="_blank" rel="noopener noreferrer">
                        <img src={m.url} alt="Photo du matériel proposé" loading="lazy" className="h-24 w-full object-cover rounded border" />
                      </a>
                    ),
                  )}
                </div>
              )}
              {mediaUrls.length === 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />Aucun média fourni par le client.
                </p>
              )}

              <Separator />

              <div className="space-y-2">
                <Button variant="outline" size="sm" onClick={runEstimate} disabled={aiEstimate.isPending}>
                  {aiEstimate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Estimation IA du marché
                </Button>
                {ai && (
                  <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {([['Basse', ai.low], ['Moyenne', ai.mid], ['Haute', ai.high]] as const).map(([label, value]) => (
                        <button
                          key={label}
                          type="button"
                          className="rounded border bg-background p-2 hover:border-primary"
                          onClick={() => setAmount(String(value))}
                        >
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-semibold">{value} €</p>
                        </button>
                      ))}
                    </div>
                    {ai.rationale && <p className="text-xs text-muted-foreground">{ai.rationale}</p>}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant proposé (€)</Label>
                <Input id="amount" type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer-message">Message au client</Label>
                <Textarea
                  id="offer-message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Bonjour, nous pouvons vous racheter cet appareil…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer-conditions">Conditions</Label>
                <Textarea
                  id="offer-conditions"
                  rows={2}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="Offre sous réserve de vérification en atelier, pièce d'identité obligatoire."
                />
              </div>

              {target.isNetwork && (
                <p className="text-xs text-muted-foreground">
                  Cotation réseau : votre offre est anonyme jusqu'à la sélection. Les frais d'envoi sont à la charge du client.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            {target && !target.isNetwork && (
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={sendBySms}
                  disabled={!target.customerPhone || !amount || Number(amount) <= 0 || !!sending}
                >
                  {sending === 'sms' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                  Envoyer par SMS
                </Button>
                <Button
                  variant="outline"
                  onClick={sendByEmail}
                  disabled={!target.customerEmail || !amount || Number(amount) <= 0 || !!sending}
                >
                  {sending === 'email' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Envoyer par e-mail
                </Button>
              </div>
            )}
            {target?.isNetwork && (
              <p className="text-xs text-muted-foreground w-full">
                Les coordonnées du client vous seront communiquées s'il retient votre offre.
              </p>
            )}
            <div className="flex gap-2 w-full">
              <Button variant="ghost" className="flex-1" onClick={() => setTarget(null)}>Annuler</Button>
              <Button className="flex-1" onClick={submit} disabled={!amount || Number(amount) <= 0 || sendOffer.isPending || !!sending}>
                {sendOffer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer l'offre
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!contact} onOpenChange={(o) => !o && setContact(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Coordonnées du client</DialogTitle>
          </DialogHeader>
          {contact && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{contact.customer_name}</p>
              {contact.customer_phone && (
                <a href={`tel:${contact.customer_phone}`} className="flex items-center gap-2 text-primary">
                  <Phone className="h-4 w-4" />{contact.customer_phone}
                </a>
              )}
              {contact.customer_email && (
                <a href={`mailto:${contact.customer_email}`} className="flex items-center gap-2 text-primary break-all">
                  <Mail className="h-4 w-4" />{contact.customer_email}
                </a>
              )}
              {(contact.customer_postal_code || contact.customer_city) && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {[contact.customer_postal_code, contact.customer_city].filter(Boolean).join(' ')}
                </p>
              )}
              <p className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <ShieldCheck className="h-4 w-4" />
                {contact.buyback_customers?.marketing_consent
                  ? 'Accepte de recevoir des offres de rachat (4 par an maximum).'
                  : "N'a pas accepté de recevoir d'offres de rachat : contact uniquement pour cette cotation."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContact(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
