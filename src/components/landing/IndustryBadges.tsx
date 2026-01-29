import { Smartphone, Monitor, Gamepad2, Watch, Tv, Wrench, Store, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const industries = [
  { icon: Smartphone, label: "Téléphonie mobile", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { icon: Monitor, label: "Informatique / PC", color: "bg-green-100 text-green-700 border-green-200" },
  { icon: Gamepad2, label: "Consoles de jeux", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { icon: Watch, label: "Bijouterie / Horlogerie", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { icon: Tv, label: "Électroménager", color: "bg-red-100 text-red-700 border-red-200" },
  { icon: Wrench, label: "Petits équipements", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { icon: Store, label: "Boutiques achat-vente", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { icon: Building2, label: "SAV interne entreprise", color: "bg-cyan-100 text-cyan-700 border-cyan-200" }
];

export function IndustryBadges() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Pour <span className="text-blue-600">tous les métiers</span> de la réparation
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            FixwayPro s'adapte à votre activité. Personnalisez vos types de SAV, 
            vos statuts et vos flux de travail.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          {industries.map((industry, index) => (
            <div
              key={index}
              className={`
                flex items-center gap-3 px-6 py-4 rounded-full border-2 
                ${industry.color}
                transform hover:scale-105 hover:shadow-lg transition-all duration-300
                cursor-default
              `}
            >
              <industry.icon className="h-6 w-6" />
              <span className="font-semibold text-base">{industry.label}</span>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-10">
          <p className="text-gray-500 flex items-center justify-center gap-2">
            <span className="inline-block w-12 h-px bg-gray-300" />
            Et bien plus encore...
            <span className="inline-block w-12 h-px bg-gray-300" />
          </p>
        </div>
      </div>
    </section>
  );
}
