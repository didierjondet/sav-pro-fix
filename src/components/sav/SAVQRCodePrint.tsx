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
              size: A4;
              margin: 2cm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .logo {
              max-height: 80px;
              max-width: 200px;
            }
            .shop-info {
              text-align: right;
              font-size: 14px;
              line-height: 1.4;
            }
            .main-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #333;
            }
            .case-number {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 30px;
            }
            .qr-code {
              margin: 30px 0;
            }
            .qr-code img {
              border: 2px solid #333;
              padding: 10px;
              background: white;
            }
            .instructions {
              font-size: 16px;
              max-width: 500px;
              margin: 20px auto;
              line-height: 1.6;
              color: #555;
            }
            .url {
              font-family: monospace;
              background: #f5f5f5;
              padding: 10px;
              border-radius: 4px;
              word-break: break-all;
              margin: 20px 0;
              font-size: 14px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${shop?.logo_url ? `<img src="${shop.logo_url}" alt="Logo" class="logo" />` : '<div style="width: 200px;"></div>'}
            </div>
            <div class="shop-info">
              <strong>${shop?.name || 'Nom du magasin'}</strong><br>
              ${shop?.address ? shop.address + '<br>' : ''}
              ${shop?.phone ? 'Tél: ' + shop.phone + '<br>' : ''}
              ${shop?.email ? 'Email: ' + shop.email : ''}
            </div>
          </div>
          
          <div class="main-content">
            <h1 class="title">Suivi de réparation SAV</h1>
            <div class="case-number">Dossier N° ${savCase.case_number}</div>
            
            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
            
            <div class="instructions">
              <p><strong>Scannez ce QR code</strong> avec votre smartphone pour suivre l'état de votre réparation en temps réel.</p>
              <p>Ou rendez-vous directement sur :</p>
              <div class="url">${trackingUrl}</div>
              <p style="margin-top: 15px;"><strong>Appareil :</strong> ${savCase.device_brand} ${savCase.device_model}</p>
              ${savCase.customer ? `<p><strong>Client :</strong> ${savCase.customer.first_name} ${savCase.customer.last_name}</p>` : ''}
            </div>
          </div>
          
          <div class="footer">
            <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} - ${shop?.name || ''}</p>
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