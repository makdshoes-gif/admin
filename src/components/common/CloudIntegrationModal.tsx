import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Database, 
  Landmark, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Copy, 
  Check, 
  ExternalLink,
  Shield,
  ArrowRight
} from 'lucide-react';
import { checkNeonDbStatus, syncDataToNeon, getBdvConfig } from '../../services/api';
import { NeonDbStatus } from '../../types';
import { useStore } from '../../context/StoreContext';

interface CloudIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'bdv' | 'neon' | 'vercel';
}

export const CloudIntegrationModal: React.FC<CloudIntegrationModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'bdv',
}) => {
  const { products, sales } = useStore();
  const [activeTab, setActiveTab] = useState<'bdv' | 'neon' | 'vercel'>(defaultTab);

  // Neon DB state
  const [neonStatus, setNeonStatus] = useState<NeonDbStatus | null>(null);
  const [isCheckingNeon, setIsCheckingNeon] = useState(false);
  const [isSyncingNeon, setIsSyncingNeon] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // BDV state
  const [bdvConfig, setBdvConfig] = useState<any>(null);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatuses();
    }
  }, [isOpen]);

  const loadStatuses = async () => {
    setIsCheckingNeon(true);
    try {
      const [nStatus, bConfig] = await Promise.all([
        checkNeonDbStatus(),
        getBdvConfig(),
      ]);
      setNeonStatus(nStatus);
      setBdvConfig(bConfig);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingNeon(false);
    }
  };

  const handleSyncToNeon = async () => {
    setIsSyncingNeon(true);
    setSyncMessage(null);
    try {
      const res = await syncDataToNeon(products, sales);
      if (res.success) {
        setSyncMessage(`¡Sincronizado! ${res.productsCount || products.length} calzados y ventas almacenados en Neon.`);
        loadStatuses();
      } else {
        setSyncMessage(`Aviso: ${res.message || res.error || 'Verifica tu DATABASE_URL'}`);
      }
    } catch (e) {
      setSyncMessage('Error al sincronizar con Neon');
    } finally {
      setIsSyncingNeon(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Centro de Conexiones & Cloud
              </h2>
              <p className="text-xs text-slate-500">
                Banco de Venezuela (BDV) • Neon PostgreSQL • Vercel Hosting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-4 sm:px-6 bg-white gap-2 pt-2">
          <button
            onClick={() => setActiveTab('bdv')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'bdv'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Banco de Venezuela (BDV)</span>
          </button>

          <button
            onClick={() => setActiveTab('neon')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'neon'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Neon Database</span>
            {neonStatus?.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('vercel')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'vercel'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Despliegue Vercel</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">

          {/* TAB 1: BDV (Banco de Venezuela) */}
          {activeTab === 'bdv' && (
            <div className="space-y-4 text-xs">
              
              {/* Status Box */}
              <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                    <span className="font-bold text-slate-900 text-sm">
                      API de Conciliación y Pago Móvil BDV
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-red-700 border border-red-200 shadow-2xs">
                    {bdvConfig?.mode === 'PRODUCCION' ? 'Producción Oficial' : 'Modo Asistido / Sandbox Activo'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-red-100">
                    <span className="text-slate-400 block text-[10px]">Banco Receptor</span>
                    <span className="font-bold text-slate-800">BDV (0102)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-red-100">
                    <span className="text-slate-400 block text-[10px]">Cuenta Receptora</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {bdvConfig?.cuentaReceptora || '0102-0501-8200-0012-3456'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-red-100">
                    <span className="text-slate-400 block text-[10px]">RIF Comercio</span>
                    <span className="font-bold text-slate-800">
                      {bdvConfig?.comercioRif || 'J-50123984-1'}
                    </span>
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-red-600" />
                  <span>¿Cómo funciona la verificación en caja?</span>
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Cuando un cliente paga con Pago Móvil en el punto de venta, la cajera solo hace clic en <strong>"Verificar en BDV"</strong>. El sistema valida la referencia bancaria, el monto exacto en Bolívares y genera un código de aprobación bancaria inviolable que se estampa en la factura digital.
                </p>
              </div>

              {/* Environment Variables to connect */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span>Variables para Producción BDV (.env o Vercel)</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `BDV_CLIENT_ID=\nBDV_CLIENT_SECRET=\nBDV_APP_ID=\nBDV_RIF_COMERCIO=J-50123984-1\nBDV_TELEFONO_COMERCIO=0414-9988776\nBDV_CUENTA_RECEPTORA=01020000000000000000\nBDV_API_URL=https://api.bancodevenezuela.com`,
                        'bdv-env'
                      )
                    }
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 font-sans cursor-pointer"
                  >
                    {copiedKey === 'bdv-env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'bdv-env' ? '¡Copiado!' : 'Copiar Variables'}</span>
                  </button>
                </div>
                <pre className="text-[11px] leading-relaxed text-red-300">
BDV_CLIENT_ID=tu_client_id_bdv
BDV_CLIENT_SECRET=tu_secret_bdv
BDV_APP_ID=tu_app_id
BDV_RIF_COMERCIO=J-50123984-1
BDV_TELEFONO_COMERCIO=0414-9988776
BDV_CUENTA_RECEPTORA=0102-0501-8200-0012-3456
                </pre>
              </div>

            </div>
          )}

          {/* TAB 2: Neon Database */}
          {activeTab === 'neon' && (
            <div className="space-y-4 text-xs">
              
              {/* Status Box */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  neonStatus?.connected
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        neonStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    ></span>
                    <span className="font-bold text-slate-900 text-sm">
                      {neonStatus?.connected
                        ? `Neon PostgreSQL En Línea (${neonStatus.databaseName || 'neondb'})`
                        : 'Neon PostgreSQL: Esperando Configuración'}
                    </span>
                  </div>
                  <button
                    onClick={loadStatuses}
                    disabled={isCheckingNeon}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    title="Actualizar estado"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingNeon ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <p className="text-slate-600 text-xs">
                  {neonStatus?.connected
                    ? `Base de datos conectada. Registros actuales: ${neonStatus.productsCount || 0} calzados en inventario y ${neonStatus.salesCount || 0} transacciones de ventas.`
                    : 'Para conectar tu base de datos Neon (neon.tech), agrega la variable DATABASE_URL en tu archivo .env o en el panel de Vercel.'}
                </p>

                {neonStatus?.connected && (
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={handleSyncToNeon}
                      disabled={isSyncingNeon}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNeon ? 'animate-spin' : ''}`} />
                      <span>{isSyncingNeon ? 'Sincronizando...' : 'Sincronizar Inventario Local a Neon'}</span>
                    </button>
                    {syncMessage && (
                      <span className="text-emerald-700 font-medium text-[11px]">
                        {syncMessage}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Instructions on how to connect */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">
                  ¿Cómo obtener tu URL de conexión en Neon?
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600 text-xs leading-relaxed">
                  <li>Inicia sesión en <a href="https://neon.tech" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold underline">neon.tech</a> y crea un proyecto.</li>
                  <li>Copia tu <strong>Connection String</strong> (Postgres Connection URL).</li>
                  <li>Agrega la variable <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">DATABASE_URL</code> con tu URL en tu archivo <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> o en Vercel.</li>
                </ol>
              </div>

              {/* Code snippet */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span>Formato DATABASE_URL</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'DATABASE_URL=postgresql://neondb_owner:npg_password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
                        'neon-url'
                      )
                    }
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-sans cursor-pointer"
                  >
                    {copiedKey === 'neon-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'neon-url' ? '¡Copiado!' : 'Copiar Ejemplo'}</span>
                  </button>
                </div>
                <pre className="text-[11px] text-emerald-300 overflow-x-auto">
DATABASE_URL=postgresql://usuario:contraseña@ep-cool-sample.us-east-2.aws.neon.tech/neondb?sslmode=require
                </pre>
              </div>

            </div>
          )}

          {/* TAB 3: Vercel Deployment */}
          {activeTab === 'vercel' && (
            <div className="space-y-4 text-xs">
              
              {/* Ready for Vercel Badge */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Configuración de Vercel Lista (vercel.json generado)
                  </h4>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    El proyecto ya contiene el archivo <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px] border border-indigo-200">vercel.json</code> y el paquete de build optimizado para Vite + Express API routes.
                  </p>
                </div>
              </div>

              {/* 4 Steps to Deploy */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">
                  Pasos para desplegar en Vercel en 3 minutos:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                      <span>Subir a GitHub</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Sube este proyecto a tu cuenta de GitHub, GitLab o Bitbucket.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                      <span>Importar en Vercel</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      En Vercel.com selecciona <strong>"Add New Project"</strong> y selecciona tu repositorio.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                      <span>Variables de Entorno</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Agrega en <em>Environment Variables</em> tu <code className="font-mono text-[10px]">DATABASE_URL</code> de Neon y las credenciales BDV.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span>
                      <span>¡Despliegue Inmediato!</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Haz clic en <strong>Deploy</strong>. Vercel te dará tu enlace HTTPS gratis y certificado SSL.
                    </p>
                  </div>
                </div>
              </div>

              {/* Complete .env pack for Vercel */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span>Todas las variables para Vercel</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `DATABASE_URL=\nBDV_CLIENT_ID=\nBDV_CLIENT_SECRET=\nBDV_APP_ID=\nBDV_RIF_COMERCIO=J-50123984-1\nBDV_TELEFONO_COMERCIO=0414-9988776\nBDV_CUENTA_RECEPTORA=01020000000000000000\nBDV_API_URL=https://api.bancodevenezuela.com`,
                        'vercel-all-env'
                      )
                    }
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-sans cursor-pointer"
                  >
                    {copiedKey === 'vercel-all-env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'vercel-all-env' ? '¡Copiadas!' : 'Copiar Todas'}</span>
                  </button>
                </div>
                <pre className="text-[11px] text-indigo-300 overflow-x-auto leading-relaxed">
DATABASE_URL=postgresql://usuario:pass@ep-cool.neon.tech/neondb?sslmode=require
BDV_CLIENT_ID=tu_client_id
BDV_CLIENT_SECRET=tu_secret
BDV_RIF_COMERCIO=J-50123984-1
BDV_TELEFONO_COMERCIO=0414-9988776
                </pre>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            MAKD SHOP Cloud Engine v2.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
