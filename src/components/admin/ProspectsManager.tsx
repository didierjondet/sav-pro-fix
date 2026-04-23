import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Mail,
  Phone,
  Building2,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Archive,
  Trash2,
  Search,
  UserPlus,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { ProspectRedirectToggle } from './ProspectRedirectToggle';

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  interested_in_beta: boolean;
  interested_in_recontact: boolean;
  interested_in_demo: boolean;
  free_message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: 'Nouveau', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  contacted: { label: 'Contacté', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  converted: { label: 'Converti', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  archived: { label: 'Archivé', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) return 'à l\'instant';
    return `il y a ${diffHours}h`;
  }
  if (diffDays === 1) return 'hier';
  if (diffDays < 30) return `il y a ${diffDays} jours`;
  const diffMonths = Math.floor(diffDays / 30);
  return `il y a ${diffMonths} mois`;
}

export function ProspectsManager() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [interestFilter, setInterestFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProspects(data || []);
    } catch (err: any) {
      console.error('Error fetching prospects:', err);
      toast.error('Erreur lors du chargement des prospects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      toast.success('Statut mis à jour');
      setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteProspect = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('prospects').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success('Prospect supprimé');
      setProspects((prev) => prev.filter((p) => p.id !== deleteId));
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (interestFilter === 'beta' && !p.interested_in_beta) return false;
      if (interestFilter === 'recontact' && !p.interested_in_recontact) return false;
      if (interestFilter === 'demo' && !p.interested_in_demo) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const blob = `${p.first_name} ${p.last_name} ${p.company_name} ${p.email}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [prospects, search, statusFilter, interestFilter]);

  const counts = useMemo(() => {
    return {
      total: prospects.length,
      new: prospects.filter((p) => p.status === 'new').length,
      contacted: prospects.filter((p) => p.status === 'contacted').length,
      converted: prospects.filter((p) => p.status === 'converted').length,
      archived: prospects.filter((p) => p.status === 'archived').length,
    };
  }, [prospects]);

  return (
    <div className="space-y-6">
      <ProspectRedirectToggle />
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Prospects
          </h2>
          <p className="text-muted-foreground mt-1">
            Demandes de contact reçues depuis la landing page publique
          </p>
        </div>
        <Button variant="outline" onClick={fetchProspects} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{counts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-blue-600">Nouveaux</p>
            <p className="text-2xl font-bold">{counts.new}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-amber-600">Contactés</p>
            <p className="text-2xl font-bold">{counts.contacted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600">Convertis</p>
            <p className="text-2xl font-bold">{counts.converted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Archivés</p>
            <p className="text-2xl font-bold">{counts.archived}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, entreprise, email)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="new">Nouveaux</SelectItem>
            <SelectItem value="contacted">Contactés</SelectItem>
            <SelectItem value="converted">Convertis</SelectItem>
            <SelectItem value="archived">Archivés</SelectItem>
          </SelectContent>
        </Select>
        <Select value={interestFilter} onValueChange={setInterestFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Intérêt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous intérêts</SelectItem>
            <SelectItem value="beta">Beta testeur</SelectItem>
            <SelectItem value="recontact">Recontact</SelectItem>
            <SelectItem value="demo">Démo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {prospects.length === 0
              ? 'Aucun prospect pour le moment.'
              : 'Aucun prospect ne correspond aux filtres.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((p) => {
            const statusInfo = STATUS_LABELS[p.status] || STATUS_LABELS.new;
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {p.first_name} {p.last_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {p.company_name}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {p.interested_in_beta && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                        Beta testeur
                      </Badge>
                    )}
                    {p.interested_in_recontact && (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                        Recontact
                      </Badge>
                    )}
                    {p.interested_in_demo && (
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">
                        Démo
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <a
                      href={`mailto:${p.email}`}
                      className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.email}
                    </a>
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.phone}
                      </a>
                    )}
                  </div>

                  {p.free_message && (
                    <div className="rounded-md bg-muted/50 p-2.5 text-sm">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="whitespace-pre-wrap">{p.free_message}</p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Reçu {relativeDate(p.created_at)}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {p.status !== 'contacted' && p.status !== 'converted' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(p.id, 'contacted')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Marquer contacté
                      </Button>
                    )}
                    {p.status !== 'converted' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(p.id, 'converted')}
                        className="text-emerald-700 hover:text-emerald-800"
                      >
                        Converti
                      </Button>
                    )}
                    {p.status !== 'archived' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(p.id, 'archived')}
                      >
                        <Archive className="h-3.5 w-3.5 mr-1.5" />
                        Archiver
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteId(p.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les coordonnées seront définitivement effacées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProspect} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
