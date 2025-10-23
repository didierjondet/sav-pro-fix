import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Download, Eye, FileText, Package } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoice_number: string;
  shop_id: string;
  shop_name: string;
  type: 'subscription' | 'sms';
  amount_cents: number;
  vat_rate: number;
  vat_amount_cents: number;
  total_ht_cents: number;
  total_ttc_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  pdf_url: string | null;
}

export function InvoiceArchives() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'subscription' | 'sms'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      // Fetch subscription invoices
      const { data: subInvoices, error: subError } = await supabase
        .from('subscription_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (subError) throw subError;

      // Fetch SMS invoices
      const { data: smsInvoices, error: smsError } = await supabase
        .from('sms_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (smsError) throw smsError;

      // Fetch shops info separately
      const shopIds = [
        ...(subInvoices || []).map(inv => inv.shop_id),
        ...(smsInvoices || []).map(inv => inv.shop_id),
      ];
      const uniqueShopIds = [...new Set(shopIds)];

      const { data: shops } = await supabase
        .from('shops')
        .select('id, name')
        .in('id', uniqueShopIds);

      const shopsMap = new Map((shops || []).map(s => [s.id, s.name]));

      // Merge and format
      const allInvoices: Invoice[] = [
        ...(subInvoices || []).map(inv => ({
          ...inv,
          type: 'subscription' as const,
          shop_name: shopsMap.get(inv.shop_id) || 'N/A',
        })),
        ...(smsInvoices || []).map(inv => ({
          ...inv,
          type: 'sms' as const,
          shop_name: shopsMap.get(inv.shop_id) || 'N/A',
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setInvoices(allInvoices);
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
      toast.error('Impossible de charger les factures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.shop_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || inv.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2) + ' €';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      paid: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
    };

    const labels: Record<string, string> = {
      paid: 'Payée',
      pending: 'En attente',
      cancelled: 'Annulée',
    };

    return (
      <Badge variant={variants[status] || 'default'} className={status === 'paid' ? 'bg-green-600 text-white' : ''}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleDownload = async (invoice: Invoice) => {
    // TODO: Implement PDF download via edge function
    toast.info('Téléchargement de la facture ' + invoice.invoice_number);
  };

  const handleView = async (invoice: Invoice) => {
    // TODO: Open PDF in new tab
    toast.info('Ouverture de la facture ' + invoice.invoice_number);
  };

  const totalRevenue = filteredInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total_ttc_cents, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total des factures</p>
              <p className="text-2xl font-bold">{filteredInvoices.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Factures payées</p>
              <p className="text-2xl font-bold">
                {filteredInvoices.filter(inv => inv.status === 'paid').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chiffre d'affaires TTC</p>
              <p className="text-2xl font-bold">{formatAmount(totalRevenue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archives des factures</CardTitle>
          <CardDescription>
            Toutes les factures générées pour tous les magasins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Rechercher par n° de facture ou magasin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="subscription">Abonnement</SelectItem>
                <SelectItem value="sms">Achat SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Magasin</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">TTC</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Aucune facture trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>{invoice.shop_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {invoice.type === 'subscription' ? (
                              <>
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">Abonnement</span>
                              </>
                            ) : (
                              <>
                                <Package className="h-4 w-4" />
                                <span className="text-sm">SMS</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatAmount(invoice.total_ht_cents)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatAmount(invoice.vat_amount_cents)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatAmount(invoice.total_ttc_cents)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(invoice)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
