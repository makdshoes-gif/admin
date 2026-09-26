app.post('/api/sales', async (req, res) => {
  // Compatibilidad con versiones anteriores del frontend:
  // acepta tanto la venta directa como { sale: venta }.
  const sale = req.body?.sale || req.body;

  if (!sale || !sale.id || !Array.isArray(sale.items)) {
    return res.status(400).json({
      saved: false,
      error: 'Datos de venta inválidos: faltan id o items.',
    });
  }

  const sql = getNeonSql();

  if (!sql) {
    return res.status(503).json({
      saved: false,
      error: 'DATABASE_URL no configurada en Vercel: la venta no se guardó en el servidor.',
    });
  }

  try {
    await initDatabaseSchema();

    // Guardar primero la venta.
    const saved = await insertSale(sale);

    if (!saved) {
      throw new Error('No se pudo guardar la venta en Neon.');
    }

    // Descontar el inventario real de Neon.
    const stockResult = await deductStockForSaleItems(sale.items);

    if (!stockResult.ok) {
      throw new Error(
        stockResult.error ||
        'La venta se guardó, pero no se pudo actualizar el inventario.'
      );
    }

    return res.json({
      saved: true,
      id: sale.id,
      stockUpdated: true,
      updatedProducts: stockResult.updatedProducts,
    });
  } catch (err) {
    console.error('Error guardando venta en Neon:', err);

    return res.status(500).json({
      saved: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
