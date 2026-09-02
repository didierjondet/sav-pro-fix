import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuybackForm, type BuybackSubmitPayload } from '@/components/buyback/BuybackForm';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ShopWebsiteSell() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

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
            <div className="flex flex-col gap-2">
              {data?.shop?.slug && (
                <Button asChild variant="outline"><Link to={`/${data.shop.slug}`}>Retour au site</Link></Button>
              )}
              <Button asChild variant="ghost"><Link to="/vendre">Proposer mon appareil à tout le réseau</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const acceptedCategories: string[] = data.config.buyback_categories ?? [];

  const handleSubmit = async (payload: BuybackSubmitPayload) => {
    const { data: token, error } = await supabase.rpc('submit_buyback_request' as any, {
      p_slug: slug,
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
            <p className="text-xs text-muted-foreground">
              Si {data.shop.name} refuse votre demande, vous pourrez l'ouvrir aux autres magasins du réseau.
            </p>
          </CardHeader>
          <CardContent>
            <BuybackForm
              allowedCategories={acceptedCategories}
              storagePrefix={slug ?? 'shop'}
              submitLabel={`Envoyer ma demande à ${data.shop.name}`}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
