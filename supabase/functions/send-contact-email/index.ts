import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { planName, clientEmail, clientName, message, toEmail } = await req.json();

    if (!toEmail) {
      throw new Error("toEmail manquant");
    }

    const html = `
      <h1>Nouvelle demande de contact</h1>
      <p><strong>Plan demandé:</strong> ${planName || '—'}</p>
      ${clientName ? `<p><strong>Nom:</strong> ${clientName}</p>` : ''}
      ${clientEmail ? `<p><strong>Email:</strong> ${clientEmail}</p>` : ''}
      ${message ? `<p><strong>Message:</strong></p><p>${message}</p>` : ''}
      <p>Cette demande a été générée automatiquement depuis la page de tarification.</p>
    `;

    // Délégation à send-app-email (qui gère le routage Brevo / Resend / fallback)
    const { data, error } = await supabaseClient.functions.invoke('send-app-email', {
      body: {
        to: toEmail,
        subject: `Demande de contact pour le plan ${planName || ''}`.trim(),
        html,
        context: 'contact_form',
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    console.log("Email sent successfully via send-app-email:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
