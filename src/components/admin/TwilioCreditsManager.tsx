import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, CreditCard, Zap, RotateCcw, AlertCircle } from 'lucide-react';
import { useTwilioCredits } from '@/hooks/useTwilioCredits';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TwilioCreditsManager() {
  const { balance, loading, purchasing, fetchTwilioBalance, purchaseCredits, syncCreditsWithShops } = useTwilioCredits();
  const [purchaseAmount, setPurchaseAmount] = useState<string>('100');

  const handlePurchase = async () => {
    const amount = parseInt(purchaseAmount);
    if (amount <= 0) return;
    
    try {
      await purchaseCredits(amount);
      setPurchaseAmount('100');
    } catch (error) {
      // Erreur déjà gérée dans le hook
    }
  };

  const handleSync = async () => {
    try {
      await syncCreditsWithShops();
      await fetchTwilioBalance();
    } catch (error) {
      // Erreur déjà gérée dans le hook
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Gestion Réseau Twilio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cette section gère les crédits SMS de votre compte Twilio principal (Réseau). 
            Les crédits alloués aux magasins doivent être synchronisés avec ce solde.
          </AlertDescription>
        </Alert>

        {/* Solde Twilio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-blue-900">Solde Twilio</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTwilioBalance}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {balance ? (
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {balance.balance.toFixed(2)} {balance.currency}
                </div>
                <p className="text-sm text-blue-600">
                  Mis à jour: {new Date(balance.lastUpdated).toLocaleString('fr-FR')}
                </p>
              </div>
            ) : (
              <div className="text-gray-500">
                {loading ? 'Chargement...' : 'Non disponible'}
              </div>
            )}
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Équivalent SMS</h3>
            <div className="text-2xl font-bold text-green-900">
              {balance ? Math.floor(balance.balance * 100) : 0}
            </div>
            <p className="text-sm text-green-600">SMS disponibles (approx.)</p>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-900 mb-2">Statut</h3>
            <Badge variant={balance && balance.balance > 5 ? "default" : "destructive"}>
              {balance && balance.balance > 5 ? "Suffisant" : "Critique"}
            </Badge>
            <p className="text-sm text-yellow-600 mt-1">
              État du compte
            </p>
          </div>
        </div>

        <Separator />

        {/* Achat de crédits */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Acheter des Crédits
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-amount">Montant en USD</Label>
              <Input
                id="purchase-amount"
                type="number"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                placeholder="100"
                min="1"
                max="1000"
              />
              <p className="text-sm text-muted-foreground">
                ≈ {parseInt(purchaseAmount) * 100} SMS
              </p>
            </div>

            <div className="flex flex-col justify-end">
              <Button
                onClick={handlePurchase}
                disabled={purchasing || !purchaseAmount || parseInt(purchaseAmount) <= 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {purchasing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Acheter ${purchaseAmount}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[10, 25, 50, 100].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setPurchaseAmount(amount.toString())}
                className="text-xs"
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Synchronisation */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Synchronisation
          </h3>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Synchroniser avec les magasins</p>
              <p className="text-sm text-muted-foreground">
                Met à jour les crédits alloués en fonction du solde Twilio
              </p>
            </div>
            <Button
              onClick={handleSync}
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sync...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Synchroniser
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}