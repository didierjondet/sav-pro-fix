import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Image, Download, Eye, Trash2, FileIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  name: string;
  url: string;
  size?: number;
  type: string;
  uploaded_at: string;
}

interface PartsDocumentsProps {
  attachments: string[];
  partName: string;
}

export function PartsDocuments({ attachments, partName }: PartsDocumentsProps) {
  const { toast } = useToast();
  const [documentsInfo, setDocumentsInfo] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (attachments.length > 0) {
      loadDocumentsInfo();
    }
  }, [attachments]);

  const loadDocumentsInfo = async () => {
    setLoading(true);
    try {
      const docs: Attachment[] = [];
      
      for (const filePath of attachments) {
        try {
          // Obtenir les informations du fichier
          const { data: fileInfo, error } = await supabase.storage
            .from('part-attachments')
            .list(filePath.split('/')[0], {
              search: filePath.split('/')[1]
            });

          if (error) throw error;

          if (fileInfo && fileInfo.length > 0) {
            const file = fileInfo[0];
            const fileName = file.name;
            const originalName = fileName.split('_').slice(3).join('_') || fileName;
            
            docs.push({
              name: originalName,
              url: filePath,
              size: file.metadata?.size,
              type: getFileTypeFromName(fileName),
              uploaded_at: file.updated_at || file.created_at || ''
            });
          }
        } catch (error) {
          console.error('Error loading file info:', error);
          // Si on ne peut pas obtenir les infos, on ajoute quand même le fichier
          const fileName = filePath.split('/').pop() || filePath;
          docs.push({
            name: fileName,
            url: filePath,
            type: getFileTypeFromName(fileName),
            uploaded_at: ''
          });
        }
      }
      
      setDocumentsInfo(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeFromName = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension || '')) {
      return 'image/*';
    }
    return 'application/pdf';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('part-attachments')
        .download(attachment.url);

      if (error) throw error;

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
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (attachment: Attachment) => {
    try {
      const { data: { signedUrl }, error } = await supabase.storage
        .from('part-attachments')
        .createSignedUrl(attachment.url, 3600); // 1 heure

      if (error) throw error;

      window.open(signedUrl, '_blank');
    } catch (error: any) {
      console.error('Preview error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de prévisualiser le fichier",
        variant: "destructive",
      });
    }
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileIcon className="h-5 w-5" />
          Documents - {partName}
          <Badge variant="secondary">{attachments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-4">
            Chargement des documents...
          </div>
        ) : (
          <div className="space-y-2">
            {documentsInfo.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(attachment.type)}
                  <div>
                    <div className="font-medium">{attachment.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatFileSize(attachment.size)}
                      {attachment.uploaded_at && (
                        <> • {new Date(attachment.uploaded_at).toLocaleDateString()}</>
                      )}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}