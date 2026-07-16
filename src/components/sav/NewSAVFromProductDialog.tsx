import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useAllCustomers } from '@/hooks/useAllCustomers';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';
import type { PreviousSAVCase } from '@/hooks/useProductHistory';

interface Props {
  sourceCase: PreviousSAVCase | null;
  trackedProductId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ClientMode = 'same' | 'other' | 'none';

export function NewSAVFromProductDialog({ sourceCase, trackedProductId, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shop } = useShop();
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const { getAllStatuses } = useShopSAVStatuses();
  const { createCase } = useSAVCases();
  const { customers } = useAllCustomers();

  const types = getAllTypes();
  const statuses = getAllStatuses();

  const [savType, setSavType] = useState<string>(sourceCase?.sav_type || types[0]?.value || 'internal');
  const sourceCustomerId = (sourceCase as any)?.customer_id || null;
  const initialClientMode: ClientMode = sourceCase?.customer ? 'same' : 'none';
  const [clientMode, setClientMode] = useState<ClientMode>(initialClientMode);
  const [otherCustomerId, setOtherCustomerId] = useState<string>('');
  const [problem, setProblem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const typeInfo = useMemo(() => getTypeInfo(savType), [savType, getTypeInfo]);

  // Reset when source changes / opened
  const handleOpenChange = (v: boolean) => {
    if (v && sourceCase) {
      setSavType(sourceCase.sav_type || types[0]?.value || 'internal');
      setClientMode(sourceCase.customer ? 'same' : 'none');
      setOtherCustomerId('');
      setProblem('');
    }
    onOpenChange(v);
  };

  const handleSubmit = async () => {
    if (!sourceCase || !shop?.id) return;
    if (!problem.trim()) {
      toast({ title: 'Panne requise', description: 'Décrivez la panne avant de créer le nouveau SAV.', variant: 'destructive' });
      return;
    }

    let customerId: string | null = null;
    if (typeInfo.show_customer_info) {
      if (clientMode === 'same') customerId = sourceCustomerId;
      else if (clientMode === 'other') customerId = otherCustomerId || null;
      if (clientMode !== 'none' && !customerId) {
        toast({ title: 'Client requis', description: 'Sélectionnez un client ou choisissez "Sans client".', variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const defaultStatus = statuses[0]?.value || 'pending';
      const { data: newCase, error } = await createCase({
        sav_type: savType,
        customer_id: customerId,
        device_brand: sourceCase.device_brand || null,
        device_model: sourceCase.device_model || null,
        device_imei: sourceCase.device_imei || null,
        sku: sourceCase.sku || null,
        problem_description: problem.trim(),
        total_time_minutes: 0,
        total_cost: 0,
        deposit_amount: 0,
        status: defaultStatus,
        shop_id: shop.id,
        attachments: [],
        tracked_product_id: trackedProductId || (sourceCase as any).tracked_product_id || null,
      });
      if (error) throw error;
      onOpenChange(false);
      if (newCase?.id) navigate(`/sav/${newCase.id}`);
    } catch (e: any) {
      // toast déjà émis par createCase
    } finally {
      setSubmitting(false);
    }
  };

  if (!sourceCase) return null;

  const customerFullName = sourceCase.customer
    ? `${sourceCase.customer.first_name || ''} ${sourceCase.customer.last_name || ''}`.trim()
    : '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Nouveau SAV pour ce produit
          </DialogTitle>
          <DialogDescription>
            L'appareil est repris automatiquement. Confirmez le type, le client et la panne.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Récap appareil */}
          <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-1">
            <div className="flex flex-wrap gap-2">
              {sourceCase.device_brand && <Badge variant="outline">{sourceCase.device_brand} {sourceCase.device_model}</Badge>}
              {sourceCase.device_imei && <Badge variant="outline" className="font-mono">IMEI {sourceCase.device_imei}</Badge>}
              {sourceCase.sku && <Badge variant="outline">SKU {sourceCase.sku}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Dossier source&nbsp;: <span className="font-mono">{sourceCase.case_number}</span>
              {sourceCase.problem_description && <> — dernière panne&nbsp;: <em>{sourceCase.problem_description}</em></>}
            </p>
          </div>

          {/* Type de SAV */}
          <div className="space-y-1.5">
            <Label>Type de SAV</Label>
            <Select value={savType} onValueChange={setSavType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          {typeInfo.show_customer_info && (
            <div className="space-y-2">
              <Label>Client</Label>
              <RadioGroup value={clientMode} onValueChange={(v) => setClientMode(v as ClientMode)} className="space-y-1">
                {sourceCustomerId && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="same" id="cm-same" />
                    <Label htmlFor="cm-same" className="font-normal cursor-pointer">
                      Même client {customerFullName && <span className="text-muted-foreground">— {customerFullName}</span>}
                    </Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="other" id="cm-other" />
                  <Label htmlFor="cm-other" className="font-normal cursor-pointer">Autre client</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="none" id="cm-none" />
                  <Label htmlFor="cm-none" className="font-normal cursor-pointer">Sans client</Label>
                </div>
              </RadioGroup>

              {clientMode === 'other' && (
                <Select value={otherCustomerId} onValueChange={setOtherCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un client…" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}{c.phone ? ` · ${c.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Panne */}
          <div className="space-y-1.5">
            <Label htmlFor="new-sav-problem">Description de la panne <span className="text-destructive">*</span></Label>
            <Textarea
              id="new-sav-problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={4}
              placeholder="Décrivez la nouvelle panne rencontrée…"
            />
            {sourceCase.problem_description && (
              <p className="text-[11px] text-muted-foreground">
                Ancienne panne (pour rappel)&nbsp;: <em>{sourceCase.problem_description}</em>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création…</> : 'Créer le SAV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
