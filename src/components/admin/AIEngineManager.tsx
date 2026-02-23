import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Check, X, Loader2, Eye, EyeOff, Zap, Sparkles } from 'lucide-react';

const PROVIDERS = [
  {
    id: 'lovable',
    name: 'Lovable AI',
    description: 'Gateway IA intégrée, pré-configurée automatiquement.',
    icon: '🚀',
    models: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
      { value: 'openai/gpt-5', label: 'GPT-5' },
      { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
    ],
    apiKeyName: 'LOVABLE_API_KEY',
    needsApiKey: false,
  },
  {
    id: 'openai',
    name: 'OpenAI ChatGPT',
    description: 'Modèles GPT d\'OpenAI via leur API directe.',
    icon: '🤖',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    apiKeyName: 'OPENAI_API_KEY',
    needsApiKey: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Modèles Gemini via l\'API Google AI directe.',
    icon: '💎',
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
    apiKeyName: 'GEMINI_API_KEY',
    needsApiKey: true,
  },
];

export function AIEngineManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const [selectedProvider, setSelectedProvider] = useState('lovable');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_engine_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSelectedProvider(data.provider);
        setSelectedModel(data.model);
        setHasExistingKey(data.provider !== 'lovable');
      }
    } catch (error: any) {
      console.error('Error fetching AI config:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider)!;

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = PROVIDERS.find(p => p.id === providerId)!;
    setSelectedModel(provider.models[0].value);
    setApiKey('');
    setShowApiKey(false);
    setTestResult(null);
    setHasExistingKey(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const provider = PROVIDERS.find(p => p.id === selectedProvider)!;

      if (provider.needsApiKey && !apiKey && !hasExistingKey) {
        toast({ title: "Erreur", description: "Veuillez saisir la clé API.", variant: "destructive" });
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('save-ai-config', {
        body: {
          provider: selectedProvider,
          model: selectedModel,
          api_key_name: provider.apiKeyName,
          api_key: provider.needsApiKey && apiKey ? apiKey : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setApiKey('');
      if (provider.needsApiKey) setHasExistingKey(true);
      setTestResult(null);

      toast({ title: "Configuration sauvegardée", description: `Moteur IA : ${provider.name} - ${selectedModel}` });
    } catch (error: any) {
      console.error('Error saving AI config:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const provider = PROVIDERS.find(p => p.id === selectedProvider)!;

      const { data, error } = await supabase.functions.invoke('save-ai-config', {
        body: {
          provider: selectedProvider,
          model: selectedModel,
          api_key_name: provider.apiKeyName,
          api_key: provider.needsApiKey && apiKey ? apiKey : undefined,
          test_only: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTestResult('success');
      toast({ title: "Test réussi ✅", description: `Connexion à ${provider.name} fonctionnelle.` });
    } catch (error: any) {
      setTestResult('error');
      toast({ title: "Test échoué ❌", description: error.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          Configuration du Moteur IA
        </h2>
        <p className="text-slate-600 mt-1">
          Choisissez le moteur IA utilisé pour toutes les fonctionnalités intelligentes du site.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROVIDERS.map((provider) => (
          <Card
            key={provider.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedProvider === provider.id
                ? 'ring-2 ring-primary border-primary'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => handleProviderChange(provider.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{provider.icon}</span>
                {selectedProvider === provider.id && (
                  <Badge className="bg-primary text-primary-foreground">Sélectionné</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{provider.name}</CardTitle>
              <CardDescription className="text-sm">{provider.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-500">
                {provider.models.length} modèle{provider.models.length > 1 ? 's' : ''} disponible{provider.models.length > 1 ? 's' : ''}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Model & API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configuration de {currentProvider.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Modèle</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentProvider.models.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>Clé API</Label>
            {!currentProvider.needsApiKey ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Pré-configurée automatiquement</span>
              </div>
            ) : (
              <div className="space-y-2">
                {hasExistingKey && !apiKey && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700">Clé API configurée. Saisissez une nouvelle clé pour la remplacer.</span>
                  </div>
                )}
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={`Saisir votre ${currentProvider.apiKeyName}...`}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  {selectedProvider === 'openai'
                    ? 'Obtenez votre clé sur platform.openai.com → API Keys'
                    : 'Obtenez votre clé sur aistudio.google.com → API Keys'}
                </p>
              </div>
            )}
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              testResult === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {testResult === 'success' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${testResult === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {testResult === 'success' ? 'Connexion réussie' : 'Échec de connexion'}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Sauvegarder
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Tester la connexion
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <h4 className="font-medium text-slate-900 mb-2">ℹ️ Fonctionnalités concernées</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Reformulation de texte (descriptions SAV, notes, SMS...)</li>
            <li>• Assistant quotidien IA (analyse du tableau de bord)</li>
            <li>• Assistant données IA (questions sur vos données)</li>
            <li>• Génération et modification de widgets statistiques</li>
            <li>• Estimation des prix du marché</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
