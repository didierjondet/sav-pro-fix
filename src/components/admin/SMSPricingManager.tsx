import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSMSPricing } from '@/hooks/useSMSPricing';
import { MessageSquare, Euro, Save } from 'lucide-react';

export function SMSPricingManager() {
  const { pricing, loading, updatePricing } = useSMSPricing();
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  console.log('SMSPricingManager render:', { pricing, loading });

  const handlePriceChange = (tier: string, value: string) => {
    setEditingPrices(prev => ({
      ...prev,
      [tier]: value
    }));
  };

  const handleSavePrice = async (tier: string) => {
    const newPrice = parseFloat(editingPrices[tier] || '0');
    if (isNaN(newPrice) || newPrice <= 0) {
      return;
    }

    setSaving(tier);
    try {
      await updatePricing(tier, newPrice);
      setEditingPrices(prev => {
        const updated = { ...prev };
        delete updated[tier];
        return updated;
      });
    } finally {
      setSaving(null);
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'free': return 'Gratuit';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Enterprise';
      default: return tier;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'secondary';
      case 'premium': return 'default';
      case 'enterprise': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Gestion des Prix SMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement des prix SMS...</div>
        </CardContent>
      </Card>
    );
  }

  if (!pricing || pricing.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Gestion des Prix SMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">
            Erreur : Impossible de charger les prix SMS. Vérifiez les politiques RLS.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Gestion des Prix SMS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Configurez le coût par SMS pour chaque plan d'abonnement. Ces prix seront utilisés lors de l'achat de crédits SMS par les magasins.
        </div>

        <div className="grid gap-4">
          {pricing.map((tierPricing) => (
            <div key={tierPricing.subscription_tier} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={getTierColor(tierPricing.subscription_tier) as any}>
                    {getTierLabel(tierPricing.subscription_tier)}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Dernière modification : {new Date(tierPricing.updated_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Euro className="h-4 w-4" />
                  {tierPricing.price_per_sms.toFixed(4)} / SMS
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor={`price-${tierPricing.subscription_tier}`}>
                    Prix par SMS (en euros)
                  </Label>
                  <Input
                    id={`price-${tierPricing.subscription_tier}`}
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder={tierPricing.price_per_sms.toString()}
                    value={editingPrices[tierPricing.subscription_tier] || ''}
                    onChange={(e) => handlePriceChange(tierPricing.subscription_tier, e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => handleSavePrice(tierPricing.subscription_tier)}
                  disabled={
                    !editingPrices[tierPricing.subscription_tier] || 
                    saving === tierPricing.subscription_tier
                  }
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving === tierPricing.subscription_tier ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Exemples de prix pour 100 SMS : {(tierPricing.price_per_sms * 100).toFixed(2)}€
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Informations importantes :</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Les prix sont en euros par SMS</li>
            <li>• Les prix s'appliquent immédiatement à tous les nouveaux achats</li>
            <li>• Les magasins verront ces prix lors de l'achat de crédits SMS</li>
            <li>• Les prix peuvent avoir jusqu'à 4 décimales pour plus de précision</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}