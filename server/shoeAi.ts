import { GoogleGenAI } from '@google/genai';

export interface ShoeAnalysisResult {
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

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno del servidor.');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

/**
 * Clean base64 string and extract MIME type
 */
function parseBase64Image(input: string, defaultMime = 'image/jpeg'): { data: string; mimeType: string } {
  let mimeType = defaultMime;
  let data = input;

  const match = input.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    data = match[2];
  }

  return { data, mimeType };
}

/**
 * Analyzes a shoe picture using Google Gemini Vision
 */
export async function analyzeShoeImage(
  imageBase64: string,
  userHint?: string
): Promise<ShoeAnalysisResult> {
  const { data, mimeType } = parseBase64Image(imageBase64);

  if (!data || data.length < 50) {
    throw new Error('La imagen proporcionada no contiene datos válidos.');
  }

  const ai = getGenAI();
  const modelsToTry = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  const prompt = `Eres el mayor experto mundial en zapatillas (sneakers), calzado deportivo y moda urbana para la tienda "MAKD SHOP".
Analiza minuciosamente la fotografía adjunta del calzado o zapato para identificar con precisión su marca, silueta o modelo icónico (por ejemplo siluetas tipo Adidas Forum, Adidas Samba, Adidas Campus, Adidas Superstar, Nike Air Force 1, Dunk Low, Jordan 1, Puma Suede, New Balance 550, etc.).

${userHint ? `Pista o información adicional del usuario: "${userHint}"` : ''}

Debes responder ÚNICAMENTE con un objeto JSON válido (sin bloques de código markdown, sin \`\`\`json, texto plano JSON) con los siguientes campos exactos:
{
  "marca": "Nombre de la marca (ej: Adidas, Nike, Jordan, Puma, New Balance, Converse, Vans, Skechers, Asics, Reebok o Genérica)",
  "modelo": "Silueta o modelo específico (ej: Forum Low, Samba OG, Campus 00s, Superstar, Air Force 1, Dunk Low, Suede Classic)",
  "nombre": "Título comercial atractivo y completo para tienda de calzado (ej: Adidas Forum Low Classic White & Black)",
  "categoria": "Calzado",
  "tipo": "Deportivo" | "Casual" | "Botas" | "Tacones" | "Sandalias" | "Mocasines" | "Infantil",
  "genero": "Unisex" | "Caballero" | "Dama" | "Niño" | "Niña",
  "color": "Combinación de colores visible (ej: Blanco con detalles en Negro y suela Gum)",
  "material": "Materiales visibles de fabricación (ej: Cuero sintético suave con detalles en gamuza y suela de goma vulcanizada)",
  "precio_sugerido_usd": 45.00,
  "descripcion_comercial": "Descripción comercial atractiva de 1 o 2 párrafos redactada para vender en tienda de calzado. Destaca su comodidad para uso diario, amortiguación, durabilidad y combinaciones con ropa urbana casual o deportiva.",
  "copy_social": "Texto listo para publicar en Instagram / WhatsApp con emojis elegantes, estructura de venta, tallas disponibles recomendadas y llamado a la acción directo.",
  "hashtags": ["#Adidas", "#SneakersVenezuela", "#MakdShop", "#ZapatosVenezuela", "#ModaUrbana", "#CalzadoDeportivo", "#OutfitUrbano"],
  "caracteristicas_clave": [
    "Suela antideslizante con tracción superior",
    "Plantilla acolchada para confort diario prolongado",
    "Silueta icónica de alta tendencia urbana"
  ],
  "tallas_sugeridas": ["38", "39", "40", "41", "42", "43", "44"],
  "detalles_estilo": "Consejo rápido de combinación de outfit (ej: Luce perfecto con joggers oversized, jeans rectos o shorts deportivos)."
}

Si la foto no parece ser un zapato o prenda, identifica lo más cercano posible e indícalo en descripcion_comercial. Asegúrate de que el JSON sea estrictamente sintáctico y parseable.`;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini Shoe AI] Analizando imagen con modelo: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType.includes('png') ? 'image/png' : mimeType.includes('webp') ? 'image/webp' : 'image/jpeg',
                  data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      });

      const rawText = response.text || '';
      console.log(`[Gemini Shoe AI] Respuesta recibida (${rawText.length} caracteres) con modelo ${model}`);

      // Clean markdown code blocks if any
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      return {
        success: true,
        marca: parsed.marca || 'Adidas',
        modelo: parsed.modelo || 'Urbano Classic',
        nombre: parsed.nombre || `${parsed.marca || 'Calzado'} ${parsed.modelo || 'Deportivo'}`,
        categoria: 'Calzado',
        tipo: validateTipo(parsed.tipo),
        genero: validateGenero(parsed.genero),
        color: parsed.color || 'Multicolor',
        material: parsed.material || 'Material sintético y suela de goma',
        descripcion_comercial: parsed.descripcion_comercial || 'Calzado de alta calidad y diseño moderno para uso diario.',
        copy_social: parsed.copy_social || `🔥 ¡Llegaron los nuevos ${parsed.nombre || 'Sneakers'}! 👟 Disponibles en varias tallas. ¡Escríbenos al WhatsApp para apartar los tuyos!`,
        hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0 ? parsed.hashtags : ['#Zapatos', '#ModaUrbana', '#MakdShop'],
        precio_sugerido_usd: Number(parsed.precio_sugerido_usd) || 45.0,
        caracteristicas_clave: Array.isArray(parsed.caracteristicas_clave) ? parsed.caracteristicas_clave : ['Comodidad garantizada', 'Diseño moderno'],
        tallas_sugeridas: Array.isArray(parsed.tallas_sugeridas) ? parsed.tallas_sugeridas : ['38', '39', '40', '41', '42'],
        modelo_ia_usado: model,
        detalles_estilo: parsed.detalles_estilo || 'Ideal para combinar con tu outfit favorito.',
      };
    } catch (err: any) {
      console.warn(`[Gemini Shoe AI] Falló modelo ${model}:`, err.message || err);
      lastError = err;
    }
  }

  // If all models failed, provide structured fallback
  console.error('[Gemini Shoe AI] Todos los modelos de Gemini fallaron:', lastError);
  throw new Error(`Error analizando el calzado con Gemini AI: ${lastError?.message || 'Servicio no disponible temporalmente'}`);
}

function validateTipo(val: string): 'Deportivo' | 'Casual' | 'Botas' | 'Tacones' | 'Sandalias' | 'Mocasines' | 'Infantil' | 'Otros' {
  const allowed = ['Deportivo', 'Casual', 'Botas', 'Tacones', 'Sandalias', 'Mocasines', 'Infantil'];
  return allowed.includes(val) ? (val as any) : 'Deportivo';
}

function validateGenero(val: string): 'Caballero' | 'Dama' | 'Unisex' | 'Niño' | 'Niña' {
  const allowed = ['Caballero', 'Dama', 'Unisex', 'Niño', 'Niña'];
  return allowed.includes(val) ? (val as any) : 'Unisex';
}
