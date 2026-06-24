import { AlertTriangle } from "lucide-react";
import { useShop } from "@/hooks/useShop";

export default function InactivityWarningBanner() {
  const { shop } = useShop();
  if (!shop?.scheduled_deletion_at) return null;

  const deletion = new Date(shop.scheduled_deletion_at);
  const daysLeft = Math.max(0, Math.ceil((deletion.getTime() - Date.now()) / 86400000));

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow">
      <AlertTriangle className="h-4 w-4" />
      <span>
        Boutique inactive — suppression prévue le{" "}
        <strong>{deletion.toLocaleDateString("fr-FR")}</strong> ({daysLeft} jour
        {daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}). Saisissez au moins une donnée pour annuler.
      </span>
    </div>
  );
}
