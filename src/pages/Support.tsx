import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSupport, SupportTicket } from '@/hooks/useSupport';
import { useSupportMessages } from '@/hooks/useSupportMessages';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus,
  MessageSquare,
  Send,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig = {
  open: { 
    label: 'Ouvert', 
    variant: 'default' as const, 
    icon: AlertCircle,
    color: 'text-blue-600'
  },
  in_progress: { 
    label: 'En cours', 
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-yellow-600'
  },
  resolved: { 
    label: 'Résolu', 
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600'
  },
  closed: { 
    label: 'Fermé', 
    variant: 'outline' as const,
    icon: XCircle,
    color: 'text-gray-600'
  }
};

const priorityConfig = {
  low: { label: 'Faible', variant: 'outline' as const, color: 'text-gray-600' },
  medium: { label: 'Moyenne', variant: 'secondary' as const, color: 'text-blue-600' },
  high: { label: 'Élevée', variant: 'default' as const, color: 'text-orange-600' },
  urgent: { label: 'Urgente', variant: 'destructive' as const, color: 'text-red-600' }
};

export default function Support() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // Form states for new ticket
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  const { tickets, loading, createTicket } = useSupport();
  const { messages, sendMessage, markAsRead } = useSupportMessages(selectedTicket?.id);
  const { toast } = useToast();

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTicket = async () => {
    console.log('handleCreateTicket called with:', {
      subject: newTicketSubject,
      description: newTicketDescription,
      priority: newTicketPriority
    });

    if (!newTicketSubject.trim() || !newTicketDescription.trim()) {
      console.log('Validation failed - missing required fields');
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    console.log('Calling createTicket...');
    const result = await createTicket({
      subject: newTicketSubject,
      description: newTicketDescription,
      priority: newTicketPriority,
    });

    console.log('createTicket result:', result);

    if (!result.error) {
      setNewTicketSubject('');
      setNewTicketDescription('');
      setNewTicketPriority('medium');
      setShowNewTicketDialog(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const result = await sendMessage(newMessage, 'shop');
    if (!result.error) {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mark messages as read when opening a ticket
  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTimeout(() => {
      markAsRead(false); // false = shop user
    }, 1000);
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
          <main className="flex-1 overflow-hidden p-6">
            <div className="max-w-7xl mx-auto h-full">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Support technique</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fixway, un service de la société{' '}
                    <a 
                      href="https://annuaire-entreprises.data.gouv.fr/entreprise/hapics-803138577" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Hapics
                    </a>
                  </p>
                </div>
                <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      console.log('Nouveau ticket button clicked');
                      setShowNewTicketDialog(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau ticket
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Créer un ticket de support</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subject">Sujet *</Label>
                        <Input
                          id="subject"
                          placeholder="Décrivez brièvement votre problème"
                          value={newTicketSubject}
                          onChange={(e) => setNewTicketSubject(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="priority">Priorité</Label>
                        <Select value={newTicketPriority} onValueChange={(value: any) => setNewTicketPriority(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Faible</SelectItem>
                            <SelectItem value="medium">Moyenne</SelectItem>
                            <SelectItem value="high">Élevée</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                          id="description"
                          placeholder="Décrivez votre problème en détail..."
                          value={newTicketDescription}
                          onChange={(e) => setNewTicketDescription(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowNewTicketDialog(false)}>
                          Annuler
                        </Button>
                        <Button onClick={() => {
                          console.log('Créer le ticket button clicked');
                          console.log('Current values:', {
                            subject: newTicketSubject,
                            description: newTicketDescription,
                            priority: newTicketPriority
                          });
                          handleCreateTicket();
                        }}>
                          Créer le ticket
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
                {/* Liste des tickets */}
                <Card className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Mes tickets ({filteredTickets.length})
                      </CardTitle>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Rechercher un ticket..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="space-y-3">
                        {filteredTickets.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Aucun ticket de support</p>
                            <p className="text-sm">Créez votre premier ticket si vous avez besoin d'aide</p>
                          </div>
                        ) : (
                          filteredTickets.map((ticket) => {
                            const statusInfo = statusConfig[ticket.status];
                            const priorityInfo = priorityConfig[ticket.priority];
                            const StatusIcon = statusInfo.icon;
                            
                            return (
                              <Card
                                key={ticket.id}
                                className={`cursor-pointer transition-all hover:shadow-md ${
                                  selectedTicket?.id === ticket.id ? 'ring-2 ring-primary' : ''
                                }`}
                                onClick={() => handleSelectTicket(ticket)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-medium truncate flex-1">{ticket.subject}</h3>
                                    <StatusIcon className={`h-4 w-4 ml-2 ${statusInfo.color}`} />
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {ticket.description}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex gap-2">
                                      <Badge variant={statusInfo.variant} className="text-xs">
                                        {statusInfo.label}
                                      </Badge>
                                      <Badge variant={priorityInfo.variant} className="text-xs">
                                        {priorityInfo.label}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(ticket.created_at), { 
                                        addSuffix: true, 
                                        locale: fr 
                                      })}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Chat du ticket sélectionné */}
                <Card className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {selectedTicket ? (
                        <div className="flex-1">
                          <div className="truncate">{selectedTicket.subject}</div>
                          <div className="text-sm font-normal text-muted-foreground">
                            {statusConfig[selectedTicket.status].label} • {priorityConfig[selectedTicket.priority].label}
                          </div>
                        </div>
                      ) : (
                        'Sélectionnez un ticket'
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0">
                    {selectedTicket ? (
                      <>
                        {/* Messages */}
                        <ScrollArea className="flex-1 mb-4 h-96">
                          <div className="space-y-3 p-2">
                            {messages.length === 0 ? (
                              <div className="text-center text-muted-foreground py-8">
                                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Aucun message pour le moment</p>
                                <p className="text-sm">Commencez la conversation avec notre équipe support</p>
                              </div>
                            ) : (
                              messages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`flex ${message.sender_type === 'shop' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                     className={`max-w-[80%] p-3 rounded-lg ${
                                       message.sender_type === 'shop'
                                         ? 'bg-blue-500 text-white rounded-br-sm ml-auto'
                                         : 'bg-green-500 text-white rounded-bl-sm mr-auto'
                                     }`}
                                  >
                                    <p className="text-sm">{message.message}</p>
                                    <div className="flex items-center justify-between mt-1">
                                       <span className="text-xs opacity-70">
                                         {message.sender_type === 'shop' ? 'Magasin' : 'Super Admin'}
                                       </span>
                                      <span className="text-xs opacity-70">
                                        {formatDistanceToNow(new Date(message.created_at), { 
                                          addSuffix: true, 
                                          locale: fr 
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>

                        <Separator className="my-3" />

                        {/* Zone de saisie */}
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Tapez votre message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="flex-1 min-h-[80px] resize-none"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            size="sm"
                            className="self-end"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Appuyez sur Entrée pour envoyer votre message
                        </p>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Sélectionnez un ticket pour voir la conversation</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}