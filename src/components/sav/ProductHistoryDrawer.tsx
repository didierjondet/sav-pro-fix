import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smartphone, Calendar, ExternalLink, History, Repeat, AlertTriangle, Plus } from 'lucide-react';
import type { PreviousSAVCase, TrackedProduct } from '@/hooks/useProductHistory';
import { computeReturnRate } from '@/lib/productReturnRate';
import { NewSAVFromProductDialog } from './NewSAVFromProductDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: TrackedProduct | null;
  cases: PreviousSAVCase[];
  title?: string;
}

export function ProductHistoryDrawer({ open, onOpenChange, product, cases, title }: Props) {
  const navigate = useNavigate();

  const stats = useMemo(
    () =>
      computeReturnRate(
        cases.map((c) => ({
          id: c.id,
          created_at: c.created_at,
          problem_description: c.problem_description,
          status: c.status,
        }))
      ),
    [cases]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title || 'Historique produit'}
          </SheetTitle>
          <SheetDescription>
            {product ? (
              <span className="flex flex-wrap gap-2 text-xs mt-1">
                {product.device_brand && (
                  <Badge variant="outline">{product.device_brand} {product.device_model}</Badge>
                )}
                {product.device_imei && (
                  <Badge variant="outline" className="font-mono">IMEI {product.device_imei}</Badge>
                )}
                {product.sku && <Badge variant="outline">SKU {product.sku}</Badge>}
                <Badge variant="secondary">{cases.length} passage{cases.length > 1 ? 's' : ''}</Badge>
              </span>
            ) : (
              <span>{cases.length} dossier{cases.length > 1 ? 's' : ''} trouvé{cases.length > 1 ? 's' : ''}</span>
            )}
          </SheetDescription>
        </SheetHeader>

        {cases.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-md border p-2">
              <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                <Repeat className="h-3 w-3" /> Retour
              </div>
              <div className="text-lg font-semibold">{Math.round(stats.returnRate)}%</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Même panne
              </div>
              <div className="text-lg font-semibold text-destructive">{Math.round(stats.sameIssueRate)}%</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Réparations</div>
              <div className="text-lg font-semibold">{stats.totalCases}</div>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 mt-4 pr-2">
          {cases.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Aucun SAV précédent pour ce produit.
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {cases.map((c) => {
                const closureCount = Array.isArray(c.closure_history) ? c.closure_history.length : 0;
                const cls = stats.classification[c.id];
                return (
                  <div key={c.id} className="border rounded-lg p-3 hover:bg-muted/30 transition">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">{c.case_number}</Badge>
                        <Badge variant="secondary" className="text-xs">{c.sav_type}</Badge>
                        <Badge variant="outline" className="text-xs">{c.status}</Badge>
                        {cls === 'first' && (
                          <Badge variant="outline" className="text-xs">1er passage</Badge>
                        )}
                        {cls === 'same' && (
                          <Badge variant="destructive" className="text-xs">Retour (même panne)</Badge>
                        )}
                        {cls === 'other' && (
                          <Badge variant="secondary" className="text-xs">Retour (autre panne)</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/sav/${c.id}`);
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(c.created_at), 'd MMM yyyy', { locale: fr })}
                      </span>
                      {c.customer && (
                        <span className="inline-flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          {c.customer.first_name} {c.customer.last_name}
                        </span>
                      )}
                      {closureCount > 0 && (
                        <span>{closureCount} clôture{closureCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {c.problem_description && (
                      <p className="text-sm line-clamp-2">{c.problem_description}</p>
                    )}
                    {c.repair_notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                        {c.repair_notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
