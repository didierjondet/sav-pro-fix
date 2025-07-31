import { Quote } from '@/hooks/useQuotes';
import { Shop } from '@/hooks/useShop';

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
            <th style="width: 40%;">Article</th>
            <th style="width: 20%;" class="text-center">Quantité</th>
            <th style="width: 20%;" class="text-right">Prix unitaire</th>
            <th style="width: 20%;" class="text-right">Total</th>
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
              <td class="text-right">${item.unit_price.toFixed(2)}€</td>
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