import { useState } from 'react';
import { DragDropStatistics } from '@/components/statistics/DragDropStatistics';
import { DailyAssistant } from '@/components/statistics/DailyAssistant';
import { useRolePermissions } from '@/hooks/useRolePermissions';

export default function Statistics() {
  const { rolePermissions } = useRolePermissions();
  const [period, setPeriod] = useState<'7d' | '30d' | '1m_calendar' | '3m' | '6m' | '1y'>('30d');

  // SEO basics
  if (typeof document !== 'undefined') {
    document.title = 'Statistiques SAV | Tableau de bord';
    const metaDesc = document.querySelector("meta[name='description']") || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', 'Statistiques SAV: chiffre d\'affaires, dépenses, profit, volume et état des dossiers.');
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector("link[rel='canonical']") || document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `${window.location.origin}/statistics`);
    document.head.appendChild(canonical);
  }

  if (!rolePermissions.menu_statistics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Accès non autorisé.</p>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <DailyAssistant />
              <DragDropStatistics
                period={period} 
                onPeriodChange={setPeriod}
              />
            </div>
          </main>
  );
}
