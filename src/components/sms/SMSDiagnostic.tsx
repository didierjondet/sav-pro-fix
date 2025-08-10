import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Wifi,
  Settings,
  Send
} from 'lucide-react';

export function SMSDiagnostic() {
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test SMS depuis Fixway');
  const [testing, setTesting] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const { toast } = useToast();
  const { subscription } = useSubscription();

  const runDiagnostic = async () => {
    setTesting(true);
    setDiagnosticResult(null);

    try {
      // Test 1: Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Test 2: Vérifier les crédits SMS
      const { data: profileData } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        throw new Error('Profil utilisateur introuvable');
      }

      const { data: shopData } = await supabase
        .from('shops')
        .select('sms_credits_allocated, sms_credits_used')
        .eq('id', profileData.shop_id)
        .single();

      if (!shopData) {
        throw new Error('Données du magasin introuvables');
      }

      const creditsRemaining = shopData.sms_credits_allocated - shopData.sms_credits_used;

      // Test 3: Tester l'edge function (si numéro fourni)
      let smsTestResult = null;
      if (testPhone.trim()) {
        try {
          const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              to: testPhone,
              message: testMessage,
              type: 'test',
              recordId: 'diagnostic-test'
            }
          });

          if (smsError) {
            smsTestResult = { success: false, error: smsError.message };
          } else {
            smsTestResult = { success: true, data: smsData };
          }
        } catch (error: any) {
          smsTestResult = { success: false, error: error.message };
        }
      }

      setDiagnosticResult({
        auth: { success: true, user: user.email },
        shop: { success: true, shopId: profileData.shop_id },
        credits: { 
          success: creditsRemaining > 0, 
          allocated: shopData.sms_credits_allocated,
          used: shopData.sms_credits_used,
          remaining: creditsRemaining
        },
        smsTest: smsTestResult
      });

    } catch (error: any) {
      setDiagnosticResult({
        error: error.message
      });
      toast({
        title: 'Erreur de diagnostic',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const TestStatus = ({ success, children }: { success?: boolean, children: React.ReactNode }) => (
    <div className="flex items-center gap-2">
      {success === true ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : success === false ? (
        <AlertCircle className="h-4 w-4 text-red-500" />
      ) : (
        <div className="h-4 w-4 bg-gray-300 rounded-full" />
      )}
      {children}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Diagnostic SMS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test de SMS */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="test-phone">Numéro de test (optionnel)</Label>
            <Input
              id="test-phone"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="06 12 34 56 78"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Laissez vide pour tester uniquement la configuration
            </p>
          </div>
          
          <div>
            <Label htmlFor="test-message">Message de test</Label>
            <Textarea
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={2}
              maxLength={160}
            />
          </div>
        </div>

        <Button 
          onClick={runDiagnostic} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Test en cours...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-2" />
              Lancer le diagnostic
            </>
          )}
        </Button>

        {/* Résultats du diagnostic */}
        {diagnosticResult && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">Résultats du diagnostic :</h4>
            
            {diagnosticResult.error ? (
              <div className="text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Erreur : {diagnosticResult.error}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <TestStatus success={diagnosticResult.auth?.success}>
                  Authentification : {diagnosticResult.auth?.success ? `✓ ${diagnosticResult.auth.user}` : '✗ Échec'}
                </TestStatus>
                
                <TestStatus success={diagnosticResult.shop?.success}>
                  Configuration magasin : {diagnosticResult.shop?.success ? `✓ ID: ${diagnosticResult.shop.shopId?.slice(0, 8)}...` : '✗ Échec'}
                </TestStatus>
                
                <TestStatus success={diagnosticResult.credits?.success}>
                  Crédits SMS : {diagnosticResult.credits ? 
                    `${diagnosticResult.credits.remaining}/${diagnosticResult.credits.allocated} disponibles` : 
                    'Non vérifié'
                  }
                </TestStatus>

                {diagnosticResult.smsTest && (
                  <TestStatus success={diagnosticResult.smsTest.success}>
                    Test d'envoi SMS : {diagnosticResult.smsTest.success ? 
                      '✓ SMS envoyé avec succès' : 
                      `✗ ${diagnosticResult.smsTest.error}`
                    }
                  </TestStatus>
                )}
              </div>
            )}
          </div>
        )}

        {/* Informations sur la configuration */}
        <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100">Configuration SMS :</h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <div>• Fournisseur : OVH SMS</div>
            <div>• Expéditeur : FIXWAYFR</div>
            <div>• Format : GSM 7-bit (160 caractères max)</div>
            <div>• Numéros supportés : France (+33)</div>
          </div>
        </div>

        {/* État de l'abonnement */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Abonnement actuel :</span>
          <Badge variant={subscription?.subscription_tier === 'free' ? 'secondary' : 'default'}>
            {subscription?.subscription_tier || 'Free'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}