import { useState } from 'react';
import { SAVForm } from '@/components/sav/SAVForm';

export default function NewSAV() {
  const handleSuccess = () => {
    window.location.href = '/sav';
  };

  return (
    <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Nouveau dossier SAV</h1>
                <p className="text-muted-foreground">Créez un nouveau dossier de service après-vente</p>
              </div>

              <SAVForm onSuccess={handleSuccess} />
            </div>
          </main>
  );
}