import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function TwilioTestButton() {
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const testTwilioAuth = async () => {
    setTesting(true);
    try {
      console.log('🔧 Test des secrets Twilio...');
      
      const { data, error } = await supabase.functions.invoke('test-twilio-auth', {
        body: {}
      });

      console.log('📡 Réponse test Twilio:', { data, error });

      if (error) {
        console.error('❌ Erreur test Twilio:', error);
        toast({
          title: 'Erreur technique',
          description: `Échec du test: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        toast({
          title: '✅ Test réussi',
          description: `Authentification Twilio OK - Compte: ${data.accountInfo?.friendlyName || 'Compte validé'}`,
        });
      } else {
        toast({
          title: '❌ Test échoué',
          description: `Secrets incorrects: ${data?.error || 'Erreur inconnue'}`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('💥 Erreur test Twilio:', error);
      toast({
        title: 'Erreur test',
        description: error.message || 'Impossible de tester l\'authentification',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Button
      onClick={testTwilioAuth}
      disabled={testing}
      variant="destructive"
      size="sm"
      className="gap-2"
    >
      <AlertTriangle className="h-4 w-4" />
      {testing ? 'Test...' : 'Test Twilio Auth'}
    </Button>
  );
}