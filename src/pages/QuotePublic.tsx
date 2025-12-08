import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, AlertCircle, Check, X, CheckCircle, XCircle, DollarSign, Clock, ShieldOff, Calendar } from 'lucide-react';
import { generateQuotePDF } from '@/utils/pdfGenerator';

interface QuoteData {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: any[];
  device_brand?: string;
  device_model?: string;
}

interface ShopData {
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface ApiResponse {
  quote: QuoteData;
  shop: ShopData;
  isExpired: boolean;
}

type RejectionReason = 'too_expensive' | 'too_slow' | 'no_trust' | 'postponed';

const REJECTION_REASONS = [
  {
    key: 'too_expensive' as RejectionReason,
    emoji: '💰',
    label: 'Trop cher',
    description: 'Le prix dépasse mon budget',
    icon: DollarSign
  },
  {
    key: 'too_slow' as RejectionReason,
    emoji: '⏱️',
    label: 'Trop lent',
    description: 'Le délai ne me convient pas',
    icon: Clock
  },
  {
    key: 'no_trust' as RejectionReason,
    emoji: '😕',
    label: 'Pas confiance',
    description: 'J\'ai des doutes sur la prestation',
    icon: ShieldOff
  },
  {
    key: 'postponed' as RejectionReason,
    emoji: '🔄',
    label: 'Je préfère reporter',
    description: 'Ce n\'est pas le bon moment',
    icon: Calendar
  }
];

export default function QuotePublic() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showRejectionReasons, setShowRejectionReasons] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!id) {
        setError('ID de devis manquant');
        setLoading(false);
        return;
      }

      try {
        const supabaseUrl = 'https://jljkrthymaqxkebosqko.supabase.co';
        const response = await fetch(`${supabaseUrl}/functions/v1/quote-public/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la récupération du devis');
        }

        const apiData: ApiResponse = await response.json();
        setData(apiData);
      } catch (error) {
        console.error('Erreur:', error);
        setError(error instanceof Error ? error.message : 'Erreur lors du chargement du devis');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [id]);

  const handleDownloadPDF = () => {
    if (data) {
      const shopForPDF = {
        name: data.shop.name,
        logo_url: data.shop.logo_url,
        address: data.shop.address,
        phone: data.shop.phone,
        email: data.shop.email
      };
      generateQuotePDF(data.quote as any, shopForPDF as any);
    }
  };

  const handleStatusUpdate = async (newStatus: 'accepted' | 'sms_accepted', rejectionReason?: RejectionReason) => {
    if (!id || !data) return;

    setUpdating(true);
    try {
      const supabaseUrl = 'https://jljkrthymaqxkebosqko.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/quote-public/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      setData(prev => prev ? {
        ...prev,
        quote: { ...prev.quote, status: newStatus }
      } : null);

      setShowConfirmation({
        type: 'success',
        title: 'Devis accepté',
        message: 'Votre devis a été accepté avec succès. Nous vous contacterons prochainement pour la suite.'
      });
    } catch (error) {
      console.error('Erreur:', error);
      setShowConfirmation({
        type: 'error',
        title: 'Erreur de mise à jour',
        message: 'Une erreur est survenue lors de la mise à jour du statut. Veuillez réessayer ou contacter le magasin.'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async (reason: RejectionReason) => {
    if (!id || !data) return;

    setUpdating(true);
    setShowRejectionReasons(false);
    try {
      const supabaseUrl = 'https://jljkrthymaqxkebosqko.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/quote-public/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          rejection_reason: reason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      setData(prev => prev ? {
        ...prev,
        quote: { ...prev.quote, status: 'rejected' }
      } : null);

      setShowConfirmation({
        type: 'success',
        title: 'Devis refusé',
        message: 'Votre retour a été enregistré. Merci pour votre réponse, nous espérons vous revoir bientôt.'
      });
    } catch (error) {
      console.error('Erreur:', error);
      setShowConfirmation({
        type: 'error',
        title: 'Erreur de mise à jour',
        message: 'Une erreur est survenue lors de la mise à jour du statut. Veuillez réessayer ou contacter le magasin.'
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'sent': return 'Envoyé';
      case 'viewed': return 'Consulté';
      case 'accepted': return 'Accepté';
      case 'sms_accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'outline';
      case 'viewed': return 'secondary';
      case 'accepted': case 'sms_accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm sm:text-base">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600 text-lg sm:text-xl">Devis non accessible</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm sm:text-base">
              {error || 'Ce devis n\'existe pas ou n\'est plus disponible.'}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Les devis sont valides pendant 1 mois après leur création.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quote, shop, isExpired } = data;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header avec logo boutique - Responsive */}
        {shop && (
          <div className="text-center mb-6 sm:mb-8">
            {shop.logo_url && (
              <img 
                src={shop.logo_url} 
                alt={shop.name} 
                className="h-12 sm:h-16 mx-auto mb-3 sm:mb-4 object-contain"
              />
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-primary">{shop.name}</h1>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg sm:text-xl">Devis {quote.quote_number}</CardTitle>
              <div className="flex items-center gap-2">
                {isExpired ? (
                  <Badge variant="destructive">Devis expiré</Badge>
                ) : (
                  <Badge variant={getStatusColor(quote.status)}>
                    {getStatusText(quote.status)}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 p-4 sm:p-6 pt-0">
            {isExpired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 font-medium text-sm sm:text-base">Ce devis a expiré</p>
                <p className="text-red-500 text-xs sm:text-sm">Ce devis n'est plus valide (plus d'un mois)</p>
              </div>
            )}

            {/* Informations client */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3">Informations client</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-medium text-xs sm:text-sm text-muted-foreground">Nom:</span>
                  <p className="text-sm">{quote.customer_name}</p>
                </div>
                {quote.customer_email && (
                  <div>
                    <span className="font-medium text-xs sm:text-sm text-muted-foreground">Email:</span>
                    <p className="text-sm break-all">{quote.customer_email}</p>
                  </div>
                )}
                {quote.customer_phone && (
                  <div>
                    <span className="font-medium text-xs sm:text-sm text-muted-foreground">Téléphone:</span>
                    <p className="text-sm">{quote.customer_phone}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-xs sm:text-sm text-muted-foreground">Date de création:</span>
                  <p className="text-sm">{new Date(quote.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Articles - Vue mobile : cartes empilées */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3">Articles</h3>
              
              {/* Vue mobile : cartes empilées */}
              <div className="block sm:hidden space-y-3">
                {quote.items.map((item, index) => {
                  const originalPrice = item.unit_public_price;
                  const finalPrice = item.total_price / item.quantity;
                  const hasDiscount = item.discount && (item.discount.type === 'percentage' || item.discount.type === 'fixed');
                  
                  return (
                    <div key={index} className="bg-muted/30 border rounded-lg p-4 space-y-3">
                      <div>
                        <div className="font-medium">{item.part_name}</div>
                        {item.part_reference && (
                          <div className="text-xs text-muted-foreground">Réf: {item.part_reference}</div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Quantité</span>
                        <span>{item.quantity}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Prix unitaire</span>
                        {hasDiscount ? (
                          <div className="text-right">
                            <div className="line-through text-muted-foreground text-xs">{originalPrice.toFixed(2)}€</div>
                            <div className="font-medium">{finalPrice.toFixed(2)}€</div>
                          </div>
                        ) : (
                          <span>{originalPrice.toFixed(2)}€</span>
                        )}
                      </div>
                      {hasDiscount && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Remise</span>
                          <span className="text-red-600 font-medium">
                            {item.discount?.type === 'percentage' 
                              ? `-${item.discount.value}%`
                              : `-${(originalPrice - finalPrice).toFixed(2)}€`
                            }
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">Total</span>
                        <span className="font-bold text-primary">{item.total_price.toFixed(2)}€</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vue desktop : tableau classique */}
              <div className="hidden sm:block border rounded-lg overflow-hidden">
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
              </div>
              
              {/* Total */}
              <div className="bg-muted/30 border rounded-lg sm:rounded-t-none p-4 mt-0 sm:mt-0 sm:border-t-0">
                <div className="flex justify-end">
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-bold">
                      Total: {quote.total_amount.toFixed(2)}€
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions - Responsive */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4">
              {!isExpired && (
                <>
                  <Button 
                    onClick={handleDownloadPDF} 
                    variant="outline"
                    className="w-full sm:w-auto py-3 text-base"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Télécharger le PDF
                  </Button>
                  
                  {quote.status !== 'accepted' && quote.status !== 'rejected' && quote.status !== 'sms_accepted' && (
                    <>
                      <Button 
                        onClick={() => handleStatusUpdate('sms_accepted')}
                        disabled={updating}
                        className="w-full sm:w-auto py-3 text-base bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-5 w-5 mr-2" />
                        {updating ? 'Mise à jour...' : 'Valider le devis'}
                      </Button>
                      
                      <Button 
                        onClick={() => setShowRejectionReasons(true)}
                        disabled={updating}
                        variant="destructive"
                        className="w-full sm:w-auto py-3 text-base"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Refuser
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer boutique */}
            {shop && (
              <div className="text-center text-xs sm:text-sm text-muted-foreground border-t pt-4">
                {shop.address && <p>{shop.address}</p>}
                {shop.phone && <p>Tél: {shop.phone}</p>}
                {shop.email && <p>Email: {shop.email}</p>}
                <p className="mt-2 text-xs">
                  <strong>Validité:</strong> Ce devis est valable 1 mois à compter de sa date de création.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog raisons de refus */}
        <Dialog open={showRejectionReasons} onOpenChange={setShowRejectionReasons}>
          <DialogContent className="sm:max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-center text-lg sm:text-xl">
                Pourquoi refusez-vous ce devis ?
              </DialogTitle>
              <DialogDescription className="text-center text-sm">
                Votre retour nous aide à améliorer nos services
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 gap-3 py-4">
              {REJECTION_REASONS.map((reason) => (
                <Button 
                  key={reason.key}
                  variant="outline" 
                  className="h-auto min-h-[4rem] text-left justify-start px-4 py-3"
                  onClick={() => handleReject(reason.key)}
                  disabled={updating}
                >
                  <span className="text-2xl mr-3 shrink-0">{reason.emoji}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-sm sm:text-base">{reason.label}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{reason.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation */}
        <Dialog open={!!showConfirmation} onOpenChange={() => setShowConfirmation(null)}>
          <DialogContent className="sm:max-w-md mx-4">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4">
                {showConfirmation?.type === 'success' ? (
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500" />
                ) : (
                  <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500" />
                )}
              </div>
              <DialogTitle className={`text-lg sm:text-xl ${showConfirmation?.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {showConfirmation?.title}
              </DialogTitle>
              <DialogDescription className="text-center text-sm sm:text-base mt-4">
                {showConfirmation?.message}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-6">
              <Button 
                onClick={() => setShowConfirmation(null)}
                className={`w-full sm:w-auto ${showConfirmation?.type === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                {showConfirmation?.type === 'success' ? 'Parfait !' : 'Fermer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}