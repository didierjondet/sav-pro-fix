import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  disabled?: boolean;
}

const MAX_BYTES = 2 * 1024 * 1024;

export function LoanerConditionPhotos({ value, onChange, max = 6, disabled }: Props) {
  const { shop } = useShop();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const path of value) {
        if (signed[path]) {
          next[path] = signed[path];
          continue;
        }
        const { data } = await supabase.storage
          .from('loaner-photos')
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) next[path] = data.signedUrl;
      }
      if (!cancelled) setSigned(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join('|')]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !shop?.id) return;
    const remaining = max - value.length;
    if (remaining <= 0) {
      toast({ title: 'Limite atteinte', description: `Maximum ${max} photos.`, variant: 'destructive' });
      return;
    }
    setUploading(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        if (file.size > MAX_BYTES) {
          toast({ title: 'Fichier trop volumineux', description: `${file.name} dépasse 2 Mo`, variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${shop.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from('loaner-photos')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) {
          toast({ title: 'Upload échoué', description: error.message, variant: 'destructive' });
          continue;
        }
        added.push(path);
      }
      if (added.length) onChange([...value, ...added]);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (path: string) => {
    await supabase.storage.from('loaner-photos').remove([path]);
    onChange(value.filter((p) => p !== path));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Photos de l'état du matériel</Label>
        <span className="text-xs text-muted-foreground">{value.length}/{max}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {value.map((path) => (
          <div key={path} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
            {signed[path] ? (
              <img src={signed[path]} alt="État du matériel" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">…</div>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(path)}
                className="absolute top-1 right-1 bg-background/80 hover:bg-background rounded-full p-1"
                aria-label="Supprimer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {value.length < max && !disabled && (
          <label className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer text-muted-foreground hover:bg-muted/40">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            <span className="text-[10px]">Ajouter</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">JPG/PNG, 2 Mo max par photo.</p>
    </div>
  );
}
