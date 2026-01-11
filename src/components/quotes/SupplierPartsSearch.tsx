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
                <div className="p-6 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Aucun résultat trouvé</p>
                  <p className="text-sm">Essayez avec d'autres termes de recherche</p>
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
