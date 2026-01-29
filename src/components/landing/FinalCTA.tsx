import { ArrowRight, Shield, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinalCTAProps {
  onAuthClick: () => void;
}

export function FinalCTA({ onAuthClick }: FinalCTAProps) {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
      </div>
      
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main message */}
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
          Arrêtez de piloter<br />
          <span className="text-amber-400">à l'aveugle.</span>
        </h2>
        
        <p className="text-xl sm:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto">
          Rejoignez les centaines de gérants qui ont repris le contrôle 
          de leur rentabilité avec FixwayPro.
        </p>
        
        {/* CTA Button */}
        <Button 
          size="lg"
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xl px-12 py-7 shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 hover:scale-105 mb-12"
          onClick={onAuthClick}
        >
          Testez gratuitement pendant 14 jours
          <ArrowRight className="ml-3 h-6 w-6" />
        </Button>
        
        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-8 text-blue-100">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-400" />
            <span className="text-sm">Données sécurisées</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <span className="text-sm">Configuration en 5 min</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-300" />
            <span className="text-sm">Sans engagement</span>
          </div>
        </div>
      </div>
    </section>
  );
}
