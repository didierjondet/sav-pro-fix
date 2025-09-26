import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const trackingSlug = url.searchParams.get('tracking_slug')
    const photoPath = url.searchParams.get('photo_path')

    if (!trackingSlug || !photoPath) {
      return new Response(
        JSON.stringify({ error: 'tracking_slug et photo_path sont requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Créer client Supabase avec service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier que le tracking slug existe et que la photo appartient bien à ce SAV
    const { data: savCase, error: savError } = await supabaseAdmin
      .from('sav_cases')
      .select('id, shop_id')
      .eq('tracking_slug', trackingSlug)
      .single()

    if (savError || !savCase) {
      return new Response(
        JSON.stringify({ error: 'Dossier SAV introuvable' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Vérifier que la photo appartient bien à un message de ce SAV
    const { data: messagePhoto, error: messageError } = await supabaseAdmin
      .from('sav_messages')
      .select('attachments')
      .eq('sav_case_id', savCase.id)
      .not('attachments', 'is', null)

    if (messageError) {
      console.error('Erreur lors de la vérification du message:', messageError)
      return new Response(
        JSON.stringify({ error: 'Erreur de vérification' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Vérifier que la photo existe dans les attachments d'un message
    let photoExists = false
    if (messagePhoto) {
      for (const message of messagePhoto) {
        if (message.attachments && Array.isArray(message.attachments)) {
          for (const attachment of message.attachments) {
            if (attachment.url === photoPath) {
              photoExists = true
              break
            }
          }
        }
        if (photoExists) break
      }
    }

    if (!photoExists) {
      return new Response(
        JSON.stringify({ error: 'Photo non trouvée pour ce dossier' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Créer un signed URL pour la photo
    const { data, error } = await supabaseAdmin.storage
      .from('sav-attachments')
      .createSignedUrl(photoPath, 3600) // 1 heure

    if (error) {
      console.error('Erreur lors de la création du signed URL:', error)
      return new Response(
        JSON.stringify({ error: 'Impossible de générer le lien de la photo' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})