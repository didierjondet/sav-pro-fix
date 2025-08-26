import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Image, Download, Eye, Upload, Trash2, FileIcon, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  [key: string]: any;
  name: string;
  url: string;
  size?: number;
  type: string;
  uploaded_at: string;
}

interface SAVDocumentsProps {
  savCaseId: string;
  attachments: Attachment[];
  onAttachmentsUpdate: (attachments: Attachment[]) => void;
}

export function SAVDocuments({ savCaseId, attachments, onAttachmentsUpdate }: SAVDocumentsProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string | undefined | null, name?: string) => {
    if (!type && name) {
      const ext = name.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
        return <Image className="h-4 w-4 text-blue-500" />;
      }
      if (['pdf'].includes(ext || '')) {
        return <FileText className="h-4 w-4 text-red-500" />;
      }
      if (['doc', 'docx'].includes(ext || '')) {
        return <FileText className="h-4 w-4 text-blue-600" />;
      }
    }
    
    if (!type) {
      return <FileIcon className="h-4 w-4 text-muted-foreground" />;
    }
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-green-500" />;
    }
    if (type === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (type.includes('word') || type.includes('document')) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    }
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  // Générer les miniatures pour les images
  useEffect(() => {
    const generateThumbnails = async () => {
      const newThumbnails: Record<string, string> = {};
      
      for (const attachment of attachments) {
        if (attachment.type?.startsWith('image/')) {
          try {
            const { data } = await supabase.storage
              .from('sav-attachments')
              .createSignedUrl(attachment.url, 3600);
            
            if (data?.signedUrl) {
              newThumbnails[attachment.url] = data.signedUrl;
            }
          } catch (error) {
            console.error('Erreur génération miniature:', error);
          }
        }
      }
      
      setThumbnails(newThumbnails);
    };

    if (attachments.length > 0) {
      generateThumbnails();
    }
  }, [attachments]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Taille inconnue';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    setUploading(true);
    try {
      // Récupérer le shop_id de l'utilisateur connecté
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop ID non trouvé');
      }

      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        // Inclure le shop_id dans le chemin pour respecter les RLS policies
        const filePath = `${profile.shop_id}/${savCaseId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('sav-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        return {
          name: file.name,
          url: filePath,
          size: file.size,
          type: file.type,
          uploaded_at: new Date().toISOString()
        };
      });

      const newAttachments = await Promise.all(uploadPromises);
      const updatedAttachments = [...attachments, ...newAttachments];

      // Mettre à jour la base de données
      const { error } = await supabase
        .from('sav_cases')
        .update({ attachments: updatedAttachments as any })
        .eq('id', savCaseId);

      if (error) throw error;

      onAttachmentsUpdate(updatedAttachments);
      toast({
        title: "Succès",
        description: `${newAttachments.length} fichier(s) uploadé(s)`,
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le(s) fichier(s)",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      console.log('Téléchargement de:', attachment);
      
      const { data, error } = await supabase.storage
        .from('sav-attachments')
        .download(attachment.url);

      if (error) {
        console.error('Erreur Supabase download:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Aucune donnée reçue');
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Succès",
        description: "Fichier téléchargé",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Erreur",
        description: `Impossible de télécharger le fichier: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (attachment: Attachment) => {
    try {
      console.log('Tentative de prévisualisation pour:', attachment);
      
      const { data, error } = await supabase.storage
        .from('sav-attachments')
        .createSignedUrl(attachment.url, 3600); // 1 heure

      console.log('Résultat createSignedUrl:', { data, error });

      if (error) {
        console.error('Erreur Supabase:', error);
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error('URL signée non générée');
      }

      window.open(data.signedUrl, '_blank');
      
      toast({
        title: "Succès",
        description: "Fichier ouvert dans un nouvel onglet",
      });
    } catch (error: any) {
      console.error('Preview error:', error);
      toast({
        title: "Erreur",
        description: `Impossible de prévisualiser le fichier: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      // Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('sav-attachments')
        .remove([attachment.url]);

      if (storageError) throw storageError;

      // Mettre à jour la liste des attachments
      const updatedAttachments = attachments.filter(a => a.url !== attachment.url);

      // Mettre à jour la base de données
      const { error } = await supabase
        .from('sav_cases')
        .update({ attachments: updatedAttachments as any })
        .eq('id', savCaseId);

      if (error) throw error;

      onAttachmentsUpdate(updatedAttachments);
      toast({
        title: "Succès",
        description: "Fichier supprimé",
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileIcon className="h-5 w-5" />
          Documents et Photos
          {attachments.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Paperclip className="h-3 w-3 mr-1" />
              {attachments.length} fichier{attachments.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone d'upload */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-sm text-muted-foreground text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-0 h-auto font-normal text-primary hover:text-primary/80"
              >
                {uploading ? 'Upload en cours...' : 'Cliquez pour sélectionner'}
              </Button>
              <div>des photos ou documents (max 5MB)</div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Liste des documents */}
        {attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {attachment.type?.startsWith('image/') && thumbnails[attachment.url] ? (
                      <div className="relative">
                        <img 
                          src={thumbnails[attachment.url]} 
                          alt={attachment.name}
                          className="w-12 h-12 object-cover rounded-lg border border-muted"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-12 h-12 bg-muted/50 rounded-lg border border-muted flex items-center justify-center">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
                          <Image className="h-3 w-3" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-muted/50 rounded-lg border border-muted flex items-center justify-center">
                        {getFileIcon(attachment.type, attachment.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2 truncate">
                      <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{attachment.name}</span>
                      {attachment.type?.startsWith('image/') && (
                        <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700 flex-shrink-0">
                          Image
                        </Badge>
                      )}
                      {attachment.type === 'application/pdf' && (
                        <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700 flex-shrink-0">
                          PDF
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatFileSize(attachment.size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(attachment)}
                    title="Prévisualiser"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(attachment)}
                    title="Supprimer"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6">
            Aucun document pour ce dossier SAV
          </div>
        )}
      </CardContent>
    </Card>
  );
}