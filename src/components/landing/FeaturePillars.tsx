import { Package, PhoneOff, AlertTriangle, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const pillars = [
  {
    icon: Package,
    title: "Maîtrise du stock",
    description: "Connaissez enfin la valeur exacte de votre inventaire",
    features: [
      "Valeur totale en euros, en temps réel",
      "Alertes de stock faible automatiques",
      "Import/export Excel en un clic"
    ],
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    textColor: "text-blue-600"
  },
  {
    icon: PhoneOff,
    title: "Zéro appel client",
    description: "Vos clients suivent leur réparation eux-mêmes",
    features: [
      "QR code de suivi unique",
      "SMS automatiques à chaque étape",
      "Fil de discussion intégré"
    ],
    color: "bg-green-500",
    lightColor: "bg-green-50",
    textColor: "text-green-600"
  },
  {
    icon: AlertTriangle,
    title: "Détection des retards",
    description: "Anticipez les problèmes avant qu'ils n'explosent",
    features: [
      "Alertes proactives configurables",
      "Tableau de bord des délais",
      "Performance par technicien"
    ],
    color: "bg-amber-500",
    lightColor: "bg-amber-50",
    textColor: "text-amber-600"
  },
  {
    icon: Star,
    title: "Satisfaction mesurée",
    description: "Transformez vos clients en ambassadeurs",
    features: [
      "Enquêtes post-réparation automatiques",
      "Note moyenne visible en temps réel",
      "Prévention des avis négatifs"
    ],
    color: "bg-purple-500",
    lightColor: "bg-purple-50",
    textColor: "text-purple-600"
  },
  {
    icon: TrendingUp,
    title: "Rentabilité visible",
    description: "Chaque réparation devient une source de profit mesurable",
    features: [
      "Marge par SAV affichée instantanément",
      "CA en temps réel par période",
      "Statistiques avancées et exports"
    ],
    color: "bg-indigo-500",
    lightColor: "bg-indigo-50",
    textColor: "text-indigo-600"
  }
];

export function FeaturePillars() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Les <span className="text-blue-600">5 piliers</span> de votre rentabilité
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Chaque fonctionnalité a été pensée pour résoudre un problème concret 
            des gérants de boutiques de réparation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <Card 
              key={index}
              className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${index === 4 ? 'md:col-span-2 lg:col-span-1' : ''}`}
            >
              {/* Top gradient bar */}
              <div className={`h-2 ${pillar.color}`} />
              
              <CardContent className="p-8">
                {/* Icon */}
                <div className={`w-16 h-16 ${pillar.lightColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <pillar.icon className={`h-8 w-8 ${pillar.textColor}`} />
                </div>
                
                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {pillar.title}
                </h3>
                
                {/* Description */}
                <p className="text-gray-600 mb-6">
                  {pillar.description}
                </p>
                
                {/* Features list */}
                <ul className="space-y-3">
                  {pillar.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full ${pillar.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
