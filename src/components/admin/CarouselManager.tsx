import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCarouselItems, type CarouselItem } from '@/hooks/useCarouselItems';
import { Images, Video, Plus, Edit, Trash2, MoveUp, MoveDown } from 'lucide-react';

export function CarouselManager() {
  const { items, loading, createItem, updateItem, deleteItem, fetchAllItems } = useCarouselItems();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media_url: '',
    media_type: 'image' as 'image' | 'video',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    fetchAllItems();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      media_url: '',
      media_type: 'image',
      display_order: items.length,
      is_active: true
    });
    setEditingItem(null);
  };

  const openDialog = (item?: CarouselItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || '',
        media_url: item.media_url,
        media_type: item.media_type,
        display_order: item.display_order,
        is_active: item.is_active
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        await updateItem(editingItem.id, formData);
      } else {
        await createItem(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving carousel item:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      await deleteItem(id);
    }
  };

  const moveItem = async (item: CarouselItem, direction: 'up' | 'down') => {
    const sortedItems = [...items].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sortedItems.findIndex(i => i.id === item.id);
    
    if (direction === 'up' && currentIndex > 0) {
      const targetItem = sortedItems[currentIndex - 1];
      await updateItem(item.id, { display_order: targetItem.display_order });
      await updateItem(targetItem.id, { display_order: item.display_order });
    } else if (direction === 'down' && currentIndex < sortedItems.length - 1) {
      const targetItem = sortedItems[currentIndex + 1];
      await updateItem(item.id, { display_order: targetItem.display_order });
      await updateItem(targetItem.id, { display_order: item.display_order });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Chargement des éléments du carrousel...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Images className="h-5 w-5" />
          <CardTitle>Gestion du Carrousel</CardTitle>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un élément
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Modifier l\'élément' : 'Ajouter un élément'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titre de l'élément"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de l'élément"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="media_type">Type de média</Label>
                <Select 
                  value={formData.media_type} 
                  onValueChange={(value: 'image' | 'video') => 
                    setFormData(prev => ({ ...prev, media_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Vidéo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="media_url">URL du média *</Label>
                <Input
                  id="media_url"
                  type="url"
                  value={formData.media_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, media_url: e.target.value }))}
                  placeholder={formData.media_type === 'video' ? 'https://example.com/video.mp4' : 'https://example.com/image.jpg'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">Ordre d'affichage</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Actif</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {editingItem ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun élément dans le carrousel</p>
            <p className="text-sm">Ajoutez votre premier élément pour commencer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items
              .sort((a, b) => a.display_order - b.display_order)
              .map((item, index) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {item.media_type === 'video' ? (
                          <Video className="h-8 w-8 text-blue-600" />
                        ) : (
                          <Images className="h-8 w-8 text-green-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </h4>
                          <Badge variant={item.is_active ? "default" : "secondary"}>
                            {item.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-500 truncate">
                            {item.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Ordre: {item.display_order}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveItem(item, 'up')}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveItem(item, 'down')}
                        disabled={index === items.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}