import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SAVForm } from '@/components/sav/SAVForm';

export default function NewSAV() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSuccess = () => {
    window.location.href = '/sav';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Nouveau dossier SAV</h1>
                <p className="text-muted-foreground">Créez un nouveau dossier de service après-vente</p>
              </div>

              <SAVForm onSuccess={handleSuccess} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}