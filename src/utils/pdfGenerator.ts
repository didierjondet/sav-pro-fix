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
            <th style="width: 50%;">Article</th>
            <th style="width: 15%;" class="text-center">Quantité</th>
            <th style="width: 20%;" class="text-right">Prix unitaire</th>
            <th style="width: 15%;" class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items.map(item => `
            <tr>
              <td>
                <strong>${item.part_name}</strong>
                ${item.part_reference ? `<br><small>Réf: ${item.part_reference}</small>` : ''}
              </td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">${(item as any).unit_public_price.toFixed(2)}€</td>
              <td class="text-right">${item.total_price.toFixed(2)}€</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total-section">
        TOTAL: ${quote.total_amount.toFixed(2)}€
      </div>
      
      <div class="footer">
        ${shop ? `
          <div class="shop-footer">
            ${shop.address ? `<p><strong>Adresse:</strong> ${shop.address}</p>` : ''}
            ${shop.phone ? `<p><strong>Téléphone:</strong> ${shop.phone}</p>` : ''}
            ${shop.email ? `<p><strong>Email:</strong> ${shop.email}</p>` : ''}
          </div>
        ` : ''}
        <p>Devis généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        <p style="font-size: 10px; margin-top: 10px;">Propulsé par <strong>FixWay Pro</strong></p>
      </div>
    </body>
    </html>
  `;

  // Créer une nouvelle fenêtre pour l'impression
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Attendre que le contenu soit chargé avant d'imprimer
    printWindow.onload = () => {
      printWindow.print();
      // Fermer la fenêtre après l'impression (optionnel)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'draft': return 'Brouillon';
    case 'pending_review': return 'En révision';
    case 'sent': return 'Envoyé';
    case 'under_negotiation': return 'En négociation';
    case 'accepted': return 'Accepté';
    case 'rejected': return 'Refusé';
    case 'expired': return 'Expiré';
    default: return status;
  }
};

export const generateSAVRestitutionPDF = async (savCase: SAVCase, shop?: Shop): Promise<string | null> => {
  try {
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
            padding: 15px;
            color: #333;
            line-height: 1.3;
            font-size: 12px;
          }
          .shop-header {
            text-align: left;
            margin-bottom: 15px;
            border-bottom: 1px solid #0066cc;
            padding-bottom: 10px;
          }
          .shop-logo {
            max-height: 50px;
            max-width: 150px;
            object-fit: contain;
            margin-bottom: 5px;
          }
          .shop-name {
            font-size: 16px;
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
            font-size: 18px;
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
            padding: 4px;
            text-align: left;
          }
          .parts-table th {
            background-color: #0066cc;
            color: white;
            font-weight: bold;
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
            font-size: 12px;
            font-weight: bold;
            color: #0066cc;
            border-top: 1px solid #0066cc;
            padding-top: 5px;
            margin-top: 5px;
          }
          .takeover-info {
            background-color: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #28a745;
          }
          .no-charge-info {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #ffc107;
            text-align: center;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
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
            height: 30px;
            margin-bottom: 5px;
          }
          @media print {
            body { margin: 0; padding: 10px; font-size: 11px; }
            .no-print { display: none; }
            .parts-table { font-size: 9px; }
            .signature-section { margin-top: 15px; }
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

          ${(savCase as any).sav_parts && (savCase as any).sav_parts.length > 0 ? `
            <h4>Pièces remplacées :</h4>
            <table class="parts-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Pièce</th>
                  <th style="width: 15%;" class="text-center">Quantité</th>
                  <th style="width: 20%;" class="text-right">Prix unitaire</th>
                  <th style="width: 15%;" class="text-right">Temps (min)</th>
                  <th style="width: 15%;" class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(savCase as any).sav_parts.map((part: any) => `
                  <tr>
                    <td>
                      <strong>${part.parts?.name || 'Pièce inconnue'}</strong>
                      ${part.parts?.reference ? `<br><small>Réf: ${part.parts.reference}</small>` : ''}
                    </td>
                    <td class="text-center">${part.quantity}</td>
                    <td class="text-right">${(part.unit_price || 0).toFixed(2)}€</td>
                    <td class="text-center">${part.time_minutes || 0}</td>
                    <td class="text-right">${((part.unit_price || 0) * part.quantity).toFixed(2)}€</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <p style="text-align: center; color: #666; font-style: italic; padding: 20px;">
              Aucune pièce remplacée lors de cette intervention
            </p>
          `}
        </div>

        <div class="total-section">
          <div class="total-row">
            <span>Sous-total pièces et main d'œuvre :</span>
            <span>${(savCase.total_cost || 0).toFixed(2)}€</span>
          </div>
          
          ${(savCase as any).taken_over ? `
            <div class="takeover-info">
              <strong>Prise en charge :</strong>
              ${(savCase as any).partial_takeover ? `
                <div>Prise en charge partielle de ${((savCase as any).takeover_amount || 0).toFixed(2)}€</div>
                <div>Montant restant à la charge du client : ${((savCase.total_cost || 0) - ((savCase as any).takeover_amount || 0)).toFixed(2)}€</div>
              ` : `
                <div>Prise en charge totale - Aucun coût pour le client</div>
              `}
            </div>
          ` : ''}
          
          <div class="total-final">
            <div class="total-row">
              <span>TOTAL À RÉGLER :</span>
              <span>${(savCase as any).taken_over ? 
                ((savCase as any).partial_takeover ? 
                  ((savCase.total_cost || 0) - ((savCase as any).takeover_amount || 0)).toFixed(2) : 
                  '0.00'
                ) : 
                (savCase.total_cost || 0).toFixed(2)
              }€</span>
            </div>
          </div>
          
          ${(((savCase as any).taken_over && !(savCase as any).partial_takeover) || (savCase.total_cost || 0) === 0) ? `
            <div class="no-charge-info">
              <h4 style="margin: 0; color: #856404;">INTERVENTION GRATUITE</h4>
              <p style="margin: 5px 0 0 0; font-size: 14px;">
                ${(savCase as any).taken_over ? 'Prise en charge totale par le magasin' : 'Aucun frais appliqué pour cette intervention'}
              </p>
            </div>
          ` : ''}
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Signature du client</strong><br>
            <small>Bon pour accord et réception</small></p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Signature du technicien</strong><br>
            <small>${shop?.name || 'Magasin'}</small></p>
          </div>
        </div>

        <div class="footer">
          <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
          <p style="font-size: 10px; margin-top: 10px;">Propulsé par <strong>FixWay Pro</strong></p>
        </div>
      </body>
      </html>
    `;

    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Attendre que le contenu soit chargé avant d'imprimer
      printWindow.onload = () => {
        printWindow.print();
        // Fermer la fenêtre après l'impression (optionnel)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      };
      
      // Retourner une URL factice pour l'archivage (dans un vrai projet, on sauvegarderait le PDF)
      const documentUrl = `${window.location.origin}/sav-documents/${savCase.case_number}-restitution.pdf`;
      return documentUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF de restitution:', error);
    return null;
  }
};