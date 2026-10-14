import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SAVForm } from '@/components/sav/SAVForm';
import { NewSAVModeDialog } from '@/components/sav/NewSAVModeDialog';

export default function NewSAV() {
  const location = useLocation();
  const navigate = useNavigate();
  const [chooseMode, setChooseMode] = useState((location.state as any)?.mode !== 'computer');

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
            <NewSAVModeDialog
              open={chooseMode}
              onOpenChange={(v) => { if (!v) setChooseMode(false); }}
              onComputer={() => { setChooseMode(false); navigate('/sav/new', { replace: true, state: { mode: 'computer' } }); }}
            />
          </main>
  );
}
