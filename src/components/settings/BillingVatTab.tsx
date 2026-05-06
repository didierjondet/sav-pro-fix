import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBillingConfig, type BillingConfig } from '@/hooks/useBillingConfig';
import { Receipt, Wrench } from 'lucide-react';

export function BillingVatTab() {
  const { config, save, isSaving, isLoading } = useBillingConfig();
  const [form, setForm] = useState<BillingConfig>(config);

  useEffect(() => { setForm(config); }, [config.shop_id, isLoading]);

  const set = <K extends keyof BillingConfig>(k: K, v: BillingConfig[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Régime de TVA
          </CardTitle>
          <CardDescription>
            Définit comment la TVA est calculée sur vos devis, SAV et factures.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={form.vat_regime}
            onValueChange={(v) => set('vat_regime', v as any)}
            className="space-y-2"
          >
            <label className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-accent">
              <RadioGroupItem value="none" id="r-none" className="mt-1" />
              <div>
                <div className="font-medium">Auto-entrepreneur</div>
                <div className="text-sm text-muted-foreground">TVA non applicable, art. 293 B du CGI.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-accent">
              <RadioGroupItem value="standard" id="r-std" className="mt-1" />
              <div>
                <div className="font-medium">TVA classique</div>
                <div className="text-sm text-muted-foreground">Taux paramétrable sur pièces et main d'œuvre.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-accent">
              <RadioGroupItem value="margin" id="r-margin" className="mt-1" />
              <div>
                <div className="font-medium">TVA sur marge</div>
                <div className="text-sm text-muted-foreground">TVA appliquée uniquement sur la marge des pièces.</div>
              </div>
            </label>
          </RadioGroup>

          {form.vat_regime !== 'none' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <Label>Taux TVA pièces (%)</Label>
                <Input type="number" min={0} step={0.1} value={form.vat_rate_parts}
                  onChange={(e) => set('vat_rate_parts', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Taux TVA main d'œuvre (%)</Label>
                <Input type="number" min={0} step={0.1} value={form.vat_rate_labor}
                  onChange={(e) => set('vat_rate_labor', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Prix saisis</Label>
                <Select value={form.prices_include_vat ? 'ttc' : 'ht'}
                  onValueChange={(v) => set('prices_include_vat', v === 'ttc')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ttc">TTC (par défaut)</SelectItem>
                    <SelectItem value="ht">HT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Facturation main d'œuvre
          </CardTitle>
          <CardDescription>
            Activez pour ajouter automatiquement une ligne de main d'œuvre à vos pièces sur les devis et factures.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-md border">
            <div>
              <div className="font-medium">Activer la facturation main d'œuvre</div>
              <div className="text-sm text-muted-foreground">Si désactivé, aucun calcul de MO n'est effectué.</div>
            </div>
            <Switch checked={form.labor_billing_enabled}
              onCheckedChange={(v) => set('labor_billing_enabled', v)} />
          </div>

          {form.labor_billing_enabled && (
            <>
              <div>
                <Label>Mode de calcul</Label>
                <Select value={form.labor_mode}
                  onValueChange={(v) => set('labor_mode', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Forfait par pièce (saisi sur la fiche pièce)</SelectItem>
                    <SelectItem value="hourly">Taux horaire (calcul auto via le temps de la pièce)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.labor_mode === 'hourly' && (
                  <div>
                    <Label>Taux horaire (€/h HT)</Label>
                    <Input type="number" min={0} step={0.5} value={form.labor_hourly_rate}
                      onChange={(e) => set('labor_hourly_rate', parseFloat(e.target.value) || 0)} />
                  </div>
                )}
                <div>
                  <Label>Libellé sur les documents</Label>
                  <Input value={form.labor_label}
                    onChange={(e) => set('labor_label', e.target.value)}
                    placeholder="Main d'œuvre" />
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                {form.labor_mode === 'hourly'
                  ? "Le coût MO sera calculé via le champ 'Temps' de chaque pièce × le taux horaire. Vous pouvez surcharger via le champ 'Coût MO' sur la fiche pièce."
                  : "Renseignez le 'Coût MO' sur chaque fiche pièce. Si une pièce n'a pas de coût MO, aucune ligne ne sera ajoutée."}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save(form)} disabled={isSaving}>
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
