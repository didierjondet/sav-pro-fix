import { Smartphone } from 'lucide-react';

interface LandingFooterProps {
  onLegalClick: (type: 'cgu_content' | 'cgv_content' | 'privacy_policy', title: string) => void;
  onAdminClick?: () => void;
}

export function LandingFooter({ onLegalClick, onAdminClick }: LandingFooterProps) {
  return (
    <footer className="bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo and tagline */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white">
              Fixway<span className="text-blue-400">Pro</span>
            </h2>
          </div>
          <p className="text-gray-400 text-center max-w-md">
            La solution SAV nouvelle génération pour les professionnels de la réparation
          </p>
        </div>
        
        {/* Legal links */}
        <div className="flex flex-wrap justify-center gap-8 mb-12 text-sm">
          <button 
            onClick={() => onLegalClick('cgu_content', "Conditions Générales d'Utilisation")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Conditions Générales d'Utilisation
          </button>
          <button 
            onClick={() => onLegalClick('cgv_content', "Conditions Générales de Vente")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Conditions Générales de Vente
          </button>
          <button 
            onClick={() => onLegalClick('privacy_policy', "Politique de Confidentialité")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Politique de Confidentialité
          </button>
        </div>
        
        {/* Copyright */}
        <div className="text-center border-t border-gray-800 pt-8">
          <p className="text-gray-500">
            &copy; {new Date().getFullYear()} FixwayPro. Tous droits réservés.
          </p>
          {onAdminClick && (
            <button 
              onClick={onAdminClick}
              className="text-xs text-gray-600 hover:text-gray-400 mt-4 opacity-50 hover:opacity-100 transition-opacity"
            >
              Administration
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
