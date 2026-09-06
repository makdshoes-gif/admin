import React, { useRef, useState } from 'react';

import { Camera, Sparkles, CheckCircle2 } from 'lucide-react';



export default function ShoeScanner({ onProductDetected }) {

  const videoRef = useRef(null);

  const canvasRef = useRef(null);

  const [streaming, setStreaming] = useState(false);

  const [loading, setLoading] = useState(false);

  const [productData, setProductData] = useState(null);



  // Iniciar la cámara web / móvil

  const startCamera = async () => {

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

      if (videoRef.current) {

        videoRef.current.srcObject = stream;

        videoRef.current.play();

        setStreaming(true);

      }

    } catch (err) {

      console.error("Error al acceder a la cámara:", err);

      alert("No se pudo acceder a la cámara.");

    }

  };



  // Capturar foto y enviarla a la API

  const captureAndAnalyze = async () => {

    if (!videoRef.current) return;

    setLoading(true);



    const canvas = canvasRef.current;

    canvas.width = videoRef.current.videoWidth;

    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);



    // Convertir imagen a Base64

    const imageBase64 = canvas.toDataURL('image/jpeg');



    try {

      const res = await fetch('/api/analyze-shoe', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ imageBase64 }),

      });



      const data = await res.json();

      setProductData(data);

      if (onProductDetected) onProductDetected(data);

    } catch (err) {

      alert('Error al analizar el calzado.');

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="p-6 bg-white rounded-2xl shadow-xl max-w-md mx-auto">

      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">

        <Sparkles className="text-purple-600" /> Escáner IA de Calzado

      </h3>



      {!streaming ? (

        <button

          onClick={startCamera}

          className="w-full bg-black text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition"

        >

          <Camera size={20} /> Abrir Cámara para Escanear

        </button>

      ) : (

        <div className="space-y-4">

          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">

            <video ref={videoRef} className="w-full h-full object-cover" playsInline />

            <canvas ref={canvasRef} className="hidden" />

          </div>



          <button

            onClick={captureAndAnalyze}

            disabled={loading}

            className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-purple-700 transition disabled:opacity-50"

          >

            {loading ? 'Analizando con IA...' : '📸 Capturar y Reconocer Zapato'}

          </button>

        </div>

      )}



      {productData && (

        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">

          <h4 className="font-bold text-gray-900">{productData.tituloComercial}</h4>

          <p className="text-sm text-gray-600"><strong>Modelo:</strong> {productData.marcaModelo}</p>

          <p className="text-sm text-gray-600"><strong>Estilo:</strong> {productData.estiloCategoria}</p>

          <p className="text-sm text-gray-600"><strong>Materiales:</strong> {productData.materiales}</p>

          <div className="pt-2 border-t text-xs text-gray-500 bg-white p-2 rounded border">

            {productData.descripcionTienda}

          </div>

        </div>

      )}

    </div>

  );

}
