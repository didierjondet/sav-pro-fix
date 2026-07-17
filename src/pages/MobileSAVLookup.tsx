import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSAVCases } from '@/hooks/useSAVCases';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarcodeScannerDialog } from '@/components/inventory/BarcodeScannerDialog';
import { Camera, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Page mobile dédiée : recherche + scan QR/code-barres d'un SAV.
 * URL courte /m/sav à enregistrer sur l'écran d'accueil.
 */
export default function MobileSAVLookup() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: cases = [], isLoading } = useSAVCases() as any;

  const [query, setQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  if (!authLoading && !user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent('/m/sav')}`} replace />;
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases.slice(0, 20);
    return cases.filter((c: any) => {
      const cust = c.customer
        ? `${c.customer.first_name || ''} ${c.customer.last_name || ''}`.toLowerCase()
        : '';
      return (
        c.case_number?.toLowerCase().includes(q) ||
        cust.includes(q) ||
        c.device_brand?.toLowerCase().includes(q) ||
        c.device_model?.toLowerCase().includes(q) ||
        c.device_imei?.toLowerCase().includes(q) ||
        c.sku?.toLowerCase().includes(q)
      );
    }).slice(0, 50);
  }, [cases, query]);

  /** Interprète la valeur scannée et redirige. */
  const handleScan = (raw: string) => {
    const value = raw.trim();
    if (!value) return;

    // 1) URL de suivi (avec ou sans schéma), on récupère le slug
    const slugMatch = value.match(/\/track\/([A-Za-z0-9_-]+)/);
    if (slugMatch) {
      const slug = slugMatch[1];
      const found = cases.find((c: any) => c.tracking_slug === slug);
      if (found) {
        setScannerOpen(false);
        navigate(`/sav/${found.id}`);
        return;
      }
      toast({
        title: 'SAV introuvable',
        description: 'Ce QR code ne correspond à aucun SAV de votre boutique.',
        variant: 'destructive',
      });
      return;
    }

    // 2) Numéro de dossier brut (code-barres 128 imprimé sur l'étiquette)
    const byNumber = cases.find(
      (c: any) => c.case_number?.toLowerCase() === value.toLowerCase(),
    );
    if (byNumber) {
      setScannerOpen(false);
      navigate(`/sav/${byNumber.id}`);
      return;
    }

    // 3) Slug brut
    const bySlug = cases.find((c: any) => c.tracking_slug === value);
    if (bySlug) {
      setScannerOpen(false);
      navigate(`/sav/${bySlug.id}`);
      return;
    }

    toast({
      title: 'Code non reconnu',
      description: value.slice(0, 40),
      variant: 'destructive',
    });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'ready':
      case 'delivered':
        return 'bg-green-500/10 text-green-700 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      case 'pending':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-3 py-2 flex items-center gap-2">
        <Link to="/dashboard" aria-label="Retour">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-base font-semibold flex-1 truncate">Recherche SAV</h1>
      </header>

      <div className="p-3 space-y-3">
        <Button
          size="lg"
          className="w-full h-14 text-base"
          onClick={() => setScannerOpen(true)}
        >
          <Camera className="h-5 w-5 mr-2" />
          Scanner un QR code
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-12 text-base"
            placeholder="Nº dossier, client, IMEI, modèle…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={false}
            inputMode="search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
          </div>
        )}
        {!isLoading && results.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">
            {query
              ? 'Aucun SAV ne correspond à votre recherche.'
              : 'Scannez un QR code ou saisissez une recherche.'}
          </div>
        )}
        {results.map((c: any) => {
          const custName = c.customer
            ? `${c.customer.first_name || ''} ${c.customer.last_name || ''}`.trim()
            : '—';
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/sav/${c.id}`)}
              className="w-full text-left border rounded-lg p-3 bg-card hover:bg-accent/40 active:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-sm">{c.case_number}</span>
                <Badge variant="outline" className={statusColor(c.status)}>
                  {c.status}
                </Badge>
              </div>
              <div className="text-sm mt-1 truncate">{custName}</div>
              <div className="text-xs text-muted-foreground truncate">
                {[c.device_brand, c.device_model].filter(Boolean).join(' ') || '—'}
                {c.device_imei ? ` · IMEI ${c.device_imei}` : ''}
              </div>
            </button>
          );
        })}
      </div>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
        title="Scanner un SAV"
        subtitle="QR code de suivi ou code-barres d'étiquette"
      />
    </div>
  );
}
