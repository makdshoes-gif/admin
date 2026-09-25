import { ShoeProduct } from '../types';

export type LabelFormat = 'thermal_40x25' | 'thermal_50x30' | 'hangtag' | 'box';

export interface LabelOptions {
  format: LabelFormat;
  showCost: boolean;
  showPrice: boolean;
  showBsPrice: boolean;
  showBarcode: boolean;
  showStoreAddress: boolean;
  exchangeRate: number;
}

// Code 39 barcode patterns
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '$': '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100',
};

/**
 * Draws a Code 39 barcode onto a 2D canvas context.
 */
function drawBarcode(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  targetWidth: number,
  barHeight: number
) {
  const sanitized = `*${text.toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '-') || 'SKU'}*`;

  // Measure total pattern units
  let totalUnits = 0;
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];
    for (let p = 0; p < 9; p++) {
      totalUnits += pattern[p] === '1' ? 2.5 : 1.0;
    }
    if (i < sanitized.length - 1) {
      totalUnits += 1.0; // inter-char gap
    }
  }

  // Calculate unit width so it fits within targetWidth
  const unitWidth = Math.min(2.8, targetWidth / totalUnits);
  const actualBarcodeWidth = totalUnits * unitWidth;
  let startX = centerX - actualBarcodeWidth / 2;

  ctx.fillStyle = '#000000';

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];
    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const w = (pattern[p] === '1' ? 2.5 : 1.0) * unitWidth;
      if (isBar) {
        ctx.fillRect(Math.round(startX), Math.round(y), Math.max(1, Math.round(w)), Math.round(barHeight));
      }
      startX += w;
    }
    if (i < sanitized.length - 1) {
      startX += 1.0 * unitWidth;
    }
  }
}

/**
 * Truncates text with ellipsis if it exceeds maxWidth
 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let current = text;
  while (current.length > 0 && ctx.measureText(current + '…').width > maxWidth) {
    current = current.slice(0, -1);
  }
  return current + '…';
}

/**
 * Renders a complete shoe label onto an HTML5 Canvas at high resolution.
 */
export function renderLabelToCanvas(
  product: ShoeProduct,
  options: LabelOptions
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Determine canvas pixel dimensions based on label format (scaled for crisp 300+ DPI print)
  let width = 480;
  let height = 300; // 40x25mm (ratio 1.6 : 1, 480 x 300)

  if (options.format === 'thermal_50x30') {
    width = 600;
    height = 360; // 50x30mm (ratio 1.67 : 1)
  } else if (options.format === 'hangtag') {
    width = 480;
    height = 700; // Hang tag (vertical)
  } else if (options.format === 'box') {
    width = 650;
    height = 450; // Box label
  }

  canvas.width = width;
  canvas.height = height;

  // 1. Fill clean white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  const priceBs = product.precio * options.exchangeRate;

  if (options.format === 'thermal_40x25') {
    // -------------------------------------------------------------
    // OPTIMIZED ULTRA-CRISP 40x25mm LAYOUT (480 x 300 px)
    // -------------------------------------------------------------
    
    // Top Bar: MAKD SHOP on left, TALLA badge on right
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('MAKD SHOP', 16, 16);

    // TALLA badge
    const tallaText = `TALLA: ${product.talla}`;
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    const tallaWidth = ctx.measureText(tallaText).width + 16;
    ctx.fillStyle = '#000000';
    ctx.fillRect(width - 16 - tallaWidth, 14, tallaWidth, 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(tallaText, width - 16 - tallaWidth / 2, 19);

    // Subtle address line under title if enabled
    if (options.showStoreAddress) {
      ctx.fillStyle = '#555555';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Puerto Ordaz • Cdad. Alta Vista II, Loc. 163', 16, 44);
    }

    // Divider
    ctx.fillStyle = '#000000';
    ctx.fillRect(16, 60, width - 32, 2);

    // Shoe Name (Bold)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    const shoeName = fitText(ctx, product.nombre.toUpperCase(), width - 36);
    ctx.fillText(shoeName, 16, 68);

    // Brand and Color / Type
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const details = `${product.marca || ''} • ${product.tipo || ''} | ${product.color || ''}`.trim();
    ctx.fillText(fitText(ctx, details, width - 36), 16, 94);

    // Barcode Section
    if (options.showBarcode) {
      // Draw Code 39 Barcode (clean black bars)
      drawBarcode(ctx, product.sku, width / 2, 118, width - 60, 48);

      // SKU text below barcode
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SKU: ${product.sku}`, width / 2, 172);
    } else {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SKU: ${product.sku}`, width / 2, 140);
    }

    // Bottom Divider
    ctx.fillStyle = '#000000';
    ctx.fillRect(16, 198, width - 32, 2);

    // Bottom Row: Cost (left) and Price (right)
    const bottomY = 208;

    if (options.showCost) {
      // Cost box on left
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, bottomY, 150, 72);

      ctx.fillStyle = '#666666';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('COSTO COMPRA', 24, bottomY + 8);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`$${product.costo.toFixed(2)}`, 24, bottomY + 28);

      // Equivalent cost in Bs
      const costBs = product.costo * options.exchangeRate;
      ctx.fillStyle = '#555555';
      ctx.font = '10px monospace';
      ctx.fillText(`≈ ${costBs.toFixed(0)} Bs`, 24, bottomY + 52);
    }

    if (options.showPrice) {
      // Price on right
      ctx.textAlign = 'right';
      ctx.fillStyle = '#444444';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('PVP VENTA', width - 16, bottomY + 6);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(`$${product.precio.toFixed(2)}`, width - 16, bottomY + 24);

      if (options.showBsPrice) {
        ctx.fillStyle = '#222222';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${priceBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Bs`, width - 16, bottomY + 54);
      }
    }
  } else {
    // -------------------------------------------------------------
    // GENERAL / STANDARD LAYOUT (50x30mm, HangTag, Box)
    // -------------------------------------------------------------
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('MAKD SHOP', 20, 20);

    const tallaText = `TALLA: ${product.talla}`;
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    const tallaWidth = ctx.measureText(tallaText).width + 20;
    ctx.fillStyle = '#000000';
    ctx.fillRect(width - 20 - tallaWidth, 18, tallaWidth, 32);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(tallaText, width - 20 - tallaWidth / 2, 23);

    if (options.showStoreAddress) {
      ctx.fillStyle = '#555555';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Puerto Ordaz • Cdad. Alta Vista II, Local 163', 20, 56);
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(20, 78, width - 40, 2);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(fitText(ctx, product.nombre.toUpperCase(), width - 44), 20, 88);

    ctx.fillStyle = '#444444';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const details = `${product.marca || ''} • ${product.tipo || ''} | ${product.color || ''}`.trim();
    ctx.fillText(fitText(ctx, details, width - 44), 20, 118);

    if (options.showBarcode) {
      drawBarcode(ctx, product.sku, width / 2, 146, width - 80, 56);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SKU: ${product.sku}`, width / 2, 210);
    } else {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SKU: ${product.sku}`, width / 2, 170);
    }

    const bottomY = height - 100;
    ctx.fillStyle = '#000000';
    ctx.fillRect(20, bottomY - 10, width - 40, 2);

    if (options.showCost) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, bottomY, 170, 78);

      ctx.fillStyle = '#555555';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('COSTO COMPRA', 30, bottomY + 10);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`$${product.costo.toFixed(2)}`, 30, bottomY + 32);

      const costBs = product.costo * options.exchangeRate;
      ctx.fillStyle = '#555555';
      ctx.font = '11px monospace';
      ctx.fillText(`≈ ${costBs.toFixed(0)} Bs`, 30, bottomY + 58);
    }

    if (options.showPrice) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#555555';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('PVP VENTA', width - 20, bottomY + 8);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 30px monospace';
      ctx.fillText(`$${product.precio.toFixed(2)}`, width - 20, bottomY + 28);

      if (options.showBsPrice) {
        ctx.fillStyle = '#222222';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`${priceBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Bs`, width - 20, bottomY + 62);
      }
    }
  }

  return canvas;
}

/**
 * Downloads the generated shoe label image to the user's computer.
 */
export function downloadLabelImage(
  product: ShoeProduct,
  options: LabelOptions,
  formatType: 'png' | 'jpeg' = 'png'
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const canvas = renderLabelToCanvas(product, options);
      const mimeType = formatType === 'jpeg' ? 'image/jpeg' : 'image/png';
      const extension = formatType === 'jpeg' ? 'jpg' : 'png';
      const sizeLabel = options.format === 'thermal_40x25' ? '40x25mm' : options.format === 'thermal_50x30' ? '50x30mm' : options.format;

      const dataUrl = canvas.toDataURL(mimeType, 0.98);
      const link = document.createElement('a');
      link.download = `etiqueta-${sizeLabel}-${product.sku.replace(/[^a-zA-Z0-9_-]/g, '')}.${extension}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      resolve(true);
    } catch (err) {
      console.error('Error generating label image:', err);
      resolve(false);
    }
  });
}
