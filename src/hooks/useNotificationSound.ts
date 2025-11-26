import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Variable globale pour suivre si l'audio a été débloqué
let audioUnlocked = false;

// Fonction pour débloquer l'audio au premier clic utilisateur
export const unlockAudio = () => {
  if (audioUnlocked) return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Créer un buffer silencieux pour débloquer l'audio
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    audioUnlocked = true;
    console.log('🔊 Audio débloqué pour les notifications automatiques');
  } catch (error) {
    console.error('Erreur déblocage audio:', error);
  }
};

// Générer un son de notification agréable avec Web Audio API
const generateNotificationSound = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Créer un oscillateur pour un son doux (deux notes : Mi5 puis Sol5)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Fréquences agréables
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime); // Mi5
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.1); // Sol5
      
      // Enveloppe de volume pour un son doux et non-intrusif
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.type = 'sine';
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      oscillator.onended = () => resolve();
      
      setTimeout(() => resolve(), 400);
    } catch (error) {
      reject(error);
    }
  });
};

export const useNotificationSound = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(null);

  // Vérifier si les sons sont activés
  const isSoundEnabled = () => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('chatSoundEnabled') !== 'false';
  };

  // Jouer le son de notification (personnalisé ou par défaut)
  const playNotificationSound = async (): Promise<void> => {
    if (!isSoundEnabled()) {
      console.log('🔇 Notifications sonores désactivées');
      return;
    }

    try {
      // Récupérer le son personnalisé si disponible
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.shop_id) {
          const { data: shop } = await supabase
            .from('shops')
            .select('custom_notification_sound_url')
            .eq('id', profile.shop_id)
            .single();

          if (shop?.custom_notification_sound_url) {
            const audio = new Audio(shop.custom_notification_sound_url);
            audio.volume = 0.5;
            await audio.play();
            return;
          }
        }
      }

      // Fallback sur le son généré avec Web Audio API
      await generateNotificationSound();
    } catch (error: any) {
      // Si autoplay est bloqué, afficher un message discret
      if (error.name === 'NotAllowedError') {
        console.log('🔇 Autoplay bloqué par le navigateur - utilisez unlockAudio() au premier clic');
      } else {
        console.log('🔔 Notification silencieuse');
      }
    }
  };

  // Tester le son
  const testSound = async (): Promise<void> => {
    toast({
      title: "🔊 Test du son...",
      description: "Lecture en cours...",
      duration: 2000,
    });

    try {
      await playNotificationSound();
      toast({
        title: "✅ Son testé avec succès",
        description: "Vous devriez avoir entendu la notification.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "⚠️ Erreur de lecture",
        description: "Vérifiez que votre navigateur autorise la lecture audio automatique.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Uploader un son personnalisé
  const uploadCustomSound = async (file: File, shopId: string): Promise<void> => {
    setIsUploading(true);
    
    try {
      // Validation du fichier
      const maxSize = 500 * 1024; // 500KB
      if (file.size > maxSize) {
        throw new Error('Le fichier est trop volumineux (max 500KB)');
      }

      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Format audio non supporté (MP3, WAV, OGG, M4A uniquement)');
      }

      // Uploader vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${shopId}/notification-sound.${fileExt}`;

      // Supprimer l'ancien fichier s'il existe
      const { data: existingFiles } = await supabase.storage
        .from('shop-assets')
        .list(shopId);

      if (existingFiles) {
        const oldSound = existingFiles.find(f => f.name.startsWith('notification-sound'));
        if (oldSound) {
          await supabase.storage
            .from('shop-assets')
            .remove([`${shopId}/${oldSound.name}`]);
        }
      }

      // Upload du nouveau fichier
      const { error: uploadError } = await supabase.storage
        .from('shop-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('shop-assets')
        .getPublicUrl(filePath);

      // Mettre à jour la base de données
      const { error: updateError } = await supabase
        .from('shops')
        .update({ custom_notification_sound_url: publicUrl })
        .eq('id', shopId);

      if (updateError) throw updateError;

      setCustomSoundUrl(publicUrl);
      
      toast({
        title: "✅ Son personnalisé uploadé",
        description: "Votre son de notification a été mis à jour.",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur d'upload",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Supprimer le son personnalisé
  const deleteCustomSound = async (shopId: string): Promise<void> => {
    try {
      // Récupérer l'URL actuelle
      const { data: shop } = await supabase
        .from('shops')
        .select('custom_notification_sound_url')
        .eq('id', shopId)
        .single();

      if (shop?.custom_notification_sound_url) {
        // Supprimer le fichier du storage
        const { data: files } = await supabase.storage
          .from('shop-assets')
          .list(shopId);

        if (files) {
          const soundFile = files.find(f => f.name.startsWith('notification-sound'));
          if (soundFile) {
            await supabase.storage
              .from('shop-assets')
              .remove([`${shopId}/${soundFile.name}`]);
          }
        }
      }

      // Mettre à jour la base de données
      const { error } = await supabase
        .from('shops')
        .update({ custom_notification_sound_url: null })
        .eq('id', shopId);

      if (error) throw error;

      setCustomSoundUrl(null);
      
      toast({
        title: "✅ Son par défaut restauré",
        description: "Le son de notification par défaut est maintenant utilisé.",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "❌ Erreur de suppression",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
      throw error;
    }
  };

  // Récupérer l'URL du son personnalisé
  const getCustomSoundUrl = async (shopId: string): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from('shops')
        .select('custom_notification_sound_url')
        .eq('id', shopId)
        .single();

      const url = data?.custom_notification_sound_url || null;
      setCustomSoundUrl(url);
      return url;
    } catch (error) {
      return null;
    }
  };

  return {
    playNotificationSound,
    testSound,
    uploadCustomSound,
    deleteCustomSound,
    getCustomSoundUrl,
    customSoundUrl,
    isUploading,
    isSoundEnabled
  };
};
