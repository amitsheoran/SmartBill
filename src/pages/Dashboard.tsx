import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  TrendingUp, 
  FileText, 
  Layers, 
  AlertTriangle, 
  IndianRupee,
  PlusCircle, 
  History, 
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  currencySymbol: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, currencySymbol }) => {
  // Live query for products
  const products = useLiveQuery(() => db.products.toArray()) || [];
  
  // Live query for invoices
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];

  // Calculations
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Filter invoices
  const todayInvoices = invoices.filter(inv => inv.dateTime >= startOfToday && inv.dateTime <= endOfToday);
  const monthlyInvoices = invoices.filter(inv => inv.dateTime >= startOfMonth);

  // Stats
  const todaySales = todayInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const monthlySales = monthlyInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const todayBillsCount = todayInvoices.length;
  
  const lowStockItems = products.filter(p => p.stock <= p.lowStockLimit);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-12">
      {/* Header section with greetings */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-xl glow-primary">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
            <Sparkles className="h-6 w-6 animate-pulse text-yellow-300" />
            SmartBill Dashboard
          </h1>
          <p className="text-blue-100 mt-1 font-medium text-sm md:text-base">
            Electrical Shop Smart Assistant. Grow your business offline.
          </p>
        </div>
        <div className="text-right flex md:flex-col items-center md:items-end justify-between md:justify-center border-t border-blue-500 md:border-0 pt-3 md:pt-0">
          <span className="text-xs text-blue-200">Current Date</span>
          <span className="font-bold text-sm md:text-lg">
            {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-card text-card-foreground p-5 rounded-2xl border shadow-sm interactive-card flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today's Sales</p>
              <h3 className="text-lg md:text-2xl font-black mt-2 leading-none">{formatCurrency(todaySales)}</h3>
            </div>
            <div className="bg-green-100 dark:bg-green-950/50 text-green-600 p-2.5 rounded-xl">
              <IndianRupee className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </div>
          <p className="text-xs text-green-500 font-medium flex items-center gap-1 mt-auto">
            <TrendingUp className="h-3 w-3" />
            Live data updated
          </p>
        </div>

        {/* Today's Invoices */}
        <div className="bg-card text-card-foreground p-5 rounded-2xl border shadow-sm interactive-card flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today's Bills</p>
              <h3 className="text-lg md:text-2xl font-black mt-2 leading-none">{todayBillsCount}</h3>
            </div>
            <div className="bg-blue-100 dark:bg-blue-950/50 text-blue-600 p-2.5 rounded-xl">
              <FileText className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-auto">Bills generated today</p>
        </div>

        {/* Inventory Status */}
        <div className="bg-card text-card-foreground p-5 rounded-2xl border shadow-sm interactive-card flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Products</p>
              <h3 className="text-lg md:text-2xl font-black mt-2 leading-none">{products.length}</h3>
            </div>
            <div className="bg-purple-100 dark:bg-purple-950/50 text-purple-600 p-2.5 rounded-xl">
              <Layers className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-auto">Total items in catalog</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card text-card-foreground p-5 rounded-2xl border shadow-sm interactive-card flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Low Stock</p>
              <h3 className={`text-lg md:text-2xl font-black mt-2 leading-none ${lowStockItems.length > 0 ? 'text-red-500' : ''}`}>
                {lowStockItems.length}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl ${lowStockItems.length > 0 ? 'bg-red-100 dark:bg-red-950/50 text-red-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'}`}>
              <AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-auto">
            {lowStockItems.length > 0 ? 'Requires attention soon' : 'All items well stocked'}
          </p>
        </div>
      </div>

      {/* Monthly Revenue Banner Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border border-slate-700/50 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Monthly Revenue Summary</span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">{formatCurrency(monthlySales)}</h2>
          <p className="text-xs text-slate-400 mt-1">Sum of all bills created since 1st of this month</p>
        </div>
        <button 
          onClick={() => setActiveTab('reports')}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow"
        >
          View Business Reports
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Actions & Low Stock Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Quick Actions Panel */}
        <div className="md:col-span-5 bg-card text-card-foreground rounded-2xl border p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-bold">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setActiveTab('billing')}
              className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/35 border border-blue-100 dark:border-blue-900/20 transition group active:scale-95"
            >
              <PlusCircle className="h-6 w-6 mb-2 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold">Quick Billing</span>
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/35 border border-purple-100 dark:border-purple-900/20 transition group active:scale-95"
            >
              <Layers className="h-6 w-6 mb-2 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold">Add Inventory</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className="flex flex-col items-center justify-center p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/35 border border-amber-100 dark:border-amber-900/20 transition group active:scale-95"
            >
              <History className="h-6 w-6 mb-2 group-hover:scale-110 transition" />
              <span className="text-xs font-semibold">View Bills</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700/50 border border-transparent transition group active:scale-95"
            >
              <SettingsIcon className="h-6 w-6 mb-2 group-hover:rotate-45 transition" />
              <span className="text-xs font-semibold">Settings</span>
            </button>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="md:col-span-7 bg-card text-card-foreground rounded-2xl border p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Low Stock Watchlist</h3>
            <span className="text-xs bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full font-bold">
              {lowStockItems.length} items
            </span>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed">
              <Sparkles className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">All products are well stocked!</p>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto divide-y pr-1 space-y-2">
              {lowStockItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex justify-between items-center py-2.5">
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Category: {item.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-red-500 block">Stock: {item.stock} {item.unit}</span>
                    <span className="text-[10px] text-muted-foreground block">Limit: {item.lowStockLimit} {item.unit}</span>
                  </div>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <button 
                  onClick={() => setActiveTab('inventory')}
                  className="w-full text-center text-xs text-blue-500 font-bold hover:underline py-2 block"
                >
                  View all low stock items ({lowStockItems.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
