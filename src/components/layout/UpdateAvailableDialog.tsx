import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useAppVersion } from '@/hooks/useAppVersion';

export default function UpdateAvailableDialog() {
  const { updateAvailable, reload } = useAppVersion();
  const [open, setOpen] = useState(false);
  const postponed = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (updateAvailable && !postponed.current) {
      setOpen(true);
    }
  }, [updateAvailable]);

  // Si l'utilisateur a différé, on recharge au prochain changement de page
  const firstRoute = useRef(location.pathname);
  useEffect(() => {
    if (updateAvailable && postponed.current && location.pathname !== firstRoute.current) {
      reload();
    }
  }, [location.pathname, updateAvailable, reload]);

  const handlePostpone = () => {
    postponed.current = true;
    firstRoute.current = location.pathname;
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handlePostpone())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Une nouvelle version de Fixway est disponible
          </DialogTitle>
          <DialogDescription className="text-center">
            Des améliorations et corrections viennent d'être mises en ligne.
            Rechargez pour en profiter immédiatement.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={handlePostpone}>
            Plus tard
          </Button>
          <Button onClick={reload}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recharger maintenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
