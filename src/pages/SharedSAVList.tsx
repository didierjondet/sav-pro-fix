import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, Handshake, Smartphone, MessagesSquare, Info } from 'lucide-react';
import { useSharedSAVs, SharedSAVRow } from '@/hooks/useSharedSAVs';
import { ShareThread } from '@/components/partners/ShareThread';
import { getDeviceColorInfo } from '@/lib/deviceColors';

export default function SharedSAVList() {
  const { data: shares = [], isLoading } = useSharedSAVs();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SharedSAVRow | null>(null);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? shares.filter((s) =>
        [s.case_number, s.owner_shop_name, s.device_brand, s.device_model, s.device_imei, s.problem_description]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      )
    : shares;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>SAV partenaires | Fixway</title>
        <meta name="description" content="Dossiers SAV confiés à votre atelier par d'autres magasins Fixway." />
      </Helmet>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="h-6 w-6" /> SAV partenaires
          </h1>
          <p className="text-sm text-muted-foreground">
            Dossiers que d'autres magasins Fixway vous ont confiés
          </p>
        </div>
        <Badge variant="secondary">{filtered.length} dossier{filtered.length > 1 ? 's' : ''}</Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Dossier, magasin, appareil, IMEI…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <Info className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun dossier partagé pour l'instant. Communiquez votre code partenaire à vos donneurs d'ordre
              depuis Réglages → Ma fiche partenaire.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <Card key={s.share_id} className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelected(s)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2">
                    <span className="font-mono">{s.case_number}</span>
                    <Badge variant="outline">{s.owner_shop_name}</Badge>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge>{s.status}</Badge>
                    {s.unread_count > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <MessagesSquare className="h-3 w-3" /> {s.unread_count}
                      </Badge>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span>{[s.device_brand, s.device_model].filter(Boolean).join(' ') || 'Appareil non précisé'}</span>
                  {s.device_color && (
                    <span
                      className="inline-block w-3 h-3 rounded-full border"
                      style={{ backgroundColor: getDeviceColorInfo(s.device_color)?.hsl }}
                      title={getDeviceColorInfo(s.device_color)?.label}
                    />
                  )}
                  {s.device_imei && <span className="text-xs text-muted-foreground">IMEI {s.device_imei}</span>}
                </div>
                {s.problem_description && (
                  <p className="text-muted-foreground line-clamp-2">{s.problem_description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Confié le {new Date(s.sent_at).toLocaleDateString('fr-FR')}
                  {s.external_ref ? ` · Réf. ${s.external_ref}` : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{selected.case_number}</span>
                  <Badge variant="outline">{selected.owner_shop_name}</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Appareil</p>
                    <p>{[selected.device_brand, selected.device_model].filter(Boolean).join(' ') || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">IMEI / n° série</p>
                    <p>{selected.device_imei || selected.sku || '—'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Panne déclarée</p>
                    <p className="whitespace-pre-wrap">{selected.problem_description || '—'}</p>
                  </div>
                  {selected.reason && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Motif de l'envoi</p>
                      <p>{selected.reason}</p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground border rounded-md p-2 bg-muted/20">
                  Les coordonnées du client final restent la propriété du magasin donneur d'ordre et ne sont pas partagées.
                </p>

                <ShareThread shareId={selected.share_id} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
