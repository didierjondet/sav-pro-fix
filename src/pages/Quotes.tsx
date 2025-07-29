import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuotes, Quote } from '@/hooks/useQuotes';
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

export default function Quotes() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  
  const { quotes, loading, createQuote, deleteQuote, updateQuote } = useQuotes();
  const { toast } = useToast();

  const filteredQuotes = quotes.filter(quote =>
    quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateQuote = async (data: any) => {
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
      generateQuotePDF(quote);
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
    const result = await updateQuote(quote.id, { status: newStatus });
    if (!result.error) {
      let description = `Le devis ${quote.quote_number} est maintenant ${getStatusText(newStatus)}`;
      
      // Message spécial pour les devis acceptés
      if (newStatus === 'accepted') {
        description += '. Le client sera automatiquement ajouté à votre base de données.';
      }
      
      toast({
        title: "Statut mis à jour",
        description: description,
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
                                  <h3 className="font-semibold text-lg">{quote.customer_name}</h3>
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
                  onSubmit={handleCreateQuote}
                  onCancel={() => setShowForm(false)}
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
              <Dialog open={!!deletingQuote} onOpenChange={() => setDeletingQuote(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Supprimer le devis</DialogTitle>
                    <DialogDescription>
                      Êtes-vous sûr de vouloir supprimer le devis "{deletingQuote?.quote_number}" ? 
                      Cette action est irréversible.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeletingQuote(null)}>
                      Annuler
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteQuote}>
                      Supprimer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}