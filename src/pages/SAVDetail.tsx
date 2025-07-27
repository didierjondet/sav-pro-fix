import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SAVMessaging } from '@/components/sav/SAVMessaging';
import { SAVStatusManager } from '@/components/sav/SAVStatusManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSAVCases } from '@/hooks/useSAVCases';
import { QrCode, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SAVDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { cases, loading } = useSAVCases();
  const [savCase, setSavCase] = useState<any>(null);

  useEffect(() => {
    if (cases && id) {
      const foundCase = cases.find(c => c.id === id);
      setSavCase(foundCase);
    }
  }, [cases, id]);

  const generateTrackingUrl = () => {
    if (!savCase) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/track/${savCase.case_number}`;
  };

  const generateQRCode = async () => {
    const url = generateTrackingUrl();
    // Open QR code generator (you can integrate a QR code library here)
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`, '_blank');
  };

  const handleStatusUpdated = () => {
    // Refresh the case data
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center">Chargement...</div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (!savCase) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Dossier SAV introuvable</h1>
                <Button onClick={() => navigate('/sav')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la liste
                </Button>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    pending: { label: 'En attente', variant: 'secondary' as const },
    in_progress: { label: 'En cours', variant: 'default' as const },
    testing: { label: 'Tests', variant: 'default' as const },
    ready: { label: 'Prêt', variant: 'default' as const },
    delivered: { label: 'Livré', variant: 'default' as const },
    cancelled: { label: 'Annulé', variant: 'destructive' as const },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/sav')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">Dossier {savCase.case_number}</h1>
                    <p className="text-muted-foreground">
                      {savCase.device_brand} {savCase.device_model}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusConfig[savCase.status as keyof typeof statusConfig]?.variant || 'secondary'}>
                    {statusConfig[savCase.status as keyof typeof statusConfig]?.label || savCase.status}
                  </Badge>
                </div>
              </div>

              {/* Case Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Détails du dossier</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Type:</strong> {savCase.sav_type === 'client' ? 'Client' : 'Interne'}
                  </div>
                  <div>
                    <strong>Appareil:</strong> {savCase.device_brand} {savCase.device_model}
                  </div>
                  {savCase.device_imei && (
                    <div>
                      <strong>IMEI:</strong> {savCase.device_imei}
                    </div>
                  )}
                  <div>
                    <strong>Coût total:</strong> {savCase.total_cost}€
                  </div>
                  <div className="md:col-span-2">
                    <strong>Description du problème:</strong>
                    <p className="mt-1 text-muted-foreground">{savCase.problem_description}</p>
                  </div>
                  {savCase.repair_notes && (
                    <div className="md:col-span-2">
                      <strong>Notes de réparation:</strong>
                      <p className="mt-1 text-muted-foreground">{savCase.repair_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Client Tracking */}
              {savCase.sav_type === 'client' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Suivi client</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium">Lien de suivi</label>
                        <div className="mt-1 p-2 bg-muted rounded border text-sm break-all">
                          {generateTrackingUrl()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(generateTrackingUrl());
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Copier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateQRCode}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          QR Code
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status Management and Messaging */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SAVStatusManager 
                  savCase={savCase} 
                  onStatusUpdated={handleStatusUpdated}
                />
                <SAVMessaging 
                  savCaseId={savCase.id} 
                  savCaseNumber={savCase.case_number}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}