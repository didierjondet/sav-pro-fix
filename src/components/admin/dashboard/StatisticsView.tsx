import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, HardDrive } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  email: string;
  total_sav_cases?: number;
  total_revenue?: number;
  average_case_value?: number;
  pending_cases?: number;
  in_progress_cases?: number;
  ready_cases?: number;
  delivered_cases?: number;
  storage_gb?: number;
}

interface StatisticsViewProps {
  shops: Shop[];
}

export function StatisticsView({ shops }: StatisticsViewProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <TrendingUp className="h-5 w-5" />
            Statistiques par Magasin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shops.map((shop) => (
              <Card key={shop.id} className="bg-white border-slate-200">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <h4 className="font-medium text-slate-900">{shop.name}</h4>
                      <p className="text-sm text-slate-600">{shop.email}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{shop.total_sav_cases}</div>
                      <div className="text-sm text-slate-600">Dossiers SAV</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{shop.total_revenue?.toFixed(2)}€</div>
                      <div className="text-sm text-slate-600">Chiffre d'affaires</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{shop.average_case_value?.toFixed(2)}€</div>
                      <div className="text-sm text-slate-600">Panier moyen</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 flex items-center justify-center gap-1">
                        <HardDrive className="h-5 w-5" />
                        {shop.storage_gb?.toFixed(3) || '0.000'} GB
                      </div>
                      <div className="text-sm text-slate-600">Stockage utilisé</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-yellow-600">{shop.pending_cases}</div>
                      <div className="text-slate-600">En attente</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-600">{shop.in_progress_cases}</div>
                      <div className="text-slate-600">En cours</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{shop.ready_cases}</div>
                      <div className="text-slate-600">Prêt</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-slate-600">{shop.delivered_cases}</div>
                      <div className="text-slate-600">Livré</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}