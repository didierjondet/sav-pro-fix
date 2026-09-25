import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { ParticulierAuthPanel } from '@/components/buyback/ParticulierAuthPanel';
import { BuybackMessageThread } from '@/components/buyback/BuybackMessageThread';
import { getCategoryEmoji, getCategoryLabel } from '@/lib/buyback';
import { Loader2, LogOut, MessageSquare, Plus } from 'lucide-react';

const STATUS: Record<string, string> = {
  pending: 'En attente', network: 'Ouverte au réseau', offered: 'Offre reçue', accepted: 'Acceptée',
  refused: 'Refusée', refused_by_shop: 'Refusée par le magasin', network_closed: 'Clôturée',
};

interface Account {
  profile: { full_name: string; email: string | null; phone: string | null; city: string | null; postal_code: string | null; marketing_consent: boolean };
  requests: {
    id: string; public_token: string; category: string; brand: string | null; model: string | null;
    status: string; created_at: string; shop_id: string | null; shop_name: string | null;
    offers: { id: string; amount: number; status: string; shop_id: string; shop_name: string; valid_until: string | null }[];
  }[];
}

export default function MonEspace() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', city: '', postal_code: '', marketing_consent: false });

  const { data: account, isLoading } = useQuery({
    queryKey: ['my-buyback-account', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_buyback_account' as any);
      if (error) throw error;
      return data as unknown as Account | null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (account?.profile) {
      const p = account.profile;
      setForm({ full_name: p.full_name ?? '', phone: p.phone ?? '', city: p.city ?? '', postal_code: p.postal_code ?? '', marketing_consent: !!p.marketing_consent });
    }
  }, [account]);

  const saveProfile = async () => {
    const { error } = await supabase.rpc('update_my_buyback_profile' as any, {
      p_full_name: form.full_name, p_phone: form.phone, p_city: form.city,
      p_postal_code: form.postal_code, p_marketing_consent: form.marketing_consent,
    });
    if (error) return toast({ title: 'Enregistrement impossible', description: error.message, variant: 'destructive' });
    toast({ title: 'Préférences enregistrées' });
    qc.invalidateQueries({ queryKey: ['my-buyback-account'] });
  };

  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_my_buyback_account' as any);
    if (error) return toast({ title: 'Suppression impossible', description: error.message, variant: 'destructive' });
    await supabase.auth.signOut();
    window.location.replace('/vendre');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/mon-espace');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Helmet>
        <title>Mon espace Fixway — mes cotations</title>
        <meta name="description" content="Retrouvez vos cotations de rachat, les offres des magasins, vos messages et vos préférences." />
      </Helmet>
      <LandingHeader />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {loading || (user && isLoading) ? (
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        ) : !user ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Mon espace Fixway</CardTitle>
              <p className="text-sm text-muted-foreground">Connectez-vous pour retrouver vos cotations et vos messages.</p>
            </CardHeader>
            <CardContent>
              <ParticulierAuthPanel returnPath="/mon-espace" defaultTab="signin" />
            </CardContent>
          </Card>
        ) : !account ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Aucune cotation liée à ce compte ({user.email}) pour l'instant.
              </p>
              <div className="flex justify-center gap-2">
                <Button asChild><Link to="/vendre"><Plus className="h-4 w-4 mr-1" />Faire estimer un appareil</Link></Button>
                <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-1" />Déconnexion</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold">Bonjour {account.profile.full_name}</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm"><Link to="/vendre"><Plus className="h-4 w-4 mr-1" />Nouvelle cotation</Link></Button>
                <Button size="sm" variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-1" />Déconnexion</Button>
              </div>
            </div>
            <Tabs defaultValue="cotations">
              <TabsList>
                <TabsTrigger value="cotations">Mes cotations</TabsTrigger>
                <TabsTrigger value="prefs">Mes préférences</TabsTrigger>
              </TabsList>

              <TabsContent value="cotations" className="space-y-3 mt-4">
                {account.requests.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune cotation pour l'instant.</p>
                )}
                {account.requests.map((r) => {
                  const shops = new Map<string, string>();
                  if (r.shop_id) shops.set(r.shop_id, r.shop_name ?? 'Magasin');
                  r.offers.forEach((o) => shops.set(o.shop_id, o.shop_name));
                  return (
                    <Card key={r.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {getCategoryEmoji(r.category)} {[r.brand, r.model].filter(Boolean).join(' ') || getCategoryLabel(r.category)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Demande du {new Date(r.created_at).toLocaleDateString('fr-FR')}
                              {r.shop_name ? ` — ${r.shop_name}` : ' — réseau Fixway'}
                            </p>
                          </div>
                          <Badge variant="secondary">{STATUS[r.status] ?? r.status}</Badge>
                        </div>
                        {r.offers.length > 0 && (
                          <div className="space-y-1">
                            {r.offers.map((o) => (
                              <div key={o.id} className="flex items-center justify-between text-sm rounded border px-3 py-2">
                                <span>{o.shop_name}</span>
                                <strong>{Number(o.amount).toFixed(2)} €</strong>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/rachat/${r.public_token}`}>Voir le détail et répondre</Link>
                          </Button>
                          {[...shops.entries()].map(([sid, name]) => (
                            <Button
                              key={sid}
                              size="sm"
                              variant={openThread === `${r.id}:${sid}` ? 'default' : 'ghost'}
                              onClick={() => setOpenThread(openThread === `${r.id}:${sid}` ? null : `${r.id}:${sid}`)}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />Écrire à {name}
                            </Button>
                          ))}
                        </div>
                        {[...shops.keys()].map((sid) =>
                          openThread === `${r.id}:${sid}` ? (
                            <BuybackMessageThread key={sid} requestId={r.id} shopId={sid} as="customer" />
                          ) : null,
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="prefs" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label>Nom et prénom</Label>
                        <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                      <div className="space-y-1.5"><Label>Téléphone</Label>
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                      <div className="space-y-1.5"><Label>Ville</Label>
                        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                      <div className="space-y-1.5"><Label>Code postal</Label>
                        <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
                    </div>
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <Checkbox className="mt-0.5" checked={form.marketing_consent}
                        onCheckedChange={(v) => setForm({ ...form, marketing_consent: v === true })} />
                      <span>J'accepte de recevoir des offres de rachat de Fixway et des magasins du réseau par SMS et/ou e-mail (4 envois maximum par an).</span>
                    </label>
                    <div className="flex flex-wrap justify-between gap-2">
                      <Button onClick={saveProfile}>Enregistrer</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" className="text-destructive">Supprimer mon compte</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer mon compte ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Vos coordonnées seront effacées et vous ne recevrez plus aucune offre. Cette action est définitive.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={deleteAccount}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
