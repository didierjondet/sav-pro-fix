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

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, FileSpreadsheet, FileText, Filter, TrendingUp, TrendingDown, DollarSign, ChevronDown } from 'lucide-react';
import { useReportData, PeriodType } from '@/hooks/useReportData';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { cn } from '@/lib/utils';
import { ReportChartsSection, AVAILABLE_REPORT_WIDGETS } from '@/components/reports/ReportChartsSection';
import { Label } from '@/components/ui/label';

export default function Reports() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('current_month');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['ready']);
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(['monthly-comparison']);

  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets(prev => 
      prev.includes(widgetId) 
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

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

  const exportToPDF = () => {
    // Add print-specific styles temporarily
    const printStyleId = 'report-print-styles';
    let printStyle = document.getElementById(printStyleId) as HTMLStyleElement | null;
    
    if (!printStyle) {
      printStyle = document.createElement('style');
      printStyle.id = printStyleId;
      document.head.appendChild(printStyle);
    }
    
    printStyle.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-report-area, .print-report-area * {
          visibility: visible;
        }
        .print-report-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          padding: 0 !important;
          font-size: 9px !important;
        }
        .no-print, header, nav, .sidebar, button, [data-sidebar] {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
        
        /* Tableau - mise en page optimisée */
        .print-report-area table {
          width: 100% !important;
          table-layout: fixed !important;
          font-size: 8px !important;
          border-collapse: collapse !important;
        }
        .print-report-area th,
        .print-report-area td {
          padding: 3px 4px !important;
          font-size: 8px !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          white-space: normal !important;
          overflow-wrap: break-word !important;
          vertical-align: top !important;
        }
        
        /* Largeurs fixes des colonnes */
        .print-report-area th:nth-child(1),
        .print-report-area td:nth-child(1) { width: 8% !important; } /* N° SAV */
        .print-report-area th:nth-child(2),
        .print-report-area td:nth-child(2) { width: 7% !important; } /* Date */
        .print-report-area th:nth-child(3),
        .print-report-area td:nth-child(3) { width: 12% !important; } /* Client */
        .print-report-area th:nth-child(4),
        .print-report-area td:nth-child(4) { width: 8% !important; } /* Statut */
        .print-report-area th:nth-child(5),
        .print-report-area td:nth-child(5) { width: 14% !important; } /* Appareil */
        .print-report-area th:nth-child(6),
        .print-report-area td:nth-child(6) { width: 10% !important; } /* SKU */
        .print-report-area th:nth-child(7),
        .print-report-area td:nth-child(7) { width: 13% !important; } /* IMEI */
        .print-report-area th:nth-child(8),
        .print-report-area td:nth-child(8) { width: 9% !important; } /* Coût */
        .print-report-area th:nth-child(9),
        .print-report-area td:nth-child(9) { width: 9% !important; } /* Prix */
        .print-report-area th:nth-child(10),
        .print-report-area td:nth-child(10) { width: 10% !important; } /* Marge */
        
        /* Ligne des pièces - retour à la ligne */
        .print-report-area td[colspan] {
          width: 100% !important;
        }
        .print-report-area .flex-wrap,
        .print-report-area .flex.flex-wrap {
          flex-wrap: wrap !important;
          display: flex !important;
        }
        .print-report-area .flex-wrap > span,
        .print-report-area .flex.flex-wrap > span {
          margin-bottom: 2px !important;
          white-space: normal !important;
          word-break: break-word !important;
        }
        
        /* Éviter les coupures */
        .print-report-area tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .print-report-area .card,
        .print-report-area [class*="Card"] {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* En-têtes de sections */
        .print-report-area [class*="CardHeader"] {
          padding: 6px 8px !important;
          font-size: 10px !important;
        }
        
        /* Graphiques */
        .recharts-wrapper, .recharts-surface, svg {
          overflow: visible !important;
        }
        .recharts-wrapper {
          width: 100% !important;
          max-width: 100% !important;
        }
        
        /* Badges et éléments inline */
        .print-report-area [class*="Badge"] {
          font-size: 7px !important;
          padding: 1px 4px !important;
        }
        
        /* Liens */
        .print-report-area a {
          text-decoration: none !important;
          color: inherit !important;
        }
        
        @page {
          margin: 8mm;
          size: A4 landscape;
        }
      }
    `;
    
    // Add class to the main content area
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.classList.add('print-report-area');
    }
    
    // Trigger print
    window.print();
    
    // Remove class after printing
    setTimeout(() => {
      if (mainContent) {
        mainContent.classList.remove('print-report-area');
      }
    }, 1000);
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Rapports</h1>
              <p className="text-muted-foreground">Analyse détaillée de vos SAV</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToPDF} disabled={loading || data.items.length === 0} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Exporter PDF
              </Button>
              <Button onClick={exportToExcel} disabled={loading || data.items.length === 0}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exporter Excel
              </Button>
            </div>
          </div>

          {/* Print header - visible only when printing */}
          <div className="hidden print-only mb-6">
            <h1 className="text-2xl font-bold mb-4">Rapport SAV</h1>
            <div className="border rounded-lg p-4 bg-muted/30 space-y-2 text-sm">
              <p><strong>Période :</strong> {periodLabel}</p>
              <p><strong>Types SAV :</strong> {selectedTypes.length > 0 ? selectedTypes.map(t => getTypeInfo(t).label).join(', ') : 'Tous les types'}</p>
              <p><strong>Statuts :</strong> {selectedStatuses.length > 0 ? selectedStatuses.map(s => getStatusInfo(s)?.label).join(', ') : 'Tous les statuts'}</p>
              {selectedWidgets.length > 0 && (
                <p><strong>Graphiques inclus :</strong> {selectedWidgets.map(w => AVAILABLE_REPORT_WIDGETS.find(aw => aw.id === w)?.name).join(', ')}</p>
              )}
            </div>
          </div>

          {/* Filters */}
          <Card className="no-print">
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
                    <SelectContent className="z-[100]" position="popper" sideOffset={5}>
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
                  <PopoverContent className="w-[250px] p-0 z-[100]" align="start" sideOffset={5}>
                    <div className="max-h-[250px] overflow-y-auto p-3">
                      <div className="space-y-2">
                        {allTypes.map(type => (
                          <label key={type.type_key} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded">
                            <Checkbox
                              checked={selectedTypes.includes(type.type_key)}
                              onCheckedChange={() => handleTypeToggle(type.type_key)}
                            />
                            <span className="text-sm">{type.type_label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {selectedTypes.length > 0 && (
                      <div className="border-t p-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedTypes([])}
                        >
                          Effacer les filtres
                        </Button>
                      </div>
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
                  <PopoverContent className="w-[250px] p-0 z-[100]" align="start" sideOffset={5}>
                    <div className="max-h-[250px] overflow-y-auto p-3">
                      <div className="space-y-2">
                        {[...allStatuses].sort((a, b) => {
                          const aIsReady = a.status_key === 'ready' || a.status_label.toLowerCase() === 'prêt';
                          const bIsReady = b.status_key === 'ready' || b.status_label.toLowerCase() === 'prêt';
                          if (aIsReady && !bIsReady) return -1;
                          if (!aIsReady && bIsReady) return 1;
                          return 0;
                        }).map(status => (
                          <label key={status.status_key} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded">
                            <Checkbox
                              checked={selectedStatuses.includes(status.status_key)}
                              onCheckedChange={() => handleStatusToggle(status.status_key)}
                            />
                            <span className="text-sm">{status.status_label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {selectedStatuses.length > 0 && (
                      <div className="border-t p-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedStatuses([])}
                        >
                          Effacer les filtres
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Widgets to include */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">Graphiques à inclure dans le rapport</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {AVAILABLE_REPORT_WIDGETS.map(widget => (
                    <label key={widget.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded">
                      <Checkbox
                        checked={selectedWidgets.includes(widget.id)}
                        onCheckedChange={() => toggleWidget(widget.id)}
                      />
                      <span className="text-sm">{widget.name}</span>
                    </label>
                  ))}
                </div>
                {selectedWidgets.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedWidgets([])}
                    >
                      Tout désélectionner
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedWidgets(AVAILABLE_REPORT_WIDGETS.map(w => w.id))}
                    >
                      Tout sélectionner
                    </Button>
                  </div>
                )}
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

          {/* Charts Section */}
          {selectedWidgets.length > 0 && (
            <ReportChartsSection 
              selectedWidgets={selectedWidgets}
              dateRange={dateRange}
              reportData={data}
            />
          )}

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
