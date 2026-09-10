/**
 * Utility for intelligent background removal and studio white background creation.
 * Optimized for shoe and product photography in MAKD SHOP.
 */

/**
 * Loads an image from a URL or base64 Data URL safely into an HTMLImageElement
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('No se pudo cargar la imagen: ' + err));
    img.src = src;
  });
}

/**
 * Downloads an image directly to the user's computer or phone
 */
export function downloadImage(dataUrl: string, filename: string) {
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error al descargar imagen:', err);
    // Fallback for some restricted browsers
    window.open(dataUrl, '_blank');
  }
}

/**
 * Attempts to remove background using server-side Gemini AI with timeout.
 * Returns null if not available, timing out, or failing.
 */
async function tryGeminiBackgroundRemoval(imageBase64: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch('/api/ai/remove-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ imageBase64 }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.imageBase64) {
        return data.imageBase64;
      }
    }
  } catch (err) {
    // Graceful fallback to client-side canvas engine
  }
  return null;
}

/**
 * High-performance client-side Canvas background removal & white studio background.
 * Uses perimeter chromatic sampling, edge-sensitive flood fill, and contact shadow rendering.
 */
export async function removeBackgroundClientCanvas(imageSrc: string): Promise<string> {
  const img = await loadImageElement(imageSrc);

  // Optimal resolution for processing: keep max dimension ~1200px
  let width = img.naturalWidth || img.width || 800;
  let height = img.naturalHeight || img.height || 800;
  const maxDim = 1200;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  // Work canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return imageSrc;

  ctx.drawImage(img, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Sample perimeter pixels to establish background color model
  const borderSamples: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 80));

  // Top & Bottom borders
  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < Math.min(height, 8); y++) {
      const idx = (y * width + x) * 4;
      borderSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    for (let y = Math.max(0, height - 8); y < height; y++) {
      const idx = (y * width + x) * 4;
      borderSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }

  // Left & Right borders
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < Math.min(width, 8); x++) {
      const idx = (y * width + x) * 4;
      borderSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
    for (let x = Math.max(0, width - 8); x < width; x++) {
      const idx = (y * width + x) * 4;
      borderSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }

  // Calculate average background color and standard deviation
  let sumR = 0, sumG = 0, sumB = 0;
  for (const [r, g, b] of borderSamples) {
    sumR += r;
    sumG += g;
    sumB += b;
  }
  const avgR = sumR / borderSamples.length;
  const avgG = sumG / borderSamples.length;
  const avgB = sumB / borderSamples.length;

  // Compute variance/distance tolerance
  let sumDiff = 0;
  for (const [r, g, b] of borderSamples) {
    const diff = Math.sqrt(
      Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2)
    );
    sumDiff += diff;
  }
  const avgDiff = sumDiff / borderSamples.length;
  // Adaptive threshold based on background noise
  const threshold = Math.max(28, Math.min(65, avgDiff * 2.2));

  // 2. Build foreground mask and find shoe bounding box
  let minX = width, maxX = 0, minY = height, maxY = 0;
  const isForeground = new Uint8Array(width * height);

  // Center coordinates
  const cx = width / 2;
  const cy = height / 2;
  const maxCenterDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Distance to average background color
      const colorDist = Math.sqrt(
        Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2)
      );

      // Distance to image edge (outer 4% is almost always background)
      const edgeDistX = Math.min(x, width - x);
      const edgeDistY = Math.min(y, height - y);
      const isExtremeEdge = edgeDistX < 8 || edgeDistY < 8;

      // Distance to center (shoes are placed near center)
      const distFromCenter = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      const centerBias = (distFromCenter / maxCenterDist) * 18;

      if (!isExtremeEdge && colorDist > (threshold - centerBias)) {
        isForeground[y * width + x] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Expand bounding box slightly for natural margin
  minX = Math.max(0, minX - 4);
  maxX = Math.min(width - 1, maxX + 4);
  minY = Math.max(0, minY - 4);
  maxY = Math.min(height - 1, maxY + 4);

  // 3. Render onto new high-clarity canvas with pure white studio background
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return imageSrc;

  // Pure studio white base (#FFFFFF)
  outCtx.fillStyle = '#FFFFFF';
  outCtx.fillRect(0, 0, width, height);

  // 4. Add subtle, realistic studio contact shadow beneath the sole
  if (maxY > minY && maxX > minX) {
    const shadowWidth = (maxX - minX) * 0.85;
    const shadowHeight = Math.max(10, Math.min(26, (maxY - minY) * 0.07));
    const shadowX = (minX + maxX) / 2;
    const shadowY = Math.min(height - 8, maxY + (shadowHeight * 0.35));

    outCtx.save();
    outCtx.beginPath();
    outCtx.ellipse(shadowX, shadowY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
    const grad = outCtx.createRadialGradient(
      shadowX, shadowY, 0,
      shadowX, shadowY, shadowWidth / 2
    );
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.18)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.08)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    outCtx.fillStyle = grad;
    outCtx.fill();
    outCtx.restore();
  }

  // 5. Blend foreground pixels with anti-aliasing into the white background
  const outImgData = outCtx.getImageData(0, 0, width, height);
  const outData = outImgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const idx = i * 4;

      if (isForeground[i]) {
        // Check neighborhood to apply soft edge anti-aliasing
        let fgNeighbors = 0;
        if (x > 0 && isForeground[i - 1]) fgNeighbors++;
        if (x < width - 1 && isForeground[i + 1]) fgNeighbors++;
        if (y > 0 && isForeground[i - width]) fgNeighbors++;
        if (y < height - 1 && isForeground[i + width]) fgNeighbors++;

        if (fgNeighbors === 4) {
          // Inner foreground
          outData[idx] = data[idx];
          outData[idx + 1] = data[idx + 1];
          outData[idx + 2] = data[idx + 2];
          outData[idx + 3] = 255;
        } else {
          // Boundary pixel - smooth blend with white
          const alpha = (fgNeighbors / 4) * 0.85 + 0.15;
          outData[idx] = Math.round(data[idx] * alpha + 255 * (1 - alpha));
          outData[idx + 1] = Math.round(data[idx + 1] * alpha + 255 * (1 - alpha));
          outData[idx + 2] = Math.round(data[idx + 2] * alpha + 255 * (1 - alpha));
          outData[idx + 3] = 255;
        }
      }
    }
  }

  outCtx.putImageData(outImgData, 0, 0);

  // Return crisp JPEG with high quality
  return outCanvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Main function: Removes background and returns photo with pure white studio background.
 * Tries server-side Gemini first, then falls back instantly to client-side canvas.
 */
export async function removeBackgroundToWhite(imageSrc: string): Promise<string> {
  if (!imageSrc || imageSrc.length < 50) return imageSrc;

  // Try server-side Gemini AI (if available and fast)
  const geminiResult = await tryGeminiBackgroundRemoval(imageSrc, 5000);
  if (geminiResult) {
    return geminiResult;
  }

  // High-fidelity client canvas fallback
  return removeBackgroundClientCanvas(imageSrc);
}

/**
 * Generates an ultra-crisp 1080x1080 Instagram Post image card with pure white background,
 * product branding, price, and store info ready for download.
 */
export async function createInstagramPostImage(
  imageSrc: string,
  options: {
    nombre: string;
    marca?: string;
    precioUsd: number;
    exchangeRate: number;
    tallas?: string[];
  }
): Promise<string> {
  const postSize = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = postSize;
  canvas.height = postSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSrc;

  // 1. Pure White / Premium Studio Gradient Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, postSize, postSize);

  // Subtle aesthetic soft vignette at the bottom
  const bgGrad = ctx.createLinearGradient(0, 0, 0, postSize);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.85, '#FFFFFF');
  bgGrad.addColorStop(1, '#F8FAFC');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, postSize, postSize);

  // 2. Top Header Bar: Store Branding & Collection Badge
  // Store Logo
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 38px system-ui, -apple-system, sans-serif';
  ctx.fillText('MAKD SHOP', 54, 78);

  ctx.fillStyle = '#64748B';
  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('EXCLUSIVE SNEAKERS & STREETWEAR', 54, 104);

  // "NUEVA COLECCIÓN" Pill
  const pillText = '🔥 NUEVO INGRESO';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  const pillWidth = ctx.measureText(pillText).width + 32;
  const pillX = postSize - 54 - pillWidth;
  const pillY = 56;

  ctx.fillStyle = '#0F172A';
  roundRect(ctx, pillX, pillY, pillWidth, 38, 19);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(pillText, pillX + 16, pillY + 24);

  // 3. Center: Product Photo with studio shadow
  try {
    const productImg = await loadImageElement(imageSrc);

    // Calculate aspect ratio containment within a 780x560 box
    const maxBoxW = 860;
    const maxBoxH = 580;
    let drawW = productImg.naturalWidth || 600;
    let drawH = productImg.naturalHeight || 400;

    const scale = Math.min(maxBoxW / drawW, maxBoxH / drawH);
    drawW = drawW * scale;
    drawH = drawH * scale;

    const drawX = (postSize - drawW) / 2;
    const drawY = 160 + (maxBoxH - drawH) / 2;

    // Contact shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(postSize / 2, drawY + drawH - 12, drawW * 0.42, 22, 0, 0, Math.PI * 2);
    const shadowGrad = ctx.createRadialGradient(
      postSize / 2, drawY + drawH - 12, 0,
      postSize / 2, drawY + drawH - 12, drawW * 0.42
    );
    shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.16)');
    shadowGrad.addColorStop(0.6, 'rgba(15, 23, 42, 0.05)');
    shadowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fill();
    ctx.restore();

    // Draw the clean product image
    ctx.drawImage(productImg, drawX, drawY, drawW, drawH);
  } catch (err) {
    console.warn('Could not draw product image onto canvas:', err);
  }

  // 4. Bottom Information Card
  const cardY = 780;
  const cardH = 240;
  const cardMargin = 54;
  const cardW = postSize - cardMargin * 2;

  // Background card with subtle border
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, cardMargin, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  roundRect(ctx, cardMargin, cardY, cardW, cardH, 28);
  ctx.stroke();

  // Brand / Category Tag
  const brandName = (options.marca || 'SNEAKERS').toUpperCase();
  ctx.fillStyle = '#4F46E5';
  ctx.font = '800 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(brandName, cardMargin + 28, cardY + 44);

  // Product Name
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 30px system-ui, -apple-system, sans-serif';
  let titleText = options.nombre || 'Calzado Deportivo';
  if (titleText.length > 32) {
    titleText = titleText.substring(0, 30) + '...';
  }
  ctx.fillText(titleText, cardMargin + 28, cardY + 84);

  // Available Sizes if present
  if (options.tallas && options.tallas.length > 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Tallas disponibles: ${options.tallas.join(' • ')}`, cardMargin + 28, cardY + 120);
  } else {
    ctx.fillStyle = '#64748B';
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('Calidad 100% Garantizada • Horma estándar', cardMargin + 28, cardY + 120);
  }

  // Delivery / Location Footer
  ctx.fillStyle = '#047857';
  ctx.font = '700 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('📍 Puerto Ordaz (Alta Vista II)   •   🚚 Envíos a toda Venezuela (Zoom/MRW)', cardMargin + 28, cardY + 168);

  // Price Badge (Right Side)
  const priceUsd = Number(options.precioUsd) || 0;
  const priceBs = priceUsd * (Number(options.exchangeRate) || 0);

  const priceBadgeW = 260;
  const priceBadgeH = 110;
  const priceBadgeX = cardMargin + cardW - priceBadgeW - 24;
  const priceBadgeY = cardY + 28;

  ctx.fillStyle = '#0F172A';
  roundRect(ctx, priceBadgeX, priceBadgeY, priceBadgeW, priceBadgeH, 20);
  ctx.fill();

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '900 38px system-ui, -apple-system, sans-serif';
  ctx.fillText(`$${priceUsd.toFixed(2)}`, priceBadgeX + 24, priceBadgeY + 52);

  if (priceBs > 0) {
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Bs. ${priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, priceBadgeX + 24, priceBadgeY + 86);
  }

  // 5. Watermark / Instagram CTA at the very bottom
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('PEDIDOS POR WHATSAPP & DIRECT  •  @MAKD_SHOP', 54, postSize - 22);

  return canvas.toDataURL('image/png');
}

/**
 * Helper to draw a rounded rectangle on a 2D canvas context
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
