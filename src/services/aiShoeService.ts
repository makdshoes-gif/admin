export interface ShoeAiResult {
  success: boolean;
  marca: string;
  modelo: string;
  nombre: string;
  categoria: string;
  tipo: 'Deportivo' | 'Casual' | 'Botas' | 'Tacones' | 'Sandalias' | 'Mocasines' | 'Infantil' | 'Otros';
  genero: 'Caballero' | 'Dama' | 'Unisex' | 'Niño' | 'Niña';
  color: string;
  material: string;
  descripcion_comercial: string;
  copy_social: string;
  hashtags: string[];
  precio_sugerido_usd: number;
  caracteristicas_clave: string[];
  tallas_sugeridas: string[];
  modelo_ia_usado?: string;
  detalles_estilo?: string;
  error?: string;
}

/**
 * Compresses an image data URL to a manageable size (< 1200px max dimension)
 * for fast, reliable Gemini multimodal recognition.
 */
export async function optimizeImageForAi(dataUrl: string, maxDim = 1000, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width <= maxDim && height <= maxDim) {
        resolve(dataUrl);
        return;
      }

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Call server-side Gemini AI to analyze a shoe picture
 */
export async function analyzeShoeWithAi(
  imageBase64: string,
  userHint?: string
): Promise<ShoeAiResult> {
  // Optimize image size first for snappy API response
  const optimizedImage = await optimizeImageForAi(imageBase64);

  const response = await fetch('/api/ai/analyze-shoe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: optimizedImage,
      userHint,
    }),
  });

  if (!response.ok) {
    let errorMsg = `Error en el servidor (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {}
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data as ShoeAiResult;
}
