import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PackageOpen, CheckCircle2, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useLoanerLoans } from '@/hooks/useLoanerLoans';
import { LOANER_CATEGORIES } from '@/hooks/useLoanerEquipment';
import { LoanerPickerDialog } from './LoanerPickerDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  savCaseId: string;
  customerId?: string | null;
}

export function SAVLoanerCard({ savCaseId, customerId }: Props) {
  const { loans, activeLoan, createLoan, returnLoan, deleteLoan } = useLoanerLoans(savCaseId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState('');
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [expectedReturn, setExpectedReturn] = useState('');


  const categoryLabel = (cat: string) =>
    LOANER_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  const handlePick = async (eq: any) => {
    await createLoan({
      equipment_id: eq.id,
      sav_case_id: savCaseId,
      customer_id: customerId || null,
      expected_return_at: expectedReturn || null,
    });
    setExpectedReturn('');
  };

  const handleReturn = async () => {
    if (!activeLoan) return;
    await returnLoan({
      id: activeLoan.id,
      return_condition: returnCondition || null,
      notes: returnNotes || activeLoan.notes,
    });
    setReturnOpen(false);
    setReturnCondition('');
    setReturnNotes('');
  };

  const pastLoans = loans.filter((l) => l.returned_at);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="h-5 w-5" /> Matériel de prêt
          </CardTitle>
          {!activeLoan && (
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Prêter du matériel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeLoan && activeLoan.equipment ? (
          <div className="p-3 border-2 border-orange-500/30 bg-orange-500/5 rounded-lg space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-orange-500 text-white">EN COURS</Badge>
                  <span className="font-medium">{activeLoan.equipment.name}</span>
                  <Badge variant="outline" className="text-xs">{categoryLabel(activeLoan.equipment.category)}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {[activeLoan.equipment.brand, activeLoan.equipment.model].filter(Boolean).join(' ') || '—'}
                </div>
                {(activeLoan.equipment.imei || activeLoan.equipment.serial_number) && (
                  <div className="text-xs font-mono text-muted-foreground">
                    {activeLoan.equipment.imei && <span>IMEI: {activeLoan.equipment.imei}</span>}
                    {activeLoan.equipment.imei && activeLoan.equipment.serial_number && <span> · </span>}
                    {activeLoan.equipment.serial_number && <span>SN: {activeLoan.equipment.serial_number}</span>}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Prêté le {format(new Date(activeLoan.loaned_at), 'dd/MM/yyyy', { locale: fr })}
                  {activeLoan.expected_return_at && (
                    <> · Retour prévu le {format(new Date(activeLoan.expected_return_at), 'dd/MM/yyyy', { locale: fr })}</>
                  )}
                </div>
              </div>
              <Button size="sm" onClick={() => setReturnOpen(true)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Marquer rendu
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucun matériel actuellement prêté pour ce SAV.
          </p>
        )}

        {pastLoans.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Historique</p>
            <div className="space-y-1">
              {pastLoans.map((l) => (
                <div key={l.id} className="text-xs p-2 border rounded flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{l.equipment?.name || '—'}</span>
                    <span className="text-muted-foreground ml-2">
                      du {format(new Date(l.loaned_at), 'dd/MM/yy', { locale: fr })}
                      {' au '}
                      {l.returned_at && format(new Date(l.returned_at), 'dd/MM/yy', { locale: fr })}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteLoan(l.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <LoanerPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePick}
      />

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retour du matériel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>État au retour</Label>
              <Input
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                placeholder="ex. RAS, écran rayé…"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Annuler</Button>
            <Button onClick={handleReturn}>Confirmer le retour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
