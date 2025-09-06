import { SystemAlertsManager } from '@/components/admin/SystemAlertsManager';

export default function SystemAlerts() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Alertes Système</h1>
        <p className="text-muted-foreground">
          Configurez les alertes automatiques pour surveiller votre plateforme
        </p>
      </div>
      
      <SystemAlertsManager />
    </div>
  );
}