import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useInvoiceConfig } from '@/hooks/useInvoiceConfig';
import { Upload, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function InvoiceConfigManager() {
  const { config, loading, updateConfig, uploadLogo } = useInvoiceConfig();
  const [uploading, setUploading] = useState(false);

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (!config) {
    return <div className="text-center py-8">Aucune configuration trouvée</div>;
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const logoUrl = await uploadLogo(file);
    if (logoUrl) {
      await updateConfig({ header_logo_url: logoUrl });
    }
    setUploading(false);
  };

  const handleSave = async (field: string, value: string | number) => {
    await updateConfig({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration de l'entreprise</CardTitle>
          <CardDescription>
            Informations légales qui apparaîtront sur les factures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nom de l'entreprise</Label>
              <Input
                id="company_name"
                defaultValue={config.company_name}
                onBlur={(e) => handleSave('company_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_legal_form">Forme juridique</Label>
              <Input
                id="company_legal_form"
                defaultValue={config.company_legal_form}
                onBlur={(e) => handleSave('company_legal_form', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_name">Nom du service</Label>
              <Input
                id="service_name"
                defaultValue={config.service_name}
                onBlur={(e) => handleSave('service_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_siret">N° SIRET</Label>
              <Input
                id="company_siret"
                defaultValue={config.company_siret || ''}
                onBlur={(e) => handleSave('company_siret', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_vat_number">N° TVA Intracommunautaire</Label>
              <Input
                id="company_vat_number"
                defaultValue={config.company_vat_number || ''}
                onBlur={(e) => handleSave('company_vat_number', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vat_rate">Taux de TVA (%)</Label>
              <Input
                id="vat_rate"
                type="number"
                step="0.1"
                defaultValue={config.vat_rate}
                onBlur={(e) => handleSave('vat_rate', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_address">Adresse</Label>
            <Input
              id="company_address"
              defaultValue={config.company_address || ''}
              onBlur={(e) => handleSave('company_address', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_postal_code">Code postal</Label>
              <Input
                id="company_postal_code"
                defaultValue={config.company_postal_code || ''}
                onBlur={(e) => handleSave('company_postal_code', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_city">Ville</Label>
              <Input
                id="company_city"
                defaultValue={config.company_city || ''}
                onBlur={(e) => handleSave('company_city', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_email">Email</Label>
              <Input
                id="company_email"
                type="email"
                defaultValue={config.company_email || ''}
                onBlur={(e) => handleSave('company_email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_phone">Téléphone</Label>
              <Input
                id="company_phone"
                defaultValue={config.company_phone || ''}
                onBlur={(e) => handleSave('company_phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_website">Site web</Label>
              <Input
                id="company_website"
                defaultValue={config.company_website || ''}
                onBlur={(e) => handleSave('company_website', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Design de la facture</CardTitle>
          <CardDescription>
            Personnalisez l'apparence de vos factures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Logo de l'entreprise</Label>
            <div className="flex items-center gap-4">
              {config.header_logo_url && (
                <img
                  src={config.header_logo_url}
                  alt="Logo"
                  className="h-16 w-auto object-contain border rounded"
                />
              )}
              <div className="flex-1">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="header_text">Texte du header (optionnel)</Label>
            <Textarea
              id="header_text"
              rows={3}
              defaultValue={config.header_text || ''}
              onBlur={(e) => handleSave('header_text', e.target.value)}
              placeholder="Texte personnalisé à afficher dans l'en-tête de la facture"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer_text">Texte du footer</Label>
            <Textarea
              id="footer_text"
              rows={3}
              defaultValue={config.footer_text || ''}
              onBlur={(e) => handleSave('footer_text', e.target.value)}
              placeholder="Mentions légales, RCS, capital social, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legal_text">Texte légal de la facture</Label>
            <Textarea
              id="legal_text"
              rows={3}
              defaultValue={config.legal_text || ''}
              onBlur={(e) => handleSave('legal_text', e.target.value)}
              placeholder="Conditions de paiement, CGV, etc."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          Prévisualiser
        </Button>
        <Button onClick={() => toast.success('Configuration sauvegardée')}>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
