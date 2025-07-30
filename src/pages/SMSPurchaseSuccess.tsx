import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft, MessageSquare } from 'lucide-react';
import { useShop } from '@/hooks/useShop';

export default function SMSPurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const credits = searchParams.get('credits');
  const { refetch } = useShop();

  useEffect(() => {
    // Rafraîchir les données du shop après l'achat
    const timer = setTimeout(() => {
      refetch();
    }, 2000);

    return () => clearTimeout(timer);
  }, [refetch]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-blue-700">
            Crédits SMS Ajoutés !
          </CardTitle>
          <CardDescription>
            {credits ? `${credits} crédits SMS` : 'Vos crédits SMS'} ont été ajoutés avec succès à votre compte.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-blue-600 mb-2">
              <CheckCircle className="w-6 h-6" />
              +{credits || '0'} SMS
            </div>
            <p className="text-sm text-muted-foreground">
              Vos nouveaux crédits sont immédiatement disponibles.
            </p>
          </div>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/settings?tab=sms">
                Voir mes crédits SMS
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