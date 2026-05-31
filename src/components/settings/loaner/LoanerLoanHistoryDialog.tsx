import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEquipmentLoanHistory, useLoanerLoans } from '@/hooks/useLoanerLoans';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExternalLink, X, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoanerConditionPhotos } from './LoanerConditionPhotos';
import type { LoanerEquipment } from '@/hooks/useLoanerEquipment';


interface Props {
  equipment: LoanerEquipment | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function LoanPhotos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!paths.length) { setUrls([]); return; }
      const signed = await Promise.all(
        paths.map(async (p) => {
          const { data } = await supabase.storage.from('loaner-photos').createSignedUrl(p, 3600);
          return data?.signedUrl || '';
        })
      );
      if (!cancelled) setUrls(signed.filter(Boolean));
    })();
    return () => { cancelled = true; };
  }, [paths.join('|')]);
  if (!urls.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-1 mt-1">
        {urls.map((u, i) => (
          <button key={i} type="button" onClick={() => setPreview(u)} className="w-14 h-14 rounded border overflow-hidden">
            <img src={u} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button className="absolute top-4 right-4 text-white" onClick={() => setPreview(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  );
}

export function LoanerLoanHistoryDialog({ equipment, open, onOpenChange }: Props) {
  const { data: loans = [], isLoading } = useEquipmentLoanHistory(equipment?.id);
  const { returnLoan } = useLoanerLoans();
  const [forceReturnLoanId, setForceReturnLoanId] = useState<string | null>(null);
  const [frCondition, setFrCondition] = useState('');
  const [frNotes, setFrNotes] = useState('');
  const [frPhotos, setFrPhotos] = useState<string[]>([]);
  const [frBusy, setFrBusy] = useState(false);

  const closeForceReturn = () => {
    setForceReturnLoanId(null);
    setFrCondition('');
    setFrNotes('');
    setFrPhotos([]);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Historique des prêts — {equipment?.name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
        ) : loans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun prêt enregistré pour cet appareil.</p>
        ) : (
          <div className="space-y-2">
            {loans.map((l: any) => {
              const customer = l.customer ? `${l.customer.first_name || ''} ${l.customer.last_name || ''}`.trim() : '—';
              const photos: string[] = Array.isArray(l.return_photos) ? l.return_photos : [];
              return (
                <div key={l.id} className="border rounded-md p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {l.sav_case ? (
                        <Link to={`/sav/${l.sav_case.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                            SAV {l.sav_case.case_number} <ExternalLink className="h-3 w-3 ml-1" />
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline">Sans SAV</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">Client : {customer}</span>
                    </div>
                    {l.returned_at ? (
                      <Badge className="bg-green-600 text-white">Rendu</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-500 text-white">En cours</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setForceReturnLoanId(l.id); setFrNotes(l.notes || ''); }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Forcer le retour
                        </Button>
                      </div>
                    )}

                  </div>
                  <div className="text-xs text-muted-foreground">
                    Prêté le {format(new Date(l.loaned_at), 'dd/MM/yyyy', { locale: fr })}
                    {l.returned_at && <> · Rendu le {format(new Date(l.returned_at), 'dd/MM/yyyy', { locale: fr })}</>}
                  </div>
                  {l.loan_condition && (
                    <div className="text-xs"><strong>État au prêt :</strong> {l.loan_condition}</div>
                  )}
                  {l.return_condition && (
                    <div className="text-xs"><strong>État au retour :</strong> {l.return_condition}</div>
                  )}
                  {l.notes && (
                    <div className="text-xs whitespace-pre-wrap"><strong>Notes :</strong> {l.notes}</div>
                  )}
                  {photos.length > 0 && <LoanPhotos paths={photos} />}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
