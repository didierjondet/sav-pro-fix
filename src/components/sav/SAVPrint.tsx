import { useState } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { useShop } from "@/hooks/useShop";
import { supabase } from "@/integrations/supabase/client";
import type { SAVCase } from "@/hooks/useSAVCases";
import { Printer, Scissors } from "lucide-react";
import { generateShortTrackingUrl } from '@/utils/trackingUtils';

interface SAVPrintButtonProps {
  savCase: SAVCase & { customer?: { first_name: string; last_name: string; email?: string; phone?: string; address?: string } };
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

export const SAVPrintButton = React.forwardRef<HTMLButtonElement, SAVPrintButtonProps>(({ savCase, className, size = "sm", variant = "outline" }, ref) => {
  const { shop } = useShop();
  const [printing, setPrinting] = useState(false);

  const generateTrackingUrl = () => {
    if (!savCase?.tracking_slug) return "";
    return generateShortTrackingUrl(savCase.tracking_slug);
  };

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      // Récupérer les pièces
      const { data: partsData } = await supabase
        .from("sav_parts")
        .select(
          `quantity, unit_price, purchase_price, time_minutes, parts:part_id(name, reference)`
        )
        .eq("sav_case_id", savCase.id);

      const parts = (partsData || []).map((p: any) => ({
        name: p.parts?.name || "Pièce personnalisée",
        reference: p.parts?.reference || "",
        quantity: Number(p.quantity) || 0,
        unit_price: Number(p.unit_price) || 0,
        purchase_price: p.purchase_price !== null && p.purchase_price !== undefined ? Number(p.purchase_price) : undefined,
        time_minutes: Number(p.time_minutes) || 0,
      }));

      const totals = parts.reduce(
        (acc, p) => {
          acc.totalQty += p.quantity;
          acc.totalTime += p.time_minutes || 0;
          acc.totalCost += (p.unit_price || 0) * p.quantity;
          return acc;
        },
        { totalQty: 0, totalTime: 0, totalCost: 0 }
      );

      const trackingUrl = generateTrackingUrl();
      const qrCodeUrl = trackingUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(trackingUrl)}`
        : "";

      const statusLabels: Record<string, string> = {
        pending: "En attente",
        in_progress: "En cours",
        testing: "En test",
        parts_ordered: "Pièce commandée",
        ready: "Prêt",
        cancelled: "Annulé",
      };

      const shopHeader = shop
        ? `
        <div class="shop-header">
          ${shop.logo_url ? `<img src="${shop.logo_url}" alt="${shop.name}" class="shop-logo" />` : ""}
          <div class="shop-info">
            <div class="shop-name">${shop.name || ""}</div>
            <div class="shop-details">
              ${shop.address ? shop.address + "<br>" : ""}
              ${shop.phone ? "Tél: " + shop.phone : ""} ${shop.email ? " | Email: " + shop.email : ""}
            </div>
          </div>
        </div>`
        : `
        <div class="shop-header">
          <div class="shop-info">
            <div class="shop-name">Nom du magasin</div>
            <div class="shop-details">Informations boutique non disponibles</div>
          </div>
        </div>`;

      const customerBlock = savCase.customer
        ? `
        <div class="block">
          <div class="block-title">Client</div>
          <div class="grid">
            <div><span class="label">Nom:</span> <span class="highlight-red">${savCase.customer.first_name} ${savCase.customer.last_name}</span></div>
            ${savCase.customer.email ? `<div><span class="label">Email:</span> ${savCase.customer.email}</div>` : ""}
            ${savCase.customer.phone ? `<div><span class="label">Téléphone:</span> ${savCase.customer.phone}</div>` : ""}
            ${savCase.customer.address ? `<div class="col-span-2"><span class="label">Adresse:</span> ${savCase.customer.address}</div>` : ""}
          </div>
        </div>`
        : "";

      const deviceBlock = `
        <div class="block">
          <div class="block-title">Appareil</div>
          <div class="grid">
            <div><span class="label">Marque:</span> ${savCase.device_brand || "-"}</div>
            <div><span class="label">Modèle:</span> ${savCase.device_model || "-"}</div>
            ${savCase.device_imei ? `<div><span class="label">IMEI:</span> <span class="highlight-red">${savCase.device_imei}</span></div>` : ""}
            ${savCase.sku ? `<div><span class="label">SKU:</span> <span class="highlight-red">${savCase.sku}</span></div>` : ""}
            <div><span class="label">Type:</span> <span class="sav-type">${savCase.sav_type === "client" ? "SAV Client" : savCase.sav_type === "external" ? "SAV Externe" : "SAV Interne"}</span></div>
            <div><span class="label">Statut:</span> ${statusLabels[savCase.status] || savCase.status}</div>
          </div>
        </div>`;

      const descriptionBlock = `
        <div class="block">
          <div class="block-title">Description du problème</div>
          <div class="text">${(savCase.problem_description || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </div>`;

      const notesBlock = savCase.repair_notes
        ? `
        <div class="block">
          <div class="block-title">Notes de réparation</div>
          <div class="text">${(savCase.repair_notes || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </div>`
        : "";

      const partsRows = parts
        .map(
          (p) => `
          <tr>
            <td>${p.name}</td>
            <td>${p.reference || "-"}</td>
            <td class="num">${p.quantity}</td>
            <td class="num">${p.unit_price.toFixed(2)}€</td>
            <td class="num">${(p.unit_price * p.quantity).toFixed(2)}€</td>
          </tr>`
        )
        .join("");

      const partsTable = `
        <div class="block">
          <div class="block-title">Pièces et main d'œuvre</div>
          ${parts.length === 0 ? `<div class="text-muted">Aucune pièce ajoutée</div>` : `
            <table class="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Référence</th>
                  <th>Qté</th>
                  <th>PU</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${partsRows}
              </tbody>
            </table>
          `}
          <div class="summary">
            <div><span>Total pièces:</span> ${totals.totalQty}</div>
            <div><span>Temps total:</span> ${totals.totalTime} min</div>
            <div class="grand-total"><span>Montant total:</span> ${totals.totalCost.toFixed(2)}€</div>
          </div>
        </div>`;

      const qrBlock = trackingUrl
        ? `
        <div class="block">
          <div class="block-title">Suivi client</div>
          <div class="qr">
            <img src="${qrCodeUrl}" alt="QR Code" />
            <div class="url">${trackingUrl}</div>
          </div>
        </div>`
        : "";

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Impression Dossier SAV ${savCase.case_number}</title>
  <style>
    @page { size: A4 portrait; margin: 1.2cm; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
    .dual-content { display: flex; flex-direction: column; gap: 20px; width: 50%; }
    .content-block { width: 100%; }
    .header { display:flex; align-items:flex-start; justify-content:flex-start; margin-bottom: 12px; }
    .shop-header { display:flex; align-items:center; gap: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; justify-content: flex-start; margin-bottom: 6px; }
    .shop-logo { max-height: 30px; max-width: 50px; }
    .shop-info { line-height: 1.1; text-align: left; }
    .shop-name { font-size: 11px; font-weight: 700; }
    .shop-details { font-size: 8px; color:#555; }
    .header-left { text-align: left; }
    .title { font-size: 12px; font-weight: 700; color:#2563eb; }
    .meta { margin-top: 2px; color:#555; font-size: 8px; }
    .grid { display:grid; grid-template-columns: repeat(1, minmax(0,1fr)); gap: 3px; }
    .col-span-2 { grid-column: span 1 / span 1; }
    .label { color:#555; font-weight:600; margin-right:3px; }
    .block { margin-top: 8px; }
    .block-title { font-size: 10px; font-weight: 700; margin-bottom: 4px; border-bottom:1px solid #eee; padding-bottom:2px; text-align: left; }
    .text { white-space: pre-wrap; font-size: 9px; text-align: left; }
    .text-muted { color:#666; }
    .table { width:100%; border-collapse: collapse; margin-top:4px; font-size: 8px; }
    .table th, .table td { border: 1px solid #e5e7eb; padding: 3px 4px; text-align:left; }
    .table th { background: #f8fafc; font-weight:700; }
    .num { text-align:right; }
    .summary { margin-top: 4px; display:flex; flex-direction: column; gap:4px; align-items: flex-start; }
    .summary div { background:#f8fafc; border:1px solid #e5e7eb; padding:3px 6px; border-radius:3px; font-size: 8px; }
    .grand-total { font-weight:700; }
    .qr { display:flex; align-items:center; gap: 6px; justify-content: flex-start; }
    .qr img { border:1px solid #ddd; padding:3px; max-width: 60px; max-height: 60px; }
    .url { font-size: 7px; word-break: break-all; color:#2563eb; text-align: left; max-width: 100px; }
    .footer { margin-top: 12px; font-size: 7px; color:#777; text-align:left; }
    .highlight-red { color: #dc2626; font-weight: bold; }
    .sav-type { color: #16a34a; font-weight: bold; font-size: 1.4em; }
    .cut-line { margin: 15px 0; display: flex; align-items: center; justify-content: center; position: relative; }
    .cut-line::before { content: ''; position: absolute; left: 0; right: 0; height: 1px; background: repeating-linear-gradient(to right, #666 0, #666 5px, transparent 5px, transparent 10px); }
    .cut-line .scissors { background: white; padding: 0 8px; color: #666; font-size: 12px; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="dual-content">
  <div class="content-block">
    ${shopHeader}
    <div class="header">
      <div class="header-left">
        <div class="title">Dossier SAV N° ${savCase.case_number}</div>
        <div class="meta">Créé le ${(savCase.created_at ? new Date(savCase.created_at).toLocaleDateString() : "")} · Statut: ${statusLabels[savCase.status] || savCase.status}</div>
      </div>
    </div>
    ${customerBlock}
    ${deviceBlock}
    ${descriptionBlock}
    ${notesBlock}
    ${partsTable}
    ${qrBlock}
    <div class="footer">Document généré par Fixway Pro</div>
  </div>
  <div class="cut-line">
    <span class="scissors">✂</span>
  </div>
  <div class="content-block">
    ${shopHeader}
    <div class="header">
      <div class="header-left">
        <div class="title">Dossier SAV N° ${savCase.case_number}</div>
        <div class="meta">Créé le ${(savCase.created_at ? new Date(savCase.created_at).toLocaleDateString() : "")} · Statut: ${statusLabels[savCase.status] || savCase.status}</div>
      </div>
    </div>
    ${customerBlock}
    ${deviceBlock}
    ${descriptionBlock}
    ${notesBlock}
    ${partsTable}
    ${qrBlock}
    <div class="footer">Document généré par Fixway Pro</div>
  </div>
</div>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 400);
      };
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handlePrint} className={className} disabled={printing} ref={ref}>
      <Printer className="h-4 w-4 mr-2" />
      {printing ? "Préparation..." : "Imprimer"}
    </Button>
  );
});

SAVPrintButton.displayName = "SAVPrintButton";
