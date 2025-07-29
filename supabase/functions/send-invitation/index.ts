import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

const handler = async (req: Request): Promise<Response> => {
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
    const baseUrl = req.headers.get('origin') || 'https://your-domain.com';
    const signupUrl = `${baseUrl}/auth?invite_token=${inviteData.invite_token}&email=${encodeURIComponent(email)}`;

    // Here you would typically send an email using a service like Resend
    // For now, we'll just return the invitation details
    console.log(`Invitation créée pour ${email} dans le magasin ${shop.name}`);
    console.log(`URL d'invitation: ${signupUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation créée avec succès',
        inviteUrl: signupUrl,
        email: email,
        shopName: shop.name
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
};

serve(handler);