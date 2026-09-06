import React from 'react';
import ShoeScanner from './components/ShoeScanner';

export default function AdminInventoryPage() {
  
  // Esta función recibe los datos cuando la IA reconoce el zapato
  const handleProductDetected = (data) => {
    console.log("Datos del zapato reconocidos por la IA:", data);
    
    // Aquí puedes rellenar automáticamente los campos de tu formulario:
    // setNombreProducto(data.tituloComercial);
    // setModelo(data.marcaModelo);
    // setDescripcion(data.descripcionTienda);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Inventario Makd Shop</h1>
      
      {/* Aquí colocas el escáner de la cámara */}
      <div className="mb-8">
        <ShoeScanner onProductDetected={handleProductDetected} />
      </div>
    </div>
  );
}
