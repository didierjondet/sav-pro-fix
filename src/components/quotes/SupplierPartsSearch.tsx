import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Loader2, 
  Package, 
  Plus, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Settings,
  AlertCircle
} from 'lucide-react';
import { useSuppliers, SupplierPart } from '@/hooks/useSuppliers';
import { useNavigate } from 'react-router-dom';

interface SupplierPartsSearchProps {
  onSelectPart?: (part: SupplierPart) => void;
}

export function SupplierPartsSearch({ onSelectPart }: SupplierPartsSearchProps) {
  const navigate = useNavigate();
  const { 
    suppliers, 
    defaultSuppliers, 
    getSupplierConfig, 
    searchParts, 
    isSearching 
  } = useSuppliers();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [results, setResults] = useState<SupplierPart[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Get enabled suppliers
  const enabledSuppliers = defaultSuppliers.filter(s => {
    const config = getSupplierConfig(s.name);
    return config?.is_enabled;
  });

  const handleSearch = async () => {
    if (!searchQuery.trim() || selectedSuppliers.length === 0) return;
    
    setHasSearched(true);
    const parts = await searchParts(searchQuery, selectedSuppliers);
    setResults(parts);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleSupplier = (supplierName: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierName)
        ? prev.filter(s => s !== supplierName)
        : [...prev, supplierName]
    );
  };

  const getSupplierColor = (supplierName: string) => {
    switch (supplierName) {
      case 'mobilax':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'utopya':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // If no suppliers are enabled, show a message
  if (enabledSuppliers.length === 0) {
    return (
      <Card className="mb-6 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Package className="h-5 w-5" />
              <span>Recherche de pièces fournisseurs</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings?tab=suppliers')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurer les fournisseurs
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Rechercher une pièce chez vos fournisseurs
          </CardTitle>
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Supplier Selection */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">Fournisseurs :</span>
            {enabledSuppliers.map(supplier => {
              const isSelected = selectedSuppliers.includes(supplier.name);
              return (
                <label
                  key={supplier.name}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSupplier(supplier.name)}
                  />
                  <span className="text-sm">{supplier.label}</span>
                </label>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher une pièce (ex: écran iPhone 13 Pro)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim() || selectedSuppliers.length === 0}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Rechercher'
              )}
            </Button>
          </div>

          {/* Results */}
          {hasSearched && (
            <div className="border rounded-lg">
              {results.length === 0 ? (
                <div className="p-6 space-y-4">
                  <div className="text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Les sites fournisseurs bloquent les requêtes automatiques</p>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 3.032C7.455 5.65 9.572 4.5 12 4.5c2.012 0 3.827.736 5.233 1.94l3.035-3.035C18.205 1.407 15.27 0 12 0z"/>
                          <path d="M23.4 12.2c0-.72-.063-1.418-.182-2.093H12v4.148h6.413c-.284 1.422-1.127 2.627-2.378 3.432l3.663 2.844c2.139-1.972 3.702-4.877 3.702-8.33z"/>
                          <path d="M5.033 14.418c-.267-.723-.418-1.5-.418-2.318s.151-1.595.418-2.318L1.08 6.75C.393 8.085 0 9.586 0 11.2c0 1.615.393 3.115 1.08 4.45l3.953-3.032z"/>
                          <path d="M12 22.4c3.117 0 5.736-1.034 7.646-2.804l-3.663-2.844c-1.028.685-2.343 1.09-3.983 1.09-2.554 0-4.717-1.722-5.493-4.036L1.08 16.65C2.868 20.143 7.198 22.4 12 22.4z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                          Solution : Extension Chrome
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          Téléchargez notre extension Chrome pour rechercher sur Mobilax et Utopya directement depuis votre navigateur, avec votre compte connecté.
                        </p>
                        <a 
                          href="/chrome-extension-download" 
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 16l-6-6h4V4h4v6h4l-6 6z"/>
                            <path d="M20 18H4v2h16v-2z"/>
                          </svg>
                          Télécharger l'extension
                        </a>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          Allez sur chrome://extensions, activez le mode développeur, puis "Charger l'extension non empaquetée"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <ScrollArea className="max-h-80">
                  <div className="divide-y">
                    {results.map((part, index) => (
                      <div
                        key={`${part.supplier}-${part.reference}-${index}`}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">{part.name}</span>
                              <Badge variant="outline" className={getSupplierColor(part.supplier)}>
                                {part.supplier}
                              </Badge>
                            </div>
                            
                            {part.reference && (
                              <p className="text-sm text-muted-foreground">
                                Réf: {part.reference}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2">
                              <div>
                                <span className="text-sm text-muted-foreground">Achat: </span>
                                <span className="font-medium">{part.purchasePrice.toFixed(2)}€</span>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Public conseillé: </span>
                                <span className="font-bold text-primary">{part.publicPrice.toFixed(2)}€</span>
                              </div>
                              {part.availability && (
                                <Badge variant="secondary" className="text-xs">
                                  {part.availability}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {part.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a href={part.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {onSelectPart && (
                              <Button
                                size="sm"
                                onClick={() => onSelectPart(part)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Ajouter
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
