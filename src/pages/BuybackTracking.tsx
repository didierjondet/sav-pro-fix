import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { getCategoryEmoji, getCategoryLabel } from '@/lib/buyback';
import { Loader2, CheckCircle2, XCircle, Globe2, Clock } from 'lucide-react';

interface TrackingData {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  answers: Record<string, string>;
  status: string;
  network_open: boolean;
  network_deadline: string | null;
  created_at: string;
  shop: { name: string; slug: string; logo_url: string | null } | null;
  offers: {
    id: string; amount: number; message: string | null; conditions: string | null;
    valid_until: string | null; status: string; is_network_offer: boolean;
    shop_name: string; shop_city: string; shop_logo: string | null;
  }[];
}

export default function BuybackTracking() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refusing, setRefusing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['buyback-tracking', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_buyback_request_by_token' as any, { p_token: token });
      if (error) throw error;
      return (data ?? null) as unknown as TrackingData | null;
    },
    enabled: !!token,
    refetchOnMount: true,
  });

  // Clôture automatique de la cotation réseau quand le délai est dépassé
  useEffect(() => {
    if (data?.network_open && data.network_deadline && new Date(data.network_deadline) < new Date()) {
      supabase.functions.invoke('buyback-close-rounds').then(() => {
        queryClient.invalidateQueries({ queryKey: ['buyback-tracking', token] });
      });
    }
  }, [data?.network_open, data?.network_deadline, token, queryClient]);

  const respond = async (offerId: string, action: 'accept' | 'refuse', openNetwork = false) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('respond_to_buyback_offer' as any, {
        p_token: token,
        p_offer_id: offerId,
        p_action: action,
        p_open_network: openNetwork,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['buyback-tracking', token] });
      toast({
        title: action === 'accept'
          ? 'Offre acceptée'
          : openNetwork ? 'Votre demande est envoyée au réseau' : 'Offre refusée',
      });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      setRefusing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center">
            <h1 className="text-lg font-semibold">Demande introuvable</h1>
            <p className="text-sm text-muted-foreground mt-2">Ce lien n'est plus valide.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeOffers = data.offers.filter((o) => o.status === 'sent' || o.status === 'accepted');
  const acceptedOffer = data.offers.find((o) => o.status === 'accepted');

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <Helmet>
        <title>Suivi de ma proposition de rachat</title>
        <meta name="description" content="Consultez l'offre de rachat de votre matériel et répondez en un clic." />
      </Helmet>

      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>{getCategoryEmoji(data.category)}</span>
              {[data.brand, data.model].filter(Boolean).join(' ') || getCategoryLabel(data.category)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Demande envoyée à {data.shop?.name} le {new Date(data.created_at).toLocaleDateString('fr-FR')}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(data.answers ?? {}).map(([k, v]) => (
              v ? (
                <div key={k} className="flex justify-between gap-4 border-b last:border-0 py-1">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-right">{v}</span>
                </div>
              ) : null
            ))}
          </CardContent>
        </Card>

        {data.status === 'pending' && (
          <Card>
            <CardContent className="py-8 text-center space-y-2">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-medium">En attente de l'offre du professionnel</p>
              <p className="text-sm text-muted-foreground">
                Vous recevrez une notification dès que {data.shop?.name} aura chiffré votre matériel.
              </p>
            </CardContent>
          </Card>
        )}

        {data.network_open && (
          <Card className="border-primary/40">
            <CardContent className="py-6 text-center space-y-2">
              <Globe2 className="h-7 w-7 mx-auto text-primary" />
              <p className="font-medium">Votre demande est ouverte au réseau Fixway</p>
              <p className="text-sm text-muted-foreground">
                Les professionnels du réseau chiffrent votre matériel
                {data.network_deadline && ` jusqu'au ${new Date(data.network_deadline).toLocaleString('fr-FR')}`}.
                Vous recevrez ensuite une sélection des meilleures offres. Les frais d'envoi restent à votre charge.
              </p>
            </CardContent>
          </Card>
        )}

        {activeOffers.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">
              {activeOffers.some((o) => o.is_network_offer) ? 'Offres du réseau Fixway' : 'Offre reçue'}
            </h2>
            {activeOffers.map((offer) => (
              <Card key={offer.id} className={offer.status === 'accepted' ? 'border-green-500' : undefined}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{offer.shop_name}</p>
                      {offer.is_network_offer && (
                        <Badge variant="secondary" className="mt-1">
                          <Globe2 className="h-3 w-3 mr-1" />
                          Offre réseau {offer.shop_city ? `— ${offer.shop_city}` : ''} (envoi à votre charge)
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold whitespace-nowrap">{Number(offer.amount).toFixed(2)} €</p>
                  </div>
                  {offer.message && <p className="text-sm whitespace-pre-line">{offer.message}</p>}
                  {offer.conditions && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{offer.conditions}</p>
                  )}
                  {offer.valid_until && (
                    <p className="text-xs text-muted-foreground">
                      Valable jusqu'au {new Date(offer.valid_until).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  <Separator />
                  {offer.status === 'accepted' ? (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />Offre acceptée — le professionnel va vous contacter.
                    </p>
                  ) : acceptedOffer ? null : (
                    <div className="flex gap-2">
                      <Button className="flex-1" disabled={busy} onClick={() => respond(offer.id, 'accept')}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />J'accepte
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={busy}
                        onClick={() => setRefusing(offer.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />Je refuse
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data.status === 'refused' && (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Vous avez refusé l'offre. Merci de votre visite.
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!refusing} onOpenChange={(o) => !o && setRefusing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Proposer votre matériel à tout le réseau ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette offre ne vous convient pas. Souhaitez-vous envoyer votre demande à l'ensemble des
              magasins et ateliers du réseau Fixway ? Vous recevrez une sélection des meilleures offres.
              Les frais d'envoi du matériel resteront à votre charge.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => refusing && respond(refusing, 'refuse', false)}
            >
              Non merci, je refuse simplement
            </Button>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); refusing && respond(refusing, 'refuse', true); }}
            >
              Oui, envoyer au réseau
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
