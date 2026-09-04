/**
 * Servicio de sincronización en tiempo real con la tasa oficial del Banco Central de Venezuela (BCV).
 * Utiliza DolarApi (https://ve.dolarapi.com/v1/dolares/oficial) como fuente oficial directa,
 * con soporte de reintentos, formato de fechas y manejo de fallos.
 */

export interface BcvApiResponse {
  moneda: string;
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

export interface BcvRateInfo {
  rate: number;
  officialDate: string;
  lastSyncedAt: string;
  source: string;
  status: 'synced' | 'syncing' | 'error' | 'manual';
  error?: string;
}

const BCV_API_PRIMARY = 'https://ve.dolarapi.com/v1/dolares/oficial';
const BCV_API_FALLBACK = 'https://ve.dolarapi.com/v1/dolares';

export async function fetchLiveBcvRate(): Promise<{
  rate: number;
  officialDate: string;
  source: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(BCV_API_PRIMARY, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} from BCV API`);
    }

    const data: BcvApiResponse = await response.json();

    if (!data || typeof data.promedio !== 'number' || data.promedio <= 0) {
      throw new Error('Formato de tasa inválido devuelto por la API del BCV');
    }

    return {
      rate: Number(data.promedio.toFixed(2)),
      officialDate: data.fechaActualizacion || new Date().toISOString(),
      source: 'Banco Central de Venezuela (vía DolarApi)',
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    // Try fallback endpoint
    try {
      const fallbackResponse = await fetch(BCV_API_FALLBACK, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (fallbackResponse.ok) {
        const list = await fallbackResponse.json();
        const oficialItem = Array.isArray(list)
          ? list.find((item: { fuente?: string }) => item.fuente === 'oficial') || list[0]
          : null;

        if (oficialItem && typeof oficialItem.promedio === 'number' && oficialItem.promedio > 0) {
          return {
            rate: Number(oficialItem.promedio.toFixed(2)),
            officialDate: oficialItem.fechaActualizacion || new Date().toISOString(),
            source: 'Banco Central de Venezuela (vía DolarApi Respaldo)',
          };
        }
      }
    } catch {
      // ignore fallback error and throw original
    }

    const errorMsg = err instanceof Error ? err.message : 'Error desconocido al conectar con API BCV';
    throw new Error(errorMsg);
  }
}
