import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Clock, Wrench, Link2, ShieldCheck, Truck } from 'lucide-react';
import { useProPartnerDirectory, ProPartner } from '@/hooks/usePartnerDirectory';
import { formatPartnerPrice } from '@/lib/partnerPricing';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (partner: ProPartner) => void;
}

/** Annuaire professionnel : réservé aux magasins connectés, tarifs pro visibles. */
export function PartnerDirectoryDialog({ open, onOpenChange, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const { data: partners = [], isLoading } = useProPartnerDirectory(search);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Rechercher un partenaire Fixway</DialogTitle>
          <DialogDescription>
            Ces magasins ont publié leur fiche partenaire. Les tarifs professionnels ci-dessous sont réservés aux magasins.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, ville, code postal, spécialité…"
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Chargement…</p>
          ) : partners.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Aucun partenaire trouvé pour cette recherche.
            </p>
          ) : (
            partners.map((p) => (
              <div key={p.shop_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.public_name}</span>
                      <Badge variant="secondary" className="text-xs">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Partenaire Fixway
                      </Badge>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {(p.city || p.postal_code) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {[p.postal_code, p.city].filter(Boolean).join(' ')}
                        </span>
                      )}
                      {p.specialties && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Wrench className="h-3 w-3" /> {p.specialties}
                        </span>
                      )}
                      {p.avg_delay_days != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {p.avg_delay_days}j moyen
                        </span>
                      )}
                      {p.shipping_modes && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" /> {p.shipping_modes}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => onSelect(p)}>
                      <Link2 className="h-4 w-4 mr-2" /> Ajouter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpanded(expanded === p.shop_id ? null : p.shop_id)}
                    >
                      {expanded === p.shop_id ? 'Masquer' : 'Tarifs pro'}
                    </Button>
                  </div>
                </div>

                {expanded === p.shop_id && (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    {p.warranty_terms && (
                      <p className="text-xs"><strong>Garantie :</strong> {p.warranty_terms}</p>
                    )}
                    {p.return_policy && (
                      <p className="text-xs"><strong>Retour :</strong> {p.return_policy}</p>
                    )}
                    {p.failure_policy && (
                      <p className="text-xs"><strong>En cas d'échec :</strong> {p.failure_policy}</p>
                    )}
                    {p.pro_prices.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Aucun tarif professionnel publié.</p>
                    ) : (
                      <div className="space-y-1">
                        {p.pro_prices.map((line, i) => (
                          <div key={i} className="flex items-center justify-between text-xs border-b py-1 last:border-0">
                            <span>
                              {line.label}
                              {line.device_family ? ` · ${line.device_family}` : ''}
                              {line.delay_days != null ? ` · ${line.delay_days}j` : ''}
                            </span>
                            <span className="font-medium">
                              {formatPartnerPrice(line.pro_price ?? line.public_price, p, 'ht')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
