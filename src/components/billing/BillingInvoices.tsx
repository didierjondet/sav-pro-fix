import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInvoices } from '@/hooks/useInvoices';
import { FileText, Download, Printer, CreditCard, MessageSquare, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function BillingInvoices() {
  const {
    subscriptionInvoices,
    smsInvoices,
    loading,
    downloadInvoice,
    printInvoice,
  } = useInvoices();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'En attente', variant: 'secondary' as const },
      paid: { label: 'Payée', variant: 'default' as const },
      failed: { label: 'Échec', variant: 'destructive' as const },
      refunded: { label: 'Remboursée', variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const formatAmount = (cents: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Chargement des factures...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Factures d'abonnement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Factures d'abonnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionInvoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune facture d'abonnement trouvée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptionInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{invoice.invoice_number}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Période: {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                      </span>
                      <span>Créée le {formatDate(invoice.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {formatAmount(invoice.amount_cents, invoice.currency)}
                      </div>
                      {invoice.paid_at && (
                        <div className="text-xs text-muted-foreground">
                          Payée le {formatDate(invoice.paid_at)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printInvoice(invoice.id, 'subscription')}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoice(invoice.id, 'subscription')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factures SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Factures d'achat SMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          {smsInvoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune facture d'achat SMS trouvée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {smsInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{invoice.invoice_number}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span>{invoice.sms_count} SMS</span>
                      <span>Créée le {formatDate(invoice.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {formatAmount(invoice.amount_cents, invoice.currency)}
                      </div>
                      {invoice.paid_at && (
                        <div className="text-xs text-muted-foreground">
                          Payée le {formatDate(invoice.paid_at)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printInvoice(invoice.id, 'sms')}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoice(invoice.id, 'sms')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}