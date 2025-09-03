import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Clock, MessageSquare, BarChart3, Users, Settings, CheckCircle, ArrowRight, Star, Shield, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LegalDocumentDialog from '@/components/legal/LegalDocumentDialog';
import { LandingCarousel } from '@/components/landing/LandingCarousel';
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  billing_interval: 'month' | 'year';
  sav_limit: number | null;
  sms_limit: number;
  features: string[];
  is_active: boolean;
  contact_only: boolean;
}
export default function Landing() {
  const [showDemo, setShowDemo] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [legalDialog, setLegalDialog] = useState<{
    isOpen: boolean;
    type: 'cgu_content' | 'cgv_content' | 'privacy_policy';
    title: string;
  }>({
    isOpen: false,
    type: 'cgu_content',
    title: ''
  });
  const navigate = useNavigate();
  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);
  const fetchSubscriptionPlans = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('monthly_price');
      if (error) throw error;

      // Transform data to match our interface
      const transformedPlans = (data || []).map(plan => ({
        ...plan,
        description: plan.description || '',
        billing_interval: plan.billing_interval as 'month' | 'year',
        features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : []
      }));
      setSubscriptionPlans(transformedPlans);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      // En cas d'erreur, afficher uniquement les plans configurés dans le super admin
      setSubscriptionPlans([]);
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Smartphone className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Fixway</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/auth')}>
                Connexion
              </Button>
              <Button onClick={() => navigate('/auth')}>
                Essai Gratuit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-800">
              Solution complète de gestion SAV
            </Badge>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Révolutionnez votre <span className="text-blue-600">Service Après-Vente</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Optimisez votre rendement, automatisez la communication client et offrez un suivi en temps réel. 
              La solution SAV nouvelle génération pour les professionnels du high-tech.
            </p>
            <div className="flex justify-center">
              <Button size="lg" className="text-lg px-8" onClick={() => navigate('/auth')}>
                Démarrer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Carousel Section */}
      <LandingCarousel />

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir SAV Pro ?
            </h2>
            <p className="text-lg text-gray-600">
              Des fonctionnalités pensées pour optimiser votre activité
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Zap className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Gestion optimisée</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Suivez tous vos dossiers SAV en temps réel, gérez votre stock de pièces détachées et optimisez vos marges. Que vous facturiez vos Sav ou que ce soit vos propres Sav, à tout moment vous avez une vue sur votre rentabilité !</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Communication automatique</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Rassurez vos clients !
Envoyez automatiquement des SMS ou passez par le fil de discussion pour les tenir informés de l'avancement de leur réparation. Vous pouvez communiquer en temps réel grâce au Qr code que vous leur donnez.
Achetez vos sms selon vos besoins</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Commandes Automatisée</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Gagnez en efficacité grâce au module qui anticipe les commandes en fonction de vos Sav et de vos stocks.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Transformez votre boutique SAV
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Page magasin personnalisée (SAV)</h3>
                    <p className="text-gray-600">Configurez vos horaires, coordonnées</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Notifications automatiques</h3>
                    <p className="text-gray-600">SMS et/ou fils de discussion envoyés automatiquement à chaque étape, ne recevez plus de coups de téléphones intempestifs !</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Gestion des stocks</h3>
                    <p className="text-gray-600">Suivez vos pièces détachées et recevez des alertes de stock faible. Importez Exportez vos stock constrisuez votre base de donnée prix et temps d'intervention. </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Statistiques avancées</h3>
                    <p className="text-gray-600">Analysez vos performances et optimisez votre activité. Mesurez l'efficacité de vos collaborateurs sur les temps de traitement des sav. Vous benéficiez d'un tableau de bord clair et fonctionnel</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Timeline client</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-medium">Appareil reçu</p>
                    <p className="text-xs text-gray-500">Il y a 2 heures</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-medium">Diagnostic en cours</p>
                    <p className="text-xs text-gray-500">En cours</p>
                  </div>
                </div>
                <div className="flex items-center opacity-50">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-medium">Réparation</p>
                    <p className="text-xs text-gray-500">À venir</p>
                  </div>
                </div>
                <div className="flex items-center opacity-50">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-medium">Tests et validation</p>
                    <p className="text-xs text-gray-500">À venir</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tarifs simples et transparents
            </h2>
            <p className="text-lg text-gray-600">
              Commencez gratuitement, évoluez selon vos besoins
            </p>
          </div>

          {loading ? <div className="text-center">
              <div className="animate-pulse">Chargement des tarifs...</div>
            </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {subscriptionPlans.map((plan, index) => <Card key={plan.id} className={index === 1 ? 'border-blue-500 shadow-lg' : ''}>
                  <CardHeader>
                    {index === 1 && <Badge className="mb-2">Populaire</Badge>}
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {plan.monthly_price === 0 ? 'Gratuit' : `${plan.monthly_price}€${plan.billing_interval === 'month' ? '/mois' : '/an'}`}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {plan.description && <p className="text-sm text-gray-600 mb-4">{plan.description}</p>}
                    <ul className="space-y-2 text-sm">
                      {plan.sav_limit && <li>• {plan.sav_limit === 0 ? 'Dossiers SAV illimités' : `Jusqu'à ${plan.sav_limit} dossiers SAV${plan.billing_interval === 'month' ? '/mois' : '/an'}`}</li>}
                      {!plan.sav_limit && <li>• Dossiers SAV illimités</li>}
                      <li>• {plan.sms_limit} SMS inclus</li>
                      {plan.features.map((feature, featureIndex) => <li key={featureIndex}>• {feature}</li>)}
                    </ul>
                     <Button className="w-full mt-4" variant={index === 1 ? 'default' : 'outline'} onClick={() => {
                if ((plan as any).contact_only) {
                  window.location.href = `mailto:contact@fixway.fr?subject=Demande de contact pour le plan ${plan.name}&body=Bonjour,%0D%0A%0D%0AJe souhaite obtenir plus d'informations sur le plan ${plan.name}.%0D%0A%0D%0ACordialement`;
                } else {
                  navigate('/auth');
                }
              }}>
                      {plan.monthly_price === 0 ? 'Commencer gratuitement' : index === 1 ? `Essayer ${plan.name}` : (plan as any).contact_only ? 'Nous contacter' : `Choisir ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>)}
            </div>}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à révolutionner votre SAV ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez les centaines de boutiques qui ont choisi SAV Pro
          </p>
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" onClick={() => navigate('/auth')}>
            Commencer maintenant
          </Button>
        </div>
      </section>

      {/* Footer avec liens légaux */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 SAV Pro. Tous droits réservés.</p>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <button onClick={() => setLegalDialog({
              isOpen: true,
              type: 'cgu_content',
              title: 'Conditions Générales d\'Utilisation'
            })} className="hover:text-white transition-colors">
                Conditions Générales d'Utilisation
              </button>
              <button onClick={() => setLegalDialog({
              isOpen: true,
              type: 'cgv_content',
              title: 'Conditions Générales de Vente'
            })} className="hover:text-white transition-colors">
                Conditions Générales de Vente
              </button>
              <button onClick={() => setLegalDialog({
              isOpen: true,
              type: 'privacy_policy',
              title: 'Politique de Confidentialité'
            })} className="hover:text-white transition-colors">
                Politique de Confidentialité
              </button>
            </div>
            <button onClick={() => navigate('/super-admin')} className="text-xs text-gray-600 hover:text-gray-400 mt-4 opacity-50 hover:opacity-100 transition-opacity">
              Administration
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Document Dialog */}
      <LegalDocumentDialog type={legalDialog.type} title={legalDialog.title} isOpen={legalDialog.isOpen} onClose={() => setLegalDialog(prev => ({
      ...prev,
      isOpen: false
    }))} />
    </div>;
}