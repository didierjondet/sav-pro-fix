import { Quote } from '@/hooks/useQuotes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Download, Mail, X, MessageSquare, Clock, CheckCircle, FileText, DollarSign, ShieldOff, Calendar, AlertTriangle } from 'lucide-react';
import { useSMS } from '@/hooks/useSMS';
import { useToast } from '@/hooks/use-toast';

const REJECTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  too_expensive: { label: 'Trop cher', icon: <DollarSign className="h-4 w-4" />, color: 'text-red-600 bg-red-50' },
  too_slow: { label: 'Trop lent', icon: <Clock className="h-4 w-4" />, color: 'text-orange-600 bg-orange-50' },
  no_trust: { label: 'Pas confiance', icon: <ShieldOff className="h-4 w-4" />, color: 'text-purple-600 bg-purple-50' },
  postponed: { label: 'Reporté', icon: <Calendar className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50' }
};

interface QuoteViewProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: (quote: Quote) => void;
  onSendEmail?: (quote: Quote) => void;
  onQuoteUpdate?: () => void;
}

export function QuoteView({ quote, isOpen, onClose, onDownloadPDF, onSendEmail, onQuoteUpdate }: QuoteViewProps) {
  const { sendQuoteNotification } = useSMS();
  const { toast } = useToast();
  if (!quote) return null;

  const isQuoteExpired = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const oneMonthLater = new Date(created);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    return now > oneMonthLater;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'outline';
      case 'viewed': return 'secondary';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'sent': return 'Envoyé';
      case 'viewed': return 'Consulté';
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  const handleSendSMS = async () => {
    if (!quote?.customer_phone) {
      toast({
        title: "Erreur",
        description: "Aucun numéro de téléphone renseigné pour ce client",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await sendQuoteNotification(
        quote.customer_phone,
        quote.customer_name,
        quote.quote_number,
        quote.id
      );

      if (result) {
        toast({
          title: "SMS envoyé",
          description: `Le devis a été envoyé par SMS à ${quote.customer_phone}`,
        });
        if (onQuoteUpdate) onQuoteUpdate();
      } else {
        throw new Error('Erreur lors de l\'envoi du SMS');
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le SMS",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Devis {quote.quote_number}</DialogTitle>
                <p className="text-sm text-muted-foreground">Créé le {new Date(quote.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isQuoteExpired(quote.created_at) ? (
                <Badge variant="destructive" className="shadow-sm">
                  Devis expiré
                </Badge>
              ) : (
                <Badge variant={getStatusColor(quote.status)} className="shadow-sm">
                  {getStatusText(quote.status)}
                </Badge>
              )}
              {quote.status === 'sent' && !isQuoteExpired(quote.created_at) && (
                <div className="flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  <span>PDF envoyé par SMS</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informations client */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Informations client</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <span className="font-medium text-sm text-muted-foreground">Nom:</span>
                <p className="text-sm">{quote.customer_name}</p>
              </div>
              {quote.customer_email && (
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Email:</span>
                  <p className="text-sm">{quote.customer_email}</p>
                </div>
              )}
              {quote.customer_phone && (
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Téléphone:</span>
                  <p className="text-sm">{quote.customer_phone}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-sm text-muted-foreground">Date de création:</span>
                <p className="text-sm">{new Date(quote.created_at).toLocaleDateString()}</p>
              </div>
              {quote.status === 'sent' && !isQuoteExpired(quote.created_at) && (
                <div className="md:col-span-2">
                  <span className="font-medium text-sm text-muted-foreground">Envoi SMS:</span>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>PDF envoyé le {new Date(quote.updated_at || quote.created_at).toLocaleDateString()} à {new Date(quote.updated_at || quote.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
              {isQuoteExpired(quote.created_at) && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <span className="font-medium">⚠️ Ce devis a expiré (plus d'un mois)</span>
                  </div>
                </div>
              )}
              {/* Affichage de la raison de refus */}
              {quote.status === 'rejected' && (quote as any).rejection_reason && (
                <div className="md:col-span-2">
                  <span className="font-medium text-sm text-muted-foreground">Raison du refus:</span>
                  <div className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-lg ${REJECTION_LABELS[(quote as any).rejection_reason]?.color || 'bg-muted'}`}>
                    {REJECTION_LABELS[(quote as any).rejection_reason]?.icon || <AlertTriangle className="h-4 w-4" />}
                    <span className="font-medium text-sm">
                      {REJECTION_LABELS[(quote as any).rejection_reason]?.label || (quote as any).rejection_reason}
                    </span>
                    {(quote as any).rejected_at && (
                      <span className="text-xs opacity-75 ml-2">
                        (le {new Date((quote as any).rejected_at).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Articles */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Articles</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 text-sm font-medium">
                <div className="col-span-5">Article</div>
                <div className="col-span-1 text-center">Qté</div>
                <div className="col-span-2 text-right">Prix unitaire</div>
                <div className="col-span-2 text-right">Remise</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              
              {quote.items.map((item, index) => {
                const originalPrice = item.unit_public_price;
                const finalPrice = item.total_price / item.quantity;
                const hasDiscount = item.discount && (item.discount.type === 'percentage' || item.discount.type === 'fixed');
                const discountAmount = hasDiscount ? originalPrice - finalPrice : 0;
                
                return (
                  <div key={index} className="grid grid-cols-12 gap-4 p-3 border-t text-sm">
                    <div className="col-span-5">
                      <div className="font-medium">{item.part_name}</div>
                      {item.part_reference && (
                        <div className="text-xs text-muted-foreground">Réf: {item.part_reference}</div>
                      )}
                    </div>
                    <div className="col-span-1 text-center">{item.quantity}</div>
                    <div className="col-span-2 text-right">
                      {hasDiscount ? (
                        <div>
                          <div className="line-through text-muted-foreground text-xs">{originalPrice.toFixed(2)}€</div>
                          <div className="font-medium">{finalPrice.toFixed(2)}€</div>
                        </div>
                      ) : (
                        <div>{originalPrice.toFixed(2)}€</div>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      {hasDiscount ? (
                        <div className="text-red-600 font-medium">
                          {item.discount?.type === 'percentage' 
                            ? `-${item.discount.value}%`
                            : `-${discountAmount.toFixed(2)}€`
                          }
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="col-span-2 text-right font-medium">{item.total_price.toFixed(2)}€</div>
                  </div>
                );
              })}
              
              <div className="border-t bg-muted/30 p-3">
                <div className="flex justify-end">
                  <div className="text-right space-y-2">
                    <div className="text-lg font-bold">
                      Total: {quote.total_amount.toFixed(2)}€
                    </div>
                    {quote.deposit_amount && quote.deposit_amount > 0 && (
                      <>
                        <div className="text-sm text-muted-foreground">
                          Acompte réglé: -{quote.deposit_amount.toFixed(2)}€
                        </div>
                        <div className="text-base font-semibold text-primary border-t pt-2">
                          Reste à payer: {Math.max(0, quote.total_amount - quote.deposit_amount).toFixed(2)}€
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-2 flex-wrap">
            {quote.customer_phone && !isQuoteExpired(quote.created_at) && (
              <Button 
                variant={quote.status === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={handleSendSMS}
                className={quote.status === 'sent' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {quote.status === 'sent' ? 'Renvoyer SMS' : 'Envoyer par SMS'}
              </Button>
            )}
            {!isQuoteExpired(quote.created_at) && (
              <Button variant="outline" onClick={() => onDownloadPDF(quote)}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </Button>
            )}
            {quote.customer_email && onSendEmail && !isQuoteExpired(quote.created_at) && (
              <Button variant="outline" onClick={() => onSendEmail(quote)}>
                <Mail className="h-4 w-4 mr-2" />
                Envoyer par email
              </Button>
            )}
            {isQuoteExpired(quote.created_at) && (
              <div className="w-full text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-medium">Ce devis a expiré et n'est plus valide</p>
                <p className="text-red-500 text-sm mt-1">Créez un nouveau devis pour ce client</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}