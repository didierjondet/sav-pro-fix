import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useInvoiceConfig } from '@/hooks/useInvoiceConfig';
import { Bell, MessageSquare } from 'lucide-react';

export function InvoiceNotificationConfig() {
  const { notificationConfigs, loading, updateNotificationConfig } = useInvoiceConfig();

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  const subscriptionConfig = notificationConfigs.find(c => c.notification_type === 'subscription');
  const smsPackageConfig = notificationConfigs.find(c => c.notification_type === 'sms_package');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications pour factures d'abonnement</CardTitle>
          <CardDescription>
            Configuration des notifications envoyées lors de la génération d'une facture mensuelle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sub-in-app">Notification dans l'application (cloche)</Label>
            </div>
            <Switch
              id="sub-in-app"
              checked={subscriptionConfig?.in_app_enabled ?? true}
              onCheckedChange={(checked) =>
                updateNotificationConfig('subscription', { in_app_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sub-sms">Notification par SMS</Label>
            </div>
            <Switch
              id="sub-sms"
              checked={subscriptionConfig?.sms_enabled ?? false}
              onCheckedChange={(checked) =>
                updateNotificationConfig('subscription', { sms_enabled: checked })
              }
            />
          </div>

          {subscriptionConfig?.sms_enabled && (
            <div className="space-y-2">
              <Label htmlFor="sub-sms-template">Template du message SMS</Label>
              <Textarea
                id="sub-sms-template"
                rows={4}
                defaultValue={subscriptionConfig.sms_message_template}
                onBlur={(e) =>
                  updateNotificationConfig('subscription', {
                    sms_message_template: e.target.value,
                  })
                }
                placeholder="Utilisez {shop_name}, {invoice_number}, {amount}, {invoice_link}"
              />
              <p className="text-sm text-muted-foreground">
                Variables disponibles : {'{shop_name}'}, {'{invoice_number}'}, {'{amount}'},
                {'{invoice_date}'}, {'{invoice_link}'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications pour factures d'achat SMS</CardTitle>
          <CardDescription>
            Configuration des notifications envoyées lors de l'achat d'un package SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sms-in-app">Notification dans l'application (cloche)</Label>
            </div>
            <Switch
              id="sms-in-app"
              checked={smsPackageConfig?.in_app_enabled ?? true}
              onCheckedChange={(checked) =>
                updateNotificationConfig('sms_package', { in_app_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sms-sms">Notification par SMS</Label>
            </div>
            <Switch
              id="sms-sms"
              checked={smsPackageConfig?.sms_enabled ?? false}
              onCheckedChange={(checked) =>
                updateNotificationConfig('sms_package', { sms_enabled: checked })
              }
            />
          </div>

          {smsPackageConfig?.sms_enabled && (
            <div className="space-y-2">
              <Label htmlFor="sms-sms-template">Template du message SMS</Label>
              <Textarea
                id="sms-sms-template"
                rows={4}
                defaultValue={smsPackageConfig.sms_message_template}
                onBlur={(e) =>
                  updateNotificationConfig('sms_package', {
                    sms_message_template: e.target.value,
                  })
                }
                placeholder="Utilisez {shop_name}, {invoice_number}, {amount}, {invoice_link}"
              />
              <p className="text-sm text-muted-foreground">
                Variables disponibles : {'{shop_name}'}, {'{invoice_number}'}, {'{amount}'},
                {'{invoice_date}'}, {'{invoice_link}'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
