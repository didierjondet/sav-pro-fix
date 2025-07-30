import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { History, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SMSHistoryItem {
  id: string;
  to_number: string;
  message: string;
  status: string;
  type: string;
  created_at: string;
  ovh_job_id?: string;
}

export function SMSHistory() {
  const [smsHistory, setSmsHistory] = useState<SMSHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSMSHistory();
  }, []);

  const fetchSMSHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSmsHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return 'default';
      case 'failed':
      case 'error':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'quote':
        return 'Devis';
      case 'sav':
        return 'SAV';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique SMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique SMS
        </CardTitle>
      </CardHeader>
      <CardContent>
        {smsHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun SMS envoyé pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {smsHistory.map((sms) => (
              <div key={sms.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(sms.status)}
                    <span className="font-medium">{sms.to_number}</span>
                    <Badge variant="outline">{getTypeLabel(sms.type)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(sms.status)}>
                      {sms.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(sms.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                  {sms.message}
                </div>
                {sms.ovh_job_id && (
                  <div className="text-xs text-muted-foreground">
                    ID OVH: {sms.ovh_job_id}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}