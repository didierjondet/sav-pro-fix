import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceConfigManager } from './billing/InvoiceConfigManager';
import { InvoiceNotificationConfig } from './billing/InvoiceNotificationConfig';
import { InvoiceArchives } from './billing/InvoiceArchives';
import { Settings, Bell, FileArchive } from 'lucide-react';

export function InvoiceManagement() {
  const [activeTab, setActiveTab] = useState('config');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion de la Facturation</h1>
        <p className="text-muted-foreground">
          Configuration et gestion centralisée des factures pour tous les magasins
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration des factures
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="archives" className="flex items-center gap-2">
            <FileArchive className="h-4 w-4" />
            Archives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <InvoiceConfigManager />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <InvoiceNotificationConfig />
        </TabsContent>

        <TabsContent value="archives" className="space-y-6">
          <InvoiceArchives />
        </TabsContent>
      </Tabs>
    </div>
  );
}
