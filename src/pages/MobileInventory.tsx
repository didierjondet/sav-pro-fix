import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarcodeScannerDialog } from '@/components/inventory/BarcodeScannerDialog';
import { ArrowLeft, Camera, Loader2, Play, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Page mobile dédiée : lancer / reprendre un inventaire et bipper les pièces.
 * URL courte /m/inventaire.
 */
export default function MobileInventory() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const {
    sessions,
    currentSession,
    selectedSessionId,
    setSelectedSessionId,
    items,
    loading,
    createSession,
    bulkScanCodes,
    completionRate,
    canEditSession,
  } = useInventory();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lastScanLabel, setLastScanLabel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const openSessions = useMemo(
    () => sessions.filter((s: any) => s.status === 'in_progress' || s.status === 'paused'),
    [sessions],
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items as any[];
    if (!q) return list.slice(0, 30);
    return list
      .filter(
        (i) =>
          i.part_name?.toLowerCase().includes(q) ||
          i.part_sku?.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [items, query]);

  if (!authLoading && !user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent('/m/inventaire')}`} replace />;
  }

  const handleScan = async (raw: string) => {
    const code = raw.trim();
    if (!code || !selectedSessionId) return;
    try {
      const summary = await bulkScanCodes(selectedSessionId, [code]);
      if (summary.matchedCodes.length > 0) {
        const item = (items as any[]).find(
          (i) => (i.part_sku || '').toUpperCase() === code.toUpperCase(),
        );
        setLastScanLabel(item ? `${item.part_name} (${code})` : code);
      } else {
        setLastScanLabel(null);
        toast({
          title: 'Code inconnu',
          description: `${code} ne correspond à aucune pièce de cet inventaire.`,
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Scan impossible', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const name = `Inventaire mobile ${new Date().toLocaleDateString('fr-FR')}`;
      await createSession({ name, mode: 'scan' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-3 py-2 flex items-center gap-2">
        <Link to="/m/sav" aria-label="Retour">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-base font-semibold flex-1 truncate">Inventaire mobile</h1>
      </header>

      <div className="p-3 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
          </div>
        )}

        {!loading && openSessions.length === 0 && (
          <Button size="lg" className="w-full h-14 text-base" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
            Lancer un inventaire
          </Button>
        )}

        {openSessions.length > 0 && (
          <div className="space-y-2">
            {openSessions.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`w-full text-left border rounded-lg p-3 transition-colors ${
                  s.id === selectedSessionId ? 'border-primary bg-primary/5' : 'bg-card'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{s.name}</span>
                  <Badge variant="outline">{s.status === 'paused' ? 'En pause' : 'En cours'}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}

        {currentSession && (
          <>
            <div className="space-y-1">
              <Progress value={completionRate} />
              <p className="text-xs text-muted-foreground">{Math.round(completionRate)} % comptés</p>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-base"
              onClick={() => setScannerOpen(true)}
              disabled={!canEditSession}
            >
              <Camera className="h-5 w-5 mr-2" />
              Bipper une pièce
            </Button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-12 text-base"
                placeholder="Rechercher une pièce…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                inputMode="search"
              />
            </div>
          </>
        )}
      </div>

      {currentSession && (
        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-2">
          {filteredItems.map((i: any) => (
            <div key={i.id} className="border rounded-lg p-3 bg-card">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-sm truncate">{i.part_name}</span>
                <Badge variant="outline">
                  {i.counted_quantity ?? '—'} / {i.expected_quantity}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">{i.part_sku || '—'}</div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucune pièce trouvée.</p>
          )}
        </div>
      )}

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
        title="Bipper une pièce"
        subtitle={currentSession?.name}
        lastScanLabel={lastScanLabel}
      />
    </div>
  );
}
