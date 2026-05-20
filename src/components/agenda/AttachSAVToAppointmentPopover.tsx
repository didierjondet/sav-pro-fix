import { useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Link2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppointments } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';

interface SAVOption {
  id: string;
  case_number: string;
  device_brand: string | null;
  device_model: string | null;
  status: string;
  customer?: { first_name: string | null; last_name: string | null } | null;
}

interface Props {
  appointmentId: string;
  customerId?: string | null;
  onAttached?: () => void;
}

export function AttachSAVToAppointmentPopover({ appointmentId, customerId, onAttached }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<SAVOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('sav_cases')
          .select('id, case_number, device_brand, device_model, status, customer:customers(first_name, last_name)')
          .not('status', 'in', '(ready,cancelled,delivered)')
          .order('created_at', { ascending: false })
          .limit(50);

        if (customerId) {
          query = query.eq('customer_id', customerId);
        } else if (search.trim()) {
          const s = `%${search.trim()}%`;
          query = query.or(
            `case_number.ilike.${s},device_brand.ilike.${s},device_model.ilike.${s}`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setOptions((data as any) || []);
      } catch (e: any) {
        if (!cancelled) {
          toast({ title: 'Erreur', description: e.message || 'Chargement impossible', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, customerId, search, toast]);

  const filtered = useMemo(() => {
    if (!customerId || !search.trim()) return options;
    const s = search.toLowerCase();
    return options.filter(
      (o) =>
        o.case_number?.toLowerCase().includes(s) ||
        o.device_brand?.toLowerCase().includes(s) ||
        o.device_model?.toLowerCase().includes(s)
    );
  }, [options, customerId, search]);

  const handleSelect = async (savId: string) => {
    setSubmitting(true);
    try {
      await updateAppointment({ id: appointmentId, data: { sav_case_id: savId } });
      setOpen(false);
      onAttached?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full" disabled={submitting}>
          <Link2 className="h-4 w-4 mr-2" />
          Attribuer un dossier SAV
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={customerId ? 'Filtrer les SAV du client...' : 'Rechercher un SAV (numéro, marque, modèle)...'}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement...
              </div>
            ) : (
              <>
                <CommandEmpty>Aucun dossier SAV trouvé</CommandEmpty>
                <CommandGroup>
                  {filtered.map((sav) => {
                    const customerName = [sav.customer?.first_name, sav.customer?.last_name].filter(Boolean).join(' ');
                    const device = [sav.device_brand, sav.device_model].filter(Boolean).join(' ');
                    return (
                      <CommandItem
                        key={sav.id}
                        value={sav.id}
                        onSelect={() => handleSelect(sav.id)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="font-medium text-sm">{sav.case_number}</span>
                        <span className="text-xs text-muted-foreground">
                          {device || 'Appareil non renseigné'}
                          {customerName ? ` — ${customerName}` : ''}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
