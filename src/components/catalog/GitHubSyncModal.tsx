import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Check,
  Eye,
  Settings,
  GitBranch,
  Globe,
  UploadCloud,
  FileCode,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Boxes
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  GitHubSyncConfig,
  getSavedGitHubConfig,
  saveGitHubConfig,
  testGitHubRepoAccess,
  pushCatalogToGitHub,
  generateCatalogHtml,
  generateProductsJson,
  groupProductsForCatalog
} from '../../services/githubCatalogService';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({ isOpen, onClose }) => {
  const { products, exchangeRate, addNotification } = useStore();

  const [config, setConfig] = useState<GitHubSyncConfig>(getSavedGitHubConfig);
  const [showToken, setShowToken] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'preview' | 'export' | 'guide'>('sync');

  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    ok: boolean;
    message: string;
    commitUrl?: string;
    catalogUrl?: string;
  } | null>(null);

  // Copy code feedback
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Preview HTML
  const [previewHtml, setPreviewHtml] = useState('');

  // Auto-generate preview when tab is opened
  useEffect(() => {
    if (activeTab === 'preview' || isOpen) {
      const html = generateCatalogHtml(products, exchangeRate, {
        whatsappNumber: '584249307158',
      });
      setPreviewHtml(html);
    }
  }, [activeTab, isOpen, products, exchangeRate]);

  if (!isOpen) return null;

  const grouped = groupProductsForCatalog(products);
  const activeProductsCount = products.filter((p) => p.activo !== false && (Number(p.stock) > 0 || p.stock === undefined)).length;

  const handleSaveConfig = () => {
    saveGitHubConfig(config);
    addNotification('Configuración de GitHub Guardada', 'Tus credenciales se guardaron de forma segura en este navegador.', 'success');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGitHubRepoAccess(config);
      setTestResult(res);
      if (res.ok) {
        handleSaveConfig();
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || 'Error probando la conexión' });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePerformSync = async () => {
    if (!config.token.trim()) {
      setActiveTab('guide');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Compilando catálogo HTML y datos JSON...');
    setSyncResult(null);

    try {
      saveGitHubConfig(config);

      const htmlContent = generateCatalogHtml(products, exchangeRate, {
        whatsappNumber: '584249307158',
      });
      const jsonContent = generateProductsJson(products, exchangeRate);

      setSyncStatus(`Conectando con api.github.com/repos/${config.owner}/${config.repo}...`);

      // Intentar sincronizar a través del backend (/api/catalog/sync-github) primero
      let resData: any = null;
      try {
        const backendRes = await fetch('/api/catalog/sync-github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: config.token.trim(),
            owner: config.owner.trim(),
            repo: config.repo.trim(),
            branch: config.branch.trim(),
            htmlContent,
            jsonContent,
            commitMessage: `Actualizar catálogo desde MAKD SHOP (${products.length} productos, tasa ${exchangeRate} Bs) - ${new Date().toLocaleString('es-VE')}`,
          }),
        });
        if (backendRes.ok) {
          resData = await backendRes.json();
        }
      } catch (backendErr) {
        console.warn('Backend sync failed, falling back to client-side push:', backendErr);
      }

      // Si el backend no respondió o no tuvo éxito, ejecutar push directo desde el cliente
      if (!resData || !resData.success) {
        setSyncStatus('Sincronizando directamente con GitHub...');
        const clientRes = await pushCatalogToGitHub(
          config,
          products,
          exchangeRate,
          (msg) => setSyncStatus(msg)
        );
        if (!clientRes.ok) {
          throw new Error(clientRes.message || clientRes.error || 'Fallo al sincronizar con GitHub');
        }
        resData = {
          success: true,
          message: clientRes.message,
          commitUrl: clientRes.commitUrl,
          catalogUrl: clientRes.catalogUrl,
        };
      }

      setSyncResult({
        ok: true,
        message: '¡Catálogo sincronizado exitosamente en GitHub!',
        commitUrl: resData.commitUrl,
        catalogUrl: resData.catalogUrl || `https://${config.owner}.github.io/${config.repo}/catalogo.html`,
      });

      addNotification(
        '¡Catálogo Web Sincronizado!',
        `Se publicaron ${grouped.length} modelos en https://${config.owner}.github.io/${config.repo}/catalogo.html`,
        'success'
      );
    } catch (err: any) {
      console.error('Error al sincronizar con GitHub:', err);
      setSyncResult({
        ok: false,
        message: err?.message || 'Ocurrió un error al actualizar el catálogo en GitHub.',
      });
      addNotification('Error en sincronización GitHub', err?.message || 'Revisa tu token o permisos', 'critical');
    } finally {
      setIsSyncing(false);
      setSyncStatus(null);
    }
  };

  const handleDownloadHtml = () => {
    const html = generateCatalogHtml(products, exchangeRate, { whatsappNumber: '584249307158' });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalogo.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification('Descarga Iniciada', 'catalogo.html descargado listo para subir a GitHub.', 'info');
  };

  const handleDownloadJson = () => {
    const json = generateProductsJson(products, exchangeRate);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification('Descarga Iniciada', 'products.json descargado.', 'info');
  };

  const handleCopyHtml = () => {
    const html = generateCatalogHtml(products, exchangeRate, { whatsappNumber: '584249307158' });
    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
    addNotification('Copiado al portapapeles', 'El código HTML de catalogo.html está en tu portapapeles.', 'success');
  };

  const handleCopyJson = () => {
    const json = generateProductsJson(products, exchangeRate);
    navigator.clipboard.writeText(json);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Sincronización con Catálogo Web en GitHub</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  makdshoes-gif/makd
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Publica en tiempo real tus {products.length} productos y precios al catálogo online en GitHub Pages.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live URL Banner */}
        <div className="px-6 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-indigo-900">
            <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>URL Pública del Catálogo:</span>
            <a
              href={`https://${config.owner}.github.io/${config.repo}/catalogo.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-bold text-indigo-700 hover:underline flex items-center gap-1"
            >
              <span>https://{config.owner}.github.io/{config.repo}/catalogo.html</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-indigo-700">
            <span><strong>{grouped.length}</strong> modelos activos</span>
            <span>•</span>
            <span>Tasa BCV: <strong>${exchangeRate.toFixed(2)} Bs</strong></span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-2 bg-slate-50 shrink-0">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'sync'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar (1 Clic)</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'preview'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vista Previa del Catálogo</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargas / Sin Token</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿Cómo obtener el Token?</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: Sincronización Automática */}
          {activeTab === 'sync' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              
              {/* Quick Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Inventario Listo para Desplegar</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeProductsCount} pares activos agrupados en {grouped.length} modelos con fotos, precios en $ y Bs, y tallas.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 border border-slate-200 rounded-md">
                    main / catalogo.html
                  </span>
                </div>
              </div>

              {/* GitHub Credentials Box */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-900">Configuración de GitHub</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Guardado seguro local en este navegador
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Usuario / Dueño
                    </label>
                    <input
                      type="text"
                      value={config.owner}
                      onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:bg-white focus:outline-indigo-600"
                      placeholder="makdshoes-gif"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Repositorio
                    </label>
                    <input
                      type="text"
                      value={config.repo}
                      onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:bg-white focus:outline-indigo-600"
                      placeholder="makd"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Rama (Branch)
                    </label>
                    <div className="flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={config.branch}
                        onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:bg-white focus:outline-indigo-600"
                        placeholder="main"
                      />
                    </div>
                  </div>
                </div>

                {/* Token Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <span>GitHub Personal Access Token (PAT)</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('guide')}
                      className="text-[11px] font-medium text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      ¿Dónde saco mi token?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={config.token}
                      onChange={(e) => setConfig({ ...config, token: e.target.value })}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-3 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:bg-white focus:outline-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-200/60 rounded"
                    >
                      {showToken ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Solo requiere permiso <code>repo</code> para hacer commit de <code>catalogo.html</code> y <code>products.json</code>.
                  </p>
                </div>

                {/* Test Connection Button */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !config.token.trim()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isTesting ? (
                      <span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Probar Conexión con GitHub</span>
                  </button>

                  {testResult && (
                    <div
                      className={`text-xs flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-md ${
                        testResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: SYNC NOW */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handlePerformSync}
                  disabled={isSyncing || !config.token.trim()}
                  className="w-full py-3.5 px-6 bg-linear-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSyncing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{syncStatus || 'Sincronizando con GitHub...'}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5" />
                      <span>Sincronizar Catálogo con GitHub Ahora</span>
                    </>
                  )}
                </button>

                {!config.token.trim() && (
                  <p className="text-center text-xs text-amber-600 font-medium">
                    ⚠️ Ingresa tu Token de GitHub arriba o usa la pestaña <strong>"Descargas / Sin Token"</strong> para subirlo manualmente.
                  </p>
                )}
              </div>

              {/* Sync Result Banner */}
              {syncResult && (
                <div
                  className={`p-4 rounded-xl border ${
                    syncResult.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  } space-y-3`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {syncResult.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
                    <span>{syncResult.message}</span>
                  </div>

                  {syncResult.ok && (
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      {syncResult.catalogUrl && (
                        <a
                          href={syncResult.catalogUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Abrir Catálogo en GitHub Pages</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {syncResult.commitUrl && (
                        <a
                          href={syncResult.commitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 font-semibold rounded-lg hover:bg-emerald-100 transition flex items-center gap-1.5"
                        >
                          <span>Ver Commit en GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Vista Previa en Vivo */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Esta es la vista previa de <code>catalogo.html</code> generado con tu inventario real:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadHtml}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar HTML</span>
                  </button>
                  <button
                    onClick={handleCopyHtml}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHtml ? 'Copiado' : 'Copiar Código'}</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-white h-[480px]">
                <iframe
                  title="Vista previa de catalogo.html"
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Descargas y Exportación Manual */}
          {activeTab === 'export' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  ¿Prefieres no crear un Token de GitHub?
                </p>
                <p className="text-slate-600">
                  Puedes descargar el archivo <strong>catalogo.html</strong> actualizado con todos tus precios, fotos y tallas, y subirlo arrastrándolo directamente en tu navegador en GitHub.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Download catalogo.html */}
                <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">catalogo.html</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Página web completa del catálogo con diseño oficial, Cashea y WhatsApp.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadHtml}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar catalogo.html</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyHtml}
                      className="w-full py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedHtml ? '¡Código Copiado!' : 'Copiar Código HTML'}</span>
                    </button>
                  </div>
                </div>

                {/* Download products.json */}
                <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">products.json</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Datos limpios en formato JSON para que cualquier app externa o web los consuma.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar products.json</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="w-full py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedJson ? '¡JSON Copiado!' : 'Copiar Código JSON'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct link to upload on GitHub */}
              <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">
                  Pasos para subir el archivo a GitHub sin token:
                </span>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Descarga <strong>catalogo.html</strong> con el botón azul arriba.</li>
                  <li>
                    Abre el enlace directo para subir archivos en tu repositorio:{' '}
                    <a
                      href={`https://github.com/${config.owner}/${config.repo}/upload/${config.branch}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Subir archivo a {config.owner}/{config.repo}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Arrastra el archivo <code>catalogo.html</code> y haz clic en <strong>"Commit changes"</strong>.</li>
                  <li>¡Listo! En 1 minuto GitHub Pages publicará tu catálogo automáticamente.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: Guía para obtener el Token */}
          {activeTab === 'guide' && (
            <div className="space-y-5 max-w-2xl mx-auto text-xs text-slate-700 leading-relaxed">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <h4 className="font-bold text-sm text-indigo-900 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>¿Por qué necesitas un Token de GitHub?</span>
                </h4>
                <p className="text-slate-600">
                  El token es como una contraseña segura que le permite a esta aplicación actualizar el archivo <code>catalogo.html</code> directamente en tu repositorio <strong>https://github.com/{config.owner}/{config.repo}</strong> sin tener que descargarlo y subirlo a mano cada vez.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Pasos rápidos (toma menos de 1 minuto):
                </h5>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Abre la página para crear tokens en GitHub:</span>
                  </div>
                  <div className="pl-7">
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=MAKD+SHOP+Catalogo+Sync"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition"
                    >
                      <span>Abrir GitHub Tokens (Con permisos preconfigurados)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Verifica que esté marcada la casilla <strong>"repo"</strong>:</span>
                  </div>
                  <p className="pl-7 text-slate-500 text-[11px]">
                    El enlace anterior ya lo deja marcado automáticamente con el nombre "MAKD SHOP Catalogo Sync".
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Haz clic en "Generate token" al final de la página</span>
                  </div>
                  <p className="pl-7 text-slate-500 text-[11px]">
                    Copia el código que empieza por <code>ghp_...</code>.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>Pégalo en la pestaña "Sincronizar (1 Clic)" de este modal:</span>
                  </div>
                  <div className="pl-7">
                    <button
                      onClick={() => setActiveTab('sync')}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Regresar a Sincronizar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Repositorio destino: <strong>github.com/{config.owner}/{config.repo}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
