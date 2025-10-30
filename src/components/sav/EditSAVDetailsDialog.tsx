import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EditSAVDetailsDialogProps {
  savCaseId: string;
  currentDetails: {
    device_brand?: string;
    device_model?: string;
    device_imei?: string;
    problem_description?: string;
    repair_notes?: string;
    sku?: string;
  };
  onDetailsUpdated?: () => void;
}

export function EditSAVDetailsDialog({ 
  savCaseId, 
  currentDetails,
  onDetailsUpdated 
}: EditSAVDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [deviceBrand, setDeviceBrand] = useState(currentDetails.device_brand || '');
  const [deviceModel, setDeviceModel] = useState(currentDetails.device_model || '');
  const [deviceImei, setDeviceImei] = useState(currentDetails.device_imei || '');
  const [sku, setSku] = useState(currentDetails.sku || '');
  const [problemDescription, setProblemDescription] = useState(currentDetails.problem_description || '');
  const [repairNotes, setRepairNotes] = useState(currentDetails.repair_notes || '');
  
  const { toast } = useToast();

  const handleSave = async () => {
    // Validation SKU (numérique uniquement, max 13 caractères)
    if (sku.trim() && (!/^\d+$/.test(sku.trim()) || sku.trim().length > 13)) {
      toast({
        title: "Erreur",
        description: "Le SKU doit être numérique et comporter maximum 13 caractères",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }

      const { error } = await supabase
        .from('sav_cases')
        .update({
          device_brand: deviceBrand.trim() || null,
          device_model: deviceModel.trim() || null,
          device_imei: deviceImei.trim() || null,
          sku: sku.trim() || null,
          problem_description: problemDescription.trim() || null,
          repair_notes: repairNotes.trim() || null,
          updated_by: user.id
        })
        .eq('id', savCaseId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Détails du dossier modifiés avec succès"
      });

      setOpen(false);
      onDetailsUpdated?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Réinitialiser avec les valeurs actuelles
      setDeviceBrand(currentDetails.device_brand || '');
      setDeviceModel(currentDetails.device_model || '');
      setDeviceImei(currentDetails.device_imei || '');
      setSku(currentDetails.sku || '');
      setProblemDescription(currentDetails.problem_description || '');
      setRepairNotes(currentDetails.repair_notes || '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0"
          title="Modifier les détails du dossier"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier les détails du dossier</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deviceBrand">Marque de l'appareil</Label>
              <Input
                id="deviceBrand"
                value={deviceBrand}
                onChange={(e) => setDeviceBrand(e.target.value)}
                placeholder="Ex: Apple, Samsung..."
              />
            </div>
            <div>
              <Label htmlFor="deviceModel">Modèle de l'appareil</Label>
              <Input
                id="deviceModel"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                placeholder="Ex: iPhone 13, Galaxy S21..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deviceImei">IMEI</Label>
              <Input
                id="deviceImei"
                value={deviceImei}
                onChange={(e) => setDeviceImei(e.target.value)}
                placeholder="Numéro IMEI (optionnel)"
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Code SKU (numérique, max 13)"
                maxLength={13}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="problemDescription">Description du problème</Label>
            <Textarea
              id="problemDescription"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              rows={3}
              placeholder="Décrivez le problème rencontré..."
            />
          </div>

          <div>
            <Label htmlFor="repairNotes">Notes de réparation</Label>
            <Textarea
              id="repairNotes"
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
              rows={3}
              placeholder="Notes techniques, diagnostics..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
