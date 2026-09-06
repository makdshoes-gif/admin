// Dentro de tu página o vista de productos existente:
import ShoeScanner from './components/ShoeScanner';

export default function GestionInventario() {
  const [mostrarEscanner, setMostrarEscanner] = useState(false);

  return (
    <div>
      {/* Tu panel y tablas normales */}
      <h2>Panel de Inventario Makd Shop</h2>
      
      {/* Botón para abrir el escáner como una ventana emergente o sección */}
      <button 
        onClick={() => setMostrarEscanner(!mostrarEscanner)}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg"
      >
        {mostrarEscanner ? 'Cerrar Escáner IA' : '📸 Escanear Zapato con IA'}
      </button>

      {mostrarEscanner && (
        <div className="my-4">
          <ShoeScanner onProductDetected={(data) => {
            console.log("Datos listos para guardar:", data);
            // Aquí rellenas los inputs de tu formulario con data.tituloComercial, etc.
          }} />
        </div>
      )}
    </div>
  );
}
