import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BuybackForm, type BuybackSubmitPayload } from '@/components/buyback/BuybackForm';
import { BUYBACK_CATEGORIES } from '@/lib/buyback';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { ArrowLeft, MapPin, Store, Globe2, Search } from 'lucide-react';

interface BuybackShop {
  shop_id: string;
  slug: string;
  name: string;
  city: string;
  postal_code: string;
  logo_url: string | null;
  categories: string[];
}

export default function SellDevice() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState<'network' | 'shop'>('network');
  const [selectedShop, setSelectedShop] = useState<BuybackShop | null>(null);
  const [search, setSearch] = useState('');

  const { data: shops = [] } = useQuery({
    queryKey: ['buyback-shops', search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_buyback_shops' as any, {
        p_category: null,
        p_search: search || null,
      });
      if (error) throw error;
      return (data ?? []) as unknown as BuybackShop[];
    },
    staleTime: 60_000,
  });

  const allCategories = BUYBACK_CATEGORIES.map((c) => c.id);

  const handleSubmit = async (payload: BuybackSubmitPayload) => {
    const { data: token, error } = await supabase.rpc('submit_buyback_request_national' as any, {
      p_shop_id: destination === 'shop' ? selectedShop?.shop_id ?? null : null,
      p_category: payload.category,
      p_brand: payload.brand,
      p_model: payload.model,
      p_answers: payload.answers,
      p_media: payload.media,
      p_customer_name: payload.customer.name,
      p_customer_email: payload.customer.email,
      p_customer_phone: payload.customer.phone,
      p_customer_city: payload.customer.city,
      p_customer_postal_code: payload.customer.postal_code,
    });
    if (error) throw error;
    navigate(`/rachat/${token}`);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Helmet>
        <title>Vendre mon appareil cassé ou en panne — Fixway</title>
        <meta
          name="description"
          content="Faites racheter votre smartphone, TV, ordinateur ou console en panne par un réparateur près de chez vous ou par tout le réseau Fixway en France."
        />
      </Helmet>

      <LandingHeader />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Vendre mon appareil cassé ou défectueux</CardTitle>
            <p className="text-sm text-muted-foreground">
              Décrivez votre appareil avec l'aide de l'assistant, ajoutez les photos demandées, puis choisissez
              un magasin en particulier ou ouvrez votre demande à toute la France.
            </p>
          </CardHeader>
          <CardContent>
            <BuybackForm
              allowedCategories={allCategories}
              storagePrefix="national"
              submitLabel={destination === 'shop' ? 'Envoyer au magasin choisi' : 'Envoyer à toute la France'}
              onSubmit={handleSubmit}
              extraStep={
                <div className="space-y-3 border-t pt-4">
                  <Label>À qui envoyer votre demande ?</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setDestination('network')}
                      className={`rounded-lg border p-3 text-left transition ${destination === 'network' ? 'border-primary ring-1 ring-primary' : ''}`}
                    >
                      <p className="font-medium text-sm flex items-center gap-2">
                        <Globe2 className="h-4 w-4" />Toute la France
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Les magasins du réseau chiffrent votre appareil, vous recevez les meilleures offres.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestination('shop')}
                      className={`rounded-lg border p-3 text-left transition ${destination === 'shop' ? 'border-primary ring-1 ring-primary' : ''}`}
                    >
                      <p className="font-medium text-sm flex items-center gap-2">
                        <Store className="h-4 w-4" />Un magasin précis
                      </p>
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
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
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
                      {!selectedShop && (
                        <p className="text-xs text-destructive">Sélectionnez un magasin pour continuer.</p>
                      )}
                    </div>
                  )}
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
