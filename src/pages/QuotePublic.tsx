import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle } from 'lucide-react';
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

export default function QuotePublic() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!id) {
        setError('ID de devis manquant');
        setLoading(false);
        return;
      }

      try {
        // Appeler l'edge function publique
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
      // Créer un objet shop compatible
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Devis non accessible</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {error || 'Ce devis n\'existe pas ou n\'est plus disponible.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Les devis sont valides pendant 1 mois après leur création.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quote, shop, isExpired } = data;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header avec logo boutique */}
        {shop && (
          <div className="text-center mb-8">
            {shop.logo_url && (
              <img 
                src={shop.logo_url} 
                alt={shop.name} 
                className="h-16 mx-auto mb-4 object-contain"
              />
            )}
            <h1 className="text-2xl font-bold text-primary">{shop.name}</h1>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Devis {quote.quote_number}</CardTitle>
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
          
          <CardContent className="space-y-6">
            {isExpired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 font-medium">Ce devis a expiré</p>
                <p className="text-red-500 text-sm">Ce devis n'est plus valide (plus d'un mois)</p>
              </div>
            )}

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

            {/* Actions */}
            <div className="flex justify-center">
              {!isExpired && (
                <Button onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le PDF
                </Button>
              )}
            </div>

            {/* Footer boutique */}
            {shop && (
              <div className="text-center text-sm text-muted-foreground border-t pt-4">
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
      </div>
    </div>
  );
}