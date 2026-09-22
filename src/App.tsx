/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, lazy, Suspense } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Sidebar, Header, NavigationTab } from './components/Navbar';
import { LoginPage } from './components/auth/LoginPage';

// Lazy load view components for maximum initial load performance and lightweight bundle
const PointOfSale = lazy(() => import('./components/pos/PointOfSale').then((m) => ({ default: m.PointOfSale })));
const InventoryManager = lazy(() => import('./components/inventory/InventoryManager').then((m) => ({ default: m.InventoryManager })));
const SalesReports = lazy(() => import('./components/reports/SalesReports').then((m) => ({ default: m.SalesReports })));
const CashClosure = lazy(() => import('./components/cash/CashClosure').then((m) => ({ default: m.CashClosure })));
const ExpensesManager = lazy(() => import('./components/expenses/ExpensesManager').then((m) => ({ default: m.ExpensesManager })));
const BankReconciliationView = lazy(() => import('./components/banking/BankReconciliationView').then((m) => ({ default: m.BankReconciliationView })));
const LayawaysManager = lazy(() => import('./components/layaways/LayawaysManager').then((m) => ({ default: m.LayawaysManager })));
const AdidasCatalogView = lazy(() => import('./components/catalog/AdidasCatalogView').then((m) => ({ default: m.AdidasCatalogView })));

function ViewFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full py-12">
      <div className="w-9 h-9 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Cargando módulo...</p>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('pos');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userRole, currentSessionUser, products, criticalStockProducts } = useStore();

  if (!currentSessionUser) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      
      {/* High Density Slate-900 Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 min-h-screen">
        
        {/* High Density White Top Header with Live Revenue */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
        />

        {/* Dynamic Page Views with Suspense */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Suspense fallback={<ViewFallback />}>
            {activeTab === 'pos' && <PointOfSale onNavigateToLayaways={() => setActiveTab('layaways')} />}
            {activeTab === 'inventory' && <InventoryManager />}
            {activeTab === 'layaways' && <LayawaysManager />}
            {activeTab === 'catalogo' && <AdidasCatalogView />}
            {activeTab === 'reports' && <SalesReports />}
            {activeTab === 'cash' && <CashClosure />}
            {activeTab === 'expenses' && <ExpensesManager />}
            {activeTab === 'conciliacion' && <BankReconciliationView />}
          </Suspense>
        </main>

        {/* High Density Sub-Footer (matching Design HTML) */}
        <footer className="h-10 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-4 sm:px-6 text-[10px] text-slate-400 shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="font-semibold text-slate-600">MAKD SHOP POS</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Sede: Puerto Ordaz - Alta Vista II (Local 163)</span>
            <span className="hidden md:inline">•</span>
            <span>Latencia: 12ms</span>
            <span className="hidden sm:inline">•</span>
            <span>Stock Crítico: <strong className={criticalStockProducts.length > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>{criticalStockProducts.length}</strong></span>
          </div>

          <div className="flex items-center space-x-3 text-slate-500">
            <span>Catálogo: <strong className="text-slate-700">{products.length}</strong> modelos</span>
            <span>•</span>
            <span className="uppercase font-bold text-indigo-600">Modo {userRole}</span>
          </div>
        </footer>

      </div>

    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
