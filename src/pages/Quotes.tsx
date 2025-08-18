import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuotes, Quote } from '@/hooks/useQuotes';
import { useShop } from '@/hooks/useShop';
import { useSAVCases } from '@/hooks/useSAVCases';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { QuoteView } from '@/components/quotes/QuoteView';
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { 
  FileText,
  Plus,
  Search,
  Mail,
  Download,
  Eye,
  Trash2,
  Calendar
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';

export default function Quotes() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const { quotes, loading, createQuote, deleteQuote, updateQuote } = useQuotes();
  const { createCase } = useSAVCases();
  const { shop } = useShop();
  const { toast } = useToast();

  const formatCustomerDisplay = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    const last = parts[parts.length - 1];
    const first = parts.slice(0, parts.length - 1).join(' ');
    return `${last.toUpperCase()} ${first.toLowerCase()}`;
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateOrUpdateQuote = async (data: any) => {
    if (editingQuote) {
      const result = await updateQuote(editingQuote.id, {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        // Infos appareil
        device_brand: data.device_brand ? data.device_brand.toUpperCase().trim() : null,
        device_model: data.device_model ? data.device_model.toUpperCase().trim() : null,
        device_imei: data.device_imei || null,
        sku: data.sku,
        problem_description: data.problem_description,
        items: data.items,
        total_amount: data.total_amount,
        status: data.status,
      });
      if (!result.error) {
        setShowForm(false);
        setEditingQuote(null);
      }
      return { data: null, error: result.error } as any;
    }
    return await createQuote(data);
  };

  const handleDeleteQuote = async () => {
    if (!deletingQuote) return;
    const { error } = await deleteQuote(deletingQuote.id);
    if (!error) {
      setDeletingQuote(null);
    }
  };

  const handleViewQuote = (quote: Quote) => {
    setViewingQuote(quote);
  };

  const handleDownloadPDF = (quote: Quote) => {
    try {
      generateQuotePDF(quote, shop);
      toast({
        title: "PDF généré",
        description: "Le PDF du devis a été généré avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = (quote: Quote) => {
    // TODO: Implémenter l'envoi d'email
    toast({
      title: "Fonctionnalité à venir",
      description: "L'envoi par email sera bientôt disponible",
    });
  };

const handleStatusChange = async (quote: Quote, newStatus: Quote['status']) => {
  if (newStatus === 'accepted') {
    setQuoteToConvert(quote);
    return;
  }
  const result = await updateQuote(quote.id, { status: newStatus });
  if (!result.error) {
    toast({
      title: "Statut mis à jour",
      description: `Le devis ${quote.quote_number} est maintenant ${getStatusText(newStatus)}`,
    });
  }
};

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending_review': return 'secondary';
      case 'sent': return 'outline';
      case 'under_negotiation': return 'secondary';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'pending_review': return 'En révision';
      case 'sent': return 'Envoyé';
      case 'under_negotiation': return 'En négociation';
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  const convertQuoteToSAV = async (type: 'client' | 'external') => {
    if (!quoteToConvert) return;
    try {
      // 0) Nettoyer les IDs invalides du devis AVANT toute opération
      const cleanQuote = {
        ...quoteToConvert,
        items: (quoteToConvert.items || []).map(item => ({
          ...item,
          part_id: item.part_id?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
            ? item.part_id 
            : null
        }))
      };

      // 1) Mettre le devis à "accepté" pour refléter l'état et nourrir les stats
      const updateRes = await updateQuote(quoteToConvert.id, { status: 'accepted' });
      if (updateRes.error) throw updateRes.error;

      // 2) Récupérer ou créer le client pour lier le SAV
      const getOrCreateCustomerId = async (): Promise<string | null> => {
        if (!shop?.id) return null;

        // Tenter de retrouver par email dans la boutique
        if (cleanQuote.customer_email) {
          const { data: existing, error: findErr } = await supabase
            .from('customers')
            .select('id')
            .eq('shop_id', shop.id)
            .eq('email', cleanQuote.customer_email)
            .maybeSingle();
          if (!findErr && existing?.id) return existing.id;
        }

        // Créer le client à partir du nom / email / téléphone du devis
        const nameParts = (cleanQuote.customer_name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || 'Client';
        const lastName = nameParts.slice(1).join(' ') || 'Devis';

        const { data: created, error: createErr } = await supabase
          .from('customers')
          .insert([
            {
              shop_id: shop.id,
              first_name: firstName,
              last_name: lastName,
              email: cleanQuote.customer_email || null,
              phone: cleanQuote.customer_phone || null,
            },
          ])
          .select('id')
          .maybeSingle();
        if (createErr) throw createErr;
        return created?.id ?? null;
      };

      const customerId = await getOrCreateCustomerId();

      // 3) Créer le dossier SAV avec le client lié
      const totalPublic =
        cleanQuote.items?.reduce(
          (sum, it) => sum + (it.total_price ?? ( (it.quantity || 0) * (it.unit_public_price || 0) )),
          0
        ) || 0;

      const savCaseData = {
        sav_type: type,
        status: 'pending',
        device_brand: (cleanQuote as any).device_brand ? (cleanQuote as any).device_brand.toUpperCase().trim() : null,
        device_model: (cleanQuote as any).device_model ? (cleanQuote as any).device_model.toUpperCase().trim() : null,
        device_imei: (cleanQuote as any).device_imei || null,
        sku: (cleanQuote as any).sku || null,
        problem_description: (cleanQuote as any).problem_description || `Créé depuis devis ${cleanQuote.quote_number}`,
        total_time_minutes: 0,
        total_cost: totalPublic,
        shop_id: shop?.id ?? null,
        customer_id: customerId,
        attachments: (cleanQuote as any).attachments || [],
      };

      const savResult = await createCase(savCaseData);
      if (savResult.error || !savResult.data) throw savResult.error ?? new Error('Création SAV échouée');

      const savCaseId = savResult.data.id;

      // 4) Insérer les lignes pièces dans sav_parts (uniquement les pièces avec des IDs valides)
      const partsToInsert = cleanQuote.items
        .filter((it) => it.part_id !== null)
        .map((it) => ({
          sav_case_id: savCaseId,
          part_id: it.part_id!,
          quantity: it.quantity || 0,
          time_minutes: 0,
          unit_price: it.unit_public_price || 0,
          purchase_price: it.unit_purchase_price ?? null,
        }));

      if (partsToInsert.length > 0) {
        const { error: partsError } = await supabase.from('sav_parts').insert(partsToInsert);
        if (partsError) throw partsError;
      }

      // 5) Supprimer le devis après conversion
      const { error: deleteErr } = await deleteQuote(quoteToConvert.id);
      if (deleteErr) throw deleteErr;

      toast({
        title: 'Conversion réussie',
        description: `Devis ${quoteToConvert.quote_number} converti en SAV ${type} avec informations client.`,
      });
      setQuoteToConvert(null);
    } catch (error: any) {
      console.error('Erreur conversion devis -> SAV:', error);
      toast({ title: 'Erreur', description: error.message ?? 'Conversion impossible', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center py-8">Chargement...</div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              {!showForm ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Gestion des devis</h1>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau devis
                    </Button>
                  </div>

                  {/* Barre de recherche */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Rechercher un devis par client ou numéro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Liste des devis */}
                  <div className="grid gap-4">
                    {filteredQuotes.length === 0 ? (
                      <Card>
                        <CardContent className="text-center py-8">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">
                            {searchTerm ? 'Aucun devis trouvé' : 'Aucun devis créé'}
                          </p>
                          {!searchTerm && (
                            <Button className="mt-4" onClick={() => setShowForm(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Créer le premier devis
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      filteredQuotes.map((quote) => (
                        <Card key={quote.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-4 mb-2">
                                  <h3 className="font-semibold text-lg">{formatCustomerDisplay(quote.customer_name)}</h3>
                                  <Badge variant="outline">
                                    {quote.quote_number}
                                  </Badge>
                                  <Badge variant={getStatusColor(quote.status)}>
                                    {getStatusText(quote.status)}
                                  </Badge>
                                  <Select
                                    value={quote.status}
                                    onValueChange={(value) => handleStatusChange(quote, value as Quote['status'])}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="draft">Brouillon</SelectItem>
                                      <SelectItem value="pending_review">En révision</SelectItem>
                                      <SelectItem value="sent">Envoyé</SelectItem>
                                      <SelectItem value="under_negotiation">En négociation</SelectItem>
                                      <SelectItem value="accepted">Accepté</SelectItem>
                                      <SelectItem value="rejected">Refusé</SelectItem>
                                      <SelectItem value="expired">Expiré</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                  <div>
                                    <span className="font-medium">Total: </span>
                                    <span className="text-lg font-bold text-foreground">
                                      {quote.total_amount.toFixed(2)}€
                                    </span>
                                  </div>
                                  
                                  {quote.customer_email && (
                                    <div>
                                      <span className="font-medium">Email: </span>
                                      <span>{quote.customer_email}</span>
                                    </div>
                                  )}
                                  
                                  {quote.customer_phone && (
                                    <div>
                                      <span className="font-medium">Téléphone: </span>
                                      <span>{quote.customer_phone}</span>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <span className="font-medium">Créé le: </span>
                                    <span>{new Date(quote.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => { setEditingQuote(quote); setShowForm(true); }}
                                >
                                  Modifier
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewQuote(quote)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Voir
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDownloadPDF(quote)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </Button>
                                {quote.customer_email && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSendEmail(quote)}
                                  >
                                    <Mail className="h-4 w-4 mr-1" />
                                    Envoyer
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeletingQuote(quote)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <QuoteForm
                  onSubmit={handleCreateOrUpdateQuote}
                  onCancel={() => { setShowForm(false); setEditingQuote(null); }}
                  initialQuote={editingQuote ?? undefined}
                  submitLabel={editingQuote ? 'Mettre à jour le devis' : 'Créer le devis'}
                  title={editingQuote ? 'Modifier le devis' : 'Nouveau devis'}
                />
              )}

{/* Dialog de vue détaillée */}
<QuoteView
  quote={viewingQuote}
  isOpen={!!viewingQuote}
  onClose={() => setViewingQuote(null)}
  onDownloadPDF={handleDownloadPDF}
  onSendEmail={handleSendEmail}
/>

{/* Dialog de suppression */}
              <Dialog open={!!deletingQuote} onOpenChange={(open) => { if (!open) setDeletingQuote(null); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Supprimer le devis</DialogTitle>
                    <DialogDescription id="delete-quote-desc">
                      Êtes-vous sûr de vouloir supprimer le devis "{deletingQuote?.quote_number}" ?
                      Cette action est irréversible.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeletingQuote(null)}>
                      Annuler
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteQuote} aria-describedby="delete-quote-desc">
                      Supprimer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

{/* Dialog de conversion en SAV */}
<Dialog open={!!quoteToConvert} onOpenChange={(open) => { if (!open) setQuoteToConvert(null); }}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Convertir en SAV</DialogTitle>
      <DialogDescription id="convert-sav-desc">
        Choisissez le type de SAV à créer pour le devis "{quoteToConvert?.quote_number}".
      </DialogDescription>
    </DialogHeader>
    <div className="flex gap-3 justify-end">
      <Button variant="outline" onClick={() => setQuoteToConvert(null)}>Annuler</Button>
      <Button onClick={() => convertQuoteToSAV('client')} aria-describedby="convert-sav-desc">SAV Client</Button>
      <Button onClick={() => convertQuoteToSAV('external')} aria-describedby="convert-sav-desc">SAV Externe</Button>
    </div>
  </DialogContent>
</Dialog>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

