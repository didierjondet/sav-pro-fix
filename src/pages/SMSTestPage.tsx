import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  Settings,
  Phone
} from 'lucide-react';

export default function SMSTestPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test SMS depuis Fixway - Votre système fonctionne correctement ! 📱');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { user } = useAuth();
  const { shop, loading } = useShop();
  const { toast } = useToast();

  const sendTestSMS = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir le numéro et le message',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: testPhone,
          message: testMessage,
          type: 'test',
          recordId: `test-${Date.now()}`
        }
      });

      if (error) throw error;

      setLastResult({
        success: true,
        data,
        timestamp: new Date().toLocaleString()
      });

      toast({
        title: 'SMS envoyé !',
        description: `SMS de test envoyé avec succès à ${testPhone}`,
      });

    } catch (error: any) {
      setLastResult({
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleString()
      });

      toast({
        title: 'Erreur d\'envoi',
        description: error.message || 'Impossible d\'envoyer le SMS',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const checkCredits = () => {
    if (!shop) return { remaining: 0, allocated: 0, used: 0 };
    
    const allocated = shop.sms_credits_allocated || 0;
    const used = shop.sms_credits_used || 0;
    const remaining = allocated - used;
    
    return { remaining, allocated, used };
  };

  const credits = checkCredits();

  const getPhoneHint = (phone: string) => {
    if (!phone) return '';
    
    // Nettoyer le numéro
    const cleaned = phone.replace(/\s/g, '');
    
    if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
      return `→ +33${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('0')) {
      return `→ +33${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('+33')) {
      return '✓ Format international';
    }
    
    return 'Format non reconnu';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center py-8">Chargement...</div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* En-tête */}
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Test SMS</h1>
                <Badge variant="outline">Debug Mode</Badge>
              </div>

              {/* État des crédits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    État du système SMS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {credits.remaining}
                      </div>
                      <p className="text-sm text-muted-foreground">SMS restants</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">
                        {credits.used}
                      </div>
                      <p className="text-sm text-muted-foreground">SMS utilisés</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">
                        {credits.allocated}
                      </div>
                      <p className="text-sm text-muted-foreground">Quota mensuel</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-sm">
                      <div><strong>Configuration :</strong></div>
                      <div>• Fournisseur : OVH SMS</div>
                      <div>• Expéditeur : FIXWAYFR</div>
                      <div>• Magasin : {shop?.name || 'Non défini'}</div>
                      <div>• Utilisateur : {user?.email || 'Non connecté'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Formulaire de test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Envoyer un SMS de test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="test-phone">Numéro de téléphone</Label>
                    <Input
                      id="test-phone"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="06 12 34 56 78 ou +33612345678"
                    />
                    {testPhone && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {getPhoneHint(testPhone)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="test-message">Message</Label>
                    <Textarea
                      id="test-message"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={3}
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {testMessage.length}/160 caractères
                    </p>
                  </div>

                  <Button 
                    onClick={sendTestSMS} 
                    disabled={sending || credits.remaining <= 0}
                    className="w-full"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer le SMS de test
                      </>
                    )}
                  </Button>

                  {credits.remaining <= 0 && (
                    <div className="text-red-600 text-sm text-center">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Aucun crédit SMS disponible
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Résultats */}
              {lastResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {lastResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      Résultat du test
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Statut :</span>
                        <Badge variant={lastResult.success ? 'default' : 'destructive'}>
                          {lastResult.success ? 'Succès' : 'Échec'}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>Horodatage :</span>
                        <span>{lastResult.timestamp}</span>
                      </div>

                      {lastResult.success && lastResult.data && (
                        <div className="space-y-2">
                          {lastResult.data.creditsRemaining !== undefined && (
                            <div className="flex justify-between text-sm">
                              <span>Crédits restants :</span>
                              <span>{lastResult.data.creditsRemaining}</span>
                            </div>
                          )}
                          {lastResult.data.ovhJobId && (
                            <div className="flex justify-between text-sm">
                              <span>ID tâche OVH :</span>
                              <span className="font-mono">{lastResult.data.ovhJobId}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {!lastResult.success && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            <strong>Erreur :</strong> {lastResult.error}
                          </p>
                          
                          {/* Aide au diagnostic */}
                          {lastResult.error.includes('Missing OVH credentials') && (
                            <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                              💡 Les clés OVH ne sont pas configurées dans les secrets Supabase
                            </div>
                          )}
                          
                          {lastResult.error.includes('Insufficient SMS credits') && (
                            <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                              💡 Quota SMS épuisé pour ce mois
                            </div>
                          )}
                          
                          {lastResult.error.includes('does not exists') && (
                            <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                              💡 L'expéditeur SMS est en cours de validation chez OVH
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Informations de dépannage */}
              <Card>
                <CardHeader>
                  <CardTitle>Guide de dépannage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <strong>🔑 Secrets requis (Supabase) :</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>OVH_APPLICATION_KEY</li>
                        <li>OVH_APPLICATION_SECRET</li>
                        <li>OVH_CONSUMER_KEY</li>
                        <li>OVH_SMS_SERVICE</li>
                      </ul>
                    </div>
                    
                    <div>
                      <strong>📞 Formats de numéros supportés :</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>06 12 34 56 78 → +33612345678</li>
                        <li>07 12 34 56 78 → +33712345678</li>
                        <li>+33612345678 (format international)</li>
                      </ul>
                    </div>
                    
                    <div>
                      <strong>⚡ Problèmes courants :</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>Expéditeur FIXWAYFR en cours de validation chez OVH</li>
                        <li>Clés OVH manquantes ou incorrectes</li>
                        <li>Quota SMS épuisé</li>
                        <li>Numéro au mauvais format</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}