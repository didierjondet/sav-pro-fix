import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Globe, Users, Award, DollarSign, FileText } from 'lucide-react';
import { CarouselManager } from '@/components/admin/CarouselManager';

interface LandingContent {
  id?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_primary?: string;
  hero_cta_secondary?: string;
  features_title?: string;
  features_subtitle?: string;
  feature_1_title?: string;
  feature_1_description?: string;
  feature_2_title?: string;
  feature_2_description?: string;
  feature_3_title?: string;
  feature_3_description?: string;
  benefits_title?: string;
  benefits_subtitle?: string;
  benefit_1_title?: string;
  benefit_1_description?: string;
  benefit_2_title?: string;
  benefit_2_description?: string;
  benefit_3_title?: string;
  benefit_3_description?: string;
  cta_title?: string;
  cta_subtitle?: string;
  cta_button_text?: string;
  footer_text?: string;
  cgv_content?: string;
  cgu_content?: string;
  privacy_policy?: string;
  contact_address?: string;
  contact_email?: string;
  contact_phone?: string;
  show_address?: boolean;
  show_email?: boolean;
  show_phone?: boolean;
}

export function LandingPageManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [content, setContent] = useState<LandingContent>({});

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_content' as any)
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setContent(data as LandingContent);
      }
    } catch (error: any) {
      console.error('Error fetching landing content:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le contenu de la landing page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateContent = (field: keyof LandingContent, value: string | boolean) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const saveSection = async (section: string, fields: (keyof LandingContent)[]) => {
    setSaving(section);
    try {
      const sectionData = fields.reduce((acc, field) => {
        acc[field as string] = content[field];
        return acc;
      }, {} as any);

      if (content.id) {
        const { error } = await supabase
          .from('landing_content' as any)
          .update(sectionData)
          .eq('id', content.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('landing_content' as any)
          .insert([sectionData])
          .select()
          .single();
        
        if (error) throw error;
        setContent(prev => ({ ...prev, id: (data as any).id }));
      }

      toast({
        title: "Succès",
        description: `Section ${section} sauvegardée avec succès`,
      });
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast({
        title: "Erreur",
        description: `Impossible de sauvegarder la section ${section}`,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Chargement du contenu...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Section Hero */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Section Hero</CardTitle>
          </div>
          <Button
            onClick={() => saveSection('Hero', ['hero_title', 'hero_subtitle', 'hero_cta_primary', 'hero_cta_secondary'])}
            disabled={saving === 'Hero'}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving === 'Hero' ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hero_title">Titre principal</Label>
              <Input
                id="hero_title"
                value={content.hero_title || ''}
                onChange={(e) => updateContent('hero_title', e.target.value)}
                placeholder="Titre accrocheur de votre landing page"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero_subtitle">Sous-titre</Label>
              <Textarea
                id="hero_subtitle"
                value={content.hero_subtitle || ''}
                onChange={(e) => updateContent('hero_subtitle', e.target.value)}
                placeholder="Description courte de votre service"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero_cta_primary">Bouton principal</Label>
              <Input
                id="hero_cta_primary"
                value={content.hero_cta_primary || ''}
                onChange={(e) => updateContent('hero_cta_primary', e.target.value)}
                placeholder="Commencer maintenant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero_cta_secondary">Bouton secondaire</Label>
              <Input
                id="hero_cta_secondary"
                value={content.hero_cta_secondary || ''}
                onChange={(e) => updateContent('hero_cta_secondary', e.target.value)}
                placeholder="Voir la démo"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Carrousel */}
      <CarouselManager />

      {/* Section Fonctionnalités */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <CardTitle>Section Fonctionnalités</CardTitle>
          </div>
          <Button
            onClick={() => saveSection('Fonctionnalités', [
              'features_title', 'features_subtitle',
              'feature_1_title', 'feature_1_description',
              'feature_2_title', 'feature_2_description',
              'feature_3_title', 'feature_3_description'
            ])}
            disabled={saving === 'Fonctionnalités'}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving === 'Fonctionnalités' ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="features_title">Titre de la section</Label>
              <Input
                id="features_title"
                value={content.features_title || ''}
                onChange={(e) => updateContent('features_title', e.target.value)}
                placeholder="Nos fonctionnalités"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="features_subtitle">Sous-titre</Label>
              <Textarea
                id="features_subtitle"
                value={content.features_subtitle || ''}
                onChange={(e) => updateContent('features_subtitle', e.target.value)}
                placeholder="Description des fonctionnalités"
                rows={2}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feature_1_title">Fonctionnalité 1 - Titre</Label>
              <Input
                id="feature_1_title"
                value={content.feature_1_title || ''}
                onChange={(e) => updateContent('feature_1_title', e.target.value)}
                placeholder="Titre de la fonctionnalité"
              />
              <Label htmlFor="feature_1_description">Description</Label>
              <Textarea
                id="feature_1_description"
                value={content.feature_1_description || ''}
                onChange={(e) => updateContent('feature_1_description', e.target.value)}
                placeholder="Description détaillée"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="feature_2_title">Fonctionnalité 2 - Titre</Label>
              <Input
                id="feature_2_title"
                value={content.feature_2_title || ''}
                onChange={(e) => updateContent('feature_2_title', e.target.value)}
                placeholder="Titre de la fonctionnalité"
              />
              <Label htmlFor="feature_2_description">Description</Label>
              <Textarea
                id="feature_2_description"
                value={content.feature_2_description || ''}
                onChange={(e) => updateContent('feature_2_description', e.target.value)}
                placeholder="Description détaillée"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="feature_3_title">Fonctionnalité 3 - Titre</Label>
              <Input
                id="feature_3_title"
                value={content.feature_3_title || ''}
                onChange={(e) => updateContent('feature_3_title', e.target.value)}
                placeholder="Titre de la fonctionnalité"
              />
              <Label htmlFor="feature_3_description">Description</Label>
              <Textarea
                id="feature_3_description"
                value={content.feature_3_description || ''}
                onChange={(e) => updateContent('feature_3_description', e.target.value)}
                placeholder="Description détaillée"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Avantages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <CardTitle>Section Avantages</CardTitle>
          </div>
          <Button
            onClick={() => saveSection('Avantages', [
              'benefits_title', 'benefits_subtitle',
              'benefit_1_title', 'benefit_1_description',
              'benefit_2_title', 'benefit_2_description',
              'benefit_3_title', 'benefit_3_description'
            ])}
            disabled={saving === 'Avantages'}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving === 'Avantages' ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="benefits_title">Titre de la section</Label>
              <Input
                id="benefits_title"
                value={content.benefits_title || ''}
                onChange={(e) => updateContent('benefits_title', e.target.value)}
                placeholder="Pourquoi nous choisir"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefits_subtitle">Sous-titre</Label>
              <Textarea
                id="benefits_subtitle"
                value={content.benefits_subtitle || ''}
                onChange={(e) => updateContent('benefits_subtitle', e.target.value)}
                placeholder="Description des avantages"
                rows={2}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="benefit_1_title">Avantage 1 - Titre</Label>
              <Input
                id="benefit_1_title"
                value={content.benefit_1_title || ''}
                onChange={(e) => updateContent('benefit_1_title', e.target.value)}
                placeholder="Titre de l'avantage"
              />
              <Label htmlFor="benefit_1_description">Description</Label>
              <Textarea
                id="benefit_1_description"
                value={content.benefit_1_description || ''}
                onChange={(e) => updateContent('benefit_1_description', e.target.value)}
                placeholder="Description détaillée"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="benefit_2_title">Avantage 2 - Titre</Label>
              <Input
                id="benefit_2_title"
                value={content.benefit_2_title || ''}
                onChange={(e) => updateContent('benefit_2_title', e.target.value)}
                placeholder="Titre de l'avantage"
              />
              <Label htmlFor="benefit_2_description">Description</Label>
              <Textarea
                id="benefit_2_description"
                value={content.benefit_2_description || ''}
                onChange={(e) => updateContent('benefit_2_description', e.target.value)}
                placeholder="Description détaillée"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="benefit_3_title">Avantage 3 - Titre</Label>
              <Input
                id="benefit_3_title"
                value={content.benefit_3_title || ''}
                onChange={(e) => updateContent('benefit_3_title', e.target.value)}
                placeholder="Titre de l'avantage"
              />
              <Label htmlFor="benefit_3_description">Description</Label>
              <Textarea
                id="benefit_3_description"
                value={content.benefit_3_description || ''}
                onChange={(e) => updateContent('benefit_3_description', e.target.value)}
                placeholder="Description détaillée"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section CTA Final */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Section Call-to-Action</CardTitle>
          </div>
          <Button
            onClick={() => saveSection('CTA', ['cta_title', 'cta_subtitle', 'cta_button_text', 'footer_text'])}
            disabled={saving === 'CTA'}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving === 'CTA' ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta_title">Titre du CTA</Label>
              <Input
                id="cta_title"
                value={content.cta_title || ''}
                onChange={(e) => updateContent('cta_title', e.target.value)}
                placeholder="Prêt à commencer ?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta_subtitle">Sous-titre du CTA</Label>
              <Textarea
                id="cta_subtitle"
                value={content.cta_subtitle || ''}
                onChange={(e) => updateContent('cta_subtitle', e.target.value)}
                placeholder="Rejoignez-nous aujourd'hui"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta_button_text">Texte du bouton</Label>
              <Input
                id="cta_button_text"
                value={content.cta_button_text || ''}
                onChange={(e) => updateContent('cta_button_text', e.target.value)}
                placeholder="Commencer maintenant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer_text">Texte du footer</Label>
              <Input
                id="footer_text"
                value={content.footer_text || ''}
                onChange={(e) => updateContent('footer_text', e.target.value)}
                placeholder="© 2024 FixWay. Tous droits réservés."
              />
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Section Documents Légaux */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Documents Légaux</CardTitle>
            </div>
            <Button
              onClick={() => saveSection('Documents Légaux', ['cgv_content', 'cgu_content', 'privacy_policy'])}
              disabled={saving === 'Documents Légaux'}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === 'Documents Légaux' ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cgv_content">Conditions Générales de Vente (CGV)</Label>
              <Textarea
                id="cgv_content"
                value={content.cgv_content || ''}
                onChange={(e) => updateContent('cgv_content', e.target.value)}
                placeholder="Saisissez vos conditions générales de vente..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Vous pouvez utiliser du HTML simple pour la mise en forme (p, br, strong, em, ul, ol, li, h1-h6)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cgu_content">Conditions Générales d'Utilisation (CGU)</Label>
              <Textarea
                id="cgu_content"
                value={content.cgu_content || ''}
                onChange={(e) => updateContent('cgu_content', e.target.value)}
                placeholder="Saisissez vos conditions générales d'utilisation..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Vous pouvez utiliser du HTML simple pour la mise en forme (p, br, strong, em, ul, ol, li, h1-h6)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="privacy_policy">Politique de Confidentialité</Label>
              <Textarea
                id="privacy_policy"
                value={content.privacy_policy || ''}
                onChange={(e) => updateContent('privacy_policy', e.target.value)}
                placeholder="Saisissez votre politique de confidentialité..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Vous pouvez utiliser du HTML simple pour la mise en forme (p, br, strong, em, ul, ol, li, h1-h6)
              </p>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Conseils de rédaction :</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Les CGV définissent les conditions de vente de vos services</li>
                <li>• Les CGU régissent l'utilisation de votre plateforme</li>
                <li>• La politique de confidentialité explique le traitement des données personnelles (RGPD)</li>
                <li>• Ces documents sont obligatoires pour toute activité commerciale en ligne</li>
                <li>• Consultez un juriste pour vous assurer de leur conformité</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section Coordonnées */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <CardTitle>Coordonnées</CardTitle>
            </div>
            <Button
              onClick={() => saveSection('Coordonnées', ['contact_address', 'contact_email', 'contact_phone', 'show_address', 'show_email', 'show_phone'])}
              disabled={saving === 'Coordonnées'}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === 'Coordonnées' ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_address">Adresse postale</Label>
                <Textarea
                  id="contact_address"
                  value={content.contact_address || ''}
                  onChange={(e) => updateContent('contact_address', e.target.value)}
                  placeholder="123 Rue de la République, 75001 Paris"
                  rows={2}
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show_address"
                    checked={content.show_address || false}
                    onChange={(e) => updateContent('show_address', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="show_address">Afficher sur la landing page</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email de contact</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={content.contact_email || ''}
                  onChange={(e) => updateContent('contact_email', e.target.value)}
                  placeholder="contact@fixway.fr"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show_email"
                    checked={content.show_email || false}
                    onChange={(e) => updateContent('show_email', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="show_email">Afficher sur la landing page</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Téléphone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={content.contact_phone || ''}
                  onChange={(e) => updateContent('contact_phone', e.target.value)}
                  placeholder="01 23 45 67 89"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show_phone"
                    checked={content.show_phone || false}
                    onChange={(e) => updateContent('show_phone', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="show_phone">Afficher sur la landing page</Label>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">📧 Email pour les demandes de contact</h4>
              <p className="text-sm text-green-700">
                L'email de contact sera utilisé pour recevoir les demandes quand un client clique sur un plan en mode "Nous contacter".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }