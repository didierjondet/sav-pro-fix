import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Smartphone } from "lucide-react";

interface LimitReachedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'upgrade_plan' | 'buy_sms_package';
  reason: string;
}

export function LimitReachedDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  action, 
  reason 
}: LimitReachedDialogProps) {
  const isUpgrade = action === 'upgrade_plan';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              {isUpgrade ? (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              ) : (
                <Smartphone className="h-5 w-5 text-orange-600" />
              )}
            </div>
            <div>
              <DialogTitle>
                {isUpgrade ? 'Limite atteinte' : 'Crédits SMS épuisés'}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription>
            {reason}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="text-sm text-muted-foreground">
            {isUpgrade ? (
              <p>
                Vous allez être redirigé vers notre page d'abonnements pour choisir un plan adapté à vos besoins.
              </p>
            ) : (
              <p>
                Vous allez être redirigé vers notre page d'abonnements pour acheter des crédits SMS supplémentaires.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            {isUpgrade ? (
              <CreditCard className="h-4 w-4" />
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
            {isUpgrade ? 'Voir les plans' : 'Acheter des SMS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}