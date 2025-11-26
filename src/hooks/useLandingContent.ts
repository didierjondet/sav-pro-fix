import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LandingContent {
  id?: string;
  contact_email?: string;
  show_carousel?: boolean;
}

export function useLandingContent() {
  const { toast } = useToast();
  const [content, setContent] = useState<LandingContent>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_content')
        .select('contact_email, show_carousel')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setContent(data);
      }
    } catch (error: any) {
      console.error('Error fetching landing content:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les coordonnées de contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { content, loading, refetch: fetchContent };
}