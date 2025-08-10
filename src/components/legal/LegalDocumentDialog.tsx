import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LegalDocumentDialogProps {
  type: 'cgu_content' | 'cgv_content' | 'privacy_policy';
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function LegalDocumentDialog({ type, title, isOpen, onClose }: LegalDocumentDialogProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchContent();
    }
  }, [isOpen, type]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('landing_content')
        .select(type)
        .limit(1)
        .single();

      if (error) throw error;

      setContent(data?.[type] || 'Contenu non disponible');
    } catch (error) {
      console.error('Error fetching legal content:', error);
      setContent('Erreur lors du chargement du contenu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">Chargement...</div>
            </div>
          ) : (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}