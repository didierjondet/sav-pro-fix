import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'admin' | 'technician';
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Pas d\'autorisation fournie');
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Get the request body
    const { email, firstName, lastName, phone, role }: InvitationRequest = await req.json();

    // Get the user's shop
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('shop_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profil utilisateur non trouvé');
    }

    // Check if user is admin of the shop
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      throw new Error('Accès refusé: seuls les admins peuvent inviter des utilisateurs');
    }

    // Create invitation using the database function
    const { data: inviteData, error: inviteError } = await supabaseClient
      .rpc('invite_user_to_shop', {
        p_email: email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone,
        p_role: role,
        p_shop_id: profile.shop_id
      });

    if (inviteError) {
      throw new Error(`Erreur lors de la création de l'invitation: ${inviteError.message}`);
    }

    if (!inviteData.success) {
      throw new Error(inviteData.error);
    }

    // Get shop details for email
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('name')
      .eq('id', profile.shop_id)
      .single();

    if (shopError) {
      throw new Error('Impossible de récupérer les détails du magasin');
    }

    // Create signup URL with invitation token
    const baseUrl = req.headers.get('origin') || 'https://fixway.fr';
    const signupUrl = `${baseUrl}/auth?invite_token=${inviteData.invite_token}&email=${encodeURIComponent(email)}`;

    // Récupérer le nom de l'inviteur pour personnaliser l'email
    const { data: inviterProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const inviterName = inviterProfile
      ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'Un administrateur'
      : 'Un administrateur';

    const roleLabel = role === 'admin' ? 'Administrateur' : 'Technicien';

    // Envoi de l'email d'invitation via send-app-email (route via fournisseur actif: Brevo / Resend / fallback)
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
          <h1 style="color: #1e3a8a; font-size: 22px; margin-bottom: 16px;">Vous êtes invité à rejoindre ${shop.name}</h1>
          <p>Bonjour ${firstName},</p>
          <p><strong>${inviterName}</strong> vous invite à rejoindre l'équipe de <strong>${shop.name}</strong> sur FixWay en tant que <strong>${roleLabel}</strong>.</p>
          <p>Pour accepter l'invitation et créer votre mot de passe, cliquez sur le bouton ci-dessous :</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${signupUrl}" style="display: inline-block; background-color: #1e3a8a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Rejoindre l'équipe
            </a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">
            Ou copiez-collez ce lien dans votre navigateur :<br>
            <a href="${signupUrl}" style="color: #1e3a8a; word-break: break-all;">${signupUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
          <p style="font-size: 12px; color: #9ca3af;">
            Cet email vous a été envoyé automatiquement par FixWay suite à une invitation reçue.<br>
            Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce message.
          </p>
        </div>
      `;

      const { data: emailResp, error: invokeErr } = await supabaseClient.functions.invoke('send-app-email', {
        body: {
          to: email,
          subject: `Invitation à rejoindre ${shop.name} sur FixWay`,
          html,
          context: 'invitation',
          shopId: profile.shop_id,
        },
      });

      if (invokeErr) throw invokeErr;
      if (emailResp?.error) throw new Error(emailResp.error);
      emailSent = true;
      console.log(`✉️ Invitation email envoyé à ${email}`);
    } catch (e: any) {
      emailError = e?.message || 'Erreur inconnue lors de l\'envoi de l\'email';
      console.error('Erreur envoi email invitation:', emailError);
      // Non bloquant — l'invitation est créée, l'admin peut copier le lien manuellement
    }

    console.log(`Invitation créée pour ${email} dans le magasin ${shop.name}`);
    console.log(`URL d'invitation: ${signupUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent
          ? 'Invitation créée et email envoyé avec succès'
          : `Invitation créée. Email non envoyé : ${emailError}. Vous pouvez transmettre le lien manuellement.`,
        inviteUrl: signupUrl,
        email: email,
        shopName: shop.name,
        emailSent,
        emailError,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-invitation function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
});