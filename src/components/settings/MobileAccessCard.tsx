import { useMemo } from 'react';
import { Smartphone, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

/**
 * Carte "Accès rapide mobile" - affiche l'URL /m/sav avec QR code,
 * boutons Copier et Ouvrir pour l'enregistrer sur un smartphone.
 */
export function MobileAccessCard() {
  const { toast } = useToast();

  const url = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/m/sav`;
  }, []);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Adresse copiée', description: url });
    } catch {
      toast({ title: 'Impossible de copier', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Accès rapide mobile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ouvrez cette adresse sur votre smartphone puis ajoutez-la à l'écran
          d'accueil. Vous pourrez rechercher un SAV, scanner un QR code
          d'étiquette ou lancer un inventaire directement depuis votre mobile.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <img
            src={qrUrl}
            alt="QR code accès mobile"
            className="h-40 w-40 border rounded bg-white p-2"
          />
          <div className="flex-1 w-full space-y-2">
            <Input readOnly value={url} className="font-mono text-sm" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copy}>
                <Copy className="h-4 w-4 mr-2" />
                Copier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
