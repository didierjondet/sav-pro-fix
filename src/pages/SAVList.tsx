import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SAVDashboard } from '@/components/sav/SAVDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSAVCases } from '@/hooks/useSAVCases';
import { 
  Eye, 
  Edit, 
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  User
} from 'lucide-react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800', 
  testing: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'En attente',
  in_progress: 'En cours',
  testing: 'En test',
  ready: 'Prêt',
  delivered: 'Livré',
  cancelled: 'Annulé',
};

export default function SAVList() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { cases, loading } = useSAVCases();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 px-6 pb-6">
          <div className="text-center py-8">Chargement...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="md:ml-64 px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dossiers SAV</h1>
            <Button onClick={() => window.location.href = '/sav/new'}>
              Nouveau dossier SAV
            </Button>
          </div>

          <div className="grid gap-4">
            {cases.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Aucun dossier SAV trouvé</p>
                  <Button className="mt-4" onClick={() => window.location.href = '/sav/new'}>
                    Créer le premier dossier
                  </Button>
                </CardContent>
              </Card>
            ) : (
              cases.map((savCase) => (
                <Card key={savCase.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-lg">
                            #{savCase.case_number}
                          </h3>
                          <Badge className={statusColors[savCase.status]}>
                            {statusLabels[savCase.status]}
                          </Badge>
                          <Badge variant="outline">
                            {savCase.sav_type === 'client' ? 'Client' : 'Interne'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>{savCase.device_brand} {savCase.device_model}</span>
                          </div>
                          
                          {savCase.customer && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{savCase.customer.first_name} {savCase.customer.last_name}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{savCase.total_time_minutes} min</span>
                          </div>
                        </div>
                        
                        <p className="mt-2 text-sm line-clamp-2">
                          {savCase.problem_description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}