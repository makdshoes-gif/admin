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

// Expenses API client
export async function fetchExpensesApi(): Promise<Expense[]> {
  try {
    const res = await fetch('/api/expenses');
    const json = await res.json();
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
    const json = await res.json();
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
    const json = await res.json();
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
    const json = await res.json();
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
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error al obtener datos');
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
    const json = await res.json();
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
    const json = await res.json();
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
    const json = await res.json();
    return Boolean(json.updated);
  } catch (err) {
    console.error('Error updating bank reconciliation:', err);
    return false;
  }
}

