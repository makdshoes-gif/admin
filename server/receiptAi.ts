import { GoogleGenAI } from '@google/genai';

export interface ScannedReceiptData {
  success: boolean;
  monto: number;
  moneda: 'USD' | 'Bs';
  monto_usd: number;
  monto_bs: number;
  categoria: string;
  descripcion: string;
  beneficiario: string;
  fecha: string; // YYYY-MM-DD
  comprobante_ref: string;
  cuenta_sugerida: string;
  detalles_detectados: string;
  confianza: 'alta' | 'media' | 'baja';
  tasa_aplicada?: number;
  items?: Array<{ descripcion: string; cantidad?: number; total?: number }>;
  error?: string;
}

const VALID_CATEGORIES = [
  'Alquiler de Local',
  'Nómina y Sueldos',
  'Servicios Públicos (Luz/Agua/Internet)',
  'Fletes y Transporte',
  'Compra de Mercancía / Proveedores',
  'Empaques, Bolsas y Cajas',
  'Publicidad y Redes Sociales',
  'Mantenimiento y Reparaciones',
  'Impuestos y Tasas Municipales',
  'Comisiones y Gastos Bancarios',
  'Otros Gastos Operativos',
];

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

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
 * Analyzes an invoice / receipt photo with Google Gemini Vision
 */
export async function analyzeReceiptImage(
  imageBase64: string,
  exchangeRate = 1,
  historicalRates?: Record<string, number>
): Promise<ScannedReceiptData> {
  const { data, mimeType } = parseBase64Image(imageBase64);

  if (!data || data.length < 50) {
    throw new Error('La imagen de la factura no contiene datos válidos.');
  }

  const ai = getGenAI();
  if (!ai) {
    throw new Error('Servicio de IA no disponible: GEMINI_API_KEY no configurada.');
  }

  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];

  const prompt = `Eres un asistente contable y auditor experto para la tienda de calzado "MAKD SHOP" en Venezuela.
Tu tarea es examinar minuciosamente la fotografía adjunta de una factura, recibo de compra, ticket fiscal de caja registradora, comprobante de pago móvil, factura de servicios o nota de entrega y extraer los datos del gasto.

INSTRUCCIONES DE EXTRACCIÓN:
1. MONTO TOTAL:
   - Identifica el monto final total a pagar o pagado (Total, Total a Pagar, Monto Neto, Total Factura, o Total Pagado).
   - Detecta si está en Bolívares (Bs, Bs.D, Bs.S, VES) o en Dólares ($ o USD).
   - Si no se especifica moneda pero la factura es venezolana con RIF y montos en cientos o miles, suele ser Bolívares (Bs). Si es monto pequeño como 25.00, 45.00 o tiene signo $, es USD.

2. FECHA:
   - Extrae la fecha de emisión de la factura o comprobante.
   - Formato requerido: AAAA-MM-DD (ej: 2026-09-23). Si no tiene año explícito, usa el año actual (${now.getFullYear()}). Si es ilegible, usa "${todayIso}".

3. BENEFICIARIO / PROVEEDOR:
   - Nombre de la empresa, tienda, comercio, prestador de servicio o persona que emitió la factura o recibió el pago (ej: Corpoelec, Tealca, Zoom, Envases Caracas, Proveedora de Calzado Los Andes, Distribuidora Suelas C.A., etc.).
   - Si tiene RIF (J-, V-, G-), inclúyelo junto al nombre si es relevante.

4. NÚMERO DE COMPROBANTE / FACTURA:
   - Número de Factura (N° Factura, Factura N°, N° Control, Comprobante N°, o Referencia de Pago Móvil).

5. CATEGORÍA:
   - Clasifica el gasto en EXACTAMENTE UNA de estas categorías oficiales:
     * "Alquiler de Local" (arrendamiento de tienda, condominio de centro comercial)
     * "Nómina y Sueldos" (sueldos de empleados, comisiones de vendedores, adelantos de quincena)
     * "Servicios Públicos (Luz/Agua/Internet)" (Corpoelec, Hidrocapital, Cantv, NetUno, Inter, internet de la tienda)
     * "Fletes y Transporte" (envíos de mercancía, flete de calzado por Tealca, MRW, Zoom, traslados)
     * "Compra de Mercancía / Proveedores" (adquisición de zapatos, sandalias, zapatillas, proveedores de calzado al mayor)
     * "Empaques, Bolsas y Cajas" (bolsas plásticas o ecológicas de la tienda, cajas de zapatos, papel seda, cinta adhesiva)
     * "Publicidad y Redes Sociales" (pauta publicitaria en Instagram, Facebook, diseñador gráfico, volantes)
     * "Mantenimiento y Reparaciones" (electricista, pintura, reparación de aire acondicionado, bombillos)
     * "Impuestos y Tasas Municipales" (SENIAT, patente de industria y comercio, aseo urbano, timbres)
     * "Comisiones y Gastos Bancarios" (comisión de punto de venta, mantenimiento de cuenta)
     * "Otros Gastos Operativos" (artículos de limpieza, café, agua potable, papelería de oficina u otros no contemplados arriba)

6. DESCRIPCIÓN CONCISA:
   - Resumen claro de qué se compró o pagó (ej: "Compra de 500 bolsas impresas para zapatos", "Pago de servicio eléctrico Corpoelec local", "Flete de 3 bultos de calzado Tealca").

7. CUENTA SUGERIDA:
   - Si en el recibo se indica pago en efectivo divisas -> "Efectivo USD"
   - Si se indica efectivo bolívares -> "Efectivo Bs"
   - Si se indica pago móvil o transferencia BDV -> "Pago Móvil (BDV)"
   - Si se indica punto de venta / POS / tarjeta -> "Punto de Venta"
   - Si no se especifica, sugiere "Efectivo USD" o "Pago Móvil (BDV)" según la moneda detectada.

Tasa de cambio actual de referencia: ${exchangeRate.toFixed(2)} Bs/USD.

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido sin bloques markdown, con esta estructura exacta:
{
  "monto": 25.50,
  "moneda": "USD" | "Bs",
  "categoria": "Empaques, Bolsas y Cajas",
  "descripcion": "Compra de bolsas y cinta de embalaje",
  "beneficiario": "Inversiones Plastiven C.A.",
  "fecha": "2026-09-23",
  "comprobante_ref": "FAC-004921",
  "cuenta_sugerida": "Efectivo USD",
  "detalles_detectados": "Factura por 2 paquetes de bolsas ecológicas y 1 rollo de cinta",
  "confianza": "alta" | "media" | "baja",
  "items": [
    { "descripcion": "Bolsas ecológicas", "cantidad": 2, "total": 20.00 },
    { "descripcion": "Cinta embalaje", "cantidad": 1, "total": 5.50 }
  ]
}`;

  // Model priority: start with gemini-3.1-flash-lite (high throughput, resistant to 503 spikes)
  // followed by gemini-flash-latest and gemini-3.8-flash
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastErr: any = null;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const model of modelsToTry) {
    // Attempt up to 2 times per model if a transient 503 or 429 error occurs
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini Receipt AI] Escaneando factura con ${model} (intento ${attempt})...`);
        const imagePart = {
          inlineData: {
            mimeType: mimeType.includes('png')
              ? 'image/png'
              : mimeType.includes('webp')
              ? 'image/webp'
              : 'image/jpeg',
            data,
          },
        };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
          model,
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const rawText = response.text || '';
        console.log(`[Gemini Receipt AI] Respuesta recibida (${rawText.length} caracteres) con ${model}`);

        const cleaned = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        // Validar fecha
        let fecha = parsed.fecha || todayIso;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          fecha = todayIso;
        }

        // Determinar tasa efectiva para la fecha detectada de la factura
        let effectiveRate = exchangeRate;
        if (historicalRates && fecha && historicalRates[fecha] && Number(historicalRates[fecha]) > 0) {
          effectiveRate = Number(historicalRates[fecha]);
        }

        const moneda: 'USD' | 'Bs' = parsed.moneda === 'Bs' ? 'Bs' : 'USD';
        const monto = Number(parsed.monto) > 0 ? Number(Number(parsed.monto).toFixed(2)) : 0;
        
        let monto_usd = 0;
        let monto_bs = 0;

        if (moneda === 'USD') {
          monto_usd = monto;
          monto_bs = Number((monto * effectiveRate).toFixed(2));
        } else {
          monto_bs = monto;
          monto_usd = effectiveRate > 0 ? Number((monto / effectiveRate).toFixed(2)) : 0;
        }

        // Validar categoría
        let categoria = parsed.categoria;
        if (!VALID_CATEGORIES.includes(categoria)) {
          categoria = 'Otros Gastos Operativos';
        }

        return {
          success: true,
          monto,
          moneda,
          monto_usd,
          monto_bs,
          tasa_aplicada: effectiveRate,
          categoria,
          descripcion: parsed.descripcion || 'Gasto operativo registrado por foto de factura',
          beneficiario: parsed.beneficiario || 'Proveedor no especificado',
          fecha,
          comprobante_ref: parsed.comprobante_ref || '',
          cuenta_sugerida: parsed.cuenta_sugerida || (moneda === 'USD' ? 'Efectivo USD' : 'Pago Móvil (BDV)'),
          detalles_detectados: parsed.detalles_detectados || '',
          confianza: ['alta', 'media', 'baja'].includes(parsed.confianza) ? parsed.confianza : 'media',
          items: Array.isArray(parsed.items) ? parsed.items : [],
        };
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.warn(`[Gemini Receipt AI] Falló con modelo ${model} (intento ${attempt}):`, errMsg);
        lastErr = err;

        const isTransientOverload =
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        if (isTransientOverload && attempt === 1) {
          console.log(`[Gemini Receipt AI] Esperando 1.2s antes de reintentar por sobrecarga temporal en ${model}...`);
          await sleep(1200);
          continue; // Try attempt 2 on same model
        }
        // If not transient or already tried twice, break to try next fallback model
        break;
      }
    }
  }

  const rawErrMsg = lastErr?.message || '';
  let friendlyMsg = 'No se pudo procesar la imagen de la factura con IA.';

  if (rawErrMsg.includes('503') || rawErrMsg.includes('high demand') || rawErrMsg.includes('UNAVAILABLE')) {
    friendlyMsg = 'Los servidores de IA están saturados por alta demanda momentánea. Por favor, pulsa "Reintentar" o ingresa el monto manualmente con la foto.';
  } else if (rawErrMsg.includes('429') || rawErrMsg.includes('RESOURCE_EXHAUSTED')) {
    friendlyMsg = 'Límite de solicitudes momentáneo alcanzado. Espera unos segundos y pulsa "Reintentar".';
  } else if (rawErrMsg) {
    try {
      const parsedErr = JSON.parse(rawErrMsg);
      if (parsedErr?.error?.message) {
        friendlyMsg = parsedErr.error.message;
      }
    } catch {
      friendlyMsg = rawErrMsg;
    }
  }

  console.error('[Gemini Receipt AI] Error general:', friendlyMsg);
  throw new Error(friendlyMsg);
}
