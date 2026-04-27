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

    const { data: notifConfig, error: configError } = await supabaseClient
      .from('invoice_notifications_config')
      .select('*')
      .eq('notification_type', invoiceType === 'subscription' ? 'subscription' : 'sms_package')
      .single();

    if (configError) throw new Error(`Failed to fetch notification config: ${configError.message}`);

    const table = invoiceType === 'subscription' ? 'subscription_invoices' : 'sms_invoices';
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from(table)
      .select('*, shops(name, email, phone)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    // In-app notification
    if (notifConfig.in_app_enabled) {
      await supabaseClient.from('notifications').insert({
        shop_id: invoice.shop_id,
        title: 'Nouvelle facture disponible',
        message: `Votre facture ${invoice.invoice_number} est disponible. Montant: ${(invoice.total_ttc_cents / 100).toFixed(2)}€`,
        type: 'invoice',
        link: `/subscription?tab=invoices`,
      });
    }

    // SMS notification via send-sms (which handles multi-provider routing)
    if (notifConfig.sms_enabled && notifConfig.sms_message_template && invoice.shops?.phone) {
      try {
        let smsMessage = notifConfig.sms_message_template
          .replace('{invoice_number}', invoice.invoice_number)
          .replace('{amount}', (invoice.total_ttc_cents / 100).toFixed(2))
          .replace('{shop_name}', invoice.shops.name);

        await supabaseClient.functions.invoke('send-sms', {
          body: {
            to: invoice.shops.phone,
            message: smsMessage,
            shopId: invoice.shop_id,
          }
        });
      } catch (smsError) {
        console.error('SMS notification error:', smsError);
      }
    }

    // Email notification if shop has email — délégation à send-app-email
    if (invoice.shops?.email) {
      try {
        const subject = `Facture ${invoice.invoice_number} disponible`;
        const html = `
          <h1>Nouvelle facture disponible</h1>
          <p>Bonjour ${invoice.shops.name},</p>
          <p>Votre facture <strong>${invoice.invoice_number}</strong> est disponible.</p>
          <p>Montant TTC: <strong>${(invoice.total_ttc_cents / 100).toFixed(2)}€</strong></p>
          <p>Connectez-vous à votre espace pour la consulter.</p>
        `;

        await supabaseClient.functions.invoke('send-app-email', {
          body: {
            to: invoice.shops.email,
            subject,
            html,
            context: 'invoice_notification',
            shopId: invoice.shop_id,
          },
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }
    }

    // Mark notification as sent
    await supabaseClient.from(table).update({
      notification_sent: true,
      notification_sent_at: new Date().toISOString()
    }).eq('id', invoiceId);

    console.log(`Notification sent for invoice ${invoice.invoice_number}`);

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
