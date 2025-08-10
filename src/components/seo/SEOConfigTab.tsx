import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useSEOConfig } from '@/hooks/useSEOConfig';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Globe, 
  Share2, 
  BarChart3, 
  FileText, 
  Image as ImageIcon,
  Settings,
  MapPin,
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SEOConfigTab() {
  const { seoConfig, loading, updateSEOConfig } = useSEOConfig();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    // Meta tags de base
    default_title: seoConfig?.default_title || '',
    default_description: seoConfig?.default_description || '',
    default_keywords: seoConfig?.default_keywords?.join(', ') || '',
    
    // Open Graph
    og_title: seoConfig?.og_title || '',
    og_description: seoConfig?.og_description || '',
    og_image_url: seoConfig?.og_image_url || '',
    og_type: seoConfig?.og_type || 'website',
    
    // Twitter Cards
    twitter_card_type: seoConfig?.twitter_card_type || 'summary_large_image',
    twitter_title: seoConfig?.twitter_title || '',
    twitter_description: seoConfig?.twitter_description || '',
    twitter_image_url: seoConfig?.twitter_image_url || '',
    
    // Structured data
    business_type: seoConfig?.business_type || 'LocalBusiness',
    price_range: seoConfig?.price_range || '€€',
    accepts_reservations: seoConfig?.accepts_reservations ?? true,
    
    // Analytics et verification
    google_analytics_id: seoConfig?.google_analytics_id || '',
    google_tag_manager_id: seoConfig?.google_tag_manager_id || '',
    google_site_verification: seoConfig?.google_site_verification || '',
    bing_site_verification: seoConfig?.bing_site_verification || '',
    facebook_domain_verification: seoConfig?.facebook_domain_verification || '',
    
    // Robots et sitemap
    robots_txt: seoConfig?.robots_txt || 'User-agent: *\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://fixway.fr/sitemap.xml',
    sitemap_enabled: seoConfig?.sitemap_enabled ?? true,
    
    // URL canoniques
    canonical_domain: seoConfig?.canonical_domain || 'fixway.fr',
    force_https: seoConfig?.force_https ?? true,
    
    // Images par défaut
    default_alt_text_pattern: seoConfig?.default_alt_text_pattern || '{shop_name} - Service de réparation',
    favicon_url: seoConfig?.favicon_url || '',
    
    // Performance
    lazy_loading_enabled: seoConfig?.lazy_loading_enabled ?? true,
    webp_images_enabled: seoConfig?.webp_images_enabled ?? true,
    
    // Données locales
    service_areas: seoConfig?.service_areas?.join(', ') || '',
    languages_supported: seoConfig?.languages_supported?.join(', ') || 'fr'
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSEOConfig({
        ...formData,
        default_keywords: formData.default_keywords ? formData.default_keywords.split(',').map(k => k.trim()) : [],
        service_areas: formData.service_areas ? formData.service_areas.split(',').map(a => a.trim()) : [],
        languages_supported: formData.languages_supported ? formData.languages_supported.split(',').map(l => l.trim()) : ['fr']
      });
    } catch (error) {
      console.error('Error saving SEO config:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement de la configuration SEO...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Meta tags de base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Meta Tags de Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="default-title">Titre par défaut du site</Label>
            <Input
              id="default-title"
              value={formData.default_title}
              onChange={(e) => setFormData({ ...formData, default_title: e.target.value })}
              placeholder="Fixway - Service de réparation professionnel"
              maxLength={60}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Recommandé: 50-60 caractères
            </p>
          </div>
          
          <div>
            <Label htmlFor="default-description">Description par défaut</Label>
            <Textarea
              id="default-description"
              value={formData.default_description}
              onChange={(e) => setFormData({ ...formData, default_description: e.target.value })}
              placeholder="Service de réparation professionnel. Devis gratuit, réparations rapides et de qualité."
              maxLength={160}
              rows={3}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Recommandé: 150-160 caractères
            </p>
          </div>
          
          <div>
            <Label htmlFor="default-keywords">Mots-clés par défaut</Label>
            <Input
              id="default-keywords"
              value={formData.default_keywords}
              onChange={(e) => setFormData({ ...formData, default_keywords: e.target.value })}
              placeholder="réparation, service, dépannage, professionnel"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Séparez les mots-clés par des virgules
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Open Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Open Graph (Réseaux Sociaux)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="og-title">Titre Open Graph</Label>
            <Input
              id="og-title"
              value={formData.og_title}
              onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
              placeholder="Fixway - Service de réparation professionnel"
            />
          </div>
          
          <div>
            <Label htmlFor="og-description">Description Open Graph</Label>
            <Textarea
              id="og-description"
              value={formData.og_description}
              onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
              placeholder="Service de réparation professionnel. Devis gratuit, réparations rapides et de qualité."
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="og-image">Image Open Graph (URL)</Label>
            <Input
              id="og-image"
              value={formData.og_image_url}
              onChange={(e) => setFormData({ ...formData, og_image_url: e.target.value })}
              placeholder="https://fixway.fr/images/og-image.jpg"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Recommandé: 1200x630 pixels
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Analytics et Vérification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics et Vérification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="google-analytics">Google Analytics ID</Label>
            <Input
              id="google-analytics"
              value={formData.google_analytics_id}
              onChange={(e) => setFormData({ ...formData, google_analytics_id: e.target.value })}
              placeholder="G-XXXXXXXXXX"
            />
          </div>
          
          <div>
            <Label htmlFor="google-tag-manager">Google Tag Manager ID</Label>
            <Input
              id="google-tag-manager"
              value={formData.google_tag_manager_id}
              onChange={(e) => setFormData({ ...formData, google_tag_manager_id: e.target.value })}
              placeholder="GTM-XXXXXXX"
            />
          </div>
          
          <div>
            <Label htmlFor="google-verification">Code de vérification Google</Label>
            <Input
              id="google-verification"
              value={formData.google_site_verification}
              onChange={(e) => setFormData({ ...formData, google_site_verification: e.target.value })}
              placeholder="Code meta de vérification Google Search Console"
            />
          </div>
          
          <div>
            <Label htmlFor="bing-verification">Code de vérification Bing</Label>
            <Input
              id="bing-verification"
              value={formData.bing_site_verification}
              onChange={(e) => setFormData({ ...formData, bing_site_verification: e.target.value })}
              placeholder="Code meta de vérification Bing Webmaster"
            />
          </div>
        </CardContent>
      </Card>

      {/* Robots et Sitemap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Robots.txt et Sitemap
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="robots-txt">Contenu du fichier robots.txt</Label>
            <Textarea
              id="robots-txt"
              value={formData.robots_txt}
              onChange={(e) => setFormData({ ...formData, robots_txt: e.target.value })}
              rows={6}
              className="font-mono text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="sitemap-enabled"
              checked={formData.sitemap_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, sitemap_enabled: checked })}
            />
            <Label htmlFor="sitemap-enabled">Activer le sitemap XML automatique</Label>
          </div>
          
          <div>
            <Label htmlFor="canonical-domain">Domaine canonique</Label>
            <Input
              id="canonical-domain"
              value={formData.canonical_domain}
              onChange={(e) => setFormData({ ...formData, canonical_domain: e.target.value })}
              placeholder="fixway.fr"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="force-https"
              checked={formData.force_https}
              onCheckedChange={(checked) => setFormData({ ...formData, force_https: checked })}
            />
            <Label htmlFor="force-https">Forcer HTTPS</Label>
          </div>
        </CardContent>
      </Card>

      {/* Images et Média */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Images et Média
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="favicon">URL du Favicon</Label>
            <Input
              id="favicon"
              value={formData.favicon_url}
              onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
              placeholder="https://fixway.fr/favicon.ico"
            />
          </div>
          
          <div>
            <Label htmlFor="alt-text-pattern">Modèle de texte alternatif</Label>
            <Input
              id="alt-text-pattern"
              value={formData.default_alt_text_pattern}
              onChange={(e) => setFormData({ ...formData, default_alt_text_pattern: e.target.value })}
              placeholder="{shop_name} - Service de réparation"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Utilisez {'{shop_name}'} pour le nom du magasin
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="lazy-loading"
              checked={formData.lazy_loading_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, lazy_loading_enabled: checked })}
            />
            <Label htmlFor="lazy-loading">Activer le lazy loading des images</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="webp-images"
              checked={formData.webp_images_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, webp_images_enabled: checked })}
            />
            <Label htmlFor="webp-images">Optimisation WebP automatique</Label>
          </div>
        </CardContent>
      </Card>

      {/* SEO Local */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            SEO Local
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="business-type">Type d'entreprise</Label>
            <Select value={formData.business_type} onValueChange={(value) => setFormData({ ...formData, business_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LocalBusiness">Entreprise locale</SelectItem>
                <SelectItem value="Store">Magasin</SelectItem>
                <SelectItem value="ProfessionalService">Service professionnel</SelectItem>
                <SelectItem value="HomeAndConstructionBusiness">Réparation/Construction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="price-range">Gamme de prix</Label>
            <Select value={formData.price_range} onValueChange={(value) => setFormData({ ...formData, price_range: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="€">€ (Économique)</SelectItem>
                <SelectItem value="€€">€€ (Modéré)</SelectItem>
                <SelectItem value="€€€">€€€ (Cher)</SelectItem>
                <SelectItem value="€€€€">€€€€ (Très cher)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="service-areas">Zones de service</Label>
            <Input
              id="service-areas"
              value={formData.service_areas}
              onChange={(e) => setFormData({ ...formData, service_areas: e.target.value })}
              placeholder="Agde, Béziers, Montpellier, Hérault"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Séparez les zones par des virgules
            </p>
          </div>
          
          <div>
            <Label htmlFor="languages">Langues supportées</Label>
            <Input
              id="languages"
              value={formData.languages_supported}
              onChange={(e) => setFormData({ ...formData, languages_supported: e.target.value })}
              placeholder="fr, en, es"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="accepts-reservations"
              checked={formData.accepts_reservations}
              onCheckedChange={(checked) => setFormData({ ...formData, accepts_reservations: checked })}
            />
            <Label htmlFor="accepts-reservations">Accepte les réservations</Label>
          </div>
        </CardContent>
      </Card>

      {/* Informations d'aide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Optimisation SEO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">🎯 Points clés pour le référencement</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Utilisez des titres uniques et descriptifs (50-60 caractères)</li>
                <li>• Rédigez des meta descriptions engageantes (150-160 caractères)</li>
                <li>• Optimisez vos images avec des textes alternatifs descriptifs</li>
                <li>• Configurez Google Analytics pour suivre vos performances</li>
                <li>• Vérifiez votre site avec Google Search Console</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">📍 SEO Local</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Incluez votre ville/région dans vos mots-clés</li>
                <li>• Configurez vos zones de service principales</li>
                <li>• Utilisez des données structurées pour votre entreprise locale</li>
                <li>• Optimisez pour les recherches "près de moi"</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">🚀 Performance</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Activez le lazy loading pour améliorer les temps de chargement</li>
                <li>• Utilisez le format WebP pour des images plus légères</li>
                <li>• Configurez un domaine canonique pour éviter le contenu dupliqué</li>
                <li>• Forcez HTTPS pour la sécurité et le SEO</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration SEO'}
        </Button>
      </div>
    </div>
  );
}