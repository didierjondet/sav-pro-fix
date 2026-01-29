import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HeroSectionProps {
  onAuthClick: () => void;
}

export function HeroSection({ onAuthClick }: HeroSectionProps) {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            🚀 La solution SAV nouvelle génération
          </Badge>
          
          {/* Main headline - shock value for decision makers */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
            Votre stock de pièces détachées<br />
            <span className="text-amber-400">vous coûte une fortune...</span><br />
            <span className="text-white/80 text-3xl sm:text-4xl lg:text-5xl">sans que vous le sachiez.</span>
          </h1>
          
          {/* Sub-headline */}
          <p className="text-xl sm:text-2xl text-blue-100 mb-10 max-w-4xl mx-auto leading-relaxed">
            FixwayPro vous donne enfin la <strong className="text-white">visibilité sur votre rentabilité réelle</strong> : 
            valeur du stock, marges par réparation, et clients satisfaits.
          </p>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Button 
              size="lg" 
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              onClick={onAuthClick}
            >
              Essayer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm text-lg px-8 py-6"
              onClick={onAuthClick}
            >
              <Play className="mr-2 h-5 w-5" />
              Voir la démo en 2 min
            </Button>
          </div>
          
          {/* Animated KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 transform hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl font-black text-amber-400 mb-2">-80%</div>
              <div className="text-sm text-blue-100">d'appels clients</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 transform hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl font-black text-green-400 mb-2">+35%</div>
              <div className="text-sm text-blue-100">de marge visible</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 transform hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl font-black text-white mb-2">2 min</div>
              <div className="text-sm text-blue-100">pour créer un SAV</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 transform hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl font-black text-purple-300 mb-2">100%</div>
              <div className="text-sm text-blue-100">configurable</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
