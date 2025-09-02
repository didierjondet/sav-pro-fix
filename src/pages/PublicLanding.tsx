import { useState, useEffect } from 'react';
import { Smartphone, Clock, MessageSquare, BarChart3, Users, Settings, CheckCircle, ArrowRight, Star, Shield, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function PublicLanding() {
  console.log('PublicLanding rendering - completely outside auth context');
  console.log('Current URL:', window.location.href);
  
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
  
  useEffect(() => {
    // Check if user is already authenticated and redirect
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('User is authenticated, redirecting to dashboard');
        window.location.href = '/dashboard';
      }
    };
    
    checkAuth();
    fetchSubscriptionPlans();
  }, []);

  const fetchSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price');

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
  
  const handleAuthClick = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Smartphone className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Fixway</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={handleAuthClick}
              >
                Connexion
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={handleAuthClick}
              >
                Essai Gratuit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Solution complète de gestion SAV
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Révolutionnez votre <span className="text-blue-600">Service Après-Vente</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Optimisez votre rendement, automatisez la communication client et offrez un suivi en temps réel. 
              La solution SAV nouvelle génération pour les professionnels du high-tech.
            </p>
            <div className="flex justify-center">
              <button 
                className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-lg flex items-center justify-center"
                onClick={handleAuthClick}
              >
                Démarrer maintenant <ArrowRight className="ml-2 h-5 w-5" />
              </button>
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
              Tout ce dont vous avez besoin pour gérer votre SAV
            </h2>
            <p className="text-xl text-gray-600">
              Une solution complète qui s'adapte à votre façon de travailler
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestion des réparations</h3>
              <p className="text-gray-600">Suivez vos réparations de A à Z avec un système intuitif</p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Communication client</h3>
              <p className="text-gray-600">SMS automatiques et suivi en temps réel pour vos clients</p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Statistiques avancées</h3>
              <p className="text-gray-600">Analysez vos performances et optimisez votre rentabilité</p>
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

          {loading ? (
            <div className="text-center">
              <div className="animate-pulse">Chargement des tarifs...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {subscriptionPlans.map((plan, index) => (
                <Card key={plan.id} className={index === 1 ? 'border-blue-500 shadow-lg' : ''}>
                  <CardHeader>
                    {index === 1 && <Badge className="mb-2">Populaire</Badge>}
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {plan.monthly_price === 0 ? 'Gratuit' : 
                        `${plan.monthly_price}€${plan.billing_interval === 'month' ? '/mois' : '/an'}`
                      }
                    </div>
                  </CardHeader>
                  <CardContent>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                    )}
                    <ul className="space-y-2 text-sm">
                      {plan.sav_limit && (
                        <li>• {plan.sav_limit === 0 ? 'Dossiers SAV illimités' : `Jusqu'à ${plan.sav_limit} dossiers SAV${plan.billing_interval === 'month' ? '/mois' : '/an'}`}</li>
                      )}
                      {!plan.sav_limit && <li>• Dossiers SAV illimités</li>}
                      <li>• {plan.sms_limit} SMS inclus</li>
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex}>• {feature}</li>
                      ))}
                    </ul>
                     <button 
                      className={`w-full mt-4 px-4 py-2 rounded-md ${
                        index === 1 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if ((plan as any).contact_only) {
                          window.location.href = `mailto:contact@fixway.fr?subject=Demande de contact pour le plan ${plan.name}&body=Bonjour,%0D%0A%0D%0AJe souhaite obtenir plus d'informations sur le plan ${plan.name}.%0D%0A%0D%0ACordialement`;
                        } else {
                          handleAuthClick();
                        }
                      }}
                    >
                      {plan.monthly_price === 0 ? 'Commencer gratuitement' : 
                        index === 1 ? `Essayer ${plan.name}` : 
                        (plan as any).contact_only ? 'Nous contacter' : `Choisir ${plan.name}`
                      }
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à révolutionner votre SAV ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez les centaines de boutiques qui ont choisi FixWay
          </p>
          <button 
            className="px-8 py-3 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-lg font-semibold"
            onClick={handleAuthClick}
          >
            Commencer maintenant
          </button>
        </div>
      </section>

      {/* Footer avec liens légaux */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 FixWay. Tous droits réservés.</p>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <button 
                onClick={() => setLegalDialog({
                  isOpen: true,
                  type: 'cgu_content',
                  title: 'Conditions Générales d\'Utilisation'
                })}
                className="hover:text-white transition-colors"
              >
                Conditions Générales d'Utilisation
              </button>
              <button 
                onClick={() => setLegalDialog({
                  isOpen: true,
                  type: 'cgv_content',
                  title: 'Conditions Générales de Vente'
                })}
                className="hover:text-white transition-colors"
              >
                Conditions Générales de Vente
              </button>
              <button 
                onClick={() => setLegalDialog({
                  isOpen: true,
                  type: 'privacy_policy',
                  title: 'Politique de Confidentialité'
                })}
                className="hover:text-white transition-colors"
              >
                Politique de Confidentialité
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Document Dialog */}
      <LegalDocumentDialog
        type={legalDialog.type}
        title={legalDialog.title}
        isOpen={legalDialog.isOpen}
        onClose={() => setLegalDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}