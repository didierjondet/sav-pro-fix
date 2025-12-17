import { useState, useMemo, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, FileSpreadsheet, Filter, TrendingUp, TrendingDown, DollarSign, ChevronDown } from 'lucide-react';
import { useReportData, PeriodType } from '@/hooks/useReportData';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { cn } from '@/lib/utils';

export default function Reports() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('current_month');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const { types: allTypes } = useShopSAVTypes();
  const { statuses: allStatuses, getStatusInfo } = useShopSAVStatuses();

  const { data, loading, dateRange, getTypeInfo } = useReportData({
    periodType,
    startDate,
    endDate,
    selectedTypes,
    selectedStatuses
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleTypeToggle = (typeKey: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeKey) 
        ? prev.filter(t => t !== typeKey)
        : [...prev, typeKey]
    );
  };

  const handleStatusToggle = (statusKey: string) => {
    setSelectedStatuses(prev => 
      prev.includes(statusKey) 
        ? prev.filter(s => s !== statusKey)
        : [...prev, statusKey]
    );
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Create a sheet for each SAV type
    Object.entries(data.groupedByType).forEach(([typeKey, items]) => {
      const typeInfo = getTypeInfo(typeKey);
      const sheetData = items.map(item => ({
        'N° SAV': item.case_number,
        'Date': format(new Date(item.created_at), 'dd/MM/yyyy', { locale: fr }),
        'Client': item.customer_name,
        'Statut': getStatusInfo(item.status)?.label || item.status,
        'Appareil': `${item.device_brand || ''} ${item.device_model || ''}`.trim() || '-',
        'SKU': item.sku || '-',
        'IMEI': item.device_imei || '-',
        'Coût achat (€)': item.purchase_cost,
        'Prix vente (€)': item.selling_price,
        'Marge (€)': item.margin
      }));

      // Add subtotals row
      const subtotal = data.subtotals[typeKey];
      sheetData.push({
        'N° SAV': 'SOUS-TOTAL',
        'Date': '',
        'Client': `${subtotal.count} SAV`,
        'Statut': '',
        'Appareil': '',
        'SKU': '',
        'IMEI': '',
        'Coût achat (€)': subtotal.costs,
        'Prix vente (€)': subtotal.revenue,
        'Marge (€)': subtotal.margin
      });

      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, typeInfo.label.substring(0, 31)); // Excel sheet name max 31 chars
    });

    // Create synthesis sheet
    const synthesisData = [
      { 'Métrique': 'Nombre total de SAV', 'Valeur': data.totals.count },
      { 'Métrique': 'Chiffre d\'affaires total', 'Valeur': `${data.totals.revenue.toFixed(2)} €` },
      { 'Métrique': 'Coûts d\'achat totaux', 'Valeur': `${data.totals.costs.toFixed(2)} €` },
      { 'Métrique': 'Marge totale', 'Valeur': `${data.totals.margin.toFixed(2)} €` },
      { 'Métrique': '', 'Valeur': '' },
      { 'Métrique': '--- Par type de SAV ---', 'Valeur': '' }
    ];

    Object.entries(data.subtotals).forEach(([typeKey, subtotal]) => {
      const typeInfo = getTypeInfo(typeKey);
      synthesisData.push(
        { 'Métrique': `${typeInfo.label} - Nombre`, 'Valeur': subtotal.count },
        { 'Métrique': `${typeInfo.label} - CA`, 'Valeur': `${subtotal.revenue.toFixed(2)} €` },
        { 'Métrique': `${typeInfo.label} - Coûts`, 'Valeur': `${subtotal.costs.toFixed(2)} €` },
        { 'Métrique': `${typeInfo.label} - Marge`, 'Valeur': `${subtotal.margin.toFixed(2)} €` }
      );
    });

    const synthesisWs = XLSX.utils.json_to_sheet(synthesisData);
    XLSX.utils.book_append_sheet(wb, synthesisWs, 'Synthèse');

    // Generate filename with date range
    const dateStr = `${format(dateRange.start, 'yyyy-MM-dd')}_${format(dateRange.end, 'yyyy-MM-dd')}`;
    XLSX.writeFile(wb, `rapport_sav_${dateStr}.xlsx`);
  };

  const periodLabel = useMemo(() => {
    return `${format(dateRange.start, 'd MMM yyyy', { locale: fr })} - ${format(dateRange.end, 'd MMM yyyy', { locale: fr })}`;
  }, [dateRange]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Rapports</h1>
              <p className="text-muted-foreground">Analyse détaillée de vos SAV</p>
            </div>
            <Button onClick={exportToExcel} disabled={loading || data.items.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exporter Excel
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Period selection */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Période</label>
                  <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="current_month">Mois en cours</SelectItem>
                      <SelectItem value="last_month">Mois précédent</SelectItem>
                      <SelectItem value="custom">Dates personnalisées</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {periodType === 'custom' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date début</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, 'dd/MM/yyyy') : 'Sélectionner'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate || undefined}
                            onSelect={(date) => setStartDate(date || null)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date fin</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, 'dd/MM/yyyy') : 'Sélectionner'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate || undefined}
                            onSelect={(date) => setEndDate(date || null)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}
              </div>

              {/* Type and Status filters */}
              <div className="flex flex-wrap gap-4">
                {/* Types filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between min-w-[180px]">
                      Types SAV
                      <Badge variant="secondary" className="ml-2">
                        {selectedTypes.length || 'Tous'}
                      </Badge>
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-3 z-50">
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {allTypes.map(type => (
                          <label key={type.type_key} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded">
                            <Checkbox
                              checked={selectedTypes.includes(type.type_key)}
                              onCheckedChange={() => handleTypeToggle(type.type_key)}
                            />
                            <span className="text-sm">{type.type_label}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                    {selectedTypes.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => setSelectedTypes([])}
                      >
                        Effacer les filtres
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Statuses filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between min-w-[180px]">
                      Statuts
                      <Badge variant="secondary" className="ml-2">
                        {selectedStatuses.length || 'Tous'}
                      </Badge>
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-3 z-50">
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {allStatuses.map(status => (
                          <label key={status.status_key} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded">
                            <Checkbox
                              checked={selectedStatuses.includes(status.status_key)}
                              onCheckedChange={() => handleStatusToggle(status.status_key)}
                            />
                            <span className="text-sm">{status.status_label}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                    {selectedStatuses.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => setSelectedStatuses([])}
                      >
                        Effacer les filtres
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Period indicator */}
              <div className="text-sm text-muted-foreground">
                Période sélectionnée : <span className="font-medium text-foreground">{periodLabel}</span>
              </div>
            </CardContent>
          </Card>

          {/* Synthesis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(data.totals.revenue)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Coûts d'achat</p>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(data.totals.costs)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-destructive/50" />
                </div>
              </CardContent>
            </Card>
            <Card className={cn(
              "border",
              data.totals.margin >= 0 ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"
            )}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Marge</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      data.totals.margin >= 0 ? "text-green-600" : "text-destructive"
                    )}>{formatCurrency(data.totals.margin)}</p>
                  </div>
                  <DollarSign className={cn(
                    "h-8 w-8",
                    data.totals.margin >= 0 ? "text-green-500/50" : "text-destructive/50"
                  )} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data table grouped by type */}
          {loading ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Chargement des données...
              </CardContent>
            </Card>
          ) : data.items.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Aucun SAV trouvé pour les critères sélectionnés
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(data.groupedByType).map(([typeKey, items]) => {
                const typeInfo = getTypeInfo(typeKey);
                const subtotal = data.subtotals[typeKey];

                return (
                  <Card key={typeKey}>
                    <CardHeader 
                      className="py-3"
                      style={{ 
                        backgroundColor: `${typeInfo.color}15`,
                        borderBottom: `2px solid ${typeInfo.color}`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span style={{ color: typeInfo.color }}>●</span>
                          {typeInfo.label}
                        </CardTitle>
                        <Badge variant="secondary">
                          {items.length} SAV
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>N° SAV</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Appareil</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>IMEI</TableHead>
                              <TableHead className="text-right">Coût achat</TableHead>
                              <TableHead className="text-right">Prix vente</TableHead>
                              <TableHead className="text-right">Marge</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map(item => {
                              const statusInfo = getStatusInfo(item.status);
                              return (
                                <Fragment key={item.id}>
                                  <TableRow>
                                    <TableCell className="font-medium">
                                      <Link 
                                        to={`/sav/${item.id}`}
                                        className="text-primary hover:underline"
                                      >
                                        {item.case_number}
                                      </Link>
                                    </TableCell>
                                    <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                                    <TableCell>{item.customer_name}</TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant="outline"
                                        style={{
                                          backgroundColor: `${statusInfo?.color || '#666'}20`,
                                          color: statusInfo?.color || '#666',
                                          borderColor: statusInfo?.color || '#666'
                                        }}
                                      >
                                        {statusInfo?.label || item.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {item.device_brand || item.device_model 
                                        ? `${item.device_brand || ''} ${item.device_model || ''}`.trim()
                                        : '-'}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {item.sku || '-'}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                      {item.device_imei || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.purchase_cost)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.selling_price)}</TableCell>
                                    <TableCell className={cn(
                                      "text-right font-medium",
                                      item.margin >= 0 ? "text-green-600" : "text-destructive"
                                    )}>
                                      {formatCurrency(item.margin)}
                                    </TableCell>
                                  </TableRow>
                                  {item.parts.length > 0 && (
                                    <TableRow className="bg-muted/30 hover:bg-muted/40">
                                      <TableCell colSpan={10} className="py-2 px-4">
                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                          <span className="font-medium">Pièces :</span>
                                          {item.parts.map((part, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 bg-background px-2 py-0.5 rounded border">
                                              {part.name}
                                              {part.quantity > 1 && <span className="text-primary">×{part.quantity}</span>}
                                              <span className="text-muted-foreground/70">
                                                ({formatCurrency(part.purchase_price)} → {formatCurrency(part.unit_price)})
                                              </span>
                                            </span>
                                          ))}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </Fragment>
                              );
                            })}
                            {/* Subtotal row */}
                            <TableRow className="bg-muted/50 font-medium">
                              <TableCell colSpan={7}>
                                Sous-total {typeInfo.label}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(subtotal.costs)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(subtotal.revenue)}</TableCell>
                              <TableCell className={cn(
                                "text-right",
                                subtotal.margin >= 0 ? "text-green-600" : "text-destructive"
                              )}>
                                {formatCurrency(subtotal.margin)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Total bar */}
          {data.items.length > 0 && (
            <Card className="bg-muted">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="font-medium">
                    TOTAL GÉNÉRAL ({data.totals.count} SAV)
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Coûts : </span>
                      <span className="font-bold">{formatCurrency(data.totals.costs)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CA : </span>
                      <span className="font-bold text-primary">{formatCurrency(data.totals.revenue)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Marge : </span>
                      <span className={cn(
                        "font-bold",
                        data.totals.margin >= 0 ? "text-green-600" : "text-destructive"
                      )}>{formatCurrency(data.totals.margin)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
