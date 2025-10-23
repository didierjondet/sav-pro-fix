import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceData {
  invoice_number: string;
  created_at: string;
  due_date?: string;
  shop_name: string;
  shop_address?: string;
  shop_siret?: string;
  shop_vat_number?: string;
  amount_ht: number;
  vat_rate: number;
  vat_amount: number;
  amount_ttc: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

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

    console.log(`Generating PDF for ${invoiceType} invoice ${invoiceId}`);

    // Récupérer la config de facturation
    const { data: config, error: configError } = await supabaseClient
      .from('invoice_config')
      .select('*')
      .single();

    if (configError) {
      throw new Error(`Failed to fetch invoice config: ${configError.message}`);
    }

    // Récupérer les données de la facture selon le type
    let invoiceData: any;
    let shopId: string;

    if (invoiceType === 'subscription') {
      const { data, error } = await supabaseClient
        .from('subscription_invoices')
        .select('*, shops(name, address, email, phone)')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      invoiceData = data;
      shopId = data.shop_id;
    } else if (invoiceType === 'sms') {
      const { data, error } = await supabaseClient
        .from('sms_invoices')
        .select('*, shops(name, address, email, phone)')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      invoiceData = data;
      shopId = data.shop_id;
    } else {
      throw new Error('Invalid invoice type');
    }

    // Générer le HTML de la facture
    const html = generateInvoiceHTML(invoiceData, config, invoiceType);

    // Convertir HTML en PDF (utiliser une API externe ou une bibliothèque)
    // Pour l'instant, on retourne le HTML
    // TODO: Intégrer une vraie génération PDF (ex: puppeteer, PDFKit, etc.)
    
    const pdfBuffer = new TextEncoder().encode(html);
    const fileName = `${shopId}/${invoiceData.invoice_number}.pdf`;

    // Uploader le PDF dans le bucket invoices
    const { error: uploadError } = await supabaseClient.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Obtenir l'URL publique (ou signée si bucket privé)
    const { data: { publicUrl } } = supabaseClient.storage
      .from('invoices')
      .getPublicUrl(fileName);

    // Mettre à jour la facture avec l'URL du PDF
    const table = invoiceType === 'subscription' ? 'subscription_invoices' : 'sms_invoices';
    const { error: updateError } = await supabaseClient
      .from(table)
      .update({ pdf_url: publicUrl })
      .eq('id', invoiceId);

    if (updateError) {
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    console.log(`PDF generated successfully: ${publicUrl}`);

    return new Response(
      JSON.stringify({ success: true, pdf_url: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateInvoiceHTML(invoice: any, config: any, type: string): string {
  const formatCurrency = (cents: number) => {
    return (cents / 100).toFixed(2) + ' €';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Facture ${invoice.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { max-width: 200px; }
    .company-info { text-align: right; }
    .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 20px; }
    .invoice-meta { margin-bottom: 30px; }
    .client-info { margin-bottom: 30px; padding: 20px; background: #f5f5f5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #333; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #ddd; }
    .totals { text-align: right; }
    .total-row { font-weight: bold; font-size: 18px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #333; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${config.header_logo_url ? `<img src="${config.header_logo_url}" class="logo" alt="Logo">` : ''}
      <div><strong>${config.company_name}</strong></div>
      <div>${config.company_legal_form}</div>
      ${config.company_address ? `<div>${config.company_address}</div>` : ''}
      ${config.company_postal_code && config.company_city ? `<div>${config.company_postal_code} ${config.company_city}</div>` : ''}
      ${config.company_siret ? `<div>SIRET: ${config.company_siret}</div>` : ''}
      ${config.company_vat_number ? `<div>N° TVA: ${config.company_vat_number}</div>` : ''}
    </div>
    <div class="company-info">
      ${config.company_email ? `<div>${config.company_email}</div>` : ''}
      ${config.company_phone ? `<div>${config.company_phone}</div>` : ''}
      ${config.company_website ? `<div>${config.company_website}</div>` : ''}
    </div>
  </div>

  <div class="invoice-title">FACTURE ${invoice.invoice_number}</div>

  <div class="invoice-meta">
    <div><strong>Date:</strong> ${formatDate(invoice.created_at)}</div>
    ${invoice.due_date ? `<div><strong>Date d'échéance:</strong> ${formatDate(invoice.due_date)}</div>` : ''}
  </div>

  <div class="client-info">
    <strong>Client:</strong><br>
    ${invoice.shops?.name || 'N/A'}<br>
    ${invoice.shops?.address || ''}<br>
    ${invoice.shops?.email || ''}<br>
    ${invoice.shops?.phone || ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Montant HT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          ${type === 'subscription' 
            ? `Abonnement ${config.service_name} - Période du ${formatDate(invoice.period_start)} au ${formatDate(invoice.period_end)}`
            : `Achat de ${invoice.sms_count} crédits SMS`
          }
        </td>
        <td style="text-align: right;">${formatCurrency(invoice.total_ht_cents)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div>Total HT: ${formatCurrency(invoice.total_ht_cents)}</div>
    <div>TVA (${invoice.vat_rate}%): ${formatCurrency(invoice.vat_amount_cents)}</div>
    <div class="total-row">Total TTC: ${formatCurrency(invoice.total_ttc_cents)}</div>
  </div>

  ${config.legal_text ? `<div class="footer">${config.legal_text}</div>` : ''}
  ${config.footer_text ? `<div class="footer">${config.footer_text}</div>` : ''}
</body>
</html>
  `;
}
