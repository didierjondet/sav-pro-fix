import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import {
  Globe,
  Eye,
  ExternalLink
} from 'lucide-react';

interface WebsiteSettings {
  website_enabled: boolean;
  website_title: string;
  website_description: string;
}

export default function ShopWebsiteManager() {
  const { shop, updateShop } = useShop();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>({
    website_enabled: false,
    website_title: '',
    website_description: ''
  });

  useEffect(() => {
    if (shop) {
      setWebsiteSettings({
        website_enabled: shop.website_enabled || false,
        website_title: shop.website_title || shop.name,
        website_description: shop.website_description || ''
      });
      setLoading(false);
    }
  }, [shop]);

  const updateWebsiteSettings = async () => {
    if (!shop) return;
    
    try {
      await updateShop(websiteSettings);
      toast({
        title: "Succès",
        description: "Paramètres du site web mis à jour",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getWebsiteUrl = () => {
    if (!shop?.slug) return '';
    return `https://www.fixway.fr/${shop.slug}`;
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Paramètres du site web */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuration du Site Web
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="website-enabled">Activer le site web</Label>
              <p className="text-sm text-muted-foreground">
                Rendre votre site web public avec votre URL personnalisée
              </p>
            </div>
            <Switch
              id="website-enabled"
              checked={websiteSettings.website_enabled}
              onCheckedChange={(checked) => 
                setWebsiteSettings(prev => ({ ...prev, website_enabled: checked }))
              }
            />
          </div>

          {websiteSettings.website_enabled && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="font-medium">URL de votre site:</span>
              </div>
              <p className="text-sm font-mono bg-background p-2 rounded border">
                {getWebsiteUrl()}
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href={getWebsiteUrl()} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le site
                </a>
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="website-title">Titre du site</Label>
            <Input
              id="website-title"
              value={websiteSettings.website_title}
              onChange={(e) => 
                setWebsiteSettings(prev => ({ ...prev, website_title: e.target.value }))
              }
              placeholder="Ex: Réparation Express"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-description">Description</Label>
            <Textarea
              id="website-description"
              value={websiteSettings.website_description}
              onChange={(e) => 
                setWebsiteSettings(prev => ({ ...prev, website_description: e.target.value }))
              }
              placeholder="Décrivez votre magasin et vos services..."
              rows={3}
            />
          </div>

          <Button onClick={updateWebsiteSettings}>
            Sauvegarder les paramètres
          </Button>
        </CardContent>
      </Card>

      {/* Gestion des services - Temporairement désactivé */}
      <Card>
        <CardHeader>
          <CardTitle>Services et Tarifs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            La gestion des services sera disponible prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}