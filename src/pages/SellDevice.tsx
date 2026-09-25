import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuybackForm, type BuybackSubmitPayload } from '@/components/buyback/BuybackForm';
import { BUYBACK_CATEGORIES } from '@/lib/buyback';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { ArrowLeft } from 'lucide-react';

export default function SellDevice() {
  const navigate = useNavigate();

  const allCategories = BUYBACK_CATEGORIES.map((c) => c.id);

  const handleSubmit = async (payload: BuybackSubmitPayload) => {
    const { data: token, error } = await supabase.rpc('submit_buyback_request_national' as any, {
      p_shop_id: payload.shopId,
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
      p_marketing_consent: payload.marketingConsent,
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
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/mon-espace">Se connecter à mon espace</Link>
          </Button>
        </div>

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
              submitLabel="Envoyer ma demande de cotation"
              allowDestinationChoice
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
