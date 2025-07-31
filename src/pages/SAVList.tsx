import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SAVDashboard } from '@/components/sav/SAVDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShop } from '@/hooks/useShop';
import { formatDelayText, calculateSAVDelay } from '@/hooks/useSAVDelay';
import { SAVQRCodePrint } from '@/components/sav/SAVQRCodePrint';
import { SMSTrackingButton } from '@/components/sms/SMSTrackingButton';
import { 
  Eye, 
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  User,
  Trash2,
  QrCode,
  MessageSquare
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
  const [qrCodeCase, setQrCodeCase] = useState(null);
  const { cases, loading, deleteCase } = useSAVCases();
  const { shop } = useShop();
  const navigate = useNavigate();

  // Calculer les informations de délai pour tous les cas et trier par priorité
  const casesWithDelayInfo = useMemo(() => {
    const casesWithDelay = cases.map((case_) => ({
      ...case_,
      delayInfo: calculateSAVDelay(case_, shop)
    }));

    // Trier par priorité : 
    // 1. SAV en retard (isOverdue = true) en premier
    // 2. Ensuite par temps restant croissant (le moins de temps restant en premier)
    // 3. Enfin les SAV livrés ou annulés à la fin
    return casesWithDelay.sort((a, b) => {
      // Les SAV livrés ou annulés vont à la fin
      const aCompleted = a.status === 'delivered' || a.status === 'cancelled';
      const bCompleted = b.status === 'delivered' || b.status === 'cancelled';
      
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && bCompleted) return 0; // Garder l'ordre existant pour les complétés
      
      // Pour les SAV actifs, trier par urgence
      // 1. SAV en retard en premier
      if (a.delayInfo.isOverdue && !b.delayInfo.isOverdue) return -1;
      if (!a.delayInfo.isOverdue && b.delayInfo.isOverdue) return 1;
      
      // 2. Si les deux sont en retard ou non en retard, trier par temps restant
      return a.delayInfo.totalRemainingHours - b.delayInfo.totalRemainingHours;
    });
  }, [cases, shop]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center py-8">Chargement...</div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Dossiers SAV</h1>
                <Button onClick={() => navigate('/sav/new')}>
                  Nouveau dossier SAV
                </Button>
              </div>

          <div className="grid gap-4">
            {casesWithDelayInfo.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Aucun dossier SAV trouvé</p>
                  <Button className="mt-4" onClick={() => navigate('/sav/new')}>
                    Créer le premier dossier
                  </Button>
                </CardContent>
              </Card>
            ) : (
              casesWithDelayInfo.map((savCase) => {
                const isUrgent = savCase.delayInfo.isOverdue;
                const isHighPriority = !isUrgent && savCase.delayInfo.totalRemainingHours <= 24; // Moins de 24h restantes
                const cardClassName = `hover:shadow-md transition-shadow ${
                  isUrgent ? 'border-l-4 border-l-red-500 bg-red-50/30' : 
                  isHighPriority ? 'border-l-4 border-l-orange-500 bg-orange-50/30' : ''
                }`;
                
                return (
                <Card key={savCase.id} className={cardClassName}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            {isUrgent && <AlertCircle className="h-5 w-5 text-red-500" />}
                            {isHighPriority && !isUrgent && <Clock className="h-5 w-5 text-orange-500" />}
                            <h3 className="font-semibold text-lg">
                              #{savCase.case_number}
                            </h3>
                          </div>
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
                            <span className={
                              isUrgent ? 'text-red-600 font-semibold' :
                              isHighPriority ? 'text-orange-600 font-medium' : ''
                            }>
                              {formatDelayText(savCase.delayInfo)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="mt-2 text-sm line-clamp-2">
                          {savCase.problem_description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/sav/${savCase.id}`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        
                        {savCase.sav_type === 'client' && savCase.customer?.phone && savCase.tracking_slug && (
                          <SMSTrackingButton
                            recipientPhone={savCase.customer.phone}
                            recipientName={`${savCase.customer.first_name} ${savCase.customer.last_name}`}
                            trackingUrl={`${window.location.origin}/track/${savCase.tracking_slug}`}
                            type="tracking"
                            recordId={savCase.id}
                            variant="outline"
                            size="sm"
                          />
                        )}
                        
                        {savCase.sav_type === 'client' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <QrCode className="h-4 w-4 mr-1" />
                                QR Code
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Impression QR Code - Dossier {savCase.case_number}</DialogTitle>
                              </DialogHeader>
                              <SAVQRCodePrint 
                                savCase={savCase} 
                                onClose={() => {}} 
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer ce dossier SAV ?')) {
                              deleteCase(savCase.id);
                            }
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}
          </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}