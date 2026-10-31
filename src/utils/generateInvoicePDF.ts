import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, CompanySettings } from '../types';
import { formatCurrencyAmount, numberToWords, cleanItemName } from './currencyAndWords';

export interface PDFDownloadResult {
  success: boolean;
  blobUrl?: string;
  filename: string;
  method: 'blob-download' | 'doc-save' | 'html-fallback';
  error?: string;
}

export const DEFAULT_INVOICE_TERMS =
  '1. Sold goods in sound condition can be returned subject to presentation of delivery slip.\n2. Cement & dry mortars must be stored in moisture-free conditions.\n3. Please settle credit dues within the agreed credit term period.\n4. Preserve this computerized invoice for warranty and accounting verification.';

export function getEffectiveInvoiceTerms(settings?: CompanySettings): string {
  if (settings && settings.footerTerms && settings.footerTerms.trim().length > 0) {
    return settings.footerTerms.trim();
  }
  return DEFAULT_INVOICE_TERMS;
}

function triggerBlobDownload(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (e) {}
    }, 1500);
    return true;
  } catch (err) {
    console.warn('Failed standard blob trigger:', err);
    return false;
  }
}

export function downloadInvoicePDF(
  invoice: Invoice,
  settings: CompanySettings,
  format: 'a4' | 'thermal' = 'a4'
): PDFDownloadResult {
  const filename =
    format === 'thermal'
      ? `Receipt_${invoice.id}.pdf`
      : `Invoice_${invoice.id}.pdf`;

  try {
    const JsPDFClass =
      typeof jsPDF === 'function'
        ? jsPDF
        : (jsPDF as any).jsPDF || (jsPDF as any).default;
    const autoTableFunc =
      typeof autoTable === 'function'
        ? autoTable
        : (autoTable as any).default || (autoTable as any).autoTable;

    const doc = new JsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: format === 'thermal' ? [80, 220 + invoice.items.length * 10] : 'a4',
    });

    if (format === 'thermal') {
      const pageWidth = 80;
      let y = 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(settings.businessName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(settings.tagline, pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.text(settings.address, pageWidth / 2, y, { align: 'center' });
      y += 3.5;
      doc.text(`Phone: ${settings.phone}`, pageWidth / 2, y, { align: 'center' });
      y += 3.5;
      doc.setFont('helvetica', 'bold');
      doc.text(`BIN / VAT: ${settings.taxId}`, pageWidth / 2, y, { align: 'center' });
      y += 4;

      const isPaid = invoice.dueAmount <= 0;
      doc.setDrawColor(isPaid ? 22 : 225, isPaid ? 163 : 29, isPaid ? 74 : 72);
      doc.setLineWidth(0.5);
      doc.roundedRect(pageWidth - 25, 6, 21, 6.5, 1, 1, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(isPaid ? 22 : 225, isPaid ? 163 : 29, isPaid ? 74 : 72);
      doc.text(isPaid ? 'PAID' : 'UNPAID', pageWidth - 14.5, 10.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      doc.setLineDashPattern([1, 1], 0);
      doc.setDrawColor(120, 120, 120);
      doc.line(4, y, pageWidth - 4, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Invoice: ${invoice.id}`, 4, y);
      y += 3.5;
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleString()}`, 4, y);
      y += 3.5;
      doc.text(`Cashier: ${invoice.cashierName} (${invoice.deviceId})`, 4, y);
      y += 3.5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Customer: ${invoice.customerName}`, 4, y);
      y += 3.5;
      if (invoice.customerPhone && invoice.customerPhone !== 'N/A') {
        doc.setFont('helvetica', 'normal');
        doc.text(`Phone: ${invoice.customerPhone}`, 4, y);
        y += 3.5;
      }
      doc.line(4, y, pageWidth - 4, y);
      y += 4;

      const tableRows = invoice.items.map((it) => [
        `${cleanItemName(it.productName)}\n${it.quantity} ${it.unit} x ${it.unitPrice.toLocaleString()}`,
        `${it.total.toLocaleString()}`,
      ]);

      autoTableFunc(doc, {
        startY: y,
        margin: { left: 4, right: 4 },
        theme: 'plain',
        styles: { fontSize: 7.5, cellPadding: 1, font: 'helvetica' },
        head: [['Item & Qty', 'Total']],
        headStyles: { fontStyle: 'bold', fontSize: 8, textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        },
        body: tableRows,
      });

      y = ((doc as any).lastAutoTable?.finalY || y) + 3;
      doc.line(4, y, pageWidth - 4, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Gross Total:', 4, y);
      doc.text(`${invoice.subtotal.toLocaleString()} ${settings.currencySymbol}`, pageWidth - 4, y, { align: 'right' });
      y += 4;
      doc.text('Discount:', 4, y);
      doc.text(`-${invoice.discountAmount.toLocaleString()} ${settings.currencySymbol}`, pageWidth - 4, y, { align: 'right' });
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Grand Total:', 4, y);
      doc.text(`${invoice.grandTotal.toLocaleString()} ${settings.currencySymbol}`, pageWidth - 4, y, { align: 'right' });
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(22, 163, 74);
      doc.text('Amount Paid:', 4, y);
      doc.text(`${invoice.totalPaid.toLocaleString()} ${settings.currencySymbol}`, pageWidth - 4, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(invoice.dueAmount > 0 ? 225 : 22, invoice.dueAmount > 0 ? 29 : 163, invoice.dueAmount > 0 ? 72 : 74);
      doc.text('Remaining Due:', 4, y);
      doc.text(
        invoice.dueAmount > 0
          ? `${invoice.dueAmount.toLocaleString()} ${settings.currencySymbol}`
          : `0 ${settings.currencySymbol} (PAID)`,
        pageWidth - 4,
        y,
        { align: 'right' }
      );

      y += 6;
      doc.setLineDashPattern([1, 1], 0);
      doc.setDrawColor(180, 180, 180);
      doc.line(4, y, pageWidth - 4, y);
      y += 4;

      const thermalTerms = getEffectiveInvoiceTerms(settings);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('TERMS & CONDITIONS:', 4, y);
      y += 3.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const thermalTermsLines = doc.splitTextToSize(thermalTerms, pageWidth - 8);
      doc.text(thermalTermsLines.slice(0, 5), 4, y);
      y += thermalTermsLines.slice(0, 5).length * 3 + 3;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('*** THANK YOU FOR YOUR BUSINESS ***', pageWidth / 2, y, { align: 'center' });

      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const downloaded = triggerBlobDownload(blob, filename);
      return { success: true, blobUrl, filename, method: downloaded ? 'blob-download' : 'doc-save' };
    } else {
      // A4 Corporate Memo
      const pageWidth = 210;
      let y = 14;

      doc.setFillColor(196, 154, 69); // #C49A45
      doc.rect(0, 0, pageWidth, 5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text(settings.businessName.toUpperCase(), 14, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(settings.tagline, 14, y + 9);
      doc.text(settings.address, 14, y + 14);
      doc.text(`Phone: ${settings.phone}  |  Email: ${settings.email}`, 14, y + 18.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Trade License & VAT BIN: ${settings.taxId}`, 14, y + 23);

      doc.setFillColor(196, 154, 69);
      doc.roundedRect(pageWidth - 75, y, 61, 9, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('SALES INVOICE', pageWidth - 44.5, y + 6.2, { align: 'center' });

      const isPaid = invoice.dueAmount <= 0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Invoice No:`, pageWidth - 75, y + 14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(invoice.id, pageWidth - 14, y + 14, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Date:`, pageWidth - 75, y + 19);
      doc.text(new Date(invoice.createdAt).toLocaleDateString(), pageWidth - 14, y + 19, { align: 'right' });
      doc.text(`Status:`, pageWidth - 75, y + 24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isPaid ? 22 : 225, isPaid ? 163 : 29, isPaid ? 74 : 72);
      doc.text(isPaid ? 'PAID' : 'UNPAID', pageWidth - 14, y + 24, { align: 'right' });

      y += 30;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, pageWidth - 14, y);
      y += 5;

      doc.setFillColor(254, 250, 243); // #FEFAF3
      doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'F');
      doc.setDrawColor(234, 219, 206);
      doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('BILLED TO (CUSTOMER):', 18, y + 6);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(invoice.customerName, 18, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Phone: ${invoice.customerPhone || 'N/A'}`, 18, y + 17);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('TERMINAL & OPERATOR:', pageWidth - 18, y + 6, { align: 'right' });
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Cashier: ${invoice.cashierName}`, pageWidth - 18, y + 12, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Terminal ID: ${invoice.deviceId}`, pageWidth - 18, y + 17, { align: 'right' });

      y += 28;

      const tableData = invoice.items.map((it, idx) => [
        String(idx + 1),
        cleanItemName(it.productName),
        it.sku,
        `${it.quantity} ${it.unit}`,
        `${it.unitPrice.toLocaleString()}`,
        `${it.total.toLocaleString()}`,
      ]);

      autoTableFunc(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.5, font: 'helvetica', lineColor: [226, 232, 240] },
        head: [['#', 'Material Description', 'SKU', 'Quantity', 'Rate', 'Total']],
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 70, fontStyle: 'bold' },
          2: { cellWidth: 32, font: 'courier' },
          3: { cellWidth: 26, halign: 'right' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        },
        body: tableData,
      });

      y = ((doc as any).lastAutoTable?.finalY || y) + 6;

      const summaryStartX = pageWidth - 90;
      const curr = settings.currencySymbol || 'OMR';
      const vatPct = settings.vatPercent ?? 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Subtotal:', summaryStartX, y + 4);
      doc.text(`${curr} ${formatCurrencyAmount(invoice.subtotal)}`, pageWidth - 14, y + 4, { align: 'right' });
      doc.text('Discount:', summaryStartX, y + 9);
      doc.text(`-${curr} ${formatCurrencyAmount(invoice.discountAmount)}`, pageWidth - 14, y + 9, { align: 'right' });
      doc.text(`VAT (${vatPct}%):`, summaryStartX, y + 14);
      doc.text(`${curr} ${formatCurrencyAmount(invoice.vatTaxAmount || 0)}`, pageWidth - 14, y + 14, { align: 'right' });

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.line(summaryStartX, y + 17, pageWidth - 14, y + 17);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Grand Total:', summaryStartX, y + 22);
      doc.text(`${curr} ${formatCurrencyAmount(invoice.grandTotal)}`, pageWidth - 14, y + 22, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(22, 163, 74);
      doc.text('Amount Paid:', summaryStartX, y + 27);
      doc.text(`${curr} ${formatCurrencyAmount(invoice.totalPaid)}`, pageWidth - 14, y + 27, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(invoice.dueAmount > 0 ? 225 : 22, invoice.dueAmount > 0 ? 29 : 163, invoice.dueAmount > 0 ? 72 : 74);
      doc.text('Remaining Due:', summaryStartX, y + 32);
      doc.text(
        invoice.dueAmount > 0
          ? `${curr} ${formatCurrencyAmount(invoice.dueAmount)}`
          : `${curr} 0.000`,
        pageWidth - 14,
        y + 32,
        { align: 'right' }
      );

      // Amount Paid in Words
      y += 37;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Amount Paid in Words:', 14, y);
      doc.setFont('helvetica', 'italic');
      doc.text(numberToWords(invoice.totalPaid, curr), 52, y);

      // Terms & Conditions block in A4 PDF
      const termsText = getEffectiveInvoiceTerms(settings);
      const termsY = Math.max(y + 36, 210);

      doc.setFillColor(254, 250, 243);
      doc.roundedRect(14, termsY, pageWidth - 28, 24, 1.5, 1.5, 'F');
      doc.setDrawColor(234, 219, 206);
      doc.roundedRect(14, termsY, pageWidth - 28, 24, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(196, 154, 69);
      doc.text('TERMS & CONDITIONS:', 18, termsY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const termsLines = doc.splitTextToSize(termsText, pageWidth - 36);
      doc.text(termsLines.slice(0, 5), 18, termsY + 10.5);

      // Signature lines
      const sigY = termsY + 36;
      if (sigY < 280) {
        doc.setDrawColor(203, 213, 225);
        doc.line(18, sigY, 68, sigY);
        doc.line(pageWidth - 68, sigY, pageWidth - 18, sigY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Customer Signature', 43, sigY + 4, { align: 'center' });
        doc.text('Authorized Signatory', pageWidth - 43, sigY + 4, { align: 'center' });
      }

      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const downloaded = triggerBlobDownload(blob, filename);
      return { success: true, blobUrl, filename, method: downloaded ? 'blob-download' : 'doc-save' };
    }
  } catch (err: any) {
    console.error('PDF error:', err);
    downloadInvoiceHTML(invoice, settings, format);
    return { success: false, filename, method: 'html-fallback', error: err?.message };
  }
}

export function generateInvoiceHTML(
  invoice: Invoice,
  settings: CompanySettings,
  format: 'a4' | 'thermal' = 'a4'
): string {
  const isThermal = format === 'thermal';
  const rows = invoice.items
    .map(
      (it, idx) => `
    <tr>
      ${!isThermal ? `<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${idx + 1}</td>` : ''}
      <td style="border: 1px solid #cbd5e1; padding: 6px;">
        <strong>${cleanItemName(it.productName)}</strong>
        ${!isThermal ? `<div style="font-size: 11px; color: #64748b;">SKU: ${it.sku}</div>` : ''}
      </td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">${it.quantity} ${it.unit}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">${settings.currencySymbol}${it.unitPrice.toLocaleString()}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold;">${settings.currencySymbol}${it.total.toLocaleString()}</td>
    </tr>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice #${invoice.id} - ${settings.businessName}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .no-print { display: none !important; }
      @page { margin: 8mm; size: ${isThermal ? '80mm auto' : 'A4'}; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 20px;
    }
    .invoice-card {
      max-width: ${isThermal ? '360px' : '780px'};
      margin: 0 auto;
      background: #fff;
      padding: ${isThermal ? '16px' : '32px'};
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .header-bar {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .biz-name {
      font-size: ${isThermal ? '18px' : '22px'};
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      text-transform: uppercase;
    }
    .meta-box {
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 16px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      padding: 8px;
      text-align: left;
    }
    .totals {
      width: 100%;
      margin-top: 10px;
      font-size: 13px;
    }
    .totals td { padding: 4px 0; }
    .grand-total {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #0f172a;
      padding-top: 6px;
    }
    .actions-bar {
      margin-bottom: 16px;
      display: flex;
      justify-content: center;
      gap: 10px;
    }
    .btn {
      background: #C49A45;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="no-print actions-bar">
    <button class="btn" onclick="window.print()">Print Invoice</button>
    <button class="btn" style="background:#0f172a;" onclick="window.close()">Close Window</button>
  </div>
  <div class="invoice-card">
    <div class="header-bar">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
        <div>
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="height: 44px; max-width: 140px; object-fit: contain; margin-bottom: 6px; display: block;" alt="Shop Logo" />` : ''}
          <h1 class="biz-name">${settings.businessName}</h1>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4;">
            ${settings.tagline}<br>
            ${settings.address} &middot; Phone: ${settings.phone}<br>
            Trade License / VAT BIN: ${settings.taxId}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; padding: 4px 12px; background: #0f172a; color: #ffffff; font-weight: bold; font-size: 11px; text-transform: uppercase; border-radius: 4px; margin-bottom: 6px;">
            COMMERCIAL INVOICE
          </div>
          <div style="font-size: 12px; color: #334155; font-family: monospace;"><strong>Invoice #:</strong> ${invoice.id}</div>
          <div style="font-size: 11px; color: #64748b;"><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</div>
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 4px; color: ${invoice.dueAmount <= 0 ? '#16a34a' : '#e11d48'};">
            STATUS: ${invoice.dueAmount <= 0 ? 'PAID' : 'UNPAID'}
          </div>
        </div>
      </div>
    </div>
    <div class="meta-box">
      <div style="display: flex; justify-content: space-between;">
        <div>
          <strong>Invoice No:</strong> ${invoice.id}<br>
          <strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleString()}<br>
          <strong>Terminal:</strong> ${invoice.deviceId}
        </div>
        <div style="text-align: right;">
          <strong>Customer:</strong> ${invoice.customerName}<br>
          <strong>Phone:</strong> ${invoice.customerPhone || 'N/A'}<br>
          <strong>Status:</strong> <span style="color: ${invoice.dueAmount <= 0 ? '#16a34a' : '#e11d48'}; font-weight: bold;">${invoice.dueAmount <= 0 ? 'PAID' : 'UNPAID'}</span>
        </div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          ${!isThermal ? '<th style="width: 30px; text-align: center;">#</th>' : ''}
          <th>Material Description</th>
          <th style="text-align: right;">Quantity</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <table class="totals">
      <tr>
        <td style="text-align: right; width: 70%;">Subtotal:</td>
        <td style="text-align: right; font-weight: bold; white-space: nowrap;">${settings.currencySymbol} ${formatCurrencyAmount(invoice.subtotal)}</td>
      </tr>
      <tr>
        <td style="text-align: right; color: #16a34a;">Discount:</td>
        <td style="text-align: right; color: #16a34a; font-weight: bold; white-space: nowrap;">-${settings.currencySymbol} ${formatCurrencyAmount(invoice.discountAmount)}</td>
      </tr>
      <tr>
        <td style="text-align: right; color: #475569;">VAT (${settings.vatPercent ?? 5}%):</td>
        <td style="text-align: right; font-weight: bold; white-space: nowrap;">${settings.currencySymbol} ${formatCurrencyAmount(invoice.vatTaxAmount || 0)}</td>
      </tr>
      <tr class="grand-total">
        <td style="text-align: right;">Grand Total:</td>
        <td style="text-align: right; white-space: nowrap;">${settings.currencySymbol} ${formatCurrencyAmount(invoice.grandTotal)}</td>
      </tr>
      <tr>
        <td style="text-align: right; color: #16a34a; font-weight: bold;">Amount Paid:</td>
        <td style="text-align: right; color: #16a34a; font-weight: bold; white-space: nowrap;">${settings.currencySymbol} ${formatCurrencyAmount(invoice.totalPaid)}</td>
      </tr>
      <tr>
        <td style="text-align: right; font-weight: bold; color: ${invoice.dueAmount > 0 ? '#e11d48' : '#16a34a'};">
          Remaining Due:
        </td>
        <td style="text-align: right; font-weight: bold; color: ${invoice.dueAmount > 0 ? '#e11d48' : '#16a34a'}; white-space: nowrap;">
          ${invoice.dueAmount > 0 ? `${settings.currencySymbol} ${formatCurrencyAmount(invoice.dueAmount)}` : `${settings.currencySymbol} 0.000`}
        </td>
      </tr>
    </table>

    <div style="margin-top: 10px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: ${isThermal ? '9.5px' : '10.5px'}; color: #334155;">
      <strong>Amount Paid in Words:</strong> <span style="font-style: italic; font-family: monospace;">${numberToWords(invoice.totalPaid, settings.currencySymbol)}</span>
    </div>
    <div style="margin-top: 20px; padding: 12px 14px; background: #FEFAF3; border: 1px solid #EADBCE; border-radius: 8px; font-size: ${isThermal ? '10px' : '11px'}; color: #475569; line-height: 1.5;">
      <strong style="color: #1e293b; display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase;">Terms & Conditions:</strong>
      <div style="white-space: pre-line;">${getEffectiveInvoiceTerms(settings)}</div>
    </div>
    ${
      !isThermal
        ? `<div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; font-size: 11px; color: #64748b; text-align: center;">
            <div style="width: 160px; border-top: 1px solid #cbd5e1; padding-top: 4px;">Customer Signature</div>
            <div style="width: 160px; border-top: 1px solid #cbd5e1; padding-top: 4px;">Authorized Signatory</div>
          </div>`
        : `<div style="text-align: center; margin-top: 14px; font-size: 10px; color: #64748b;">*** THANK YOU FOR YOUR BUSINESS ***</div>`
    }
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        try { window.print(); } catch(e){}
      }, 300);
    };
  </script>
</body>
</html>`;
}

export function downloadInvoiceHTML(
  invoice: Invoice,
  settings: CompanySettings,
  format: 'a4' | 'thermal' = 'a4'
): boolean {
  try {
    const html = generateInvoiceHTML(invoice, settings, format);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const filename = `Invoice_${invoice.id}.html`;
    return triggerBlobDownload(blob, filename);
  } catch (e) {
    console.error('Failed to download HTML invoice:', e);
    return false;
  }
}

export function printInvoiceSafely(
  invoice: Invoice,
  settings: CompanySettings,
  format: 'a4' | 'thermal' = 'a4'
) {
  const html = generateInvoiceHTML(invoice, settings, format);

  // Strategy 1: Open Blob URL window tab (bypasses iframe sandbox restrictions, opens native Print Preview in top tab)
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const printWin = window.open(blobUrl, '_blank');

    if (printWin) {
      printWin.focus();
      return;
    }
  } catch (err) {
    console.warn('Blob window.open blocked by browser:', err);
  }

  // Strategy 2: If pop-up window is blocked by browser, execute window.print() on current page
  try {
    window.print();
  } catch (e) {
    console.error('Window print failed:', e);
  }
}

export interface DailyReportPrintParams {
  selectedDate: string;
  settings: CompanySettings;
  dayGrossSales: number;
  dayReturnsTotal: number;
  dayNetIncome: number;
  dayTotalExpense: number;
  dayGrossProfit: number;
  dayNetProfit: number;
  openingCashBalance: number;
  dayTotalPaidCash: number;
  dayCashRevenue?: number;
  dayBankTransferRevenue?: number;
  dayMobileRevenue?: number;
  dayDuesCollectedCash: number;
  dayCashExpenses: number;
  dayCashRefunds: number;
  estimatedClosingCash: number;
  cashWithdrawnToday?: number;
  remainingCashBalance?: number;
  withdrawals?: { id?: string; amount: number; withdrawnBy: string; purpose?: string; note?: string; createdAt: string }[];
  invoices: Invoice[];
  expenses: { id: string; category: string; description: string; amount: number; paidVia: string }[];
}

export function printDailyReportSafely(data: DailyReportPrintParams) {
  try {
    const existing = document.getElementById('report-print-frame');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    const iframe = document.createElement('iframe');
    iframe.id = 'report-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const invoiceRows = data.invoices.map((inv, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 8px; font-family: monospace; font-weight: bold;">${inv.id}</td>
        <td style="padding: 6px 8px;">${inv.customerName}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; white-space: nowrap;">${data.settings.currencySymbol} ${inv.grandTotal.toLocaleString()}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #16a34a; white-space: nowrap;">${data.settings.currencySymbol} ${inv.totalPaid.toLocaleString()}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: ${inv.dueAmount > 0 ? '#e11d48' : '#64748b'}; font-weight: bold; white-space: nowrap;">${data.settings.currencySymbol} ${inv.dueAmount.toLocaleString()}</td>
      </tr>
    `).join('');

    const expenseRows = data.expenses.map((exp) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 8px; font-weight: 600;">${exp.category}</td>
        <td style="padding: 6px 8px;">${exp.description}</td>
        <td style="padding: 6px 8px; text-transform: capitalize; color: #64748b;">${exp.paidVia}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #e11d48; font-weight: bold; white-space: nowrap;">${data.settings.currencySymbol} ${exp.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    const withdrawalRows = (data.withdrawals || []).map((wth) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 8px; font-weight: bold; color: #991b1b;">${data.settings.currencySymbol} ${wth.amount.toLocaleString()}</td>
        <td style="padding: 6px 8px; font-weight: 600;">${wth.withdrawnBy}</td>
        <td style="padding: 6px 8px; color: #475569;">${wth.purpose || 'Owner Draw / Bank'}</td>
        <td style="padding: 6px 8px; color: #64748b;">${wth.note || '-'}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #64748b;">${new Date(wth.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Daily Financial Report - ${data.selectedDate}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 12px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
    .cash-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    th { background: #0f172a; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    .footer { margin-top: 24px; display: flex; justify-content: space-between; padding-top: 30px; font-size: 11px; color: #64748b; }
    .sig-line { width: 160px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 800;">${data.settings.businessName}</h2>
      <p style="margin: 0; color: #475569; font-size: 11px;">${data.settings.tagline || ''}</p>
      <p style="margin: 2px 0 0 0; color: #475569; font-size: 11px;">${data.settings.address} &middot; Phone: ${data.settings.phone}</p>
      <p style="margin: 2px 0 0 0; font-weight: bold; font-size: 11px;">Trade License / BIN: ${data.settings.taxId || 'N/A'}</p>
    </div>
    <div style="text-align: right;">
      <span style="display: inline-block; background: #0f172a; color: white; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 11px;">DAILY FINANCIAL REPORT</span>
      <p style="margin: 6px 0 0 0; font-weight: bold; font-size: 12px;">Date: ${data.selectedDate}</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Generated: ${new Date().toLocaleString()}</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div style="font-size: 10px; color: #166534; font-weight: bold; text-transform: uppercase;">Total Day Revenue</div>
      <div style="font-size: 18px; font-weight: 800; color: #16a34a; font-family: monospace; white-space: nowrap;">${data.settings.currencySymbol} ${data.dayNetIncome.toLocaleString()}</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Gross: ${data.settings.currencySymbol}${data.dayGrossSales.toLocaleString()} | Returns: -${data.settings.currencySymbol}${data.dayReturnsTotal.toLocaleString()}</div>
      <div style="font-size: 9.5px; color: #047857; margin-top: 4px; border-top: 1px solid #cbd5e1; padding-top: 3px;">
        Cash: <strong>${data.settings.currencySymbol} ${(data.dayCashRevenue ?? data.dayTotalPaidCash).toLocaleString()}</strong> &middot; 
        Bank Transfer: <strong>${data.settings.currencySymbol} ${(data.dayBankTransferRevenue ?? 0).toLocaleString()}</strong>
        ${(data.dayMobileRevenue && data.dayMobileRevenue > 0) ? ` &middot; Mobile: <strong>${data.settings.currencySymbol} ${data.dayMobileRevenue.toLocaleString()}</strong>` : ''}
      </div>
    </div>
    <div class="kpi-card">
      <div style="font-size: 10px; color: #991b1b; font-weight: bold; text-transform: uppercase;">Total Day Expenses</div>
      <div style="font-size: 18px; font-weight: 800; color: #e11d48; font-family: monospace; white-space: nowrap;">${data.settings.currencySymbol} ${data.dayTotalExpense.toLocaleString()}</div>
      <div style="font-size: 10px; color: #64748b;">${data.expenses.length} operating vouchers</div>
    </div>
    <div class="kpi-card">
      <div style="font-size: 10px; color: #0f172a; font-weight: bold; text-transform: uppercase;">Day Net Profit</div>
      <div style="font-size: 18px; font-weight: 800; color: ${data.dayNetProfit >= 0 ? '#b45309' : '#e11d48'}; font-family: monospace; white-space: nowrap;">${data.settings.currencySymbol} ${data.dayNetProfit.toLocaleString()}</div>
      <div style="font-size: 10px; color: #64748b;">Margin: ${data.settings.currencySymbol}${data.dayGrossProfit.toLocaleString()} - Exp: ${data.settings.currencySymbol}${data.dayTotalExpense.toLocaleString()}</div>
    </div>
  </div>

  <div class="cash-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px;">
    <div>
      <div style="font-size: 9px; color: #92400e; font-weight: bold; text-transform: uppercase;">Opening Capital</div>
      <div style="font-size: 13px; font-weight: 800; color: #b45309; font-family: monospace; white-space: nowrap;">${data.settings.currencySymbol} ${data.openingCashBalance.toLocaleString()}</div>
    </div>
    <div>
      <div style="font-size: 9px; color: #166534; font-weight: bold; text-transform: uppercase;">Cash Inflow Today</div>
      <div style="font-size: 13px; font-weight: 800; color: #16a34a; font-family: monospace; white-space: nowrap;">+${data.settings.currencySymbol} ${(data.dayTotalPaidCash + data.dayDuesCollectedCash).toLocaleString()}</div>
      <div style="font-size: 8px; color: #64748b;">Sales & dues</div>
    </div>
    <div>
      <div style="font-size: 9px; color: #991b1b; font-weight: bold; text-transform: uppercase;">Cash Outflow Today</div>
      <div style="font-size: 13px; font-weight: 800; color: #e11d48; font-family: monospace; white-space: nowrap;">-${data.settings.currencySymbol} ${(data.dayCashExpenses + data.dayCashRefunds).toLocaleString()}</div>
      <div style="font-size: 8px; color: #64748b;">Expenses & refunds</div>
    </div>
    <div>
      <div style="font-size: 9px; color: #991b1b; font-weight: bold; text-transform: uppercase;">Cash Withdrawn</div>
      <div style="font-size: 13px; font-weight: 800; color: #b91c1c; font-family: monospace; white-space: nowrap;">-${data.settings.currencySymbol} ${(data.cashWithdrawnToday || 0).toLocaleString()}</div>
      <div style="font-size: 8px; color: #64748b;">Daily owner draw</div>
    </div>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 6px;">
      <div style="font-size: 9px; color: #15803d; font-weight: bold; text-transform: uppercase;">Remaining Balance</div>
      <div style="font-size: 14px; font-weight: 800; color: #15803d; font-family: monospace; white-space: nowrap;">${data.settings.currencySymbol} ${(data.remainingCashBalance !== undefined ? data.remainingCashBalance : data.estimatedClosingCash).toLocaleString()}</div>
      <div style="font-size: 8px; color: #166534;">In safe/drawer</div>
    </div>
  </div>

  ${(data.withdrawals && data.withdrawals.length > 0) ? `
  <h4 style="margin: 10px 0 4px 0; font-size: 12px; font-weight: bold; color: #991b1b;">Cash Withdrawals for Date (${data.withdrawals.length})</h4>
  <table>
    <thead>
      <tr style="background: #991b1b; color: white;">
        <th>Amount</th>
        <th>Withdrawn By</th>
        <th>Purpose / Reason</th>
        <th>Note</th>
        <th style="text-align: right;">Time</th>
      </tr>
    </thead>
    <tbody>
      ${withdrawalRows}
    </tbody>
  </table>
  ` : ''}

  <h4 style="margin: 10px 0 4px 0; font-size: 12px; font-weight: bold;">Daily Sales Invoices (${data.invoices.length})</h4>
  <table>
    <thead>
      <tr>
        <th>Invoice #</th>
        <th>Customer</th>
        <th style="text-align: right;">Net Bill</th>
        <th style="text-align: right;">Paid</th>
        <th style="text-align: right;">Due</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceRows || '<tr><td colspan="5" style="text-align: center; padding: 10px; color: #94a3b8;">No invoices for this date</td></tr>'}
    </tbody>
  </table>

  <h4 style="margin: 10px 0 4px 0; font-size: 12px; font-weight: bold;">Daily Operating Expenses (${data.expenses.length})</h4>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Description</th>
        <th>Paid Via</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${expenseRows || '<tr><td colspan="4" style="text-align: center; padding: 10px; color: #94a3b8;">No expenses for this date</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <div class="sig-line">Prepared By (Cashier)</div>
    <div class="sig-line">Audited By (Accountant)</div>
    <div class="sig-line">Approved By (Store Owner)</div>
  </div>
</body>
</html>`;

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          window.print();
        }
      }, 300);
      return;
    }
  } catch (e) {
    console.warn('Daily report print fallback:', e);
    window.print();
  }
}

export interface MonthlyReportPrintParams {
  startMonth: string;
  endMonth: string;
  settings: CompanySettings;
  rangeRevenue: number;
  rangeGrossSales: number;
  rangeReturnsTotal: number;
  rangeExpenses: number;
  rangeGrossProfit: number;
  rangeNetProfit: number;
  profitMarginPct: number;
  invoiceCount: number;
  expenseCount: number;
  monthlyBreakdown: {
    month: string;
    monthLabel: string;
    invoiceCount: number;
    revenue: number;
    expenses: number;
    netProfit: number;
    marginPct: number;
  }[];
  topExpenseCategories: { category: string; amount: number; percentage: number }[];
}

export function printMonthlyReportSafely(data: MonthlyReportPrintParams) {
  try {
    const existing = document.getElementById('report-monthly-print-frame');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    const iframe = document.createElement('iframe');
    iframe.id = 'report-monthly-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const curr = data.settings.currencySymbol || 'OMR';
    const monthRows = data.monthlyBreakdown.map((m) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 7px 9px; font-weight: bold; color: #1e293b;">${m.monthLabel}</td>
        <td style="padding: 7px 9px; text-align: center; font-family: monospace;">${m.invoiceCount}</td>
        <td style="padding: 7px 9px; text-align: right; font-family: monospace; font-weight: bold;">${curr} ${formatCurrencyAmount(m.revenue)}</td>
        <td style="padding: 7px 9px; text-align: right; font-family: monospace; color: #e11d48;">${curr} ${formatCurrencyAmount(m.expenses)}</td>
        <td style="padding: 7px 9px; text-align: right; font-family: monospace; font-weight: bold; color: ${m.netProfit >= 0 ? '#16a34a' : '#e11d48'};">
          ${curr} ${formatCurrencyAmount(m.netProfit)}
        </td>
        <td style="padding: 7px 9px; text-align: right; font-family: monospace; font-weight: bold; color: ${m.marginPct >= 0 ? '#16a34a' : '#e11d48'};">
          ${m.marginPct.toFixed(1)}%
        </td>
      </tr>
    `).join('');

    const topExpRows = data.topExpenseCategories.map((c) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 5px 8px; font-weight: 600;">${c.category}</td>
        <td style="padding: 5px 8px; text-align: right; font-family: monospace; color: #e11d48; font-weight: bold;">${curr} ${formatCurrencyAmount(c.amount)}</td>
        <td style="padding: 5px 8px; text-align: right; font-family: monospace; color: #64748b;">${c.percentage.toFixed(1)}%</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Financial Report: ${data.startMonth} to ${data.endMonth}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 11.5px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    th { background: #0f172a; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
    .footer { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 25px; font-size: 11px; color: #64748b; }
    .sig-line { width: 160px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 800;">${data.settings.businessName}</h2>
      <p style="margin: 0; color: #475569; font-size: 11px;">${data.settings.tagline || ''}</p>
      <p style="margin: 2px 0 0 0; color: #475569; font-size: 11px;">${data.settings.address} &middot; Phone: ${data.settings.phone}</p>
      <p style="margin: 2px 0 0 0; font-weight: bold; font-size: 11px;">Trade License / BIN: ${data.settings.taxId || 'N/A'}</p>
    </div>
    <div style="text-align: right;">
      <span style="display: inline-block; background: #0f172a; color: white; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 11px;">MONTHLY FINANCIAL STATEMENT</span>
      <p style="margin: 6px 0 0 0; font-weight: bold; font-size: 12px; color: #c49a45;">Range: ${data.startMonth} to ${data.endMonth}</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Generated: ${new Date().toLocaleString()}</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div style="font-size: 9px; color: #166534; font-weight: bold; text-transform: uppercase;">Range Total Revenue</div>
      <div style="font-size: 15px; font-weight: 800; color: #16a34a; font-family: monospace;">${curr} ${formatCurrencyAmount(data.rangeRevenue)}</div>
      <div style="font-size: 8.5px; color: #64748b;">${data.invoiceCount} invoices settled</div>
    </div>
    <div class="kpi-card">
      <div style="font-size: 9px; color: #991b1b; font-weight: bold; text-transform: uppercase;">Range Operating Expenses</div>
      <div style="font-size: 15px; font-weight: 800; color: #e11d48; font-family: monospace;">${curr} ${formatCurrencyAmount(data.rangeExpenses)}</div>
      <div style="font-size: 8.5px; color: #64748b;">${data.expenseCount} vouchers logged</div>
    </div>
    <div class="kpi-card">
      <div style="font-size: 9px; color: #0f172a; font-weight: bold; text-transform: uppercase;">Range Net Profit</div>
      <div style="font-size: 15px; font-weight: 800; color: ${data.rangeNetProfit >= 0 ? '#16a34a' : '#e11d48'}; font-family: monospace;">${curr} ${formatCurrencyAmount(data.rangeNetProfit)}</div>
      <div style="font-size: 8.5px; color: #64748b;">Gross margin: ${curr} ${formatCurrencyAmount(data.rangeGrossProfit)}</div>
    </div>
    <div class="kpi-card">
      <div style="font-size: 9px; color: #c49a45; font-weight: bold; text-transform: uppercase;">Net Profit Margin</div>
      <div style="font-size: 15px; font-weight: 800; color: ${data.profitMarginPct >= 0 ? '#b45309' : '#e11d48'}; font-family: monospace;">${data.profitMarginPct.toFixed(1)}%</div>
      <div style="font-size: 8.5px; color: #64748b;">Overall profitability</div>
    </div>
  </div>

  <h4 style="margin: 12px 0 6px 0; font-size: 12px; font-weight: bold;">Monthly Breakdown Analysis (${data.monthlyBreakdown.length} Months)</h4>
  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th style="text-align: center;">Invoices</th>
        <th style="text-align: right;">Revenue</th>
        <th style="text-align: right;">Expenses</th>
        <th style="text-align: right;">Net Profit</th>
        <th style="text-align: right;">Margin %</th>
      </tr>
    </thead>
    <tbody>
      ${monthRows || '<tr><td colspan="6" style="text-align: center; padding: 10px; color: #94a3b8;">No data found for this range</td></tr>'}
    </tbody>
    <tfoot>
      <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a;">
        <td style="padding: 7px 9px;">Total</td>
        <td style="padding: 7px 9px; text-align: center; font-family: monospace;">${data.invoiceCount}</td>
        <td style="padding: 7px 9px; text-align: right; font-family: monospace;">${curr} ${formatCurrencyAmount(data.rangeRevenue)}</td>
        <td style="padding: 7px 9px; text-align: right; font-family: monospace; color: #e11d48;">${curr} ${formatCurrencyAmount(data.rangeExpenses)}</td>
        <td style="padding: 7px 9px; text-align: right; font-family: monospace; color: ${data.rangeNetProfit >= 0 ? '#16a34a' : '#e11d48'};">${curr} ${formatCurrencyAmount(data.rangeNetProfit)}</td>
        <td style="padding: 7px 9px; text-align: right; font-family: monospace; color: ${data.profitMarginPct >= 0 ? '#16a34a' : '#e11d48'};">${data.profitMarginPct.toFixed(1)}%</td>
      </tr>
    </tfoot>
  </table>

  ${topExpRows ? `
  <h4 style="margin: 12px 0 6px 0; font-size: 11.5px; font-weight: bold;">Expense Distribution by Category</h4>
  <table style="width: 70%;">
    <thead>
      <tr>
        <th>Category</th>
        <th style="text-align: right;">Amount</th>
        <th style="text-align: right;">Share</th>
      </tr>
    </thead>
    <tbody>
      ${topExpRows}
    </tbody>
  </table>` : ''}

  <div class="footer">
    <div class="sig-line">Prepared By (Accountant)</div>
    <div class="sig-line">Verified By (Auditor)</div>
    <div class="sig-line">Approved By (Store Owner)</div>
  </div>
</body>
</html>`;

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          window.print();
        }
      }, 300);
    }
  } catch (e) {
    console.warn('Monthly report print fallback:', e);
    window.print();
  }
}

