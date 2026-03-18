import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, DollarSign, RotateCcw, ExternalLink, Bell, RefreshCw } from 'lucide-react';
import { useTwilioCredits } from '@/hooks/useTwilioCredits';
import { useGlobalSMSCredits } from '@/hooks/useGlobalSMSCredits';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

export function TwilioCreditsManager() {
  const { balance, loading: twilioLoading, fetchTwilioBalance, syncCreditsWithShops } = useTwilioCredits();
  const { globalCredits, loading: globalLoading, fetchGlobalCredits } = useGlobalSMSCredits();
  const { toast } = useToast();
  const [alertThreshold, setAlertThreshold] = useState(100);
  const [alertPhone, setAlertPhone] = useState('');
  const [savingAlert, setSavingAlert] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchAlertSettings();
  }, []);

  const fetchAlertSettings = async () => {
    try {
      const { data } = await supabase
        .from('twilio_alert_config')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (data) {
        setAlertThreshold(data.threshold_sms || 100);
        setAlertPhone(data.alert_phone || '');
      }
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
    }
  };

  const handleSaveAlert = async () => {
    setSavingAlert(true);
    try {
      const { error } = await supabase
        .from('twilio_alert_config')
        .update({
          threshold_sms: alertThreshold,
          alert_phone: alertPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;
      toast({ title: 'Succès', description: 'Configuration d\'alerte sauvegardée' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingAlert(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      await syncCreditsWithShops();
      await Promise.all([fetchTwilioBalance(), fetchGlobalCredits()]);
      toast({ title: 'Synchronisation réussie', description: 'Solde et crédits mis à jour' });
    } catch (error) {
      // handled by hook
    } finally {
      setSyncing(false);
    }
  };

  const estimatedSMS = balance ? Math.floor(balance.balance / 0.08) : 0;
  const usagePercent = globalCredits && globalCredits.total_credits 
    ? Math.round(((globalCredits.used_credits || 0) / globalCredits.total_credits) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Carte principale - Solde Twilio */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Compte Twilio — Solde & Crédits SMS
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullSync}
                disabled={syncing || twilioLoading || globalLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisation...' : 'Synchroniser'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://console.twilio.com/us1/billing/manage-billing/add-funds', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Recharger sur Twilio
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Solde USD */}
            <div className="text-center p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Solde Twilio</p>
              <p className="text-3xl font-bold text-primary">
                ${balance?.balance?.toFixed(2) || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">USD</p>
            </div>

            {/* SMS estimés */}
            <div className="text-center p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">SMS disponibles</p>
              <p className="text-3xl font-bold">
                {balance ? estimatedSMS : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">≈ $0.08 / SMS</p>
            </div>

            {/* Crédits distribués */}
            <div className="text-center p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Crédits distribués</p>
              <p className="text-3xl font-bold">
                {globalCredits?.used_credits ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">aux boutiques</p>
            </div>

            {/* Statut */}
            <div className="text-center p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Statut</p>
              <Badge variant={balance ? "default" : "destructive"} className="text-lg px-4 py-1">
                {balance ? "Connecté" : "Déconnecté"}
              </Badge>
              {globalCredits?.last_sync_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Sync: {new Date(globalCredits.last_sync_at).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          </div>

          {/* Barre de distribution */}
          {globalCredits && globalCredits.total_credits && globalCredits.total_credits > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Distribution des crédits</span>
                <span>{usagePercent}% distribué</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {globalCredits.remaining_credits} crédits non distribués sur {globalCredits.total_credits} totaux
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration des alertes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Alerte de Solde Bas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alert-threshold">Seuil d'alerte (nombre minimum de SMS)</Label>
              <Input
                id="alert-threshold"
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-phone">Numéro pour l'alerte</Label>
              <Input
                id="alert-phone"
                type="tel"
                value={alertPhone}
                onChange={(e) => setAlertPhone(e.target.value)}
                placeholder="+33612345678"
              />
            </div>
          </div>
          <Button 
            onClick={handleSaveAlert}
            disabled={savingAlert || !alertPhone}
            variant="outline"
          >
            <Bell className="h-4 w-4 mr-2" />
            {savingAlert ? 'Enregistrement...' : 'Enregistrer l\'alerte'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
