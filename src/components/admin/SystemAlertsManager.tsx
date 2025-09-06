import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Bell, Settings, Trash2 } from 'lucide-react';
import { useSystemAlerts } from '@/hooks/useSystemAlerts';
import { useTwilioCredits } from '@/hooks/useTwilioCredits';

export function SystemAlertsManager() {
  const { alerts, loading, updateAlert } = useSystemAlerts();
  const { testTwilioAuth } = useTwilioCredits();
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const smsAlert = alerts.find(alert => alert.alert_type === 'sms_credits');

  const handleEdit = (alert: any) => {
    setEditingAlert(alert.id);
    setFormData({
      is_enabled: alert.is_enabled,
      threshold_value: alert.threshold_value || 100,
      sms_message_1: alert.sms_message_1 || '',
      sms_message_2: alert.sms_message_2 || '',
      sms_message_3: alert.sms_message_3 || '',
    });
  };

  const handleSave = async () => {
    if (!editingAlert) return;
    
    await updateAlert(editingAlert, formData);
    setEditingAlert(null);
    setFormData({});
  };

  const handleCancel = () => {
    setEditingAlert(null);
    setFormData({});
  };

  const getAlertStatusBadge = (alert: any) => {
    if (!alert.is_enabled) {
      return <Badge variant="secondary">Désactivée</Badge>;
    }
    
    const lastCheck = alert.last_check_at ? new Date(alert.last_check_at) : null;
    const lastAlert = alert.last_alert_sent_at ? new Date(alert.last_alert_sent_at) : null;
    
    if (lastAlert && Date.now() - lastAlert.getTime() < 24 * 60 * 60 * 1000) {
      return <Badge variant="destructive">Alerte récente</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertes Système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertes Système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Configurez les alertes automatiques pour surveiller votre plateforme.
          </div>
          
          {/* Test Twilio Button */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Test de configuration Twilio
                </h4>
                <p className="text-sm text-muted-foreground">
                  Vérifiez que vos identifiants Twilio sont correctement configurés
                </p>
              </div>
              <Button onClick={testTwilioAuth} variant="outline" size="sm">
                Tester Twilio
              </Button>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Alerte SMS Credits */}
          {smsAlert && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {smsAlert.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getAlertStatusBadge(smsAlert)}
                    {editingAlert !== smsAlert.id && (
                      <Button
                        onClick={() => handleEdit(smsAlert)}
                        variant="outline"
                        size="sm"
                      >
                        Configurer
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingAlert === smsAlert.id ? (
                  <div className="space-y-4">
                    {/* Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>État de l'alerte</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.is_enabled}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, is_enabled: checked })
                            }
                          />
                          <span className="text-sm">
                            {formData.is_enabled ? 'Activée' : 'Désactivée'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="threshold">Seuil d'alerte (crédits)</Label>
                        <Input
                          id="threshold"
                          type="number"
                          value={formData.threshold_value || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              threshold_value: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="100"
                        />
                      </div>
                    </div>

                    {/* Messages SMS */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Messages d'alerte SMS</h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sms1">Message d'alerte niveau 1</Label>
                        <Textarea
                          id="sms1"
                          value={formData.sms_message_1 || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sms_message_1: e.target.value,
                            })
                          }
                          placeholder="Message d'information générale..."
                          rows={2}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sms2">Message d'alerte niveau 2</Label>
                        <Textarea
                          id="sms2"
                          value={formData.sms_message_2 || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sms_message_2: e.target.value,
                            })
                          }
                          placeholder="Message d'urgence..."
                          rows={2}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sms3">Message d'alerte niveau 3</Label>
                        <Textarea
                          id="sms3"
                          value={formData.sms_message_3 || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sms_message_3: e.target.value,
                            })
                          }
                          placeholder="Message critique..."
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <p>Variables disponibles :</p>
                      <p>• ${'{threshold}'} - Seuil configuré</p>
                      <p>• ${'{remaining}'} - Crédits restants</p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSave}>Sauvegarder</Button>
                      <Button onClick={handleCancel} variant="outline">
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <strong>Seuil:</strong> {smsAlert.threshold_value} crédits
                      </span>
                      <span>
                        <strong>Fréquence:</strong> Toutes les {smsAlert.check_frequency_hours}h
                      </span>
                    </div>
                    
                    {smsAlert.last_check_at && (
                      <div className="text-sm text-muted-foreground">
                        Dernière vérification : {new Date(smsAlert.last_check_at).toLocaleString('fr-FR')}
                      </div>
                    )}
                    
                    {smsAlert.last_alert_sent_at && (
                      <div className="text-sm text-orange-600">
                        Dernière alerte envoyée : {new Date(smsAlert.last_alert_sent_at).toLocaleString('fr-FR')}
                      </div>
                    )}
                    
                    {!smsAlert.is_enabled && (
                      <div className="text-sm text-muted-foreground">
                        Cette alerte est actuellement désactivée.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!smsAlert && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune alerte SMS configurée.</p>
              <p className="text-sm">L'alerte par défaut devrait être créée automatiquement.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}