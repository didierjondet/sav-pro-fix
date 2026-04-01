import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ScrollText, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getFieldLabel } from '@/hooks/useSAVAuditLog';

interface AuditLog {
  id: string;
  sav_case_id: string;
  action: string;
  table_name: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string;
  created_at: string;
}

export default function SAVLogs() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, actualProfile } = useProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [caseNumber, setCaseNumber] = useState('');

  const isAdmin = profile?.role === 'admin' || actualProfile?.role === 'super_admin';

  useEffect(() => {
    if (!id || !isAdmin) return;

    const fetchLogs = async () => {
      setLoading(true);

      const [logsRes, caseRes] = await Promise.all([
        supabase
          .from('sav_audit_logs' as any)
          .select('*')
          .eq('sav_case_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sav_cases')
          .select('case_number')
          .eq('id', id)
          .single(),
      ]);

      if (logsRes.data) setLogs(logsRes.data as AuditLog[]);
      if (caseRes.data) setCaseNumber(caseRes.data.case_number);
      setLoading(false);
    };

    fetchLogs();
  }, [id, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  const getActionLabel = (action: string, tableName: string) => {
    if (tableName === 'sav_parts') {
      if (action === 'insert') return 'Pièce ajoutée';
      if (action === 'delete') return 'Pièce supprimée';
      return 'Pièce modifiée';
    }
    if (tableName === 'customers') return 'Client modifié';
    if (action === 'update') return 'Modification';
    if (action === 'insert') return 'Création';
    if (action === 'delete') return 'Suppression';
    return action;
  };

  const getActionColor = (action: string) => {
    if (action === 'delete') return 'destructive';
    if (action === 'insert') return 'default';
    return 'secondary';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate(`/sav/${id}`)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au dossier
                </Button>
                <div className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-destructive" />
                  <h1 className="text-xl font-bold">Journal d'audit — {caseNumber}</h1>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Historique des modifications</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-center py-8">Chargement...</p>
                  ) : logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Aucune modification enregistrée pour ce dossier.</p>
                  ) : (
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div key={log.id} className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getActionColor(log.action) as any} className="text-xs">
                                {getActionLabel(log.action, log.table_name)}
                              </Badge>
                              {log.field_name && (
                                <span className="text-sm font-medium">{getFieldLabel(log.field_name)}</span>
                              )}
                            </div>

                            {(log.old_value || log.new_value) && (
                              <div className="text-sm space-y-0.5">
                                {log.old_value && (
                                  <p>
                                    <span className="text-muted-foreground">Avant : </span>
                                    <span className="line-through text-destructive/70">{log.old_value}</span>
                                  </p>
                                )}
                                {log.new_value && (
                                  <p>
                                    <span className="text-muted-foreground">Après : </span>
                                    <span className="font-medium text-foreground">{log.new_value}</span>
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {log.changed_by_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(log.created_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
