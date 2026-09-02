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
import { Sparkles, Globe2, Loader2, Euro, ImageIcon, XCircle } from 'lucide-react';

interface OfferTarget {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  answers: Record<string, string>;
  media: { path: string; type: string }[];
  isNetwork: boolean;
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
                    {r.customer_name} · {r.customer_phone || r.customer_email} ·{' '}
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </p>
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
                    onClick={() => openOffer({ ...r, isNetwork: false })}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Annuler</Button>
            <Button onClick={submit} disabled={!amount || Number(amount) <= 0 || sendOffer.isPending}>
              {sendOffer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Envoyer l'offre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
