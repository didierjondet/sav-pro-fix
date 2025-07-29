import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Nettoyer complètement au démarrage si nécessaire
    const forceCleanup = () => {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, 'User:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          forceCleanup();
          setUser(null);
          setSession(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Existing session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      console.log('Déconnexion en cours...');
      
      // Nettoyer immédiatement l'état local
      setUser(null);
      setSession(null);
      
      // Nettoyer TOUT le localStorage Supabase
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase') || key.includes('sb-') || key.includes('auth')) {
          localStorage.removeItem(key);
          console.log('Supprimé:', key);
        }
      });
      
      // Nettoyer sessionStorage aussi
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase') || key.includes('sb-') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Déconnexion Supabase avec scope global
      await supabase.auth.signOut({ scope: 'global' });
      
      // Redirection forcée avec rechargement complet
      window.location.replace('/auth');
      
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      // Force le nettoyage même en cas d'erreur
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/auth');
    }
  };

  const value = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}