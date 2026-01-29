import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingHeaderProps {
  onAuthClick: () => void;
}

export function LandingHeader({ onAuthClick }: LandingHeaderProps) {
  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Fixway<span className="text-blue-600">Pro</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-900 hidden sm:flex"
              onClick={onAuthClick}
            >
              Connexion
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
              onClick={onAuthClick}
            >
              Essai Gratuit
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
