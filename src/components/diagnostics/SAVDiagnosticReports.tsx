import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { diagPublicUrl, gradeInfo } from '@/lib/diagnostics';

/** "Diagnostics" block in a SAV: DiagStation reports linked to this case (hidden when none). */
export function SAVDiagnosticReports({ savCaseId }: { savCaseId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (supabase as any).from('device_diagnostics').select('id, public_token, grade, fail_count, created_at')
      .eq('sav_case_id', savCaseId).order('created_at', { ascending: false })
      .then(({ data }: any) => setRows(data ?? []));
  }, [savCaseId]);
  if (!rows.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Diagnostics</CardTitle></CardHeader>
      <CardContent className="divide-y">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: gradeInfo(r.grade).gradient }}>{r.grade ?? '–'}</span>
            <span className="flex-1">{new Date(r.created_at).toLocaleString('fr-FR')} · {r.fail_count ?? 0} défaut(s)</span>
            <a className="text-primary inline-flex items-center gap-1" href={diagPublicUrl(r.public_token)} target="_blank" rel="noreferrer">Voir le rapport <ExternalLink className="h-3 w-3" /></a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
