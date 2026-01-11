import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, TestTube, Loader2, ExternalLink } from 'lucide-react';
import { SupplierConfig } from '@/hooks/useSuppliers';

interface SupplierConfigCardProps {
  name: string;
  label: string;
  url: string;
  config: SupplierConfig | null;
  onSave: (config: Partial<SupplierConfig> & { supplier_name: string }) => void;
  onTestConnection: (supplierName: string) => Promise<boolean>;
  isSaving: boolean;
}

export function SupplierConfigCard({
  name,
  label,
  url,
  config,
  onSave,
  onTestConnection,
  isSaving,
}: SupplierConfigCardProps) {
  const [isEnabled, setIsEnabled] = useState(config?.is_enabled ?? false);
  const [username, setUsername] = useState(config?.username ?? '');
  const [password, setPassword] = useState(config?.password_encrypted ?? '');
  const [coefficient, setCoefficient] = useState(config?.price_coefficient ?? 1.5);
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (config) {
      setIsEnabled(config.is_enabled);
      setUsername(config.username ?? '');
      setPassword(config.password_encrypted ?? '');
      setCoefficient(config.price_coefficient);
    }
  }, [config]);

  const handleSave = () => {
    onSave({
      supplier_name: name,
      supplier_url: url,
      username: username || null,
      password_encrypted: password || null,
      price_coefficient: coefficient,
      is_enabled: isEnabled,
    });
  };

  const handleTest = async () => {
    // Sauvegarder d'abord avant de tester
    if (hasChanges) {
      onSave({
        supplier_name: name,
        supplier_url: url,
        username: username || null,
        password_encrypted: password || null,
        price_coefficient: coefficient,
        is_enabled: isEnabled,
      });
    }
    
    setIsTesting(true);
    await onTestConnection(name);
    setIsTesting(false);
  };

  const hasChanges = 
    isEnabled !== (config?.is_enabled ?? false) ||
    username !== (config?.username ?? '') ||
    password !== (config?.password_encrypted ?? '') ||
    coefficient !== (config?.price_coefficient ?? 1.5);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {label}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardTitle>
            <CardDescription>{url}</CardDescription>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${name}-username`}>Identifiant / Email</Label>
            <Input
              id={`${name}-username`}
              type="email"
              placeholder="votre@email.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!isEnabled}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`${name}-password`}>Mot de passe</Label>
            <div className="relative">
              <Input
                id={`${name}-password`}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!isEnabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!isEnabled}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${name}-coefficient`}>
            Coefficient de prix (multiplicateur pour prix public)
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id={`${name}-coefficient`}
              type="number"
              min="1"
              max="10"
              step="0.05"
              value={coefficient}
              onChange={(e) => setCoefficient(parseFloat(e.target.value) || 1.5)}
              disabled={!isEnabled}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">
              Ex: 1.5 = +50% de marge (10€ d'achat → 15€ public)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder'
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={!isEnabled || !username || !password || isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Test...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Tester la connexion
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
