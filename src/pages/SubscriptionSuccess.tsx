import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan');
  const { checkSubscription } = useSubscription();

  useEffect(() => {
    // Rafraîchir le statut d'abonnement après le succès
    const timer = setTimeout(() => {
      checkSubscription();
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkSubscription]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">
            Abonnement Confirmé !
          </CardTitle>
          <CardDescription>
            Votre abonnement {plan ? `${plan.charAt(0).toUpperCase() + plan.slice(1)}` : ''} a été activé avec succès.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Vous pouvez maintenant profiter de toutes les fonctionnalités de votre plan.</p>
            <p className="mt-2">Un email de confirmation vous a été envoyé.</p>
          </div>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/subscription">
                Voir mon abonnement
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au tableau de bord
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}