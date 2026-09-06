/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Sidebar, Header, NavigationTab } from './components/Navbar';
import { PointOfSale } from './components/pos/PointOfSale';
import { InventoryManager } from './components/inventory/InventoryManager';
import { SalesReports } from './components/reports/SalesReports';
import { CashClosure } from './components/cash/CashClosure';
import { ExpensesManager } from './components/expenses/ExpensesManager';
import { BankReconciliationView } from './components/banking/BankReconciliationView';
import { LayawaysManager } from './components/layaways/LayawaysManager';

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('pos');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userRole, products, criticalStockProducts } = useStore();

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

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {activeTab === 'pos' && <PointOfSale onNavigateToLayaways={() => setActiveTab('layaways')} />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'layaways' && <LayawaysManager />}
          {activeTab === 'reports' && userRole === 'admin' && <SalesReports />}
          {activeTab === 'cash' && <CashClosure />}
          {activeTab === 'expenses' && <ExpensesManager />}
          {activeTab === 'conciliacion' && <BankReconciliationView />}
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
