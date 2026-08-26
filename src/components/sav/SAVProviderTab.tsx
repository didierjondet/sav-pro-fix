import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, ArrowRightLeft, CheckCircle2, Trash2, Truck, Clock } from 'lucide-react';
import { useSAVProviders, useSAVCaseAssignments } from '@/hooks/useSAVProviders';

interface Props {
  savCaseId: string;
  shopId: string;
}

export function SAVProviderTab({ savCaseId, shopId }: Props) {
  const { providers } = useSAVProviders();
  const { assignments, current, assign, markReturned, removeAssignment } = useSAVCaseAssignments(savCaseId);
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const activeProviders = providers.filter((p) => p.is_active);
  const providerById = (id: string) => providers.find((p) => p.id === id);

  const submit = async () => {
    if (!providerId) return;
    setSaving(true);
    try {
      await assign({
        shop_id: shopId,
        provider_id: providerId,
        reason: reason || undefined,
        external_ref: externalRef || undefined,
        cost: cost ? parseFloat(cost) : null,
        notes: notes || undefined,
      });
      setOpen(false);
      setProviderId(''); setReason(''); setExternalRef(''); setCost(''); setNotes('');
    } finally {
      setSaving(false);
    }
  };

  const currentProvider = current ? providerById(current.provider_id) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" /> Prestataire technique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {current && currentProvider ? (
            <div
              className="rounded-lg border p-4 space-y-3"
              style={{ borderColor: currentProvider.color, backgroundColor: `${currentProvider.color}12` }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" style={{ color: currentProvider.color }} />
                    <span className="font-semibold">{currentProvider.name}</span>
                    <Badge variant="outline" style={{ borderColor: currentProvider.color, color: currentProvider.color }}>
                      En cours
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Envoyé le {new Date(current.sent_at).toLocaleDateString('fr-FR')}
                    {currentProvider.avg_delay_days ? ` · délai moyen ${currentProvider.avg_delay_days} j` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Changer
                  </Button>
                  <Button size="sm" onClick={() => markReturned(current.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Retour reçu
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeAssignment(current.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                {current.reason && <div><span className="text-muted-foreground">Motif : </span>{current.reason}</div>}
                {current.external_ref && <div><span className="text-muted-foreground">Réf. prestataire : </span>{current.external_ref}</div>}
                {current.cost != null && <div><span className="text-muted-foreground">Coût : </span>{current.cost} €</div>}
                {(currentProvider.phone || currentProvider.email) && (
                  <div className="text-muted-foreground">
                    {currentProvider.phone} {currentProvider.email}
                  </div>
                )}
              </div>
              {current.notes && <p className="text-sm whitespace-pre-wrap">{current.notes}</p>}
            </div>
          ) : (
            <div className="text-center py-6">
              <Wrench className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-3">
                Ce dossier est traité en interne. Vous pouvez le confier à un prestataire technique.
              </p>
              <Button onClick={() => setOpen(true)} disabled={activeProviders.length === 0}>
                <Truck className="h-4 w-4 mr-2" /> Confier à un prestataire
              </Button>
              {activeProviders.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Aucun prestataire configuré (Paramètres → Prestataires techniques).
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Information interne : le client ne voit jamais le prestataire ni le type de SAV.
          </p>
        </CardContent>
      </Card>

      {assignments.filter((a) => a.returned_at).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> Historique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignments.filter((a) => a.returned_at).map((a) => {
              const p = providerById(a.provider_id);
              return (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div>
                    <span className="font-medium">{p?.name || 'Prestataire'}</span>
                    <span className="text-muted-foreground">
                      {' '}· {new Date(a.sent_at).toLocaleDateString('fr-FR')} → {new Date(a.returned_at!).toLocaleDateString('fr-FR')}
                    </span>
                    {a.reason && <div className="text-xs text-muted-foreground">{a.reason}</div>}
                  </div>
                  {a.cost != null && <span className="text-muted-foreground">{a.cost} €</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{current ? 'Changer de prestataire' : 'Confier à un prestataire'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Prestataire *</Label>
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {activeProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motif</Label>
              <Input placeholder="Micro-soudure, carte mère…" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Référence prestataire</Label>
                <Input value={externalRef} onChange={(e) => setExternalRef(e.target.value)} />
              </div>
              <div>
                <Label>Coût (€)</Label>
                <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={!providerId || saving}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
