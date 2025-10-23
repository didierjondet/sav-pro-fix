import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoiceId, invoiceType } = await req.json();

    if (!invoiceId || !invoiceType) {
      throw new Error('Missing invoiceId or invoiceType');
    }

    console.log(`Sending notification for ${invoiceType} invoice ${invoiceId}`);

    // Récupérer la config des notifications pour ce type
    const { data: notifConfig, error: configError } = await supabaseClient
      .from('invoice_notifications_config')
      .select('*')
      .eq('notification_type', invoiceType === 'subscription' ? 'subscription' : 'sms_package')
      .single();

    if (configError) {
      throw new Error(`Failed to fetch notification config: ${configError.message}`);
    }

    // Récupérer les données de la facture
    const table = invoiceType === 'subscription' ? 'subscription_invoices' : 'sms_invoices';
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from(table)
      .select('*, shops(name, email, phone)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    // Créer la notification in-app si activée
    if (notifConfig.in_app_enabled) {
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          shop_id: invoice.shop_id,
          title: 'Nouvelle facture disponible',
          message: `Votre facture ${invoice.invoice_number} est disponible. Montant: ${(invoice.total_ttc_cents / 100).toFixed(2)}€`,
          type: 'invoice',
          link: `/subscription?tab=invoices`,
        });

      if (notifError) {
        console.error('Failed to create in-app notification:', notifError);
      }
    }

    // Envoyer SMS si activé
    if (notifConfig.sms_enabled && notifConfig.sms_message_template && invoice.shops?.phone) {
      try {
        // Remplacer les variables dans le template
        let smsMessage = notifConfig.sms_message_template
          .replace('{invoice_number}', invoice.invoice_number)
          .replace('{amount}', (invoice.total_ttc_cents / 100).toFixed(2))
          .replace('{shop_name}', invoice.shops.name);

        const { error: smsError } = await supabaseClient.functions.invoke('send-sms', {
          body: {
            to: invoice.shops.phone,
            message: smsMessage,
            shopId: invoice.shop_id,
          }
        });

        if (smsError) {
          console.error('Failed to send SMS notification:', smsError);
        }
      } catch (smsError) {
        console.error('SMS notification error:', smsError);
      }
    }

    // Marquer la notification comme envoyée
    const { error: updateError } = await supabaseClient
      .from(table)
      .update({ 
        notification_sent: true,
        notification_sent_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    if (updateError) {
      throw new Error(`Failed to update notification status: ${updateError.message}`);
    }

    console.log(`Notification sent successfully for invoice ${invoice.invoice_number}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending invoice notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
