import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock,
  Euro,
  Phone,
  Mail,
  MapPin,
  Globe,
  Star
} from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string;
  website_enabled: boolean;
  website_title: string;
  website_description: string;
  slug: string;
}

interface ShopService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
  visible: boolean;
  display_order: number;
}

export default function ShopWebsite() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<ShopService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchShopData();
    }
  }, [slug]);

  const fetchShopData = async () => {
    try {
      // Récupérer les données du magasin
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .eq('website_enabled', true)
        .maybeSingle();

      if (shopError) throw shopError;
      if (!shopData) {
        setError('Magasin non trouvé ou site web désactivé');
        return;
      }

      setShop(shopData);

      // Récupérer les services du magasin
      const { data: servicesData, error: servicesError } = await supabase
        .from('shop_services')
        .select('*')
        .eq('shop_id', shopData.id)
        .eq('visible', true)
        .order('display_order', { ascending: true });

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

    } catch (error: any) {
      console.error('Error fetching shop data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{error || 'Magasin non trouvé'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Grouper les services par catégorie
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.category || 'Autres';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, ShopService[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {shop.logo_url ? (
                <img 
                  src={shop.logo_url} 
                  alt={`Logo ${shop.name}`}
                  className="h-12 w-12 object-contain rounded-lg"
                />
              ) : (
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {shop.website_title || shop.name}
                </h1>
                <p className="text-sm text-muted-foreground">Service de réparation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">4.9/5</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Description */}
        {shop.website_description && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {shop.website_description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        {Object.keys(servicesByCategory).length > 0 && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-6">Nos Services</h2>
            <div className="space-y-8">
              {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                <div key={category}>
                  <h3 className="text-xl font-semibold mb-4 text-primary">{category}</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryServices.map((service) => (
                      <Card key={service.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span className="text-lg">{service.name}</span>
                            <Badge variant="secondary" className="font-bold">
                              {formatPrice(service.price)}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {service.description && (
                            <p className="text-muted-foreground mb-3">
                              {service.description}
                            </p>
                          )}
                          {service.duration_minutes && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Durée: {formatDuration(service.duration_minutes)}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Nous Contacter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shop.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Téléphone</p>
                    <a href={`tel:${shop.phone}`} className="text-primary hover:underline">
                      {shop.phone}
                    </a>
                  </div>
                </div>
              )}
              
              {shop.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a href={`mailto:${shop.email}`} className="text-primary hover:underline">
                      {shop.email}
                    </a>
                  </div>
                </div>
              )}
              
              {shop.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Adresse</p>
                    <p className="text-muted-foreground">{shop.address}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <Button className="w-full md:w-auto" size="lg">
                <Phone className="h-4 w-4 mr-2" />
                Prendre Rendez-vous
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="font-semibold">{shop.name}</p>
              {shop.address && (
                <p className="text-sm text-muted-foreground">{shop.address}</p>
              )}
              {shop.phone && (
                <p className="text-sm text-muted-foreground">{shop.phone}</p>
              )}
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">
                Propulsé par <span className="font-medium text-primary">fixway.fr</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}