import { supabase } from '@/integrations/supabase/client';
import { Quote } from '@/hooks/useQuotes';
import { Shop } from '@/hooks/useShop';
import { SAVCase } from '@/hooks/useSAVCases';

export const generateQuotePDF = (quote: Quote, shop?: Shop) => {
  // Créer le contenu HTML du PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Devis ${quote.quote_number}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .shop-header {
          text-align: left;
          margin-bottom: 30px;
        }
        .shop-logo {
          max-height: 80px;
          max-width: 200px;
          object-fit: contain;
          margin-bottom: 10px;
        }
        .shop-name {
          font-size: 24px;
          font-weight: bold;
          color: #0066cc;
          margin: 0;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #0066cc;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .quote-number {
          font-size: 24px;
          font-weight: bold;
          color: #0066cc;
        }
        .customer-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 30px;
        }
        .customer-info h3 {
          margin-top: 0;
          color: #0066cc;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        .items-table th {
          background-color: #0066cc;
          color: white;
        }
        .items-table .text-center {
          text-align: center;
        }
        .items-table .text-right {
          text-align: right;
        }
        .total-section {
          text-align: right;
          font-size: 18px;
          font-weight: bold;
          margin-top: 20px;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 5px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .shop-footer {
          text-align: center;
          font-size: 11px;
          color: #666;
          margin-bottom: 15px;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-draft { background-color: #e2e8f0; color: #475569; }
        .status-sent { background-color: #ddd6fe; color: #7c3aed; }
        .status-accepted { background-color: #dcfce7; color: #16a34a; }
        .status-rejected { background-color: #fee2e2; color: #dc2626; }
      </style>
    </head>
    <body>
      ${shop ? `
        <div class="shop-header">
          ${shop.logo_url ? `<img src="${shop.logo_url}" alt="${shop.name}" class="shop-logo">` : ''}
          <h1 class="shop-name">${shop.name}</h1>
        </div>
      ` : ''}
      
      <div class="header">
        <div class="quote-number">DEVIS ${quote.quote_number}</div>
        <p>Date: ${new Date(quote.created_at).toLocaleDateString('fr-FR')}</p>
        <p><strong>Validité: 1 mois à compter de la date de création</strong></p>
        <span class="status-badge status-${quote.status}">
          ${getStatusText(quote.status)}
        </span>
      </div>
      
      <div class="customer-info">
        <h3>Informations client</h3>
        <p><strong>Nom:</strong> ${quote.customer_name}</p>
        ${quote.customer_email ? `<p><strong>Email:</strong> ${quote.customer_email}</p>` : ''}
        ${quote.customer_phone ? `<p><strong>Téléphone:</strong> ${quote.customer_phone}</p>` : ''}
      </div>
      
      <h3>Détail des articles</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 40%;">Article</th>
            <th style="width: 10%;" class="text-center">Qté</th>
            <th style="width: 18%;" class="text-right">Prix unitaire</th>
            <th style="width: 17%;" class="text-right">Remise</th>
            <th style="width: 15%;" class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items.map(item => {
            const originalPrice = (item as any).unit_public_price;
            const finalPrice = item.total_price / item.quantity;
            const hasDiscount = (item as any).discount && ((item as any).discount.type === 'percentage' || (item as any).discount.type === 'fixed');
            const discountAmount = hasDiscount ? originalPrice - finalPrice : 0;
            const discountInfo = (item as any).discount;
            
            return `
              <tr>
                <td>
                  <strong>${item.part_name}</strong>
                  ${item.part_reference ? `<br><small style="color: #666;">Réf: ${item.part_reference}</small>` : ''}
                </td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">
                  ${hasDiscount ? `
                    <div style="text-decoration: line-through; color: #999; font-size: 11px;">${originalPrice.toFixed(2)}€</div>
                    <div style="font-weight: bold;">${finalPrice.toFixed(2)}€</div>
                  ` : `${originalPrice.toFixed(2)}€`}
                </td>
                <td class="text-right">
                  ${hasDiscount ? `
                    <div style="color: #dc2626; font-weight: bold;">
                      ${discountInfo?.type === 'percentage' 
                        ? `-${discountInfo.value}%`
                        : `-${discountAmount.toFixed(2)}€`
                      }
                    </div>
                  ` : '<span style="color: #999;">-</span>'}
                </td>
                <td class="text-right" style="font-weight: bold;">${item.total_price.toFixed(2)}€</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="total-section">
        ${(() => {
          const subtotalBrut = quote.items.reduce((sum, item) => sum + (item.quantity * (item as any).unit_public_price), 0);
          const totalRemises = quote.items.reduce((sum, item) => {
            const discountInfo = (item as any).discount ? JSON.parse(JSON.stringify((item as any).discount)) : null;
            return sum + (discountInfo?.amount || 0);
          }, 0);
          
          return `
            <div style="margin-bottom: 10px; text-align: right;">
              <span>Sous-total: ${subtotalBrut.toFixed(2)}€</span>
            </div>
            ${totalRemises > 0 ? `
              <div style="margin-bottom: 10px; text-align: right; color: #0066cc;">
                <span>Total remises: -${totalRemises.toFixed(2)}€</span>
              </div>
            ` : ''}
            <div style="font-size: 18px; font-weight: bold;">
              TOTAL: ${quote.total_amount.toFixed(2)}€
            </div>
          `;
        })()}
      </div>
      
      <div class="footer">
        ${shop ? `
          <div class="shop-footer">
            ${shop.address ? `<p><strong>Adresse:</strong> ${shop.address}</p>` : ''}
            ${shop.phone ? `<p><strong>Téléphone:</strong> ${shop.phone}</p>` : ''}
            ${shop.email ? `<p><strong>Email:</strong> ${shop.email}</p>` : ''}
          </div>
        ` : ''}
        <p><strong>IMPORTANT:</strong> Ce devis est valable 1 mois à compter de sa date de création. Passé ce délai, il ne sera plus accessible et devra être renouvelé.</p>
        <p>Devis généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        <p style="font-size: 10px; margin-top: 10px;">Propulsé par <strong>FixWay Pro</strong></p>
      </div>
    </body>
    </html>
  `;

  // Créer un iframe masqué pour l'impression
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
  // Attendre un peu avant d'imprimer
  setTimeout(() => {
    try {
      const contentWindow = iframe.contentWindow;
      if (!contentWindow) {
        throw new Error('Impossible d\'accéder à la fenêtre de l\'iframe');
      }
      
      // S'assurer que le contenu est chargé
      contentWindow.focus();
      
      // Vérifier si print est disponible et fonctionnel
      if (typeof contentWindow.print !== 'function') {
        throw new Error('Fonction d\'impression non disponible');
      }
      
      // Tenter l'impression
      contentWindow.print();
      
      // Nettoyer l'iframe après l'impression
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      
      // Nettoyer l'iframe en cas d'erreur
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      
      // Fallback 1: Ouvrir dans une nouvelle fenêtre
      try {
        const newWindow = window.open('', '_blank', 'width=800,height=600');
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
          newWindow.focus();
          newWindow.print();
          setTimeout(() => {
            newWindow.close();
          }, 1000);
        } else {
          throw new Error('Popup bloquée');
        }
      } catch (popupError) {
        console.error('Erreur popup:', popupError);
        
        // Fallback 2: télécharger en HTML
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devis-${quote.quote_number}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Afficher un message d'information
        console.info('Le fichier HTML du devis a été téléchargé. Ouvrez-le dans votre navigateur et imprimez-le.');
      }
    }
  }, 500);
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'draft': return 'Brouillon';
    case 'sent': return 'Envoyé';
    case 'viewed': return 'Consulté';
    case 'accepted': return 'Accepté';
    case 'rejected': return 'Refusé';
    case 'expired': return 'Expiré';
    default: return status;
  }
};

export const generateSAVRestitutionPDF = async (savCase: SAVCase, shop?: Shop, options?: { includeAttachments?: boolean; clientMessages?: any[] }) => {
  // Récupérer les données fraîches du SAV (closure_history inclus)
  let freshCaseData: any = null;
  try {
    const { data: freshCase, error: freshError } = await supabase
      .from('sav_cases')
      .select('closure_history')
      .eq('id', savCase.id)
      .single();
    
    if (!freshError && freshCase) {
      freshCaseData = freshCase;
    }
  } catch (e) {
    console.error('Erreur récupération closure_history:', e);
  }

  const closureHistory = (freshCaseData?.closure_history || savCase.closure_history || []) as Array<{
    closed_at: string;
    status_label: string;
    closed_by_name: string;
  }>;

  // Récupérer les pièces du SAV avec les informations complètes
  let savCaseWithParts = savCase as any;
  
  try {
    const { data: savParts, error } = await supabase
      .from('sav_parts')
      .select(`
        *,
        parts(name, reference, selling_price, purchase_price)
      `)
      .eq('sav_case_id', savCase.id);

    if (error) {
      console.error('Erreur lors de la récupération des pièces SAV:', error);
    } else {
      savCaseWithParts.sav_parts = savParts?.map(part => ({
        ...part,
        name: part.parts?.name || part.custom_part_name || 'Pièce personnalisée',
        public_price: part.parts?.selling_price || part.unit_price || 0
      })) || [];
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des pièces SAV:', error);
    savCaseWithParts.sav_parts = [];
  }

  // Créer le contenu HTML du document de restitution
  const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Document de Restitution SAV ${savCase.case_number}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px 15px;
            color: #333;
            line-height: 1.2;
            font-size: 11px;
          }
          .shop-header {
            text-align: left;
            margin-bottom: 8px;
            border-bottom: 1px solid #0066cc;
            padding-bottom: 5px;
          }
          .shop-logo {
            max-height: 40px;
            max-width: 120px;
            object-fit: contain;
            margin-bottom: 5px;
          }
          .shop-name {
            font-size: 18px;
            font-weight: bold;
            color: #0066cc;
            margin: 0;
          }
          .shop-contact {
            font-size: 10px;
            color: #666;
            margin-top: 3px;
          }
          .document-header {
            text-align: center;
            margin-bottom: 15px;
          }
          .document-title {
            font-size: 20px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 5px;
          }
          .case-info {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            border-left: 3px solid #0066cc;
          }
          .case-info h3 {
            margin-top: 0;
            margin-bottom: 8px;
            color: #0066cc;
            font-size: 14px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 10px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-weight: bold;
            color: #333;
            font-size: 10px;
            text-transform: uppercase;
            margin-bottom: 1px;
          }
          .info-value {
            font-size: 11px;
            color: #666;
          }
          .parts-section {
            margin-bottom: 15px;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 8px;
            padding-bottom: 3px;
            border-bottom: 1px solid #ddd;
          }
          .parts-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10px;
          }
          .parts-table th,
          .parts-table td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
          }
          .parts-table th {
            background-color: #0066cc;
            color: white;
            font-weight: bold;
            font-size: 10px;
          }
          .parts-table .text-center {
            text-align: center;
          }
          .parts-table .text-right {
            text-align: right;
          }
          .total-section {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #0066cc;
            margin-bottom: 15px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 11px;
          }
          .total-final {
            font-size: 14px;
            font-weight: bold;
            color: #0066cc;
            border-top: 1px solid #0066cc;
            padding-top: 5px;
            margin-top: 5px;
          }
          .takeover-info {
            background-color: #e8f5e8;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 10px;
            border-left: 3px solid #28a745;
            font-size: 10px;
          }
          .no-charge-info {
            background-color: #fff3cd;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 10px;
            border-left: 3px solid #ffc107;
            text-align: center;
            font-size: 11px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          .signature-section {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 45%;
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #333;
            height: 40px;
            margin-bottom: 5px;
          }
          .signature-box p {
            font-size: 9px;
            margin: 0;
          }
          .discount-info {
            background-color: #fff3cd;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 10px;
            border-left: 3px solid #ffc107;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; padding: 10px; font-size: 11px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${shop ? `
          <div class="shop-header">
            ${shop.logo_url ? `<img src="${shop.logo_url}" alt="${shop.name}" class="shop-logo">` : ''}
            <h1 class="shop-name">${shop.name}</h1>
            <div class="shop-contact">
              ${shop.address ? `${shop.address}<br>` : ''}
              ${shop.phone ? `Tél: ${shop.phone}` : ''}
              ${shop.email ? ` - Email: ${shop.email}` : ''}
            </div>
          </div>
        ` : ''}
        
        <div class="document-header">
          <div class="document-title">DOCUMENT DE RESTITUTION</div>
          <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        
        <div class="case-info">
          <h3>Informations du dossier</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Numéro de dossier</span>
              <span class="info-value">${savCase.case_number}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date de création</span>
              <span class="info-value">${new Date(savCase.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Client</span>
              <span class="info-value">${savCase.customer ? `${savCase.customer.first_name} ${savCase.customer.last_name}` : 'Non renseigné'}</span>
            </div>
            ${savCase.customer?.phone ? `
            <div class="info-item">
              <span class="info-label">Téléphone client</span>
              <span class="info-value" style="font-size: 13px; font-weight: bold; color: #0066cc;">📞 ${savCase.customer.phone}</span>
            </div>
            ` : ''}
            <div class="info-item">
              <span class="info-label">Appareil</span>
              <span class="info-value">${savCase.device_brand} ${savCase.device_model}</span>
            </div>
          </div>
          ${savCase.device_imei ? `
            <div class="info-item">
              <span class="info-label">IMEI</span>
              <span class="info-value">${savCase.device_imei}</span>
            </div>
          ` : ''}
        </div>

        <div class="parts-section">
          <h3 class="section-title">Détail de l'intervention</h3>
          
          ${savCase.problem_description ? `
            <div style="margin-bottom: 20px;">
              <strong>Problème signalé :</strong>
              <p style="margin: 5px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                ${savCase.problem_description}
              </p>
            </div>
          ` : ''}

          ${savCase.repair_notes ? `
            <div style="margin-bottom: 20px;">
              <strong>Notes de réparation :</strong>
              <p style="margin: 5px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                ${savCase.repair_notes}
              </p>
            </div>
          ` : ''}

          ${savCaseWithParts.sav_parts && savCaseWithParts.sav_parts.length > 0 ? `
            <h4>Pièces remplacées :</h4>
            <table class="parts-table">
              <thead>
                <tr>
                  <th style="width: 50%;">Pièce</th>
                  <th style="width: 15%;" class="text-center">Quantité</th>
                  <th style="width: 20%;" class="text-right">Prix unitaire</th>
                  <th style="width: 15%;" class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${savCaseWithParts.sav_parts.map((part: any) => {
                  const unitPrice = part.public_price || part.unit_price || 0;
                  const lineTotal = unitPrice * part.quantity;
                  const discountInfo = part.discount_info ? JSON.parse(part.discount_info) : null;
                  const discountAmount = discountInfo?.amount || 0;
                  const finalTotal = Math.max(0, lineTotal - discountAmount);
                  
                  return `
                    <tr>
                      <td>
                        <strong>${part.name || 'Pièce personnalisée'}</strong>
                        ${part.parts?.reference ? `<br><small>Réf: ${part.parts.reference}</small>` : ''}
                        ${discountInfo ? `<br><small style="color: #0066cc;">Remise ${discountInfo.type === 'percentage' ? `${discountInfo.value}%` : `${discountInfo.value}€`}: -${discountAmount.toFixed(2)}€</small>` : ''}
                      </td>
                      <td class="text-center">${part.quantity}</td>
                      <td class="text-right">${unitPrice.toFixed(2)}€</td>
                      <td class="text-right">${finalTotal.toFixed(2)}€</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : `
            <p style="text-align: center; color: #666; font-style: italic; padding: 20px;">
              Aucune pièce remplacée lors de cette intervention
            </p>
          `}
        </div>

        <div class="total-section">
          ${(() => {
            const subtotalBrut = savCaseWithParts.sav_parts ? savCaseWithParts.sav_parts.reduce((total: number, part: any) => {
              const unitPrice = part.public_price || part.unit_price || 0;
              return total + (unitPrice * part.quantity);
            }, 0) : 0;
            
            const totalRemises = savCaseWithParts.sav_parts ? savCaseWithParts.sav_parts.reduce((total: number, part: any) => {
              const discountInfo = part.discount_info ? JSON.parse(part.discount_info) : null;
              return total + (discountInfo?.amount || 0);
            }, 0) : 0;
            
            return `
              ${savCaseWithParts.sav_parts && savCaseWithParts.sav_parts.length > 0 ? `
                <div class="total-row">
                  <span>Sous-total pièces :</span>
                  <span>${subtotalBrut.toFixed(2)}€</span>
                </div>
              ` : ''}
              
              ${totalRemises > 0 ? `
                <div class="total-row" style="color: #0066cc;">
                  <span>Total remises pièces :</span>
                  <span>-${totalRemises.toFixed(2)}€</span>
                </div>
              ` : ''}
              
              <div class="total-row">
                <span><strong>Sous-total :</strong></span>
                <span><strong>${(savCase.total_cost || 0).toFixed(2)}€</strong></span>
              </div>
            `;
          })()}
          
          ${((savCase as any).taken_over || (savCase as any).partial_takeover) ? `
            <div class="total-row" style="color: #dc3545; font-weight: bold; background-color: #f8d7da; padding: 5px; border-radius: 3px;">
              <span>🏪 Prise en charge magasin :</span>
              <span>-${(savCase as any).partial_takeover ? 
                ((savCase as any).takeover_amount || 0).toFixed(2) : 
                (savCase.total_cost || 0).toFixed(2)
              }€</span>
            </div>
          ` : ''}
          
          <div class="total-final">
            <div class="total-row" style="color: #0066cc; font-weight: bold; background-color: #e6f3ff; padding: 8px; border-radius: 5px; border: 2px solid #0066cc;">
              <span><strong>TOTAL À RÉGLER :</strong></span>
              <span><strong>${(
                (savCase.total_cost || 0) - 
                (((savCase as any).taken_over || (savCase as any).partial_takeover) ? 
                  ((savCase as any).partial_takeover ? 
                    ((savCase as any).takeover_amount || 0) : 
                    (savCase.total_cost || 0)
                  ) : 0
                )
              ).toFixed(2)}€</strong></span>
            </div>
          </div>
          
          ${(((savCase as any).taken_over && !(savCase as any).partial_takeover) || (savCase.total_cost || 0) === 0) ? `
            <div class="no-charge-info">
              <strong style="color: #856404;">INTERVENTION GRATUITE</strong>
              <p style="margin: 3px 0 0 0;">
                ${(savCase as any).taken_over ? 'Prise en charge totale par le magasin' : 'Aucun frais appliqué pour cette intervention'}
              </p>
            </div>
          ` : ''}
         </div>

        ${savCase.technician_comments ? `
          <div style="margin-bottom: 8px;">
            <h4 style="color: #0066cc; border-bottom: 1px solid #0066cc; padding-bottom: 3px; margin: 8px 0 5px 0; font-size: 12px;">
              Commentaires technicien
            </h4>
            <div style="background-color: #f8f9fa; padding: 8px; border-left: 3px solid #0066cc; border-radius: 3px;">
              <p style="margin: 0; white-space: pre-wrap; line-height: 1.3; font-size: 10px;">${savCase.technician_comments}</p>
            </div>
          </div>
        ` : ''}

        ${options?.clientMessages && options.clientMessages.length > 0 ? `
          <div style="margin-bottom: 8px;">
            <h4 style="color: #28a745; border-bottom: 1px solid #28a745; padding-bottom: 3px; margin: 8px 0 5px 0; font-size: 12px;">
              Messages du client
            </h4>
            ${options.clientMessages.map((msg: any) => `
              <div style="background-color: #f0fff4; padding: 6px 8px; border-left: 3px solid #28a745; border-radius: 3px; margin-bottom: 4px;">
                <p style="margin: 0; font-size: 9px; color: #666;">${new Date(msg.created_at).toLocaleDateString('fr-FR')} à ${new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — ${msg.sender_name}</p>
                <p style="margin: 2px 0 0 0; white-space: pre-wrap; line-height: 1.3; font-size: 10px;">${msg.message}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${closureHistory.length > 0 ? `
          <div style="margin-bottom: 8px;">
            <h4 style="color: #0066cc; border-bottom: 1px solid #0066cc; padding-bottom: 3px; margin: 8px 0 5px 0; font-size: 12px;">
              Historique de clôture
            </h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background-color: #0066cc; color: white;">
                  <th style="padding: 4px 6px; text-align: left;">Date & Heure</th>
                  <th style="padding: 4px 6px; text-align: left;">Statut</th>
                  <th style="padding: 4px 6px; text-align: left;">Clôturé par</th>
                </tr>
              </thead>
              <tbody>
                ${closureHistory.map((entry: any) => `
                  <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 3px 6px;">${new Date(entry.closed_at).toLocaleDateString('fr-FR')} à ${new Date(entry.closed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style="padding: 3px 6px; font-weight: bold;">${entry.status_label}</td>
                    <td style="padding: 3px 6px;">${entry.closed_by_name || 'Non précisé'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="signature-section" style="margin-top: 10px;">
          <div class="signature-box">
            <div class="signature-line" style="height: 30px;"></div>
            <p><strong>Signature du client</strong><br>
            <small>Bon pour accord et réception</small></p>
          </div>
          <div class="signature-box">
            <div class="signature-line" style="height: 30px;"></div>
            <p><strong>Signature du technicien</strong><br>
            <small>${shop?.name || 'Magasin'}</small></p>
          </div>
        </div>

        <div class="footer" style="margin-top: 8px; padding-top: 5px;">
          <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
      </body>
      </html>
    `;

  // Créer un iframe masqué pour l'impression
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    // Attendre un peu avant d'imprimer
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Nettoyer l'iframe après l'impression
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      } catch (error) {
        console.error('Erreur lors de l\'impression:', error);
        document.body.removeChild(iframe);
        
        // Fallback : télécharger en HTML
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `restitution-${savCase.case_number}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 500);
  }
};

export const generateSAVListPDF = async (savCases: SAVCase[], shop?: Shop, filterInfo?: {
  searchTerm: string;
  filterType: string;
  statusFilter: string;
  sortOrder: string;
}, statuses?: any[], types?: any[]) => {
  // Utiliser directement les cases filtrées passées en paramètre
  const filteredCases = savCases;
  
  if (filteredCases.length === 0) {
    return null; // Pas de SAV à imprimer
  }

  // Fonction pour calculer le coût réel (prix d'achat des pièces)
  const calculateRealCost = async (savCaseId: string): Promise<number> => {
    try {
      // Import Supabase client dynamically to avoid circular imports
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: parts, error } = await supabase
        .from('sav_parts')
        .select('quantity, purchase_price')
        .eq('sav_case_id', savCaseId);

      if (error) {
        console.error('Error fetching SAV parts:', error);
        return 0;
      }

      return parts?.reduce((total, part) => {
        const qty = Number(part.quantity) || 0;
        const purchasePrice = Number(part.purchase_price) || 0;
        return total + (qty * purchasePrice);
      }, 0) || 0;
    } catch (error) {
      console.error('Error calculating real cost:', error);
      return 0;
    }
  };

  // Fonction pour obtenir le libellé du statut depuis les statuts personnalisés
  const getStatusText = (status: string) => {
    const customStatus = statuses?.find(s => s.status_key === status);
    return customStatus ? customStatus.status_label : status;
  };

  // Fonction pour obtenir le libellé du type depuis les types personnalisés
  const getTypeText = (type: string) => {
    const customType = types?.find(t => t.type_key === type);
    return customType ? customType.type_label : type;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'received': return 'status-received';
      case 'diagnostic': return 'status-diagnostic';
      case 'waiting_parts': return 'status-waiting-parts';
      case 'in_repair': return 'status-in-repair';
      case 'waiting_customer': return 'status-waiting-customer';
      case 'ready': return 'status-ready';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  };

  const getFilterTypeLabel = (filterType: string) => {
    switch (filterType) {
      case 'all': return 'Tous les SAV';
      case 'client': return 'SAV Client';
      case 'internal': return 'SAV Magasin';
      case 'external': return 'SAV Externe';
      default: return filterType;
    }
  };

  const getStatusFilterLabel = (statusFilter: string) => {
    switch (statusFilter) {
      case 'all': return 'Tous les statuts';
      case 'all-except-ready': return 'Masquer les prêts';
      case 'overdue': return 'En retard';
      default: {
        // Chercher dans les statuts personnalisés
        const customStatus = statuses?.find(s => s.status_key === statusFilter);
        return customStatus ? customStatus.status_label : statusFilter;
      }
    }
  };

  const getSortOrderLabel = (sortOrder: string) => {
    switch (sortOrder) {
      case 'priority': return 'Par priorité';
      case 'oldest': return 'Plus vieux en premier';
      case 'newest': return 'Plus récent en premier';
      default: return sortOrder;
    }
  };

  // Grouper les SAV par type
  const grouped: Record<string, typeof filteredCases> = {};
  for (const c of filteredCases) {
    if (!grouped[c.sav_type]) grouped[c.sav_type] = [];
    grouped[c.sav_type].push(c);
  }

  // Générer les sections HTML par type
  const typeSectionsHTML: string[] = [];
  for (const typeKey of Object.keys(grouped)) {
    const casesForType = grouped[typeKey];
    const typeLabel = getTypeText(typeKey);
    const typeColor = types?.find(t => t.type_key === typeKey)?.type_color || '#0066cc';

    const rowsHTML = await Promise.all(casesForType.map(async (savCase) => {
      const realCost = await calculateRealCost(savCase.id);
      const customerHTML = savCase.customer
        ? `<strong>${savCase.customer.first_name} ${savCase.customer.last_name}</strong><br>${savCase.customer.phone || ''}`
        : 'Non renseigné';
      const imeiHTML = savCase.device_imei ? `<br><small>IMEI: ${savCase.device_imei.substring(0, 8)}...</small>` : '';
      const costHTML = realCost > 0 ? `${realCost.toFixed(2)}€` : '-';

      return `
        <tr>
          <td class="case-number">${savCase.case_number}</td>
          <td class="text-center">${new Date(savCase.created_at).toLocaleDateString('fr-FR')}</td>
          <td class="customer-info">${customerHTML}</td>
          <td class="device-info"><strong>${savCase.device_brand}</strong><br>${savCase.device_model}${imeiHTML}</td>
          <td class="problem-desc" title="${savCase.problem_description || ''}">${savCase.problem_description || 'Non renseigné'}</td>
          <td class="text-center"><span class="status-badge ${getStatusClass(savCase.status)}">${getStatusText(savCase.status)}</span></td>
          <td class="text-center">${costHTML}</td>
          <td class="text-center">${new Date(savCase.updated_at).toLocaleDateString('fr-FR')}</td>
        </tr>
      `;
    }));

    typeSectionsHTML.push(`
      <div style="margin-bottom: 25px;">
        <div style="background-color: ${typeColor}; color: white; padding: 8px 14px; border-radius: 6px 6px 0 0; font-size: 13px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
          <span>${typeLabel}</span>
          <span style="font-size: 11px; opacity: 0.9;">${casesForType.length} dossier(s)</span>
        </div>
        <table class="sav-table" style="margin-bottom: 0;">
          <thead>
            <tr>
              <th style="width: 12%;">N° Dossier</th>
              <th style="width: 8%;">Date</th>
              <th style="width: 15%;">Client</th>
              <th style="width: 15%;">Appareil</th>
              <th style="width: 20%;">Problème</th>
              <th style="width: 12%;">Statut</th>
              <th style="width: 8%;">Coût</th>
              <th style="width: 10%;">Dernière MAJ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML.join('')}
          </tbody>
        </table>
      </div>
    `);
  }

  const allSectionsHTML = typeSectionsHTML.join('');

  // Créer le contenu HTML de la liste des SAV
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Liste des dossiers SAV</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 15px;
          color: #333;
          font-size: 11px;
          line-height: 1.3;
        }
        .shop-header {
          text-align: left;
          margin-bottom: 20px;
          border-bottom: 2px solid #0066cc;
          padding-bottom: 10px;
        }
        .shop-logo {
          max-height: 50px;
          max-width: 150px;
          object-fit: contain;
          margin-bottom: 8px;
        }
        .shop-name {
          font-size: 20px;
          font-weight: bold;
          color: #0066cc;
          margin: 0;
        }
        .shop-contact {
          font-size: 9px;
          color: #666;
          margin-top: 3px;
        }
        .document-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .document-title {
          font-size: 18px;
          font-weight: bold;
          color: #0066cc;
          margin-bottom: 5px;
        }
        .stats-info {
          background-color: #f8f9fa;
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 15px;
          text-align: center;
          border-left: 3px solid #0066cc;
        }
        .sav-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 9px;
        }
        .sav-table th,
        .sav-table td {
          border: 1px solid #ddd;
          padding: 4px;
          text-align: left;
          vertical-align: top;
        }
        .sav-table th {
          background-color: #f0f0f0;
          color: #333;
          font-weight: bold;
          font-size: 9px;
          text-align: center;
        }
        .sav-table .text-center {
          text-align: center;
        }
        .case-number {
          font-weight: bold;
          color: #0066cc;
        }
        .status-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 7px;
          font-weight: bold;
          text-transform: uppercase;
          text-align: center;
        }
        .status-received { background-color: #e3f2fd; color: #1976d2; }
        .status-diagnostic { background-color: #fff3e0; color: #f57c00; }
        .status-waiting-parts { background-color: #fce4ec; color: #c2185b; }
        .status-in-repair { background-color: #e8f5e8; color: #388e3c; }
        .status-waiting-customer { background-color: #fff8e1; color: #f9a825; }
        .status-ready { background-color: #e0f2f1; color: #00695c; }
        .status-delivered { background-color: #f3e5f5; color: #7b1fa2; }
        .status-cancelled { background-color: #ffebee; color: #d32f2f; }
        .status-default { background-color: #f5f5f5; color: #757575; }
        .customer-info {
          font-size: 8px;
        }
        .device-info {
          font-size: 8px;
          color: #666;
        }
        .problem-desc {
          font-size: 7px;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 8px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        @media print {
          body { margin: 0; padding: 8px; font-size: 10px; }
          .no-print { display: none; }
          .sav-table { font-size: 8px; }
        }
      </style>
    </head>
    <body>
      ${shop ? `
        <div class="shop-header">
          ${shop.logo_url ? `<img src="${shop.logo_url}" alt="${shop.name}" class="shop-logo">` : ''}
          <h1 class="shop-name">${shop.name}</h1>
          <div class="shop-contact">
            ${shop.address ? `${shop.address}<br>` : ''}
            ${shop.phone ? `Tél: ${shop.phone}` : ''}
            ${shop.email ? ` - Email: ${shop.email}` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="document-header">
        <div class="document-title">LISTE DES DOSSIERS SAV</div>
        <p>Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        ${filterInfo ? `
          <div class="filter-info" style="margin-top: 10px; padding: 8px; background-color: #f8f9fa; border-radius: 5px; font-size: 10px;">
            <strong>Filtres appliqués :</strong>
            ${filterInfo.searchTerm ? `<br>• Recherche : "${filterInfo.searchTerm}"` : ''}
            <br>• Type : ${getFilterTypeLabel(filterInfo.filterType)}
            <br>• Statut : ${getStatusFilterLabel(filterInfo.statusFilter)}
            <br>• Tri : ${getSortOrderLabel(filterInfo.sortOrder)}
          </div>
        ` : ''}
      </div>
      
      <div class="stats-info">
        <strong>${filteredCases.length} dossier(s) trouvé(s)</strong>
      </div>

      ${allSectionsHTML}

      <div class="footer">
        <p>Liste générée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        <p style="font-size: 10px; margin-top: 8px;">Propulsé par <strong>FixWay Pro</strong></p>
      </div>
    </body>
    </html>
  `;

  // Créer un iframe masqué pour l'impression
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    // Attendre un peu avant d'imprimer
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Nettoyer l'iframe après l'impression
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      } catch (error) {
        console.error('Erreur lors de l\'impression:', error);
        document.body.removeChild(iframe);
        
        // Fallback : télécharger en HTML
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Construire un nom de fichier basé sur les filtres
        const date = new Date().toISOString().split('T')[0];
        let fileName = 'fixway-sav';
        
        if (filterInfo) {
          const typeSlug = filterInfo.filterType !== 'all' ? `-${filterInfo.filterType}` : '';
          const statusSlug = filterInfo.statusFilter !== 'all' ? `-${filterInfo.statusFilter}` : '';
          fileName = `fixway-sav${typeSlug}${statusSlug}-${date}`;
        } else {
          fileName = `fixway-sav-${date}`;
        }
        
        a.download = `${fileName}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 500);
  }

  return true;
};