import { useState, useEffect } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PartStatusIconProps {
  savCaseId: string;
  className?: string;
}

interface PartStatus {
  hasAssignedParts: boolean;
  missingPartsCount: number;
  totalPartsCount: number;
}

export function PartStatusIcon({ savCaseId, className = "" }: PartStatusIconProps) {
  const [partStatus, setPartStatus] = useState<PartStatus>({
    hasAssignedParts: false,
    missingPartsCount: 0,
    totalPartsCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartStatus();
  }, [savCaseId]);

  const fetchPartStatus = async () => {
    try {
      // Récupérer les pièces assignées au SAV
      const { data: savParts, error: savPartsError } = await supabase
        .from('sav_parts')
        .select(`
          *,
          part:parts(quantity)
        `)
        .eq('sav_case_id', savCaseId);

      if (savPartsError) throw savPartsError;

      if (!savParts || savParts.length === 0) {
        setPartStatus({
          hasAssignedParts: false,
          missingPartsCount: 0,
          totalPartsCount: 0
        });
        setLoading(false);
        return;
      }

      // Calculer le nombre de pièces manquantes
      let missingCount = 0;
      for (const savPart of savParts) {
        if (savPart.part) {
          const availableQuantity = savPart.part.quantity || 0;
          const requiredQuantity = savPart.quantity || 0;
          
          if (availableQuantity < requiredQuantity) {
            missingCount++;
          }
        } else {
          // Pièce non trouvée = manquante
          missingCount++;
        }
      }

      setPartStatus({
        hasAssignedParts: true,
        missingPartsCount: missingCount,
        totalPartsCount: savParts.length
      });
    } catch (error) {
      console.error('Error fetching part status:', error);
      setPartStatus({
        hasAssignedParts: false,
        missingPartsCount: 0,
        totalPartsCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Ne rien afficher pendant le chargement
  }

  if (!partStatus.hasAssignedParts) {
    return null; // Pas de pièces assignées = pas d'icône
  }

  // Déterminer la couleur et l'icône selon l'état
  if (partStatus.missingPartsCount === partStatus.totalPartsCount) {
    // Toutes les pièces manquent = rouge
    return (
      <X 
        className={`h-5 w-5 text-red-500 ${className}`}
      />
    );
  } else if (partStatus.missingPartsCount > 0) {
    // Quelques pièces manquent = orange
    return (
      <AlertTriangle 
        className={`h-5 w-5 text-orange-500 ${className}`}
      />
    );
  } else {
    // Toutes les pièces disponibles = vert
    return (
      <Check 
        className={`h-5 w-5 text-green-500 ${className}`}
      />
    );
  }
}