import { Check, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

interface PricingSectionProps {
  plans: SubscriptionPlan[];
  loading: boolean;
  onAuthClick: () => void;
}

export function PricingSection({ plans, loading, onAuthClick }: PricingSectionProps) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tarifs <span className="text-blue-600">simples et transparents</span>
          </h2>
          <p className="text-xl text-gray-600">
            Commencez gratuitement, évoluez selon vos besoins
          </p>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="animate-pulse text-gray-500">Chargement des tarifs...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const isPopular = index === 1;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                    isPopular 
                      ? 'border-2 border-blue-500 shadow-xl scale-105' 
                      : 'border border-gray-200 shadow-lg'
                  }`}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-2 text-sm font-semibold flex items-center justify-center gap-2">
                      <Star className="h-4 w-4 fill-white" />
                      Le plus populaire
                    </div>
                  )}
                  
                  <CardHeader className={isPopular ? 'pt-14' : ''}>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-5xl font-black text-gray-900">
                        {plan.monthly_price === 0 ? 'Gratuit' : `${plan.monthly_price}€`}
                      </span>
                      {plan.monthly_price > 0 && (
                        <span className="text-gray-500 ml-2">
                          /{plan.billing_interval === 'month' ? 'mois' : 'an'}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {plan.description && (
                      <p className="text-gray-600 mb-6">{plan.description}</p>
                    )}
                    
                    <ul className="space-y-4 mb-8">
                      {/* SAV limit */}
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span className="text-gray-700">
                          {plan.sav_limit === null || plan.sav_limit === 0 
                            ? 'Dossiers SAV illimités' 
                            : `Jusqu'à ${plan.sav_limit} dossiers SAV/${plan.billing_interval === 'month' ? 'mois' : 'an'}`
                          }
                        </span>
                      </li>
                      
                      {/* SMS limit */}
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span className="text-gray-700">{plan.sms_limit} SMS inclus</span>
                      </li>
                      
                      {/* Features */}
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-green-600" />
                          </div>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full py-6 text-lg font-semibold ${
                        isPopular 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                          : ''
                      }`}
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => {
                        if (plan.contact_only) {
                          window.location.href = `mailto:contact@fixway.fr?subject=Demande de contact pour le plan ${plan.name}&body=Bonjour,%0D%0A%0D%0AJe souhaite obtenir plus d'informations sur le plan ${plan.name}.%0D%0A%0D%0ACordialement`;
                        } else {
                          onAuthClick();
                        }
                      }}
                    >
                      {plan.monthly_price === 0 
                        ? 'Commencer gratuitement' 
                        : plan.contact_only 
                          ? 'Nous contacter' 
                          : `Choisir ${plan.name}`
                      }
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
