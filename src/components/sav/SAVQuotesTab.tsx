import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Download, MessageSquare, Eye, Trash2, CheckCircle, XCircle, Pencil } from 'lucide-react';
import { useQuotes, Quote } from '@/hooks/useQuotes';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { QuoteView } from '@/components/quotes/QuoteView';
import { SAVQuoteDepositControl } from '@/components/sav/SAVQuoteDepositControl';
import { getQuotePaymentInfo, useQuoteActions } from '@/lib/quoteActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface SAVQuotesTabCase {
  id: string;
  case_number: string;
  device_brand?: string | null;
  device_model?: string | null;
  device_imei?: string | null;
  sku?: string | null;
  problem_description?: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  viewed: 'Consulté',
  accepted: 'Accepté',
  sms_accepted: 'Accepté par le client',
  rejected: 'Refusé',
  expired: 'Expiré',
  completed: 'Terminé',
  archived: 'Archivé',
};

const REJECTION_LABELS: Record<string, string> = {
  too_expensive: 'Trop cher',
  too_slow: 'Délai trop long',
  no_trust: 'Manque de confiance',
  postponed: 'Reporté',
};

export function getSAVQuotesIndicator(quotes: Quote[]) {
  const pending = quotes.filter(q => ['draft', 'sent', 'viewed'].includes(q.status)).length;
  return { total: quotes.length, pending };
}

export function useSAVCaseQuotes(savCaseId?: string) {
  const { quotes } = useQuotes();
  return useMemo(
    () => (savCaseId ? quotes.filter(q => q.sav_case_id === savCaseId) : []),
    [quotes, savCaseId]
  );
}

export function SAVQuotesTab({ savCase }: { savCase: SAVQuotesTabCase }) {
  const { createQuote, updateQuote, deleteQuote } = useQuotes();
  const savQuotes = useSAVCaseQuotes(savCase.id);
  const { printQuote, sendQuoteSMS } = useQuoteActions();

  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);

  const customerName = [savCase.customer?.first_name, savCase.customer?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  const prefill: Partial<Quote> = {
    customer_name: customerName,
    customer_email: savCase.customer?.email || undefined,
    customer_phone: savCase.customer?.phone || undefined,
    device_brand: savCase.device_brand || undefined,
    device_model: savCase.device_model || undefined,
    device_imei: savCase.device_imei || undefined,
    sku: savCase.sku || undefined,
    problem_description: savCase.problem_description || undefined,
    sav_case_id: savCase.id,
  };

  const handleSubmit = async (data: any) => {
    if (editingQuote) {
      const result = await updateQuote(editingQuote.id, {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        device_brand: data.device_brand,
        device_model: data.device_model,
        device_imei: data.device_imei,
        sku: data.sku,
        problem_description: data.problem_description,
        items: data.items,
        total_amount: data.total_amount,
        deposit_amount: data.deposit_amount ?? 0,
        status: data.status,
      });
      if (!result.error) {
        setEditingQuote(null);
        setShowForm(false);
      }
      return { data: null, error: result.error } as any;
    }

    const result = await createQuote({ ...data, sav_case_id: savCase.id });
    if (!result.error) {
      setShowForm(false);
    }
    return result;
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingQuote(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Devis du dossier {savCase.case_number}
              {savQuotes.length > 0 && (
                <Badge variant="secondary">{savQuotes.length}</Badge>
              )}
            </span>
            <Button size="sm" onClick={() => { setEditingQuote(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau devis
            </Button>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Proposez un devis complémentaire au client (panne différente, réparation additionnelle).
            Les devis créés ici apparaissent aussi dans la page Devis.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {savQuotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun devis lié à ce dossier.</p>
          ) : (
            savQuotes.map((quote) => {
              const payment = getQuotePaymentInfo(quote);
              return (
                <div key={quote.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{quote.quote_number}</span>
                        <Badge
                          variant={
                            quote.status === 'rejected'
                              ? 'destructive'
                              : quote.status === 'accepted' || quote.status === 'sms_accepted'
                                ? 'default'
                                : 'outline'
                          }
                        >
                          {STATUS_LABELS[quote.status] || quote.status}
                        </Badge>
                        {quote.status === 'rejected' && (quote as any).rejection_reason && (
                          <Badge variant="outline" className="text-destructive border-destructive">
                            {REJECTION_LABELS[(quote as any).rejection_reason] || (quote as any).rejection_reason}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Créé le {format(new Date(quote.created_at), 'dd/MM/yyyy', { locale: fr })}
                        {quote.sms_sent_at && ` · SMS envoyé le ${format(new Date(quote.sms_sent_at), 'dd/MM/yyyy', { locale: fr })}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{payment.total.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">
                        Reste à payer : {payment.remaining.toFixed(2)}€
                      </p>
                    </div>
                  </div>

                  <SAVQuoteDepositControl quote={quote} />

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setViewingQuote(quote)}>
                      <Eye className="h-3 w-3 mr-1" /> Voir
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setEditingQuote(quote); setShowForm(true); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Modifier
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => printQuote(quote)}>
                      <Download className="h-3 w-3 mr-1" /> Imprimer
                    </Button>
                    {quote.customer_phone && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => sendQuoteSMS(quote)}>
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {quote.status === 'sent' ? 'Renvoyer SMS' : 'Envoyer par SMS'}
                      </Button>
                    )}
                    {quote.status !== 'accepted' && quote.status !== 'sms_accepted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-green-600 hover:text-green-700"
                        onClick={() => updateQuote(quote.id, {
                          status: 'accepted',
                          accepted_by: 'shop',
                          accepted_at: new Date().toISOString(),
                        })}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Marquer accepté
                      </Button>
                    )}
                    {quote.status !== 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-orange-600 hover:text-orange-700"
                        onClick={() => updateQuote(quote.id, { status: 'rejected' })}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Marquer refusé
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => deleteQuote(quote.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuote ? `Modifier le devis ${editingQuote.quote_number}` : `Nouveau devis — ${savCase.case_number}`}
            </DialogTitle>
          </DialogHeader>
          <QuoteForm
            hideHeader
            initialQuote={editingQuote || undefined}
            prefill={editingQuote ? undefined : prefill}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>

      <QuoteView
        quote={viewingQuote}
        isOpen={!!viewingQuote}
        onClose={() => setViewingQuote(null)}
        onDownloadPDF={printQuote}
      />
    </div>
  );
}
