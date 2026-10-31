import { Product, CompanySettings } from '../types';
import { formatCurrencyAmount, cleanItemName } from './currencyAndWords';

export function generateStickerSheetHTML(
  product: Product,
  settings: CompanySettings,
  copies: number = 1
): string {
  const priceText = `${settings.currencySymbol}${formatCurrencyAmount(product.regularPrice)}${product.unit ? ` / ${product.unit}` : ''}`;
  const safeCopies = Math.max(1, Math.min(copies, 500));
  const displayName = cleanItemName(product.name);

  let stickerItemsHTML = '';
  for (let i = 0; i < safeCopies; i++) {
    stickerItemsHTML += `
      <div class="sticker-card">
        <div class="store-name">${settings.businessName || 'STORE LABEL'}</div>
        <div class="product-name">${displayName}</div>
        <div class="meta-row">
          <span>SKU: ${product.sku}</span>
          ${product.barcode ? `<span>BC: ${product.barcode}</span>` : ''}
        </div>
        <div class="barcode-graphic">||||| | ||||| |||| ||||| ||</div>
        <div class="price-box">
          <span class="price-lbl">PRICE:</span>
          <span class="price-val">${priceText}</span>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Print Product Stickers - ${product.sku} (${safeCopies} Copies)</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      @page { size: auto; margin: 3mm; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0;
      padding: 12px;
      background: #f1f5f9;
      color: #0f172a;
    }
    .top-actions {
      display: flex;
      align-items: center;
      justify-content: justify-between;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px 18px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border: 1px solid #cbd5e1;
    }
    .title-info {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .btn-group {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
    .print-btn {
      background: #C49A45;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-weight: bold;
      font-size: 13px;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .print-btn:hover {
      background: #b58c38;
    }
    .close-btn {
      background: #e2e8f0;
      color: #1e293b;
      border: none;
      padding: 8px 16px;
      font-weight: bold;
      font-size: 13px;
      border-radius: 8px;
      cursor: pointer;
    }
    .close-btn:hover {
      background: #cbd5e1;
    }
    .sticker-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-start;
    }
    .sticker-card {
      width: 55mm;
      height: 35mm;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 5px 8px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .store-name {
      font-size: 8px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .product-name {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-top: 2px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      font-family: monospace;
      color: #334155;
      font-weight: bold;
      margin-top: 2px;
    }
    .barcode-graphic {
      font-family: "Courier New", Courier, monospace;
      font-size: 13px;
      letter-spacing: 2px;
      font-weight: 900;
      text-align: center;
      color: #0f172a;
      line-height: 1;
      margin: 1px 0;
      user-select: none;
    }
    .price-box {
      background: #0f172a;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .price-lbl {
      font-size: 7.5px;
      font-weight: 700;
      opacity: 0.85;
    }
    .price-val {
      font-size: 12px;
      font-weight: 900;
      font-family: monospace;
      color: #fef08a;
    }
  </style>
</head>
<body>
  <div class="no-print top-actions">
    <div class="title-info">
      Sticker Sheet Preview: ${product.name} (${safeCopies} Copies)
    </div>
    <div class="btn-group">
      <button class="print-btn" onclick="window.print()">🖨️ Print All ${safeCopies} Stickers</button>
      <button class="close-btn" onclick="window.close()">Close Window</button>
    </div>
  </div>
  <div class="sticker-grid">
    ${stickerItemsHTML}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        try { window.print(); } catch(e){}
      }, 350);
    };
  </script>
</body>
</html>`;
}

export function printProductSticker(
  product: Product,
  settings: CompanySettings,
  copies: number = 1
): boolean {
  const html = generateStickerSheetHTML(product, settings, copies);

  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const printWin = window.open(blobUrl, '_blank');

    if (printWin) {
      printWin.focus();
      return true;
    }
  } catch (err) {
    console.warn('Blob window.open blocked:', err);
  }

  // Fallback: window.print() on current page
  try {
    window.print();
    return true;
  } catch (e) {
    console.error('Final print trigger failed:', e);
    return false;
  }
}

export function downloadStickerHTML(
  product: Product,
  settings: CompanySettings,
  copies: number = 1
) {
  const html = generateStickerSheetHTML(product, settings, copies);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Stickers_${product.sku}_${copies}pcs.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
