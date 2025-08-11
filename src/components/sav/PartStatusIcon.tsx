import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface PartStatusIconProps {
  savCaseId: string;
  className?: string;
}

interface PartStatus {
  hasAssignedParts: boolean;
  missingPartsCount: number;
  totalPartsCount: number;
  partDetails: PartDetail[];
}

interface PartDetail {
  name: string;
  quantityRequired: number;
  quantityAvailable: number;
  isAvailable: boolean;
}

export function PartStatusIcon({ savCaseId, className = "" }: PartStatusIconProps) {
  const [partStatus, setPartStatus] = useState<PartStatus>({
    hasAssignedParts: false,
    missingPartsCount: 0,
    totalPartsCount: 0,
    partDetails: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartStatus();
  }, [savCaseId]);

  const fetchPartStatus = async () => {
    try {
      // Récupérer les pièces assignées au SAV avec les détails des parts
      const { data: savParts, error: savPartsError } = await supabase
        .from('sav_parts')
        .select(`
          *,
          part:parts(name, quantity)
        `)
        .eq('sav_case_id', savCaseId);

      if (savPartsError) throw savPartsError;

      if (!savParts || savParts.length === 0) {
        setPartStatus({
          hasAssignedParts: false,
          missingPartsCount: 0,
          totalPartsCount: 0,
          partDetails: []
        });
        setLoading(false);
        return;
      }

      // Calculer le nombre de pièces manquantes et créer les détails
      let missingCount = 0;
      const partDetails: PartDetail[] = [];
      
      for (const savPart of savParts) {
        const requiredQuantity = savPart.quantity || 0;
        let availableQuantity = 0;
        let partName = "Pièce inconnue";
        let isAvailable = false;
        
        if (savPart.part) {
          availableQuantity = savPart.part.quantity || 0;
          partName = savPart.part.name || "Pièce sans nom";
          isAvailable = availableQuantity >= requiredQuantity;
        }
        
        if (!isAvailable) {
          missingCount++;
        }
        
        partDetails.push({
          name: partName,
          quantityRequired: requiredQuantity,
          quantityAvailable: availableQuantity,
          isAvailable: isAvailable
        });
      }

      setPartStatus({
        hasAssignedParts: true,
        missingPartsCount: missingCount,
        totalPartsCount: savParts.length,
        partDetails: partDetails
      });
    } catch (error) {
      console.error('Error fetching part status:', error);
      setPartStatus({
        hasAssignedParts: false,
        missingPartsCount: 0,
        totalPartsCount: 0,
        partDetails: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Ne rien afficher pendant le chargement
  }

  // Composant d'icône avec cercle coloré
  const IconWithCircle = ({ children, bgColor }: { children: React.ReactNode; bgColor: string }) => (
    <div className={`rounded-full p-1 ${bgColor}`}>
      {children}
    </div>
  );

  if (!partStatus.hasAssignedParts) {
    // Aucune pièce rattachée = croix rouge
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <IconWithCircle bgColor="bg-red-500/10">
              <X className={`h-6 w-6 text-red-500 ${className}`} />
            </IconWithCircle>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="text-sm">Aucune pièce rattachée à ce SAV</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Créer le contenu du tooltip
  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-medium text-sm">Pièces rattachées ({partStatus.totalPartsCount})</div>
      {partStatus.partDetails.map((detail, index) => (
        <div key={index} className="text-xs flex justify-between items-center gap-4">
          <span className="truncate flex-1">{detail.name}</span>
          <span className={`font-mono ${detail.isAvailable ? 'text-green-400' : 'text-red-400'}`}>
            {detail.quantityRequired > 0 ? detail.quantityRequired : '0 (pas commandé)'}
          </span>
          <span className="text-muted-foreground">
            (dispo: {detail.quantityAvailable})
          </span>
        </div>
      ))}
    </div>
  );


  // Déterminer la couleur et l'icône selon l'état
  if (partStatus.missingPartsCount > 0) {
    // Il manque des pièces = check orange
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <IconWithCircle bgColor="bg-orange-500/10">
              <Check className={`h-6 w-6 text-orange-500 ${className}`} />
            </IconWithCircle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  } else {
    // Toutes les pièces disponibles = check vert
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <IconWithCircle bgColor="bg-green-500/10">
              <Check className={`h-6 w-6 text-green-500 ${className}`} />
            </IconWithCircle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
}