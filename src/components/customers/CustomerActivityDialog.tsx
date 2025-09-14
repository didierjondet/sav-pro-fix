import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCustomerActivity } from '@/hooks/useCustomerActivity';
import { Customer } from '@/hooks/useCustomers';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { 
  FileText, 
  Wrench, 
  Euro, 
  TrendingUp, 
  Calendar,
  Activity,
  Receipt,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface CustomerActivityDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerActivityDialog({ customer, open, onOpenChange }: CustomerActivityDialogProps) {
  const { activities, stats, loading } = useCustomerActivity(customer?.id || '');
  const { getStatusInfo } = useShopSAVStatuses();

  // Configuration de fallback pour les statuts non-SAV (devis)
  const quoteStatusConfig = {
    draft: { label: 'Brouillon', variant: 'outline' as const },
    sent: { label: 'Envoyé', variant: 'default' as const },
    accepted: { label: 'Accepté', variant: 'default' as const },
    rejected: { label: 'Refusé', variant: 'destructive' as const },
  };

  const getStatusDisplay = (status: string, type: 'sav' | 'quote') => {
    if (type === 'sav') {
      const statusInfo = getStatusInfo(status);
      return {
        label: statusInfo.label,
        variant: 'default' as const
      };
    } else {
      return quoteStatusConfig[status as keyof typeof quoteStatusConfig] || { label: status, variant: 'secondary' as const };
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activité de {customer.first_name} {customer.last_name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center">Chargement...</div>
        ) : (
          <div className="space-y-6">
            {/* Statistiques */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                      <p className="text-lg font-bold text-green-600">
                        {stats.total_revenue.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bénéfice</p>
                      <p className="text-lg font-bold text-blue-600">
                        {stats.total_profit.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">SAV</p>
                      <p className="text-lg font-bold">{stats.total_sav}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Devis acceptés</p>
                      <p className="text-lg font-bold">
                        {stats.accepted_quotes}/{stats.total_quotes}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Liste des activités */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Historique des activités</h3>
              
              {activities.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune activité enregistrée</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {activity.type === 'sav' ? (
                              <Wrench className="h-5 w-5 text-orange-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-purple-600" />
                            )}
                            <div>
                              <h4 className="font-medium">
                                {activity.type === 'sav' ? (
                                  <Link to={`/sav/${activity.id}`} className="text-primary underline-offset-4 hover:underline">
                                    SAV {activity.number}
                                  </Link>
                                ) : (
                                  <Link to={`/quotes`} className="text-primary underline-offset-4 hover:underline">
                                    Devis {activity.number}
                                  </Link>
                                )}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {activity.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {(() => {
                              const statusDisplay = getStatusDisplay(activity.status, activity.type);
                              return (
                                <Badge variant={statusDisplay.variant}>
                                  {statusDisplay.label}
                                </Badge>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {format(new Date(activity.date), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Receipt className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Total: {activity.total_cost.toFixed(2)}€
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3 text-green-600" />
                            <span className="text-green-600 font-medium">
                              CA: {activity.revenue.toFixed(2)}€
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-blue-600" />
                            <span className="text-blue-600 font-medium">
                              Profit: {activity.profit.toFixed(2)}€
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}