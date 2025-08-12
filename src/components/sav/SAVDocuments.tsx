import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Image, Download, Eye, Upload, Trash2, FileIcon } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string | undefined | null) => {
    if (!type) {
      return <FileIcon className="h-4 w-4" />;
    }
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

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
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${savCaseId}/${fileName}`;

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
      const { data, error } = await supabase.storage
        .from('sav-attachments')
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
        .from('sav-attachments')
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
            <Badge variant="secondary">{attachments.length}</Badge>
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
                  {getFileIcon(attachment.type)}
                  <div>
                    <div className="font-medium">{attachment.name}</div>
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