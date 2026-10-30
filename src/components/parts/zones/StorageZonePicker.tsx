import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, MapPin, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { StorageZone, useStorageZones, zonePath } from '@/hooks/useStorageZones';
import { StorageZoneDialog } from './StorageZoneDialog';

interface Props {
  value: string | null;
  onChange: (zoneId: string | null) => void;
  compact?: boolean;
  className?: string;
}

/** Sélecteur de zone avec recherche, création et modification sans quitter l'écran. */
export function StorageZonePicker({ value, onChange, compact, className }: Props) {
  const { zones } = useStorageZones();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StorageZone | null>(null);

  const byId = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const current = value ? byId.get(value) : undefined;

  const openCreate = () => { setEditing(null); setOpen(false); setDialogOpen(true); };
  const openEdit = (z: StorageZone) => { setEditing(z); setOpen(false); setDialogOpen(true); };

  return (
    <div className={cn('flex items-center gap-1', className)} onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn('justify-between font-normal', compact ? 'h-7 px-2 text-xs min-w-[120px]' : 'w-full')}
            style={current ? { borderColor: current.color, color: current.color } : undefined}
          >
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {current ? (
                <><span className="font-mono font-semibold">{current.code}</span>{!compact && <span className="truncate">— {zonePath(current, byId)}</span>}</>
              ) : (
                <span className="text-muted-foreground">Sans zone</span>
              )}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-72" align="start">
          <Command>
            <CommandInput placeholder="Rechercher ou créer une zone…" value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={openCreate}>
                  <Plus className="h-4 w-4" />Créer « {search} »
                </Button>
              </CommandEmpty>
              <CommandGroup>
                <CommandItem value="__none" onSelect={() => { onChange(null); setOpen(false); }}>
                  <Check className={cn('h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                  Sans zone
                </CommandItem>
                {zones.map((z) => (
                  <CommandItem
                    key={z.id}
                    value={`${z.code} ${zonePath(z, byId)}`}
                    onSelect={() => { onChange(z.id); setOpen(false); }}
                    className="group"
                  >
                    <Check className={cn('h-4 w-4', value === z.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                    <span className="font-mono font-semibold">{z.code}</span>
                    <span className="truncate flex-1">{zonePath(z, byId)}</span>
                    <button
                      type="button"
                      aria-label="Modifier la zone"
                      className="opacity-50 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); openEdit(z); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-1">
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={openCreate}>
                <Plus className="h-4 w-4" />Nouvelle zone
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      {current && !compact && (
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Modifier cette zone" onClick={() => openEdit(current)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <StorageZoneDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        zone={editing}
        initialName={editing ? undefined : search}
        onSaved={(z) => { if (!editing) onChange(z.id); setSearch(''); }}
      />
    </div>
  );
}
