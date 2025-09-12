import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useSAVStatuses, SAVStatus } from '@/hooks/useSAVStatuses';
import { useProfile } from '@/hooks/useProfile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';

export function SAVStatusesManager() {
  const { statuses, loading, createStatus, updateStatus, deleteStatus } = useSAVStatuses();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<SAVStatus | null>(null);
  const [formData, setFormData] = useState({
    status_key: '',
    status_label: '',
    status_color: '#6b7280',
    pause_timer: false,
    show_in_sidebar: false
  });

  const resetForm = () => {
    setFormData({
      status_key: '',
      status_label: '',
      status_color: '#6b7280',
      pause_timer: false,
      show_in_sidebar: false
    });
  };

  const handleCreate = async () => {
    if (!profile?.shop_id) return;
    
    try {
      const nextOrder = Math.max(...statuses.map(s => s.display_order), 0) + 1;
      
      await createStatus({
        shop_id: profile.shop_id,
        status_key: formData.status_key.toLowerCase().replace(/\s+/g, '_'),
        status_label: formData.status_label,
        status_color: formData.status_color,
        display_order: nextOrder,
        is_default: false,
        is_active: true,
        pause_timer: formData.pause_timer,
        show_in_sidebar: formData.show_in_sidebar
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEdit = async () => {
    if (!editingStatus) return;
    
    try {
      await updateStatus(editingStatus.id, {
        status_label: formData.status_label,
        status_color: formData.status_color,
        pause_timer: formData.pause_timer,
        show_in_sidebar: formData.show_in_sidebar
      });
      
      setEditingStatus(null);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async (status: SAVStatus) => {
    if (status.is_default) {
      toast({
        title: 'Impossible de supprimer',
        description: 'Les statuts par défaut ne peuvent pas être supprimés',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await deleteStatus(status.id);
    } catch (error) {
      // Error handled in hook
    }
  };

  const openEditDialog = (status: SAVStatus) => {
    setEditingStatus(status);
    setFormData({
      status_key: status.status_key,
      status_label: status.status_label,
      status_color: status.status_color,
      pause_timer: status.pause_timer,
      show_in_sidebar: status.show_in_sidebar
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statuts SAV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Chargement...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Statuts SAV
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un statut
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouveau statut</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau statut personnalisé pour vos SAV
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="status_key">Clé du statut</Label>
                  <Input
                    id="status_key"
                    value={formData.status_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, status_key: e.target.value }))}
                    placeholder="ex: en_revision"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status_label">Libellé</Label>
                  <Input
                    id="status_label"
                    value={formData.status_label}
                    onChange={(e) => setFormData(prev => ({ ...prev, status_label: e.target.value }))}
                    placeholder="ex: En révision"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status_color">Couleur</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="status_color"
                      type="color"
                      value={formData.status_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, status_color: e.target.value }))}
                      className="w-20"
                    />
                    <Input
                      value={formData.status_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, status_color: e.target.value }))}
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pause_timer"
                    checked={formData.pause_timer}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, pause_timer: !!checked }))
                    }
                  />
                  <Label htmlFor="pause_timer" className="text-sm">
                    Mettre en pause le compteur de temps (ne compte pas dans les retards)
                  </Label>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_in_sidebar" className="text-sm">
                    Afficher dans la barre latérale
                  </Label>
                  <Switch
                    id="show_in_sidebar"
                    checked={formData.show_in_sidebar}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, show_in_sidebar: checked }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={!formData.status_key || !formData.status_label}
                >
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {statuses.map((status) => (
            <div
              key={status.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge 
                  style={{ backgroundColor: status.status_color, color: 'white' }}
                  className="min-w-0"
                >
                  {status.status_label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ({status.status_key})
                </span>
                {status.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    Par défaut
                  </Badge>
                )}
                {status.pause_timer && (
                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">
                    ⏸️ Timer en pause
                  </Badge>
                )}
                {status.show_in_sidebar && (
                  <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">
                    👁️ Sidebar
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Dialog open={editingStatus?.id === status.id} onOpenChange={(open) => {
                  if (!open) {
                    setEditingStatus(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(status)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Modifier le statut</DialogTitle>
                      <DialogDescription>
                        Modifiez le libellé et la couleur du statut
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_status_label">Libellé</Label>
                        <Input
                          id="edit_status_label"
                          value={formData.status_label}
                          onChange={(e) => setFormData(prev => ({ ...prev, status_label: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_status_color">Couleur</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="edit_status_color"
                            type="color"
                            value={formData.status_color}
                            onChange={(e) => setFormData(prev => ({ ...prev, status_color: e.target.value }))}
                            className="w-20"
                          />
                          <Input
                            value={formData.status_color}
                            onChange={(e) => setFormData(prev => ({ ...prev, status_color: e.target.value }))}
                            placeholder="#6b7280"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="edit_pause_timer"
                          checked={formData.pause_timer}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, pause_timer: !!checked }))
                          }
                        />
                        <Label htmlFor="edit_pause_timer" className="text-sm">
                          Mettre en pause le compteur de temps (ne compte pas dans les retards)
                        </Label>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="edit_show_in_sidebar" className="text-sm">
                          Afficher dans la barre latérale
                        </Label>
                        <Switch
                          id="edit_show_in_sidebar"
                          checked={formData.show_in_sidebar}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, show_in_sidebar: checked }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingStatus(null)}>
                        Annuler
                      </Button>
                      <Button onClick={handleEdit}>
                        Sauvegarder
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {!status.is_default && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le statut</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer le statut "{status.status_label}" ?
                          Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(status)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
          
          {statuses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun statut configuré
            </div>
          )}
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Information</h4>
          <p className="text-sm text-muted-foreground">
            • Les statuts par défaut ne peuvent pas être supprimés mais peuvent être modifiés
          </p>
          <p className="text-sm text-muted-foreground">
            • La clé du statut est utilisée en interne et ne peut pas être modifiée après création
          </p>
          <p className="text-sm text-muted-foreground">
            • L'ordre des statuts peut être réorganisé en glissant-déposant
          </p>
          <p className="text-sm text-muted-foreground">
            • Les statuts avec timer en pause ne comptent pas dans le calcul des retards
          </p>
          <p className="text-sm text-muted-foreground">
            • Seuls les statuts avec "Sidebar" activé apparaissent dans la barre latérale
          </p>
        </div>
      </CardContent>
    </Card>
  );
}