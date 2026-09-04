import React, { useState, useMemo } from 'react';
import {
  Store,
  DollarSign,
  Bell,
  RefreshCw,
  TrendingUp,
  Boxes,
  ShoppingCart,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
  Check,
  UserCheck,
  Menu,
  Cloud,
  Database,
  Landmark,
  TrendingDown,
  Receipt,
  User
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CloudIntegrationModal } from './common/CloudIntegrationModal';
import { MakdLogo } from './common/MakdLogo';
import { UserWindowModal } from './common/UserWindowModal';

export type NavigationTab = 'pos' | 'inventory' | 'reports' | 'cash' | 'expenses' | 'conciliacion';

interface NavbarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<{
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}> = ({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) => {
  const { criticalStockProducts, userRole } = useStore();

  const navItems = [
    { id: 'pos' as const, label: 'Punto de Venta', icon: ShoppingCart, count: null },
    { id: 'inventory' as const, label: 'Gestión Inventario', icon: Boxes, count: criticalStockProducts.length },
    ...(userRole === 'admin'
      ? [{ id: 'reports' as const, label: 'Reportes de Ventas', icon: TrendingUp, count: null }]
      : []),
    { id: 'cash' as const, label: 'Caja & Arqueo', icon: Wallet, count: null },
    { id: 'expenses' as const, label: 'Gastos & Fin de Mes', icon: TrendingDown, count: null },
    { id: 'conciliacion' as const, label: 'Conciliación Bancaria', icon: Landmark, count: null },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => {
              setActiveTab('pos');
              setMobileOpen(false);
            }}
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-md shadow-black/30 overflow-hidden shrink-0 border border-slate-700">
              <MakdLogo size={36} showSlogan={false} />
            </div>
            <div>
              <span className="text-white font-black tracking-tight uppercase text-sm block leading-none">
                MAKD SHOP
              </span>
              <span className="text-[10px] text-slate-400 font-medium italic block mt-1">
                marcamos tu estilo
              </span>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-2 pb-2 text-[10px] uppercase font-bold tracking-wider text-slate-500">
            Navegación Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full p-2.5 rounded-md flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== null && item.count > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Real-time Status Card (High Density Mockup) */}
        <div className="p-4 mt-auto border-t border-slate-800/80">
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700/60">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
              Estado en Tiempo Real
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[11px] text-slate-200 font-medium">Sistema Online</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">12ms</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export const Header: React.FC<{
  activeTab: NavigationTab;
  onToggleMobile: () => void;
}> = ({ activeTab, onToggleMobile }) => {
  const {
    exchangeRate,
    setExchangeRate,
    criticalStockProducts,
    notifications,
    markNotificationsAsRead,
    clearNotification,
    userRole,
    setUserRole,
    resetToDemoData,
    sales,
    bcvInfo,
    isBcvSyncing,
    isAutoSyncEnabled,
    syncBcvRate,
    setIsAutoSyncEnabled,
  } = useStore();

  const [showRateModal, setShowRateModal] = useState(false);
  const [newRate, setNewRate] = useState(exchangeRate.toString());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Live Revenue Calculation (Today's Sales)
  const todayStr = new Date().toISOString().split('T')[0];
  const liveRevenue = useMemo(() => {
    return sales
      .filter((s) => s.fecha.startsWith(todayStr))
      .reduce((sum, s) => sum + s.total_usd, 0);
  }, [sales, todayStr]);

  const handleUpdateRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newRate);
    if (!isNaN(parsed) && parsed > 0) {
      setExchangeRate(parsed, true);
      setShowRateModal(false);
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'pos':
        return 'Punto de Venta (POS)';
      case 'inventory':
        return 'Gestión de Inventario y Almacén';
      case 'reports':
        return 'Reportes Automáticos de Ventas';
      case 'cash':
        return 'Arqueo y Cierre Diario de Caja';
      case 'expenses':
        return 'Control de Gastos & Balance de Fin de Mes';
      case 'conciliacion':
        return 'Conciliación Bancaria & Neon Database';
      default:
        return 'Administración de Zapatería';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
      {/* Left Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          title="Menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            {getTabTitle()}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • Puerto Ordaz (Alta Vista II, Local 163)
          </p>
        </div>
      </div>

      {/* Right Actions: Live Revenue, BCV Rate, Alerts, User Avatar */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        
        {/* Live Revenue Metric (from Design HTML) */}
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-slate-400 uppercase font-bold">Ventas de Hoy</p>
          <p className="text-sm font-bold text-indigo-600 font-mono">
            ${liveRevenue.toFixed(2)}
          </p>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

        {/* BCV Tasa Badge with Live Status */}
        <button
          id="bcv-rate-badge"
          onClick={() => {
            setNewRate(exchangeRate.toString());
            setShowRateModal(true);
          }}
          title="Sincronización en tiempo real con tasa oficial BCV"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isBcvSyncing
                  ? 'bg-amber-400'
                  : bcvInfo.status === 'synced'
                  ? 'bg-emerald-400'
                  : 'bg-slate-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isBcvSyncing
                  ? 'bg-amber-500'
                  : bcvInfo.status === 'synced'
                  ? 'bg-emerald-500'
                  : 'bg-slate-500'
              }`}
            ></span>
          </span>
          <span className="font-bold text-slate-600 text-[11px]">BCV:</span>
          <span className="font-mono font-bold text-slate-900">{exchangeRate.toFixed(2)}</span>
          <span className="text-slate-400 text-[10px] font-semibold">Bs</span>
          <RefreshCw
            className={`w-3 h-3 text-slate-400 ${
              isBcvSyncing ? 'animate-spin text-indigo-600' : ''
            }`}
          />
        </button>

        {/* BDV & Cloud Integrations Button */}
        <button
          id="cloud-integrations-btn"
          onClick={() => setShowCloudModal(true)}
          title="Conexiones: Banco de Venezuela (BDV), Neon Database y Vercel"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer shadow-2xs"
        >
          <Cloud className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden md:inline font-bold">Cloud & BDV</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="notif-bell-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) markNotificationsAsRead();
            }}
            className="relative p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Alertas del sistema"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Alertas en Tiempo Real
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No hay alertas pendientes en este momento.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs flex items-start gap-2.5 transition-colors ${
                        notif.type === 'critical'
                          ? 'bg-rose-50/50'
                          : notif.type === 'warning'
                          ? 'bg-amber-50/50'
                          : 'bg-white'
                      }`}
                    >
                      {notif.type === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      ) : notif.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{notif.title}</span>
                          <span className="text-[10px] text-slate-400">{notif.time}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{notif.message}</p>
                      </div>
                      <button
                        onClick={() => clearNotification(notif.id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Switcher Pill */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            id="role-admin-btn"
            onClick={() => setUserRole('admin')}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              userRole === 'admin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3 h-3 text-indigo-600" />
            <span className="hidden sm:inline">Admin</span>
          </button>
          <button
            id="role-cajera-btn"
            onClick={() => setUserRole('cajera')}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              userRole === 'cajera'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Cajera</span>
          </button>
        </div>

        {/* Ventana de Usuario con Logo MAKD */}
        <button
          id="user-window-btn"
          onClick={() => setShowUserModal(true)}
          className="flex items-center space-x-2 px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer shadow-2xs group"
          title="Abrir Ventana de Usuario (MAKD SHOP)"
        >
          <div className="w-6 h-6 bg-white rounded border border-slate-300 flex items-center justify-center p-0.5 overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
            <MakdLogo size={20} showSlogan={false} />
          </div>
          <div className="text-left hidden md:block">
            <span className="text-[11px] font-bold text-slate-800 leading-none block">
              {userRole === 'admin' ? 'Alejandra R.' : 'Cajera Turno'}
            </span>
            <span className="text-[9px] text-indigo-600 font-semibold uppercase leading-none block mt-0.5">
              {userRole === 'admin' ? 'Gerente General' : 'Ventas POS'}
            </span>
          </div>
        </button>

        {/* Reset Demo Data Button */}
        <button
          id="reset-demo-btn"
          onClick={() => setShowResetConfirm(true)}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
          title="Restablecer datos de muestra"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

      </div>

      {/* BCV Exchange Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Sincronización Oficial BCV
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Banco Central de Venezuela en Tiempo Real
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Rate Card */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Tasa Oficial Vigente</span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {bcvInfo.status === 'synced' ? 'API En Línea' : bcvInfo.status === 'manual' ? 'Modo Manual' : 'Verificando'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-white tracking-tight">
                  {exchangeRate.toFixed(2)}
                </span>
                <span className="text-slate-300 font-semibold text-sm">Bs por 1.00 USD</span>
              </div>

              <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800 pt-2 font-mono">
                <div className="flex justify-between">
                  <span>Fuente:</span>
                  <span className="text-slate-200">{bcvInfo.source}</span>
                </div>
                <div className="flex justify-between">
                  <span>Última Sincronización:</span>
                  <span className="text-slate-200">{bcvInfo.lastSyncedAt}</span>
                </div>
                {bcvInfo.officialDate && (
                  <div className="flex justify-between">
                    <span>Emisión BCV:</span>
                    <span className="text-indigo-300 truncate max-w-[180px]">
                      {bcvInfo.officialDate.replace('T', ' ').slice(0, 19)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Live Sync Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="sync-bcv-now-btn"
                disabled={isBcvSyncing}
                onClick={async () => {
                  await syncBcvRate(false);
                }}
                className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBcvSyncing ? 'animate-spin' : ''}`} />
                <span>{isBcvSyncing ? 'Consultando API BCV...' : 'Sincronizar API en Tiempo Real'}</span>
              </button>

              <button
                type="button"
                onClick={() => setManualMode(!manualMode)}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  manualMode
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Ajustar tasa manualmente si se requiere"
              >
                {manualMode ? 'Ocultar Manual' : 'Ajuste Manual'}
              </button>
            </div>

            {/* Auto-sync Toggle */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800 block">
                  Auto-sincronización en vivo
                </span>
                <span className="text-[11px] text-slate-500">
                  Actualiza automáticamente con la última tasa oficial
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  isAutoSyncEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-xs"></span>
              </button>
            </div>

            {/* Optional Manual Input Form */}
            {manualMode && (
              <form onSubmit={handleUpdateRate} className="pt-2 border-t border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fijar Tasa Manual de Emergencia (Bs / USD)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:bg-white"
                      placeholder="Ej. 68.50"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">
                      Bs
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Tasa Manual</span>
                  </button>
                </div>
              </form>
            )}

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRateModal(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">¿Restablecer datos de muestra?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Se restaurará el inventario inicial con tallas, modelos de calzado (Nike, Jordan, Adidas, etc.), alertas y ventas de demostración.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetToDemoData();
                  setShowResetConfirm(false);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Restablecer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Cloud & BDV Integrations Modal */}
      <CloudIntegrationModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
      />

      {/* Ventana de Usuario Modal con Logo MAKD */}
      <UserWindowModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
      />
    </header>
  );
};
