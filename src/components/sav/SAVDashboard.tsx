import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SAVForm } from './SAVForm';
import { useSAVCases } from '@/hooks/useSAVCases';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig = {
  pending: { label: 'En attente', variant: 'secondary' as const },
  in_progress: { label: 'En cours', variant: 'default' as const },
  testing: { label: 'En test', variant: 'default' as const },
  ready: { label: 'Prêt', variant: 'default' as const },
  delivered: { label: 'Livré', variant: 'default' as const },
  cancelled: { label: 'Annulé', variant: 'destructive' as const },
};

export function SAVDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { cases, loading, updateCaseStatus, deleteCase } = useSAVCases();
  const navigate = useNavigate();

  const filteredCases = cases.filter(
    (case_) =>
      case_.customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.device_brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un dossier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtres
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SAV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cases.length}</div>
            <p className="text-xs text-muted-foreground">Dossiers créés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cases.filter(c => c.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">Réparations actives</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prêts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cases.filter(c => c.status === 'ready').length}
            </div>
            <p className="text-xs text-muted-foreground">À récupérer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA du mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cases.filter(c => c.sav_type !== 'internal').reduce((acc, c) => acc + (c.total_cost || 0), 0).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dossiers SAV récents</CardTitle>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau SAV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer un nouveau dossier SAV</DialogTitle>
                </DialogHeader>
                <SAVForm onSuccess={() => setIsFormOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Gérez vos dossiers de réparation et leur statut
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement des dossiers...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Dossier</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((case_) => (
                  <TableRow key={case_.id}>
                    <TableCell className="font-medium">{case_.case_number}</TableCell>
                    <TableCell>
                      {case_.customer 
                        ? `${case_.customer.first_name} ${case_.customer.last_name}`
                        : 'SAV Interne'
                      }
                    </TableCell>
                    <TableCell>{case_.device_brand} {case_.device_model}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[case_.status].variant}>
                        {statusConfig[case_.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(case_.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>{(case_.total_cost || 0).toFixed(2)}€</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/sav/${case_.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/sav/${case_.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer ce dossier SAV ?')) {
                                deleteCase(case_.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}