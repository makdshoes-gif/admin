import * as XLSX from 'xlsx';
import { 
  Sale, 
  Expense, 
  Layaway, 
  LayawayPayment, 
  SalePayment, 
  AccountingRecord, 
  AccountingJournalLine,
  StockMovement
} from '../types';

/**
 * Formats a sequence number into an official entry code (e.g. 1 -> AS-00001)
 */
export function formatAsientoNumber(num: number): string {
  return `AS-${String(num).padStart(5, '0')}`;
}

/**
 * Extracts MM-YYYY from an ISO or YYYY-MM-DD date string
 */
export function getMesAno(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${mm}-${now.getFullYear()}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parts = dateStr.split(/[-/]/);
      if (parts.length >= 2) {
        return `${parts[1].padStart(2, '0')}-${parts[0]}`;
      }
      return '10-2026';
    }
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${yyyy}`;
  } catch {
    return '10-2026';
  }
}

/**
 * Formats date into DD/MM/YYYY for tabular display
 */
export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr.slice(0, 10);
  }
}

/**
 * Generates an automatic double-entry journal entry for a Sale (Venta)
 * Venta:
 *  -> Libro Diario / Mayor
 *  -> Inventario / Costo de Venta
 *  -> IVA Débito Fiscal
 *  -> Caja / Bancos / Cashea
 */
export function createRecordFromSale(sale: Sale, seqNum: number): AccountingRecord {
  const mesAno = getMesAno(sale.fecha);
  const numeroAsiento = formatAsientoNumber(seqNum);
  const clienteFullName = `${sale.cliente_nombre || 'Cliente General'} ${sale.cliente_apellido || ''}`.trim();
  const clienteRif = sale.cliente_rif || 'V-00000000';

  // Subtotal neto y montos
  const subtotalNeto = Math.max(0, (sale.subtotal_usd || 0) - (sale.descuento_usd || 0));
  const ivaMonto = sale.aplica_iva ? (sale.iva_monto_usd || 0) : 0;
  const totalVenta = sale.total_usd || (subtotalNeto + ivaMonto);
  const costoTotal = sale.costo_total_usd || 0;

  // Determine main payment method label
  let metodoPago = 'Efectivo USD';
  if (sale.pagos && sale.pagos.length > 0) {
    if (sale.pagos.length === 1) {
      metodoPago = sale.pagos[0].cuenta;
    } else {
      const hasCashea = sale.pagos.some((p) => p.cuenta.toLowerCase().includes('cashea'));
      metodoPago = hasCashea ? 'Cashea / Mixto' : 'Pago Combinado';
    }
  }

  // Build double-entry lines
  const lineas: AccountingJournalLine[] = [];
  let lineId = 1;

  // 1. Débitos por Cobro (Caja / Bancos / Cashea)
  if (sale.pagos && sale.pagos.length > 0) {
    sale.pagos.forEach((p) => {
      const isCashea = p.cuenta.toLowerCase().includes('cashea');
      if (isCashea) {
        lineas.push({
          id: `line-${lineId++}`,
          partida: '01',
          cuenta: 'Cuentas por Cobrar Cashea',
          subcuenta: 'Cashea Cuotas Pendientes',
          clasificacion: 'Activo',
          subclasificacion: 'Cuentas por Cobrar',
          debe: p.monto_equivalente_usd,
          haber: 0,
          descripcion: `Venta financiada Cashea Factura #${sale.numero_factura}`,
        });
      } else {
        const isBdv = p.cuenta.toLowerCase().includes('pago móvil') || p.cuenta.toLowerCase().includes('bdv');
        const isPos = p.cuenta.toLowerCase().includes('punto');
        const isZelle = p.cuenta.toLowerCase().includes('zelle');

        const cuenta = isBdv || isPos ? 'Bancos Nacionales' : isZelle ? 'Bancos Internacionales' : 'Caja Principal';
        const subcuenta = p.cuenta;

        lineas.push({
          id: `line-${lineId++}`,
          partida: '01',
          cuenta,
          subcuenta,
          clasificacion: 'Activo',
          subclasificacion: 'Efectivo y Equivalentes',
          debe: p.monto_equivalente_usd,
          haber: 0,
          descripcion: `Cobro en ${p.cuenta} Factura #${sale.numero_factura}`,
        });
      }
    });
  } else {
    // Default cash debit
    lineas.push({
      id: `line-${lineId++}`,
      partida: '01',
      cuenta: 'Caja Principal',
      subcuenta: 'Efectivo USD',
      clasificacion: 'Activo',
      subclasificacion: 'Efectivo y Equivalentes',
      debe: totalVenta,
      haber: 0,
      descripcion: `Cobro Factura #${sale.numero_factura}`,
    });
  }

  // 2. Crédito por Ingreso de Ventas
  lineas.push({
    id: `line-${lineId++}`,
    partida: '01',
    cuenta: 'Ventas de mercancía',
    subcuenta: 'Calzado Deportivo y Urbano',
    clasificacion: 'Ingresos',
    subclasificacion: 'Ventas gravadas',
    debe: 0,
    haber: subtotalNeto,
    descripcion: `Venta de Calzado Factura #${sale.numero_factura} (${clienteFullName})`,
  });

  // 3. Crédito por IVA Débito Fiscal si aplica
  if (ivaMonto > 0) {
    lineas.push({
      id: `line-${lineId++}`,
      partida: '01',
      cuenta: 'Impuestos por Pagar',
      subcuenta: 'IVA Débito Fiscal (16%)',
      clasificacion: 'Pasivo',
      subclasificacion: 'Pasivo Corriente',
      debe: 0,
      haber: ivaMonto,
      descripcion: `IVA 16% Factura #${sale.numero_factura}`,
    });
  }

  // 4. Reconocimiento de Costo de Venta e Inventario
  if (costoTotal > 0) {
    lineas.push({
      id: `line-${lineId++}`,
      partida: '01',
      cuenta: 'Costo de Ventas',
      subcuenta: 'Costo de Calzado Vendido',
      clasificacion: 'Costos',
      subclasificacion: 'Costo Operativo',
      debe: costoTotal,
      haber: 0,
      descripcion: `Costo de mercancía vendida Factura #${sale.numero_factura}`,
    });
    lineas.push({
      id: `line-${lineId++}`,
      partida: '01',
      cuenta: 'Inventario de Mercancía',
      subcuenta: 'Almacén de Calzado',
      clasificacion: 'Activo',
      subclasificacion: 'Inventarios',
      debe: 0,
      haber: costoTotal,
      descripcion: `Salida de almacén por venta Factura #${sale.numero_factura}`,
    });
  }

  return {
    id: `asiento-sale-${sale.id}`,
    numero_asiento: numeroAsiento,
    fecha: (sale.fecha || '').slice(0, 10),
    partida: '01',
    cuenta: 'Ventas de mercancía',
    subcuenta: 'Calzado',
    clasificacion: 'Ingresos',
    subclasificacion: 'Ventas gravadas',
    mes_ano: mesAno,
    metodo_pago: metodoPago,
    numero_documento: sale.numero_factura.startsWith('FAC') ? sale.numero_factura : `FAC-${sale.numero_factura}`,
    tipo_documento: 'FACTURA',
    sujeto: clienteFullName,
    rif: clienteRif,
    moneda: 'USD',
    debe: totalVenta,
    haber: totalVenta,
    operacion_tipo: 'Venta',
    origen_tipo: 'venta',
    origen_id: sale.id,
    observaciones: sale.notas || `Venta en tienda MAKD SHOP (${sale.items?.length || 0} modelos)`,
    tasa_cambio: sale.tasa_cambio,
    created_at: sale.created_at || sale.fecha,
    lineas_asiento: lineas,
  };
}

/**
 * Generates an automatic double-entry journal entry for a Purchase (Compra)
 * Compra:
 *  -> Libro Diario
 *  -> Inventario
 *  -> Proveedor / Caja / Banco
 *  -> IVA Crédito Fiscal
 */
export function createRecordFromPurchase(
  purchase: {
    id: string;
    fecha: string;
    numero_documento: string;
    proveedor: string;
    rif?: string;
    monto_total_usd: number;
    metodo_pago: string;
    aplica_iva?: boolean;
    iva_monto_usd?: number;
    notas?: string;
    tasa_cambio?: number;
  },
  seqNum: number
): AccountingRecord {
  const mesAno = getMesAno(purchase.fecha);
  const numeroAsiento = formatAsientoNumber(seqNum);
  const docNum = purchase.numero_documento || `COM-${purchase.id.slice(-6).toUpperCase()}`;
  const total = purchase.monto_total_usd;
  const iva = purchase.aplica_iva ? (purchase.iva_monto_usd || total * 0.16) : 0;
  const subtotalNeto = Math.max(0, total - iva);

  const lineas: AccountingJournalLine[] = [
    {
      id: 'line-1',
      partida: '05',
      cuenta: 'Inventario de Mercancía',
      subcuenta: 'Almacén de Calzado',
      clasificacion: 'Activo',
      subclasificacion: 'Inventarios',
      debe: subtotalNeto,
      haber: 0,
      descripcion: `Ingreso de mercancía por compra Doc #${docNum}`,
    },
  ];

  if (iva > 0) {
    lineas.push({
      id: 'line-2',
      partida: '05',
      cuenta: 'Crédito Fiscal IVA',
      subcuenta: 'IVA Crédito Fiscal (16%)',
      clasificacion: 'Activo',
      subclasificacion: 'Activo Exigible',
      debe: iva,
      haber: 0,
      descripcion: `IVA Crédito Fiscal Doc #${docNum}`,
    });
  }

  const isBank = purchase.metodo_pago.toLowerCase().includes('banco') || purchase.metodo_pago.toLowerCase().includes('transferencia');
  lineas.push({
    id: 'line-3',
    partida: '05',
    cuenta: isBank ? 'Bancos Nacionales' : 'Cuentas por Pagar Proveedores',
    subcuenta: purchase.metodo_pago || 'Proveedores Nacionales',
    clasificacion: isBank ? 'Activo' : 'Pasivo',
    subclasificacion: isBank ? 'Efectivo y Equivalentes' : 'Pasivo Corriente',
    debe: 0,
    haber: total,
    descripcion: `Pago / Obligación a ${purchase.proveedor} por Doc #${docNum}`,
  });

  return {
    id: `asiento-compra-${purchase.id}`,
    numero_asiento: numeroAsiento,
    fecha: (purchase.fecha || '').slice(0, 10),
    partida: '05',
    cuenta: 'Inventario de Mercancía',
    subcuenta: 'Almacén de Calzado',
    clasificacion: 'Activo',
    subclasificacion: 'Inventarios',
    mes_ano: mesAno,
    metodo_pago: purchase.metodo_pago,
    numero_documento: docNum,
    tipo_documento: 'COMPRA',
    sujeto: purchase.proveedor,
    rif: purchase.rif || 'J-40192837-0',
    moneda: 'USD',
    debe: total,
    haber: total,
    operacion_tipo: 'Compra',
    origen_tipo: 'compra',
    origen_id: purchase.id,
    observaciones: purchase.notas || `Compra de calzado para stock`,
    tasa_cambio: purchase.tasa_cambio,
    created_at: purchase.fecha,
    lineas_asiento: lineas,
  };
}

/**
 * Generates an automatic double-entry journal entry for an Expense (Gasto)
 * Gasto:
 *  -> Libro Diario
 *  -> Gasto correspondiente (alquiler, nómina, servicios)
 *  -> Caja / Banco
 */
export function createRecordFromExpense(exp: Expense, seqNum: number): AccountingRecord {
  const mesAno = getMesAno(exp.fecha);
  const numeroAsiento = formatAsientoNumber(seqNum);
  const docNum = exp.comprobante_ref || `GAST-${exp.id.slice(-6).toUpperCase()}`;

  const isEfectivo = exp.cuenta_origen.toLowerCase().includes('efectivo');
  const isBs = exp.moneda === 'Bs';

  const lineas: AccountingJournalLine[] = [
    {
      id: 'line-1',
      partida: '02',
      cuenta: 'Gastos de Operación',
      subcuenta: exp.categoria,
      clasificacion: 'Gastos',
      subclasificacion: 'Gastos Operativos',
      debe: exp.monto_usd,
      haber: 0,
      descripcion: exp.descripcion || `Gasto en ${exp.categoria}`,
    },
    {
      id: 'line-2',
      partida: '02',
      cuenta: isEfectivo ? 'Caja Principal' : 'Bancos Nacionales',
      subcuenta: exp.cuenta_origen,
      clasificacion: 'Activo',
      subclasificacion: 'Efectivo y Equivalentes',
      debe: 0,
      haber: exp.monto_usd,
      descripcion: `Pago de gasto con ${exp.cuenta_origen}${isBs ? ` (${exp.monto.toLocaleString('es-VE')} Bs)` : ''}`,
    },
  ];

  return {
    id: `asiento-exp-${exp.id}`,
    numero_asiento: numeroAsiento,
    fecha: (exp.fecha || '').slice(0, 10),
    partida: '02',
    cuenta: 'Gastos de Operación',
    subcuenta: exp.categoria,
    clasificacion: 'Gastos',
    subclasificacion: 'Gastos Operativos',
    mes_ano: mesAno,
    metodo_pago: exp.cuenta_origen,
    numero_documento: docNum,
    tipo_documento: 'GASTO',
    sujeto: exp.beneficiario || 'Proveedor de Servicios',
    rif: 'J-50491823-1',
    moneda: exp.moneda,
    debe: exp.monto_usd,
    haber: exp.monto_usd,
    operacion_tipo: 'Gasto',
    origen_tipo: 'gasto',
    origen_id: exp.id,
    observaciones: exp.notas || exp.descripcion,
    url_comprobante: exp.foto_factura,
    tasa_cambio: exp.tasa_cambio,
    created_at: exp.created_at || exp.fecha,
    lineas_asiento: lineas,
  };
}

/**
 * Generates an automatic double-entry journal entry for a Cashea settlement (Cobro Cashea)
 * Cobro de Cashea:
 *  -> Caja / Banco
 *  -> Disminuye Cuentas por Cobrar Cashea
 */
export function createRecordFromCasheaSettlement(
  sale: Sale,
  pago: SalePayment,
  targetAccount: string,
  bankRef: string,
  seqNum: number
): AccountingRecord {
  const fecha = (pago.fecha_conciliacion || new Date().toISOString()).slice(0, 10);
  const mesAno = getMesAno(fecha);
  const numeroAsiento = formatAsientoNumber(seqNum);

  const lineas: AccountingJournalLine[] = [
    {
      id: 'line-1',
      partida: '03',
      cuenta: 'Bancos Nacionales',
      subcuenta: targetAccount || 'Pago Móvil BDV',
      clasificacion: 'Activo',
      subclasificacion: 'Efectivo y Equivalentes',
      debe: pago.monto_equivalente_usd,
      haber: 0,
      descripcion: `Liquidación de fondos Cashea en ${targetAccount}`,
    },
    {
      id: 'line-2',
      partida: '03',
      cuenta: 'Cuentas por Cobrar Cashea',
      subcuenta: 'Cashea Cuotas Pendientes',
      clasificacion: 'Activo',
      subclasificacion: 'Cuentas por Cobrar',
      debe: 0,
      haber: pago.monto_equivalente_usd,
      descripcion: `Cancelación de cuenta por cobrar Factura #${sale.numero_factura}`,
    },
  ];

  return {
    id: `asiento-cashea-${sale.id}-${pago.id}`,
    numero_asiento: numeroAsiento,
    fecha,
    partida: '03',
    cuenta: 'Bancos Nacionales',
    subcuenta: targetAccount,
    clasificacion: 'Activo',
    subclasificacion: 'Efectivo y Equivalentes',
    mes_ano: mesAno,
    metodo_pago: 'Cashea / Banco',
    numero_documento: bankRef || `LIQ-${sale.numero_factura}`,
    tipo_documento: 'LIQUIDACION',
    sujeto: 'Cashea App / Depósito Bancario',
    rif: 'J-50123984-2',
    moneda: 'USD',
    debe: pago.monto_equivalente_usd,
    haber: pago.monto_equivalente_usd,
    operacion_tipo: 'Cashea',
    origen_tipo: 'cobro_cashea',
    origen_id: sale.id,
    observaciones: `Acreditación bancaria de cuota Cashea Factura #${sale.numero_factura} (Ref: ${bankRef})`,
    tasa_cambio: sale.tasa_cambio,
    created_at: pago.fecha_conciliacion || new Date().toISOString(),
    lineas_asiento: lineas,
  };
}

/**
 * Generates an automatic double-entry journal entry for a Layaway creation (Apartado)
 * Apartado:
 *  -> Registro del apartado
 *  -> Pago recibido (abono inicial)
 *  -> Cuenta pendiente por cobrar
 *  -> Pasivo Diferido (Anticipos de Clientes para no duplicar venta ni inventario final)
 */
export function createRecordFromLayaway(layaway: Layaway, seqNum: number): AccountingRecord {
  const fecha = (layaway.fecha_apartado || layaway.created_at || '').slice(0, 10);
  const mesAno = getMesAno(fecha);
  const numeroAsiento = formatAsientoNumber(seqNum);
  const clienteFullName = `${layaway.cliente_nombre || 'Cliente'} ${layaway.cliente_apellido || ''}`.trim();
  const clienteRif = layaway.cliente_cedula || 'V-00000000';

  const totalApartado = layaway.total_usd || 0;
  const totalAbonado = layaway.total_abonado_usd || 0;
  const saldoPendiente = Math.max(0, totalApartado - totalAbonado);

  const metodoPago = layaway.abonos && layaway.abonos.length > 0 ? layaway.abonos[0].cuenta : 'Apartado en Reserva';

  const lineas: AccountingJournalLine[] = [];
  let lineId = 1;

  // 1. Debe Caja/Banco por el abono inicial recibido
  if (totalAbonado > 0) {
    lineas.push({
      id: `line-${lineId++}`,
      partida: '04',
      cuenta: 'Caja Principal',
      subcuenta: metodoPago,
      clasificacion: 'Activo',
      subclasificacion: 'Efectivo y Equivalentes',
      debe: totalAbonado,
      haber: 0,
      descripcion: `Abono inicial recibido Apartado #${layaway.codigo_apartado}`,
    });
  }

  // 2. Debe Cuentas por Cobrar Clientes por el saldo pendiente
  if (saldoPendiente > 0) {
    lineas.push({
      id: `line-${lineId++}`,
      partida: '04',
      cuenta: 'Cuentas por Cobrar Clientes',
      subcuenta: 'Apartados por Cobrar',
      clasificacion: 'Activo',
      subclasificacion: 'Cuentas por Cobrar',
      debe: saldoPendiente,
      haber: 0,
      descripcion: `Saldo pendiente de entrega Apartado #${layaway.codigo_apartado}`,
    });
  }

  // 3. Haber Anticipos de Clientes (Reserva en pasivo para no duplicar ingreso fiscal ni inventario)
  lineas.push({
    id: `line-${lineId++}`,
    partida: '04',
    cuenta: 'Pasivos Diferidos',
    subcuenta: 'Anticipos de Clientes (Apartados)',
    clasificacion: 'Pasivo',
    subclasificacion: 'Pasivo Corriente',
    debe: 0,
    haber: totalApartado,
    descripcion: `Reserva de calzado Apartado #${layaway.codigo_apartado} (${clienteFullName})`,
  });

  return {
    id: `asiento-layaway-${layaway.id}`,
    numero_asiento: numeroAsiento,
    fecha,
    partida: '04',
    cuenta: 'Pasivos Diferidos',
    subcuenta: 'Anticipos de Clientes',
    clasificacion: 'Pasivo',
    subclasificacion: 'Pasivo Corriente',
    mes_ano: mesAno,
    metodo_pago: metodoPago,
    numero_documento: layaway.codigo_apartado,
    tipo_documento: 'APARTADO',
    sujeto: clienteFullName,
    rif: clienteRif,
    moneda: 'USD',
    debe: totalApartado,
    haber: totalApartado,
    operacion_tipo: 'Apartado',
    origen_tipo: 'apartado',
    origen_id: layaway.id,
    observaciones: layaway.notas || `Reserva de calzado (${layaway.items?.length || 0} pares) - Vence ${layaway.fecha_vencimiento}`,
    tasa_cambio: layaway.tasa_cambio,
    created_at: layaway.created_at,
    lineas_asiento: lineas,
  };
}

/**
 * Generates an automatic double-entry journal entry for a subsequent Layaway payment (Abono de Apartado)
 */
export function createRecordFromLayawayPayment(layaway: Layaway, payment: LayawayPayment, seqNum: number): AccountingRecord {
  const fecha = (payment.fecha || new Date().toISOString()).slice(0, 10);
  const mesAno = getMesAno(fecha);
  const numeroAsiento = formatAsientoNumber(seqNum);
  const clienteFullName = `${layaway.cliente_nombre || 'Cliente'} ${layaway.cliente_apellido || ''}`.trim();
  const clienteRif = layaway.cliente_cedula || 'V-00000000';

  const lineas: AccountingJournalLine[] = [
    {
      id: 'line-1',
      partida: '04',
      cuenta: payment.cuenta.toLowerCase().includes('efectivo') ? 'Caja Principal' : 'Bancos Nacionales',
      subcuenta: payment.cuenta,
      clasificacion: 'Activo',
      subclasificacion: 'Efectivo y Equivalentes',
      debe: payment.monto_equivalente_usd,
      haber: 0,
      descripcion: `Abono a cuenta de Apartado #${layaway.codigo_apartado}`,
    },
    {
      id: 'line-2',
      partida: '04',
      cuenta: 'Cuentas por Cobrar Clientes',
      subcuenta: 'Apartados por Cobrar',
      clasificacion: 'Activo',
      subclasificacion: 'Cuentas por Cobrar',
      debe: 0,
      haber: payment.monto_equivalente_usd,
      descripcion: `Cancelación parcial de cuenta por cobrar Apartado #${layaway.codigo_apartado}`,
    },
  ];

  return {
    id: `asiento-abono-${layaway.id}-${payment.id || Date.now()}`,
    numero_asiento: numeroAsiento,
    fecha,
    partida: '04',
    cuenta: 'Caja Principal',
    subcuenta: payment.cuenta,
    clasificacion: 'Activo',
    subclasificacion: 'Efectivo y Equivalentes',
    mes_ano: mesAno,
    metodo_pago: payment.cuenta,
    numero_documento: `ABO-${layaway.codigo_apartado}`,
    tipo_documento: 'RECIBO',
    sujeto: clienteFullName,
    rif: clienteRif,
    moneda: payment.moneda,
    debe: payment.monto_equivalente_usd,
    haber: payment.monto_equivalente_usd,
    operacion_tipo: 'Pago',
    origen_tipo: 'apartado',
    origen_id: layaway.id,
    observaciones: `Abono registrado a reserva de calzado Apartado #${layaway.codigo_apartado}`,
    created_at: payment.fecha || new Date().toISOString(),
    lineas_asiento: lineas,
  };
}

/**
 * Builds the centralized complete accounting registry from all store data (Patentado V10 engine)
 */
export function buildCentralizedLedger(
  sales: Sale[],
  expenses: Expense[],
  layaways: Layaway[],
  movements: StockMovement[] = [],
  manualRecords: AccountingRecord[] = []
): AccountingRecord[] {
  const records: AccountingRecord[] = [];
  let seq = 1;

  // 1. Process all sales
  sales.forEach((s) => {
    // Check if there is already a manual override for this sale
    const existing = manualRecords.find((r) => r.origen_id === s.id && r.origen_tipo === 'venta');
    if (existing) {
      records.push(existing);
    } else {
      records.push(createRecordFromSale(s, seq++));
    }

    // Also check if this sale had reconciled Cashea payments
    if (s.pagos && s.pagos.length > 0) {
      s.pagos.forEach((p) => {
        if (p.cuenta.toLowerCase().includes('cashea') && p.estado_liquidacion === 'conciliado_en_banco') {
          const existingCashea = manualRecords.find((r) => r.id === `asiento-cashea-${s.id}-${p.id}`);
          if (existingCashea) {
            records.push(existingCashea);
          } else {
            records.push(createRecordFromCasheaSettlement(s, p, p.banco_acreditado || 'Pago Móvil BDV', p.referencia_bancaria || '', seq++));
          }
        }
      });
    }
  });

  // 2. Process all expenses
  expenses.forEach((e) => {
    const existing = manualRecords.find((r) => r.origen_id === e.id && r.origen_tipo === 'gasto');
    if (existing) {
      records.push(existing);
    } else {
      records.push(createRecordFromExpense(e, seq++));
    }
  });

  // 3. Process all layaways and their payments
  layaways.forEach((l) => {
    const existing = manualRecords.find((r) => r.origen_id === l.id && r.origen_tipo === 'apartado');
    if (existing) {
      records.push(existing);
    } else {
      records.push(createRecordFromLayaway(l, seq++));
    }

    // Process additional payments if more than initial deposit
    if (l.abonos && l.abonos.length > 1) {
      l.abonos.slice(1).forEach((abono, idx) => {
        const abonoId = `asiento-abono-${l.id}-${abono.id || idx}`;
        const existingAbono = manualRecords.find((r) => r.id === abonoId);
        if (existingAbono) {
          records.push(existingAbono);
        } else {
          records.push(createRecordFromLayawayPayment(l, abono, seq++));
        }
      });
    }
  });

  // 4. Process inventory purchase arrivals (Entradas de mercancía al almacén)
  movements.forEach((m) => {
    if (m.tipo === 'entrada') {
      const existing = manualRecords.find((r) => r.origen_id === m.id && r.origen_tipo === 'compra');
      if (existing) {
        records.push(existing);
      } else {
        const costoEstimado = 42.0;
        const total = (m.cantidad || 1) * costoEstimado;
        records.push(createRecordFromPurchase({
          id: m.id,
          fecha: m.fecha || new Date().toISOString(),
          numero_documento: `COM-${m.id.slice(-6).toUpperCase()}`,
          proveedor: 'Distribuidora Deportiva de Calzado',
          rif: 'J-40192837-0',
          monto_total_usd: total,
          metodo_pago: 'Cuentas por Pagar Proveedores',
          aplica_iva: false,
          notas: m.motivo || `Ingreso de ${m.cantidad} pares de ${m.producto_nombre || 'calzado'}`,
        }, seq++));
      }
    }
  });

  // 5. Append any purely manual or custom records added by the user
  manualRecords.forEach((m) => {
    if (!m.origen_id || m.origen_tipo === 'manual') {
      if (!records.some((r) => r.id === m.id)) {
        records.push(m);
      }
    }
  });

  // Sort by date descending
  records.sort((a, b) => {
    const dateA = new Date(a.fecha).getTime() || 0;
    const dateB = new Date(b.fecha).getTime() || 0;
    if (dateB !== dateA) return dateB - dateA;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  // Re-number sequence neatly from AS-00001 up
  return records.map((rec, idx) => ({
    ...rec,
    numero_asiento: rec.numero_asiento || formatAsientoNumber(records.length - idx),
  }));
}

/**
 * Exports the accounting registry to a structured Excel (.xlsx) file
 * with the exact columns defined in the Patentado standard.
 */
export function exportLedgerToExcel(records: AccountingRecord[], fileName = 'Libro_Diario_Contabilidad_MAKD.xlsx') {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Registro Contable Centralizado (19 columnas)
  const mainRows = records.map((r, index) => ({
    'N°': index + 1,
    'Registro': r.numero_asiento,
    'Fecha': formatDateDisplay(r.fecha),
    'Partida': r.partida,
    'Cuenta': r.cuenta,
    'Subcuenta': r.subcuenta,
    'Clasificación': r.clasificacion,
    'Subclasificación': r.subclasificacion,
    'Mes-Año': r.mes_ano,
    'Método de pago': r.metodo_pago,
    'N° Documento': r.numero_documento,
    'Tipo Doc.': r.tipo_documento,
    'Razón social / Proveedor / Cliente': r.sujeto,
    'RIF': r.rif,
    'Moneda': r.moneda,
    'Debe': Number(r.debe || 0),
    'Haber': Number(r.haber || 0),
    'Venta/Compra': r.operacion_tipo,
    'Observaciones': r.observaciones || '',
  }));

  const wsMain = XLSX.utils.json_to_sheet(mainRows);

  // Set nice column widths
  wsMain['!cols'] = [
    { wch: 5 },   // N°
    { wch: 12 },  // Registro
    { wch: 12 },  // Fecha
    { wch: 8 },   // Partida
    { wch: 22 },  // Cuenta
    { wch: 22 },  // Subcuenta
    { wch: 15 },  // Clasificación
    { wch: 22 },  // Subclasificación
    { wch: 10 },  // Mes-Año
    { wch: 18 },  // Método de pago
    { wch: 16 },  // N° Documento
    { wch: 12 },  // Tipo Doc.
    { wch: 30 },  // Razón Social / Cliente
    { wch: 14 },  // RIF
    { wch: 8 },   // Moneda
    { wch: 14 },  // Debe
    { wch: 14 },  // Haber
    { wch: 14 },  // Venta/Compra
    { wch: 35 },  // Observaciones
  ];

  XLSX.utils.book_append_sheet(wb, wsMain, 'Libro Diario');

  // Sheet 2: Detalle de Doble Partida (Líneas Contables)
  const detailRows: any[] = [];
  records.forEach((r) => {
    if (r.lineas_asiento && r.lineas_asiento.length > 0) {
      r.lineas_asiento.forEach((l) => {
        detailRows.push({
          'Asiento': r.numero_asiento,
          'Fecha': formatDateDisplay(r.fecha),
          'Documento': r.numero_documento,
          'Sujeto': r.sujeto,
          'Partida': l.partida,
          'Cuenta': l.cuenta,
          'Subcuenta': l.subcuenta,
          'Clasificación': l.clasificacion,
          'Subclasificación': l.subclasificacion,
          'Debe': Number(l.debe || 0),
          'Haber': Number(l.haber || 0),
          'Descripción / Glosa': l.descripcion,
        });
      });
    }
  });

  if (detailRows.length > 0) {
    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    wsDetail['!cols'] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 26 },
      { wch: 8 },
      { wch: 24 },
      { wch: 24 },
      { wch: 16 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Líneas Asientos');
  }

  // Trigger browser download
  XLSX.writeFile(wb, fileName);
}

/**
 * Triggers standard browser print of an individual Accounting Voucher
 */
export function printAccountingVoucher(record: AccountingRecord) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  const linesHtml = (record.lineas_asiento || [])
    .map(
      (l, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
        <td style="padding: 8px 6px; text-align: center;">${l.partida || record.partida}</td>
        <td style="padding: 8px 6px; font-weight: 600;">${l.cuenta}</td>
        <td style="padding: 8px 6px; color: #475569;">${l.subcuenta}</td>
        <td style="padding: 8px 6px; color: #64748b;">${l.clasificacion}</td>
        <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 600;">$${Number(l.debe || 0).toFixed(2)}</td>
        <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 600;">$${Number(l.haber || 0).toFixed(2)}</td>
        <td style="padding: 8px 6px; font-size: 11px; color: #64748b;">${l.descripcion}</td>
      </tr>
    `
    )
    .join('');

  const totalDebe = (record.lineas_asiento || []).reduce((s, l) => s + (l.debe || 0), 0) || record.debe;
  const totalHaber = (record.lineas_asiento || []).reduce((s, l) => s + (l.haber || 0), 0) || record.haber;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Asiento Contable ${record.numero_asiento} - MAKD SHOP</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f1f5f9; padding: 8px 6px; font-size: 11px; text-transform: uppercase; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .signatures { margin-top: 48px; display: flex; justify-content: space-between; }
          .sig-box { width: 28%; border-top: 1px solid #475569; padding-top: 6px; text-align: center; font-size: 11px; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">MAKD SHOP, C.A.</h1>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">RIF: J-50491823-1 • Puerto Ordaz, Alta Vista II Local 163</p>
              <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 600; color: #4338ca;">LIBRO DIARIO CENTRALIZADO (PATENTADO V10)</p>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: #e0e7ff; color: #3730a3; font-size: 14px;">ASIENTO ${record.numero_asiento}</span>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Fecha: <strong>${formatDateDisplay(record.fecha)}</strong></p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Mes-Año: <strong>${record.mes_ano}</strong></p>
            </div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 12px;">
          <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; display: block;">Documento:</span><strong>${record.numero_documento}</strong> (${record.tipo_documento})</div>
          <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; display: block;">Cliente / Sujeto:</span><strong>${record.sujeto}</strong></div>
          <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; display: block;">RIF / C.I.:</span><strong>${record.rif}</strong></div>
          <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; display: block;">Método Pago:</span><strong>${record.metodo_pago}</strong></div>
          <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; display: block;">Partida:</span><strong>${record.partida}</strong></div>
          <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; display: block;">Cuenta Principal:</span><strong>${record.cuenta}</strong></div>
          <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; display: block;">Subcuenta:</span><strong>${record.subcuenta}</strong></div>
          <div><span style="color: #64748b; font-size: 10px; text-transform: uppercase; display: block;">Operación:</span><strong style="color: #4338ca;">${record.operacion_tipo}</strong></div>
        </div>

        <h3 style="margin: 18px 0 6px 0; font-size: 13px; text-transform: uppercase; color: #334155;">Detalle de Doble Partida (Líneas del Asiento)</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">Part.</th>
              <th>Cuenta</th>
              <th>Subcuenta</th>
              <th>Clasificación</th>
              <th style="text-align: right;">Debe ($)</th>
              <th style="text-align: right;">Haber ($)</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #0f172a; font-size: 12px;">
              <td colspan="4" style="padding: 10px 6px; text-align: right; text-transform: uppercase;">Totales Balanceados:</td>
              <td style="padding: 10px 6px; text-align: right; font-family: monospace; font-size: 13px; color: #047857;">$${Number(totalDebe).toFixed(2)}</td>
              <td style="padding: 10px 6px; text-align: right; font-family: monospace; font-size: 13px; color: #047857;">$${Number(totalHaber).toFixed(2)}</td>
              <td style="padding: 10px 6px; font-size: 11px; color: #059669;">✓ Cuadrado</td>
            </tr>
          </tfoot>
        </table>

        ${record.observaciones ? `
          <div style="margin-top: 14px; font-size: 11px; color: #475569; background: #f1f5f9; padding: 8px 12px; border-radius: 4px;">
            <strong>Observaciones:</strong> ${record.observaciones}
          </div>
        ` : ''}

        <div class="signatures">
          <div class="sig-box">Preparado por<br><strong>Caja / Facturación</strong></div>
          <div class="sig-box">Revisado por<br><strong>Administración MAKD</strong></div>
          <div class="sig-box">Aprobado por<br><strong>Contador Público (CPC)</strong></div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
