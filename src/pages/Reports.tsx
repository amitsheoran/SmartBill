import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  TrendingUp, 
  Award, 
  Calendar,
  FileText
} from 'lucide-react';

interface ReportsProps {
  currencySymbol: string;
}

export const Reports: React.FC<ReportsProps> = ({ currencySymbol }) => {
  // DB query
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];

  // Active Tab
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'products' | 'gst'>('summary');

  // Calculations
  const totalBills = invoices.length;
  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const avgBillValue = totalBills > 0 ? parseFloat((totalRevenue / totalBills).toFixed(2)) : 0;

  // Group sales by Date (Last 7 Days)
  const getLast7DaysSales = () => {
    const dailyMap: Record<string, number> = {};
    
    // Seed last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dailyMap[dateStr] = 0;
    }

    invoices.forEach(inv => {
      const dateStr = new Date(inv.dateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr] += inv.grandTotal;
      }
    });

    return Object.entries(dailyMap).map(([date, amount]) => ({ date, amount }));
  };

  const dailySalesData = getLast7DaysSales();
  const maxDailySales = Math.max(...dailySalesData.map(d => d.amount), 1);

  // Group sales by Payment Mode
  const getPaymentModeSummary = () => {
    const paymentMap: Record<string, { count: number; sum: number }> = {
      'Cash': { count: 0, sum: 0 },
      'UPI': { count: 0, sum: 0 },
      'Card': { count: 0, sum: 0 },
      'Credit': { count: 0, sum: 0 }
    };

    invoices.forEach(inv => {
      if (paymentMap[inv.paymentMode]) {
        paymentMap[inv.paymentMode].count += 1;
        paymentMap[inv.paymentMode].sum += inv.grandTotal;
      }
    });

    return Object.entries(paymentMap).map(([mode, data]) => ({ mode, ...data }));
  };

  const paymentData = getPaymentModeSummary();

  // Top Products calculations
  const getProductPerformance = () => {
    const performanceMap: Record<number, { name: string; quantity: number; revenue: number }> = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!performanceMap[item.productId]) {
          performanceMap[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0
          };
        }
        performanceMap[item.productId].quantity += item.quantity;
        performanceMap[item.productId].revenue += item.subtotal;
      });
    });

    const list = Object.values(performanceMap);
    
    // Best Selling by volume
    const topQty = [...list].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    
    // Top Revenue
    const topRevenue = [...list].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return { topQty, topRevenue };
  };

  const { topQty, topRevenue } = getProductPerformance();

  // GST Tax Report computations
  // Groups invoice items by GST rate (e.g. 0%, 5%, 12%, 18%, 28%)
  const getGSTTaxReport = () => {
    const taxMap: Record<number, { taxableAmount: number; taxCollected: number }> = {
      0: { taxableAmount: 0, taxCollected: 0 },
      5: { taxableAmount: 0, taxCollected: 0 },
      12: { taxableAmount: 0, taxCollected: 0 },
      18: { taxableAmount: 0, taxCollected: 0 },
      28: { taxableAmount: 0, taxCollected: 0 }
    };

    invoices.forEach(inv => {
      // Find total invoice item subtotal before discount
      const invoiceItemsSubtotal = inv.items.reduce((acc, item) => acc + item.subtotal, 0);
      const invoiceDiscount = inv.discount;

      inv.items.forEach(item => {
        // Distribute discount proportionally across items for exact GST calculation
        const itemRatio = invoiceItemsSubtotal > 0 ? item.subtotal / invoiceItemsSubtotal : 0;
        const itemDiscount = invoiceDiscount * itemRatio;
        const itemNet = item.subtotal - itemDiscount;

        const taxable = itemNet / (1 + item.gstRate / 100);
        const taxVal = itemNet - taxable;

        if (taxMap[item.gstRate]) {
          taxMap[item.gstRate].taxableAmount += taxable;
          taxMap[item.gstRate].taxCollected += taxVal;
        } else {
          taxMap[item.gstRate] = { taxableAmount: taxable, taxCollected: taxVal };
        }
      });
    });

    return Object.entries(taxMap).map(([rate, data]) => ({
      rate: parseFloat(rate),
      taxableAmount: parseFloat(data.taxableAmount.toFixed(2)),
      taxCollected: parseFloat(data.taxCollected.toFixed(2))
    })).filter(x => x.taxableAmount > 0);
  };

  const gstReportData = getGSTTaxReport();
  const totalTaxCollected = gstReportData.reduce((acc, r) => acc + r.taxCollected, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Business Reports</h1>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
            Analyze daily sales metrics, top selling items, and GST tax statements.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border max-w-md">
        <button 
          onClick={() => setActiveReportTab('summary')}
          className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${activeReportTab === 'summary' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
          Sales Summary
        </button>
        <button 
          onClick={() => setActiveReportTab('products')}
          className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${activeReportTab === 'products' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Award className="h-3.5 w-3.5 inline mr-1" />
          Product Sales
        </button>
        <button 
          onClick={() => setActiveReportTab('gst')}
          className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${activeReportTab === 'gst' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <FileText className="h-3.5 w-3.5 inline mr-1" />
          GST Statement
        </button>
      </div>

      {/* SUMMARY REPORT VIEW */}
      {activeReportTab === 'summary' && (
        <div className="space-y-6">
          
          {/* Summary Mini Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase">Total Sales Volume</span>
              <h3 className="text-2xl font-black text-primary">{currencySymbol}{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
              <p className="text-[10px] text-muted-foreground">All generated invoices offline</p>
            </div>
            <div className="bg-card border p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase">Total Bills Count</span>
              <h3 className="text-2xl font-black text-foreground">{totalBills}</h3>
              <p className="text-[10px] text-muted-foreground">Invoices generated in database</p>
            </div>
            <div className="bg-card border p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase">Avg Invoice Amount</span>
              <h3 className="text-2xl font-black text-foreground">{currencySymbol}{avgBillValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
              <p className="text-[10px] text-muted-foreground">Average order ticket size</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Daily Sales Bar Chart */}
            <div className="lg:col-span-8 bg-card border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Calendar className="h-4 w-4 text-primary" />
                Sales Trend - Last 7 Days
              </h3>
              
              <div className="h-60 flex items-end justify-between pt-6 border-b pb-2 px-4 gap-2">
                {dailySalesData.map(d => {
                  const barHeight = `${(d.amount / maxDailySales) * 100}%`;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded transition font-bold pointer-events-none">
                        {currencySymbol}{d.amount}
                      </div>
                      <div 
                        style={{ height: barHeight }} 
                        className="w-8 bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 rounded-t-lg transition-all duration-300 min-h-[4px]"
                      />
                      <span className="text-[9px] font-bold text-muted-foreground mt-1 rotate-12 md:rotate-0">
                        {d.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Mode Share list */}
            <div className="lg:col-span-4 bg-card border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
                Payment Breakdown
              </h3>
              
              <div className="space-y-4">
                {paymentData.map(p => {
                  const sharePercent = totalRevenue > 0 ? (p.sum / totalRevenue) * 100 : 0;
                  return (
                    <div key={p.mode} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold">{p.mode}</span>
                        <span className="text-muted-foreground font-semibold">
                          {p.count} bills ({sharePercent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${sharePercent}%` }}
                          className="bg-indigo-600 h-full rounded-full"
                        />
                      </div>
                      <div className="text-right text-[10px] font-black text-primary">
                        {currencySymbol}{p.sum.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* PRODUCT SALES VIEW */}
      {activeReportTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Best selling by volume */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide border-b pb-2 flex items-center gap-1">
              <Award className="h-4 w-4 text-amber-500 animate-pulse" />
              Best Sellers (By Quantity)
            </h3>

            {topQty.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No sales records available yet.</p>
            ) : (
              <div className="space-y-4">
                {topQty.map((item, idx) => {
                  const maxQty = topQty[0].quantity;
                  const ratio = (item.quantity / maxQty) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="truncate max-w-[240px]">{item.name}</span>
                        <span className="text-primary font-black shrink-0">{item.quantity} units</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div style={{ width: `${ratio}%` }} className="bg-indigo-500 h-full rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top products by revenue */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide border-b pb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Highest Revenue Products
            </h3>

            {topRevenue.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No sales records available yet.</p>
            ) : (
              <div className="space-y-4">
                {topRevenue.map((item, idx) => {
                  const maxRev = topRevenue[0].revenue;
                  const ratio = (item.revenue / maxRev) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="truncate max-w-[240px]">{item.name}</span>
                        <span className="text-primary font-black shrink-0">{currencySymbol}{item.revenue.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div style={{ width: `${ratio}%` }} className="bg-emerald-500 h-full rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* GST TAX REPORT VIEW */}
      {activeReportTab === 'gst' && (
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
              GST Tax Collected Statement
            </h3>
            <span className="text-xs font-bold text-primary">
              Total Tax: {currencySymbol}{totalTaxCollected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          {gstReportData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No taxable invoices available yet.</p>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b text-[10px] text-muted-foreground font-black uppercase text-center">
                    <th className="py-2.5 text-left pl-4">GST Rate Category</th>
                    <th className="py-2.5 text-right">Taxable Net Value</th>
                    <th className="py-2.5 text-right">CGST Collected (50% Split)</th>
                    <th className="py-2.5 text-right">SGST Collected (50% Split)</th>
                    <th className="py-2.5 text-right pr-4">Total Tax Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-center">
                  {gstReportData.map(row => {
                    const halfTax = row.taxCollected / 2;
                    return (
                      <tr key={row.rate} className="hover:bg-muted/30">
                        <td className="py-3 text-left pl-4 font-bold">GST {row.rate}%</td>
                        <td className="py-3 text-right font-medium">{currencySymbol}{row.taxableAmount.toFixed(2)}</td>
                        <td className="py-3 text-right text-muted-foreground">{currencySymbol}{halfTax.toFixed(2)}</td>
                        <td className="py-3 text-right text-muted-foreground">{currencySymbol}{halfTax.toFixed(2)}</td>
                        <td className="py-3 text-right font-bold text-primary pr-4">{currencySymbol}{row.taxCollected.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
