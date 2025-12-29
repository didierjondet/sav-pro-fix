import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface SurveyData {
  id: string;
  shop_id: string;
  sav_case_id: string | null;
  completed_at: string | null;
  shop?: {
    name: string;
    logo_url: string | null;
  };
  sav_case?: {
    case_number: string;
    device_brand: string | null;
    device_model: string | null;
  };
}

// Client Supabase anonyme sans session persistée pour les enquêtes publiques
const SUPABASE_URL = "https://jljkrthymaqxkebosqko.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsamtydGh5bWFxeGtlYm9zcWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzIyNzAsImV4cCI6MjA2OTEwODI3MH0._0zuhHNvENoU0vpuOTT8OmksA59xLG-KaaTg9SU0OxA";

export default function Satisfaction() {
  const { token } = useParams<{ token: string }>();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');

  // Client anonyme sans session pour éviter les problèmes de RLS avec auth.uid()
  const anonClient = useMemo(() => {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }, []);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!token) {
        setError('Lien invalide');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await anonClient
        .from('satisfaction_surveys')
        .select(`
          id,
          shop_id,
          sav_case_id,
          completed_at
        `)
        .eq('access_token', token)
        .single();

      if (fetchError || !data) {
        setError('Questionnaire introuvable ou lien expiré');
        setLoading(false);
        return;
      }

      // Vérifier si déjà complété
      if (data.completed_at) {
        setAlreadyCompleted(true);
        setSubmitted(true);
      }

      // Récupérer les infos du shop
      const { data: shopData } = await anonClient
        .from('shops')
        .select('name, logo_url')
        .eq('id', data.shop_id)
        .single();

      // Récupérer les infos du SAV si disponible
      let savData = null;
      if (data.sav_case_id) {
        const { data: sav } = await anonClient
          .from('sav_cases')
          .select('case_number, device_brand, device_model')
          .eq('id', data.sav_case_id)
          .single();
        savData = sav;
      }

      setSurvey({
        ...data,
        shop: shopData || undefined,
        sav_case: savData || undefined
      });
      setLoading(false);
    };

    fetchSurvey();
  }, [token, anonClient]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Veuillez sélectionner une note');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Vérifier d'abord si l'enquête n'a pas déjà été soumise (double-clic, etc.)
    const { data: currentSurvey } = await anonClient
      .from('satisfaction_surveys')
      .select('completed_at')
      .eq('access_token', token)
      .maybeSingle();

    if (currentSurvey?.completed_at) {
      setError('Vous avez déjà répondu à cette enquête de satisfaction. Merci !');
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await anonClient
      .from('satisfaction_surveys')
      .update({
        rating,
        comment: comment.trim() || null,
        completed_at: new Date().toISOString()
      })
      .eq('access_token', token);

    if (updateError) {
      // Message d'erreur plus informatif selon le type d'erreur
      if (updateError.code === '42501' || updateError.message?.includes('policy')) {
        setError('Vous avez déjà répondu à cette enquête de satisfaction.');
      } else {
        setError('Erreur lors de l\'envoi. Veuillez réessayer plus tard.');
      }
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            {alreadyCompleted ? (
              <>
                <h2 className="text-2xl font-bold text-foreground">Déjà répondu</h2>
                <p className="text-muted-foreground">
                  Vous avez déjà donné votre avis sur cette prestation. Merci pour votre retour !
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground">Merci !</h2>
                <p className="text-muted-foreground">
                  Votre avis a bien été enregistré. Il nous aidera à améliorer nos services.
                </p>
              </>
            )}
            {survey?.shop?.name && (
              <p className="text-sm text-muted-foreground mt-4">
                — L'équipe {survey.shop.name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Oups !</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {survey?.shop?.logo_url && (
            <img 
              src={survey.shop.logo_url} 
              alt={survey.shop?.name || 'Logo'} 
              className="h-12 w-auto mx-auto mb-4 object-contain"
            />
          )}
          <CardTitle className="text-xl">
            {survey?.shop?.name || 'Votre avis compte !'}
          </CardTitle>
          <CardDescription>
            {survey?.sav_case ? (
              <>
                Concernant votre réparation{' '}
                <span className="font-medium">
                  {survey.sav_case.device_brand} {survey.sav_case.device_model}
                </span>
                {' '}(#{survey.sav_case.case_number})
              </>
            ) : (
              'Comment évaluez-vous notre service ?'
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Sélection des étoiles */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Votre note
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {rating === 5 && 'Excellent !'}
                {rating === 4 && 'Très bien'}
                {rating === 3 && 'Correct'}
                {rating === 2 && 'Décevant'}
                {rating === 1 && 'Très décevant'}
              </p>
            )}
          </div>

          {/* Commentaire optionnel */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Un commentaire ? (optionnel)
            </label>
            <Textarea
              placeholder="Dites-nous ce que vous avez apprécié ou ce que nous pourrions améliorer..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              'Envoyer mon avis'
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Vos données sont traitées de manière confidentielle.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
