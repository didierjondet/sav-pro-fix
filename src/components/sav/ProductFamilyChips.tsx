import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useProductFamilies, type ProductFamily } from '@/hooks/useProductFamilies';
import { matchFamilyForDevice, findOtherFamily } from '@/lib/productFamilies';

export function FamilyChip({ family, active, onClick, count, small }: {
  family: Pick<ProductFamily, 'name' | 'color'>; active?: boolean; onClick?: () => void; count?: number; small?: boolean;
}) {
  const color = family.color ?? '#6B7280';
  const Comp: any = onClick ? 'button' : 'span';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
        small ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        active ? 'ring-2 ring-ring ring-offset-1' : 'opacity-90 hover:opacity-100',
      )}
      style={{ backgroundColor: active ? color : `${color}26`, borderColor: color, color: active ? '#fff' : undefined }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? '#fff' : color }} />
      {family.name}
      {count !== undefined && <span className="opacity-75">({count})</span>}
    </Comp>
  );
}

interface PickerProps {
  brand: string;
  model: string;
  problemDescription?: string;
  value: string | null;
  onChange: (id: string | null) => void;
}

/** Pastilles de famille de produit avec présélection automatique (règle locale puis IA). */
export function ProductFamilyPicker({ brand, model, problemDescription, value, onChange }: PickerProps) {
  const { activeFamilies } = useProductFamilies();
  const manual = useRef(false);
  const [suggested, setSuggested] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (manual.current || !activeFamilies.length) return;
    const b = brand.trim(), m = model.trim();
    if (!b || !m) return;
    const { familyId } = matchFamilyForDevice(activeFamilies, b, m);
    if (familyId) { onChange(familyId); setSuggested(true); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setAiLoading(true);
      try {
        const { data } = await supabase.functions.invoke('classify-sav-category', {
          body: {
            items: [{ id: 'x', brand: b, model: m, problem_description: problemDescription || '' }],
            families: activeFamilies.map((f) => ({ id: f.id, name: f.name })),
          },
        });
        const id = data?.results?.x;
        if (!cancelled && !manual.current) {
          const valid = activeFamilies.some((f) => f.id === id) ? id : findOtherFamily(activeFamilies);
          if (valid) { onChange(valid); setSuggested(true); }
        }
      } catch { /* suggestion facultative */ } finally { if (!cancelled) setAiLoading(false); }
    }, 900);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, model, activeFamilies]);

  if (!activeFamilies.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Famille de produit</Label>
        {aiLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {suggested && !manual.current && value && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Proposé par l'IA
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {activeFamilies.map((f) => (
          <FamilyChip
            key={f.id}
            family={f}
            active={value === f.id}
            onClick={() => { manual.current = true; setSuggested(false); onChange(value === f.id ? null : f.id); }}
          />
        ))}
      </div>
    </div>
  );
}
