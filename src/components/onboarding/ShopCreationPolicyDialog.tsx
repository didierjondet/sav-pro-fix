import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useShop } from "@/hooks/useShop";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

export default function ShopCreationPolicyDialog() {
  const { shop } = useShop();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!shop || !user) return;
    if (!shop.inactivity_policy_acknowledged_at) setOpen(true);
  }, [shop, user]);

  const handleAck = async () => {
    await supabase.rpc("acknowledge_shop_inactivity_policy");
    qc.invalidateQueries({ queryKey: ["shop"] });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* mandatory */ }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Politique d'inactivité
          </DialogTitle>
          <DialogDescription className="pt-2 text-foreground">
            Si <strong>aucune donnée</strong> (SAV, client, devis, pièce, RDV…) n'est créée ou modifiée dans votre boutique pendant <strong>60 jours consécutifs</strong>, elle sera <strong>automatiquement supprimée</strong>.
            <br /><br />
            Vous recevrez un email et un SMS d'avertissement 7 jours avant la suppression. La suppression est définitive et libère votre email et le nom de la boutique pour une nouvelle inscription.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleAck} className="w-full">J'ai compris</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
