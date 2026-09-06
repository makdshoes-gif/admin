import { 
  BdvVerificationData, 
  BdvVerificationResponse, 
  NeonDbStatus, 
  ShoeProduct, 
  Sale,
  Expense,
  BankMovement,
  NeonTableInfo
} from '../types';

/**
 * Safely extract JSON from a Fetch Response without throwing
 * "Unexpected end of JSON input" if the response body is empty or non-JSON.
 */
async function safeJson<T = any>(res: Response, fallbackValue: T): Promise<T> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) {
      return fallbackValue;
    }
    return JSON.parse(text) as T;
  } catch {
    return fallbackValue;
  }
}

export async function checkNeonDbStatus(): Promise<NeonDbStatus> {
  try {
    const res = await fetch('/api/db/status');
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await safeJson<NeonDbStatus>(res, {
      connected: false,
      message: 'Respuesta no válida del servidor.',
    });
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
    return await safeJson(res, {
      success: false,
      message: 'Respuesta vacía del servidor',
    });
  } catch (err) {
    return {
      success: false,
      message: 'Fallo al sincronizar con Neon PostgreSQL',
      error: String(err),
    };
  }
}

export async function verifyBdvPagoMovil(data: BdvVerificationData): Promise<BdvVerificationResponse> {
  try {
    const res = await fetch('/api/bdv/verificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await safeJson<BdvVerificationResponse | null>(res, null);

    if (!result) {
      return {
        aprobado: false,
        codigo_aprobacion: 'SIN_RESPUESTA',
        referencia: data.referencia,
        monto_bs: data.monto_bs,
        telefono_origen: data.telefono_origen,
        cedula_cliente: data.cedula_cliente,
        banco_origen: data.banco_origen,
        cuenta_receptora: '',
        fecha_transaccion: new Date().toISOString(),
        modo: 'SANDBOX_VERIFICADO',
        mensaje: res.ok
          ? 'No se recibió contenido en la respuesta del servidor.'
          : `El servidor devolvió un error (HTTP ${res.status}).`,
      };
    }

    return result;
  } catch (err: any) {
    return {
      aprobado: false,
      codigo_aprobacion: 'ERROR_CONEXION',
      referencia: data.referencia,
      monto_bs: data.monto_bs,
      telefono_origen: data.telefono_origen,
      cedula_cliente: data.cedula_cliente,
      banco_origen: data.banco_origen,
      cuenta_receptora: '',
      fecha_transaccion: new Date().toISOString(),
      modo: 'SANDBOX_VERIFICADO',
      mensaje: err?.message || 'Error de red al conectar con el servicio de verificación.',
    };
  }
}

export async function getBdvConfig() {
  const fallback = {
    isConfigured: false,
    mode: 'SANDBOX_ACTIVO',
    banco: 'Banco de Venezuela S.A. (0102)',
    comercioRif: 'J-50123984-1',
    comercioTelefono: '0414-9988776',
    cuentaReceptora: '0102-0501-8200-0012-3456',
  };

  try {
    const res = await fetch('/api/bdv/status');
    return await safeJson(res, fallback);
  } catch {
    return fallback;
  }
}

// Expenses API client
export async function fetchExpensesApi(): Promise<Expense[]> {
  try {
    const res = await fetch('/api/expenses');
    const json = await safeJson(res, { data: [] });
    return json.data || [];
  } catch (err) {
    console.error('Error fetching expenses from API:', err);
    return [];
  }
}

export async function saveExpenseApi(expense: Expense): Promise<boolean> {
  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    const json = await safeJson(res, { saved: false });
    return Boolean(json.saved);
  } catch (err) {
    console.error('Error saving expense to API:', err);
    return false;
  }
}

export async function deleteExpenseApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
    const json = await safeJson(res, { deleted: false });
    return Boolean(json.deleted);
  } catch (err) {
    console.error('Error deleting expense:', err);
    return false;
  }
}

// Neon Tables Explorer
export async function fetchNeonTablesList(): Promise<NeonTableInfo[]> {
  try {
    const res = await fetch('/api/db/tables');
    const json = await safeJson(res, { tables: [] });
    return json.tables || [];
  } catch (err) {
    console.error('Error fetching Neon tables:', err);
    return [];
  }
}

export async function fetchNeonTableContent(tableName: string, limit = 50): Promise<{
  tableName: string;
  rowCount: number;
  columns: string[];
  rows: any[];
} | null> {
  try {
    const res = await fetch(`/api/db/table-data?table=${encodeURIComponent(tableName)}&limit=${limit}`);
    const json = await safeJson(res, null);
    if (!json || !json.success) return null;
    return json;
  } catch (err) {
    console.error(`Error loading table data for ${tableName}:`, err);
    return null;
  }
}

// Bank Reconciliations API client
export async function fetchBankReconciliationsApi(): Promise<BankMovement[]> {
  try {
    const res = await fetch('/api/bank-reconciliations');
    const json = await safeJson(res, { data: [] });
    return json.data || [];
  } catch (err) {
    console.error('Error fetching bank reconciliations:', err);
    return [];
  }
}

export async function saveBankReconciliationApi(item: BankMovement): Promise<boolean> {
  try {
    const res = await fetch('/api/bank-reconciliations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const json = await safeJson(res, { saved: false });
    return Boolean(json.saved);
  } catch (err) {
    console.error('Error saving bank reconciliation:', err);
    return false;
  }
}

export async function updateBankReconciliationApi(
  id: string, 
  updates: Partial<BankMovement>
): Promise<boolean> {
  try {
    const res = await fetch(`/api/bank-reconciliations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await safeJson(res, { updated: false });
    return Boolean(json.updated);
  } catch (err) {
    console.error('Error updating bank reconciliation:', err);
    return false;
  }
}
