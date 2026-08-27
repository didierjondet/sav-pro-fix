import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AIReformulatorRecipient {
  customerFirstName?: string;
  customerLastName?: string;
  customerName?: string;
  shopName?: string;
  caseNumber?: string;
}

interface AITextReformulatorProps {
  text: string;
  context: "problem_description" | "repair_notes" | "technician_comments" | "private_comments" | "chat_message" | "sms_message" | "customer_message";
  onReformulated: (reformulatedText: string) => void;
  className?: string;
  recipient?: AIReformulatorRecipient;
}

export function AITextReformulator({
  text,
  context,
  onReformulated,
  className = "",
  recipient,
}: AITextReformulatorProps) {
  const [isReformulating, setIsReformulating] = useState(false);
  const { toast } = useToast();

  const handleReformulate = async () => {
    if (!text || text.trim() === "") {
      toast({
        title: "Texte vide",
        description: "Veuillez saisir du texte avant de le reformuler",
        variant: "destructive",
      });
      return;
    }

    setIsReformulating(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-reformulate-text", {
        body: {
          text: text.trim(),
          context,
          recipient,
        },
      });


      // Extract real error from edge function response
      if (error) {
        // Try to get the detailed message from the response body
        const errorMsg = data?.error || error.message || "Erreur inconnue";
        throw new Error(errorMsg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.reformulatedText) {
        throw new Error("Aucune reformulation reçue");
      }

      onReformulated(data.reformulatedText);

      toast({
        title: "✨ Texte reformulé",
        description: "Le texte a été corrigé et amélioré par l'IA",
      });
    } catch (error: any) {
      console.error("Erreur reformulation IA:", error);
      
      const msg = error.message || "";
      
      // Display the real error message from the backend directly
      toast({
        title: "Erreur IA",
        description: msg || "Impossible de reformuler le texte. Réessayez dans quelques instants.",
        variant: "destructive",
      });
    } finally {
      setIsReformulating(false);
    }
  };

  const getTooltipText = () => {
    switch (context) {
      case "problem_description":
        return "Reformuler la description du problème (note interne)";
      case "repair_notes":
        return "Reformuler les notes de réparation (note interne)";
      case "technician_comments":
        return "Reformuler les commentaires (note interne)";
      case "private_comments":
        return "Reformuler les commentaires privés (note interne)";
      case "customer_message":
        return "Reformuler pour le client (message lisible par le client)";
      case "chat_message":
        return "Reformuler pour le client (message de discussion)";
      case "sms_message":
        return "Reformuler pour le client (SMS, max 160 caractères)";
      default:
        return "Reformuler et corriger avec l'IA";

    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleReformulate}
            disabled={isReformulating || !text || text.trim() === ""}
            className={className}
          >
            {isReformulating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-purple-500" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
