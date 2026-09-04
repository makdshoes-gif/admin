import { BdvVerificationData, BdvVerificationResponse, NeonDbStatus, ShoeProduct, Sale } from '../types';

export async function checkNeonDbStatus(): Promise<NeonDbStatus> {
  try {
    const res = await fetch('/api/db/status');
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return {
      connected: false,
      message: 'No se pudo conectar con el endpoint de base de datos.',
      error: String(err),
    };
  }
}

export async function syncDataToNeon(products: ShoeProduct[], sales: Sale[]): Promise<{
  success: boolean;
  message: string;
  productsCount?: number;
  salesCount?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/db/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products, sales }),
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      message: 'Fallo al sincronizar con Neon PostgreSQL',
      error: String(err),
    };
  }
}

export async function verifyBdvPagoMovil(data: BdvVerificationData): Promise<BdvVerificationResponse> {
  const res = await fetch('/api/bdv/verificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  if (!res.ok && !result.mensaje) {
    throw new Error(`Error en servidor BDV: ${res.status}`);
  }
  return result;
}

export async function getBdvConfig() {
  try {
    const res = await fetch('/api/bdv/status');
    return await res.json();
  } catch {
    return {
      isConfigured: false,
      mode: 'SANDBOX_ACTIVO',
      banco: 'Banco de Venezuela S.A. (0102)',
      comercioRif: 'J-50123984-1',
      comercioTelefono: '0414-9988776',
      cuentaReceptora: '0102-0501-8200-0012-3456',
    };
  }
}
