import { X, Check, HelpCircle, Euro, Phone, Clock, Star, TrendingUp } from 'lucide-react';

const comparisons = [
  {
    icon: Euro,
    without: "Stock inconnu en valeur",
    with: "Valeur du stock en temps réel"
  },
  {
    icon: Phone,
    without: "Clients qui appellent sans cesse",
    with: "Suivi autonome par QR code"
  },
  {
    icon: Clock,
    without: "Retards non détectés",
    with: "Alertes automatiques de retard"
  },
  {
    icon: Star,
    without: "Satisfaction client invisible",
    with: "Enquêtes et notes centralisées"
  },
  {
    icon: TrendingUp,
    without: "Marges floues",
    with: "Rentabilité par SAV affichée"
  }
];

export function ComparisonTable() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Vos problèmes, <span className="text-blue-600">nos solutions</span>
          </h2>
          <p className="text-xl text-gray-600">
            Découvrez comment FixwayPro transforme votre quotidien
          </p>
        </div>

        <div className="relative">
          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-red-50 rounded-2xl p-6 text-center border-2 border-red-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <HelpCircle className="h-6 w-6 text-red-500" />
                <h3 className="text-xl font-bold text-red-700">Sans FixwayPro</h3>
              </div>
              <p className="text-red-600 text-sm">Gestion manuelle et stress quotidien</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-6 text-center border-2 border-green-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Check className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-bold text-green-700">Avec FixwayPro</h3>
              </div>
              <p className="text-green-600 text-sm">Tout est sous contrôle</p>
            </div>
          </div>

          {/* Comparison rows */}
          <div className="space-y-4">
            {comparisons.map((item, index) => (
              <div 
                key={index}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 group"
              >
                <div className="relative bg-white rounded-xl p-5 border border-red-100 shadow-sm flex items-center gap-4 group-hover:border-red-300 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700 font-medium">{item.without}</span>
                  </div>
                </div>
                
                <div className="relative bg-white rounded-xl p-5 border border-green-100 shadow-sm flex items-center gap-4 group-hover:border-green-300 group-hover:shadow-lg transition-all">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-green-600" />
                    <span className="text-gray-900 font-semibold">{item.with}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
