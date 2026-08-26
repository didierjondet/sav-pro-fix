import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Tags, ListChecks, Building2 } from 'lucide-react';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useSAVProviders } from '@/hooks/useSAVProviders';

export interface SAVPrintSelection {
  types: string[];
  statuses: string[];
  /** Ids de prestataires + 'none' pour « sans prestataire » */
  providers: string[];
}

interface SAVPrintFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (selection: SAVPrintSelection) => void;
  initialTypes?: string[];
  initialStatuses?: string[];
  initialProviders?: string[];
  providerCaseCounts?: Record<string, number>;
  unassignedProviderCount?: number;
  hideEmptyProviders?: boolean;
  /** Types de SAV réellement présents dans la liste imprimable (même s'ils sont masqués de la barre latérale) */
  availableTypes?: string[];
}


function SectionActions({
  count,
  total,
  onAll,
  onNone,
}: {
  count: number;
  total: number;
  onAll: () => void;
  onNone: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Badge variant="secondary" className="text-[11px]">{count}/{total} sélectionné(s)</Badge>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAll}>Tout</Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onNone}>Aucun</Button>
      </div>
    </div>
  );
}

export function SAVPrintFilterDialog({
  isOpen,
  onClose,
  onPrint,
  initialTypes = [],
  initialStatuses = [],
  initialProviders = [],
  providerCaseCounts = {},
  unassignedProviderCount = 0,
  hideEmptyProviders = false,
  availableTypes = [],
}: SAVPrintFilterDialogProps) {
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const { statuses } = useShopSAVStatuses();
  const { providers } = useSAVProviders();
  const initializedForOpenRef = useRef(false);

  const availableTypesKey = availableTypes.join('|');
  // Types visibles dans la barre latérale + types réellement présents dans la liste imprimable
  const visibleTypes = useMemo(() => {
    const availableSet = new Set(availableTypes);
    return getAllTypes().filter(
      t => getTypeInfo(t.value).show_in_sidebar !== false || availableSet.has(t.value)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllTypes, getTypeInfo, availableTypesKey]);

  const visibleStatuses = useMemo(
    () =>
      statuses
        .filter(s => s.is_active && s.show_in_sidebar !== false)
        .sort((a, b) => a.display_order - b.display_order),
    [statuses]
  );
  const visibleProviders = useMemo(
    () =>
      providers
        .filter(p => p.is_active !== false && p.show_in_sidebar !== false)
        .filter(p => !hideEmptyProviders || (providerCaseCounts[p.id] || 0) > 0),
    [providers, hideEmptyProviders, providerCaseCounts]
  );
  const showUnassignedProvider = unassignedProviderCount > 0;
  const providerTotal = visibleProviders.length + (showUnassignedProvider ? 1 : 0);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const visibleTypeKeys = visibleTypes.map(t => t.value).join('|');
  const visibleStatusKeys = visibleStatuses.map(s => s.status_key).join('|');
  const visibleProviderKeys = visibleProviders.map(p => p.id).join('|');

  useEffect(() => {
    if (!isOpen) {
      initializedForOpenRef.current = false;
      return;
    }

    if (initializedForOpenRef.current || visibleTypes.length === 0) return;
    initializedForOpenRef.current = true;

    const typeSet = new Set(visibleTypes.map(t => t.value));
    const requestedTypes = initialTypes.filter(type => typeSet.has(type));
    setSelectedTypes(requestedTypes.length > 0 ? requestedTypes : visibleTypes.map(t => t.value));

    const statusSet = new Set(visibleStatuses.map(s => s.status_key));
    setSelectedStatuses(initialStatuses.filter(status => statusSet.has(status)));

    const providerSet = new Set([
      ...visibleProviders.map(p => p.id),
      ...(showUnassignedProvider ? ['none'] : []),
    ]);
    setSelectedProviders(initialProviders.filter(provider => providerSet.has(provider)));
  }, [
    isOpen,
    visibleTypeKeys,
    visibleStatusKeys,
    visibleProviderKeys,
    showUnassignedProvider,
    initialTypes,
    initialStatuses,
    initialProviders,
    visibleTypes,
    visibleStatuses,
    visibleProviders,
  ]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const handlePrint = () => {
    if (selectedTypes.length === 0) return;
    onPrint({
      types: selectedTypes,
      statuses: selectedStatuses,
      providers: selectedProviders,
    });
    onClose();
  };

  const showStatusesTab = visibleStatuses.length > 0;
  const showProvidersTab = providerTotal > 0;
  const tabsCount = 1 + (showStatusesTab ? 1 : 0) + (showProvidersTab ? 1 : 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimer la liste SAV
          </DialogTitle>
          <DialogDescription>
            Choisissez les types, statuts et prestataires à inclure. Un onglet sans sélection = aucun filtre sur ce critère.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="types" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="flex-shrink-0" style={{ gridTemplateColumns: `repeat(${tabsCount}, minmax(0, 1fr))` }}>
            <TabsTrigger value="types" className="gap-1.5">
              <Tags className="h-3.5 w-3.5" />
              Types
              <Badge variant="secondary" className="ml-1 text-[10px]">{selectedTypes.length}</Badge>
            </TabsTrigger>
            {showStatusesTab && (
              <TabsTrigger value="statuses" className="gap-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                Statuts
                <Badge variant="secondary" className="ml-1 text-[10px]">{selectedStatuses.length}</Badge>
              </TabsTrigger>
            )}
            {showProvidersTab && (
              <TabsTrigger value="providers" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Prestataires
                <Badge variant="secondary" className="ml-1 text-[10px]">{selectedProviders.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 pr-3 mt-3">
            <TabsContent value="types" className="mt-0 space-y-2.5">
              <SectionActions
                count={selectedTypes.length}
                total={visibleTypes.length}
                onAll={() => setSelectedTypes(visibleTypes.map(t => t.value))}
                onNone={() => setSelectedTypes([])}
              />
              <p className="text-xs text-muted-foreground">
                Au moins un type doit être sélectionné.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {visibleTypes.map(type => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={() => toggle(selectedTypes, setSelectedTypes, type.value)}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm truncate">{type.label}</span>
                  </label>
                ))}
                {visibleTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                    Aucun type affiché dans la barre latérale.
                  </p>
                )}
              </div>
            </TabsContent>

            {showStatusesTab && (
              <TabsContent value="statuses" className="mt-0 space-y-2.5">
                <SectionActions
                  count={selectedStatuses.length}
                  total={visibleStatuses.length}
                  onAll={() => setSelectedStatuses(visibleStatuses.map(s => s.status_key))}
                  onNone={() => setSelectedStatuses([])}
                />
                <p className="text-xs text-muted-foreground">
                  Aucun statut coché = tous les statuts.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {visibleStatuses.map(s => (
                    <label
                      key={s.status_key}
                      className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedStatuses.includes(s.status_key)}
                        onCheckedChange={() => toggle(selectedStatuses, setSelectedStatuses, s.status_key)}
                      />
                      <span className="text-sm truncate">{s.status_label}</span>
                    </label>
                  ))}
                </div>
              </TabsContent>
            )}

            {showProvidersTab && (
              <TabsContent value="providers" className="mt-0 space-y-2.5">
                <SectionActions
                  count={selectedProviders.length}
                  total={providerTotal}
                  onAll={() => setSelectedProviders([
                    ...(showUnassignedProvider ? ['none'] : []),
                    ...visibleProviders.map(p => p.id),
                  ])}
                  onNone={() => setSelectedProviders([])}
                />
                <p className="text-xs text-muted-foreground">
                  Aucun prestataire coché = tous les dossiers.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {showUnassignedProvider && (
                    <label className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={selectedProviders.includes('none')}
                        onCheckedChange={() => toggle(selectedProviders, setSelectedProviders, 'none')}
                      />
                      <span className="text-sm truncate">Sans prestataire</span>
                    </label>
                  )}
                  {visibleProviders.map(p => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedProviders.includes(p.id)}
                        onCheckedChange={() => toggle(selectedProviders, setSelectedProviders, p.id)}
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-sm truncate">{p.name}</span>
                    </label>
                  ))}
                  {providerTotal === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                      Aucun prestataire affiché dans la barre latérale.
                    </p>
                  )}
                </div>
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex-shrink-0 gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handlePrint} disabled={selectedTypes.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
