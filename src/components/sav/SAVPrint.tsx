import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useShop } from "@/hooks/useShop";
import { supabase } from "@/integrations/supabase/client";
import type { SAVCase } from "@/hooks/useSAVCases";
import { Printer } from "lucide-react";
import { generateShortTrackingUrl } from '@/utils/trackingUtils';

interface SAVPrintButtonProps {
  savCase: SAVCase & { customer?: { first_name: string; last_name: string; email?: string; phone?: string; address?: string } };
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

export function SAVPrintButton({ savCase, className, size = "sm", variant = "outline" }: SAVPrintButtonProps) {
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
            <div><span class="label">Nom:</span> ${savCase.customer.first_name} ${savCase.customer.last_name}</div>
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
            ${savCase.device_imei ? `<div><span class="label">IMEI:</span> ${savCase.device_imei}</div>` : ""}
            ${savCase.sku ? `<div><span class="label">SKU:</span> ${savCase.sku}</div>` : ""}
            <div><span class="label">Type:</span> ${savCase.sav_type === "client" ? "Client" : savCase.sav_type === "external" ? "Externe" : "Interne"}</div>
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
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
    .header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 12px; }
    .shop-header { display:flex; align-items:center; gap: 12px; border-bottom: 1px solid #ddd; padding-bottom: 8px; max-width: 25%; }
    .shop-logo { max-height: 40px; max-width: 70px; }
    .shop-info { line-height: 1.2; }
    .shop-name { font-size: 14px; font-weight: 700; }
    .shop-details { font-size: 10px; color:#555; }
    .header-right { text-align: right; max-width: 25%; }
    .title { font-size: 16px; font-weight: 700; color:#2563eb; }
    .meta { margin-top: 4px; color:#555; font-size: 10px; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px 16px; }
    .col-span-2 { grid-column: span 2 / span 2; }
    .label { color:#555; font-weight:600; margin-right:6px; }
    .block { margin-top: 14px; }
    .block-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; border-bottom:1px solid #eee; padding-bottom:4px; }
    .text { white-space: pre-wrap; }
    .text-muted { color:#666; }
    .table { width:100%; border-collapse: collapse; margin-top:8px; }
    .table th, .table td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align:left; }
    .table th { background: #f8fafc; font-weight:700; }
    .num { text-align:right; }
    .summary { margin-top: 8px; display:flex; gap:16px; justify-content:flex-end; }
    .summary div { background:#f8fafc; border:1px solid #e5e7eb; padding:6px 10px; border-radius:6px; }
    .grand-total { font-weight:700; }
    .qr { display:flex; align-items:center; gap:12px; }
    .qr img { border:1px solid #ddd; padding:6px; }
    .url { font-size: 10px; word-break: break-all; color:#2563eb; }
    .footer { margin-top: 18px; font-size: 10px; color:#777; text-align:center; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${shopHeader}
  <div class="header">
    <div></div>
    <div class="header-right">
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
    <Button variant={variant} size={size} onClick={handlePrint} className={className} disabled={printing}>
      <Printer className="h-4 w-4 mr-2" />
      {printing ? "Préparation..." : "Imprimer"}
    </Button>
  );
}
