import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Edit,
} from 'lucide-react';

interface SAVCase {
  id: string;
  caseNumber: string;
  customerName: string;
  deviceBrand: string;
  deviceModel: string;
  status: 'pending' | 'in_progress' | 'testing' | 'ready' | 'delivered';
  createdAt: string;
  technician?: string;
}

const statusConfig = {
  pending: {
    label: 'En attente',
    variant: 'secondary' as const,
    icon: Clock,
  },
  in_progress: {
    label: 'En cours',
    variant: 'default' as const,
    icon: AlertCircle,
  },
  testing: {
    label: 'En test',
    variant: 'default' as const,
    icon: AlertCircle,
  },
  ready: {
    label: 'Prêt',
    variant: 'outline' as const,
    icon: CheckCircle,
  },
  delivered: {
    label: 'Livré',
    variant: 'outline' as const,
    icon: CheckCircle,
  },
};

// Mock data
const mockSAVCases: SAVCase[] = [
  {
    id: '1',
    caseNumber: '2025-01-26-001',
    customerName: 'Jean Dupont',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone 14',
    status: 'in_progress',
    createdAt: '2025-01-26T10:30:00Z',
    technician: 'Marie Martin',
  },
  {
    id: '2',
    caseNumber: '2025-01-26-002',
    customerName: 'Sophie Bernard',
    deviceBrand: 'Samsung',
    deviceModel: 'Galaxy S23',
    status: 'pending',
    createdAt: '2025-01-26T14:15:00Z',
  },
  {
    id: '3',
    caseNumber: '2025-01-25-015',
    customerName: 'Pierre Moreau',
    deviceBrand: 'Xiaomi',
    deviceModel: 'Redmi Note 12',
    status: 'ready',
    createdAt: '2025-01-25T16:45:00Z',
    technician: 'Thomas Dubois',
  },
];

export function SAVDashboard() {
  const stats = [
    {
      title: 'Total des SAV',
      value: '176',
      icon: FileText,
      description: '+12% par rapport au mois dernier',
    },
    {
      title: 'En attente',
      value: '12',
      icon: Clock,
      description: 'À traiter en priorité',
    },
    {
      title: 'En cours',
      value: '8',
      icon: AlertCircle,
      description: 'En cours de réparation',
    },
    {
      title: 'Terminés',
      value: '156',
      icon: CheckCircle,
      description: 'Ce mois-ci',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent SAV Cases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dossiers SAV récents</CardTitle>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau SAV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Dossier</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Appareil</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Technicien</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSAVCases.map((savCase) => {
                const statusInfo = statusConfig[savCase.status];
                const StatusIcon = statusInfo.icon;
                
                return (
                  <TableRow key={savCase.id}>
                    <TableCell className="font-medium">
                      {savCase.caseNumber}
                    </TableCell>
                    <TableCell>{savCase.customerName}</TableCell>
                    <TableCell>
                      {savCase.deviceBrand} {savCase.deviceModel}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {savCase.technician || (
                        <span className="text-muted-foreground">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(savCase.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}