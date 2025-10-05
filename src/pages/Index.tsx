import { useState } from 'react';
import { SAVDashboard } from '@/components/sav/SAVDashboard';
import { SAVForm } from '@/components/sav/SAVForm';
const Index = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'new-sav'>('dashboard');
  const renderContent = () => {
    switch (currentView) {
      case 'new-sav':
        return <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Nouveau dossier SAV</h2>
            </div>
            <SAVForm />
          </div>;
      default:
        return <div className="space-y-6">
            
            <SAVDashboard />
          </div>;
    }
  };
  return renderContent();
};
export default Index;