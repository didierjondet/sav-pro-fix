import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PackageOpen, CheckCircle2, Calendar as CalendarIcon, Plus, Save, Trash2 } from 'lucide-react';
import { useLoanerLoans, type LoanerLoan } from '@/hooks/useLoanerLoans';
import { LOANER_CATEGORIES } from '@/hooks/useLoanerEquipment';
import { LoanerPickerDialog } from './LoanerPickerDialog';
import { LoanerConditionPhotos } from '@/components/settings/loaner/LoanerConditionPhotos';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  savCaseId: string;
  customerId?: string | null;
}

export function SAVLoanerCard({ savCaseId, customerId }: Props) {
  const { loans, createLoan, returnLoan, updateLoan, deleteLoan } = useLoanerLoans(savCaseId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<LoanerLoan | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState('');
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

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

  const openReturn = (loan: LoanerLoan) => {
    setReturnTarget(loan);
    setReturnCondition('');
    setReturnNotes(loan.notes || '');
    setReturnPhotos([]);
  };

  const handleReturn = async () => {
    if (!returnTarget) return;
    await returnLoan({
      id: returnTarget.id,
      return_condition: returnCondition || null,
      notes: returnNotes || returnTarget.notes,
      return_photos: returnPhotos,
    });
    setReturnTarget(null);
    setReturnCondition('');
    setReturnNotes('');
    setReturnPhotos([]);
  };

  const activeLoans = loans.filter((l) => !l.returned_at);
  const pastLoans = loans.filter((l) => l.returned_at);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="h-5 w-5" /> Matériel de prêt
          </CardTitle>
          <Button size="sm" onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {activeLoans.length > 0 ? 'Attribuer un autre appareil' : 'Prêter du matériel'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeLoans.length > 0 ? (
          activeLoans.map((loan) => (
            <div key={loan.id} className="p-3 border-2 border-orange-500/30 bg-orange-500/5 rounded-lg space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-orange-500 text-white">EN COURS</Badge>
                    <span className="font-medium">{loan.equipment?.name || '—'}</span>
                    {loan.equipment?.category && (
                      <Badge variant="outline" className="text-xs">{categoryLabel(loan.equipment.category)}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {[loan.equipment?.brand, loan.equipment?.model].filter(Boolean).join(' ') || '—'}
                  </div>
                  {(loan.equipment?.imei || loan.equipment?.serial_number) && (
                    <div className="text-xs font-mono text-muted-foreground">
                      {loan.equipment?.imei && <span>IMEI: {loan.equipment.imei}</span>}
                      {loan.equipment?.imei && loan.equipment?.serial_number && <span> · </span>}
                      {loan.equipment?.serial_number && <span>SN: {loan.equipment.serial_number}</span>}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Prêté le {format(new Date(loan.loaned_at), 'dd/MM/yyyy', { locale: fr })}
                    {loan.expected_return_at && (
                      <> · Retour prévu le {format(new Date(loan.expected_return_at), 'dd/MM/yyyy', { locale: fr })}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => openReturn(loan)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Marquer rendu
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteLoan(loan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notes du prêt</Label>
                <Textarea
                  rows={2}
                  placeholder="Accessoires remis, caution, état, consignes…"
                  value={notesDraft[loan.id] ?? loan.notes ?? ''}
                  onChange={(e) => setNotesDraft({ ...notesDraft, [loan.id]: e.target.value })}
                />
                {(notesDraft[loan.id] ?? loan.notes ?? '') !== (loan.notes ?? '') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await updateLoan({ id: loan.id, notes: notesDraft[loan.id] ?? '' });
                      setNotesDraft((d) => {
                        const next = { ...d };
                        delete next[loan.id];
                        return next;
                      });
                    }}
                  >
                    <Save className="h-4 w-4 mr-1" /> Enregistrer les notes
                  </Button>
                )}
              </div>
            </div>
          ))
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
                  <div className="min-w-0">
                    <span className="font-medium">{l.equipment?.name || '—'}</span>
                    <span className="text-muted-foreground ml-2">
                      du {format(new Date(l.loaned_at), 'dd/MM/yy', { locale: fr })}
                      {' au '}
                      {l.returned_at && format(new Date(l.returned_at), 'dd/MM/yy', { locale: fr })}
                    </span>
                    {l.notes && <div className="text-muted-foreground italic mt-0.5 break-words">{l.notes}</div>}
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

      <Dialog open={!!returnTarget} onOpenChange={(o) => !o && setReturnTarget(null)}>
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
            <LoanerConditionPhotos value={returnPhotos} onChange={setReturnPhotos} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Annuler</Button>
            <Button onClick={handleReturn}>Confirmer le retour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
