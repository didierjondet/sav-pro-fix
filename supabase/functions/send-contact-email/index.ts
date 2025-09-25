import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  planName: string;
  clientEmail?: string;
  clientName?: string;
  message?: string;
  toEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planName, clientEmail, clientName, message, toEmail }: ContactEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "FixWay <noreply@fixway.fr>",
      to: [toEmail],
      subject: `Demande de contact pour le plan ${planName}`,
      html: `
        <h1>Nouvelle demande de contact</h1>
        <p><strong>Plan demandé:</strong> ${planName}</p>
        ${clientName ? `<p><strong>Nom:</strong> ${clientName}</p>` : ''}
        ${clientEmail ? `<p><strong>Email:</strong> ${clientEmail}</p>` : ''}
        ${message ? `<p><strong>Message:</strong></p><p>${message}</p>` : ''}
        <p>Cette demande a été générée automatiquement depuis la page de tarification.</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);