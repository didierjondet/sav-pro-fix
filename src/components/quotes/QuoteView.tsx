import { Quote } from '@/hooks/useQuotes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Download, Mail, X } from 'lucide-react';
import { SMSButton } from '@/components/sav/SMSButton';

interface QuoteViewProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: (quote: Quote) => void;
  onSendEmail?: (quote: Quote) => void;
}

export function QuoteView({ quote, isOpen, onClose, onDownloadPDF, onSendEmail }: QuoteViewProps) {
  if (!quote) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending_review': return 'secondary';
      case 'sent': return 'outline';
      case 'under_negotiation': return 'secondary';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'pending_review': return 'En révision';
      case 'sent': return 'Envoyé';
      case 'under_negotiation': return 'En négociation';
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Devis {quote.quote_number}</DialogTitle>
            <Badge variant={getStatusColor(quote.status)}>
              {getStatusText(quote.status)}
            </Badge>
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
            </div>
          </div>

          <Separator />

          {/* Articles */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Articles</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 text-sm font-medium">
                <div className="col-span-6">Article</div>
                <div className="col-span-2 text-center">Quantité</div>
                <div className="col-span-2 text-right">Prix unitaire</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              
              {quote.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 p-3 border-t text-sm">
                  <div className="col-span-6">
                    <div className="font-medium">{item.part_name}</div>
                    {item.part_reference && (
                      <div className="text-xs text-muted-foreground">Réf: {item.part_reference}</div>
                    )}
                  </div>
                  <div className="col-span-2 text-center">{item.quantity}</div>
                  <div className="col-span-2 text-right">{item.unit_public_price.toFixed(2)}€</div>
                  <div className="col-span-2 text-right font-medium">{item.total_price.toFixed(2)}€</div>
                </div>
              ))}
              
              <div className="border-t bg-muted/30 p-3">
                <div className="flex justify-end">
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      Total: {quote.total_amount.toFixed(2)}€
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-2 flex-wrap">
            {quote.customer_phone && (
              <SMSButton
                customerPhone={quote.customer_phone}
                customerName={quote.customer_name}
                quoteNumber={quote.quote_number}
                quoteId={quote.id}
                size="sm"
                variant="outline"
              />
            )}
            <Button variant="outline" onClick={() => onDownloadPDF(quote)}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
            {quote.customer_email && onSendEmail && (
              <Button variant="outline" onClick={() => onSendEmail(quote)}>
                <Mail className="h-4 w-4 mr-2" />
                Envoyer par email
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}