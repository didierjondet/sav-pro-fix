import { useEffect } from 'react';
import { useShop } from '@/hooks/useShop';
import { SAVCase } from '@/hooks/useSAVCases';
import { Card, CardContent } from '@/components/ui/card';

interface SAVQRCodePrintProps {
  savCase: SAVCase;
  onClose: () => void;
}

export function SAVQRCodePrint({ savCase, onClose }: SAVQRCodePrintProps) {
  const { shop } = useShop();

  // Créer l'URL raccourcie du style www.fixway.fr/nom_du_magasin/nom_du_client
  const shopName = shop?.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'magasin';
  const clientName = savCase.customer 
    ? `${savCase.customer.first_name}_${savCase.customer.last_name}`.toLowerCase().replace(/[^a-z0-9]/g, '_')
    : 'client';
  const trackingUrl = `www.fixway.fr/${shopName}/${clientName}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://${trackingUrl}`)}`;

  useEffect(() => {
    console.log('Shop data:', shop); // Debug
    
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - Suivi SAV ${savCase.case_number}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 1.5cm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100vh;
            }
            
            /* Première moitié de page */
            .qr-section {
              width: 100%;
              height: 48vh;
              padding: 20px;
              border-bottom: 2px dashed #ccc;
              display: flex;
              flex-direction: column;
            }
            
            /* Deuxième moitié de page */
            .qr-section-duplicate {
              width: 100%;
              height: 48vh;
              padding: 20px;
              display: flex;
              flex-direction: column;
            }
            
            .shop-header {
              display: flex;
              align-items: center;
              margin-bottom: 15px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
            }
            
            .shop-logo {
              max-height: 50px;
              max-width: 80px;
              margin-right: 15px;
            }
            
            .shop-info {
              flex: 1;
            }
            
            .shop-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .shop-details {
              font-size: 11px;
              line-height: 1.3;
              color: #666;
            }
            
            .content {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            
            .qr-info {
              flex: 1;
              padding-right: 15px;
            }
            
            .case-number {
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 8px;
            }
            
            .device-info {
              font-size: 12px;
              margin-bottom: 5px;
            }
            
            .customer-info {
              font-size: 11px;
              color: #666;
              margin-bottom: 8px;
            }
            
            .url-info {
              font-size: 10px;
              background: #f5f5f5;
              padding: 5px;
              border-radius: 3px;
              word-break: break-all;
            }
            
            .qr-code {
              text-align: center;
            }
            
            .qr-code img {
              width: 120px;
              height: 120px;
              border: 1px solid #ddd;
            }
            
            .instructions {
              font-size: 9px;
              text-align: center;
              margin-top: 5px;
              line-height: 1.2;
            }
            
            @media print {
              body { print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <!-- Première QR Code -->
          <div class="qr-section">
            <div class="shop-header">
              ${shop?.logo_url ? `<img src="${shop.logo_url}" alt="Logo" class="shop-logo" />` : ''}
              <div class="shop-info">
                <div class="shop-name">${shop?.name || 'Nom du magasin'}</div>
                <div class="shop-details">
                  ${shop?.address || ''}<br>
                  ${shop?.phone ? 'Tél: ' + shop.phone : ''} ${shop?.email ? '| Email: ' + shop.email : ''}
                </div>
              </div>
            </div>
            
            <div class="content">
              <div class="qr-info">
                <div class="case-number">SAV N° ${savCase.case_number}</div>
                <div class="device-info"><strong>Appareil:</strong> ${savCase.device_brand} ${savCase.device_model}</div>
                ${savCase.customer ? `<div class="customer-info"><strong>Client:</strong> ${savCase.customer.first_name} ${savCase.customer.last_name}</div>` : ''}
                <div class="url-info">${trackingUrl}</div>
              </div>
              
              <div class="qr-code">
                <img src="${qrCodeUrl}" alt="QR Code" />
                <div class="instructions">Scannez pour suivre<br>votre réparation</div>
              </div>
            </div>
          </div>
          
          <!-- Deuxième QR Code (identique) -->
          <div class="qr-section-duplicate">
            <div class="shop-header">
              ${shop?.logo_url ? `<img src="${shop.logo_url}" alt="Logo" class="shop-logo" />` : ''}
              <div class="shop-info">
                <div class="shop-name">${shop?.name || 'Nom du magasin'}</div>
                <div class="shop-details">
                  ${shop?.address || ''}<br>
                  ${shop?.phone ? 'Tél: ' + shop.phone : ''} ${shop?.email ? '| Email: ' + shop.email : ''}
                </div>
              </div>
            </div>
            
            <div class="content">
              <div class="qr-info">
                <div class="case-number">SAV N° ${savCase.case_number}</div>
                <div class="device-info"><strong>Appareil:</strong> ${savCase.device_brand} ${savCase.device_model}</div>
                ${savCase.customer ? `<div class="customer-info"><strong>Client:</strong> ${savCase.customer.first_name} ${savCase.customer.last_name}</div>` : ''}
                <div class="url-info">${trackingUrl}</div>
              </div>
              
              <div class="qr-code">
                <img src="${qrCodeUrl}" alt="QR Code" />
                <div class="instructions">Scannez pour suivre<br>votre réparation</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Attendre que l'image soit chargée puis imprimer
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        onClose();
      }, 500);
    };
  }, [savCase, shop, trackingUrl, qrCodeUrl, onClose]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 text-center">
        <p>Génération du QR code d'impression...</p>
        <p className="text-sm text-muted-foreground mt-2">
          La fenêtre d'impression va s'ouvrir automatiquement.
        </p>
      </CardContent>
    </Card>
  );
}