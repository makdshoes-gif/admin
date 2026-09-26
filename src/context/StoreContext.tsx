// Persist sale and inventory change in Neon
// IMPORTANTE: /api/sales espera directamente la venta,
// no { sale: ..., updatedProducts: ... }.
void (async () => {
  try {
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completedSale),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.saved !== true) {
      console.error('Error guardando venta en servidor:', result);

      addNotification(
        'Error de sincronización',
        result.error || 'La venta no pudo guardarse en el servidor.',
        'critical'
      );

      return;
    }

    console.log('✅ Venta guardada correctamente en Neon:', completedSale.id);

    // Confirmar que el inventario mostrado por el navegador
    // coincide con el inventario real de Neon.
    try {
      await syncFromServer();
    } catch (syncError) {
      console.error('Error sincronizando inventario después de la venta:', syncError);
    }
  } catch (error) {
    console.error('Error de conexión guardando venta:', error);

    addNotification(
      'Sin conexión con el servidor',
      'La venta quedó pendiente de sincronización. Verifica la conexión antes de continuar.',
      'critical'
    );
  }
})();
