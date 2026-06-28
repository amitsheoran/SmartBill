import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Invoice } from '../db/db';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { 
  Search, 
  Calendar, 
  Trash2, 
  Download, 
  Share2, 
  ChevronDown, 
  ChevronUp, 
  Undo,
  ShoppingBag,
  Clock,
  User,
  CreditCard,
  AlertCircle
} from 'lucide-react';

interface SalesHistoryProps {
  shopDetails: Record<string, any>;
  currencySymbol: string;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ shopDetails, currencySymbol }) => {
  // DB query for invoices
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expanded Invoice Details
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

  // Undo States
  const [deletedInvoice, setDeletedInvoice] = useState<Invoice | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const [undoTimer, setUndoTimer] = useState(6);

  useEffect(() => {
    let interval: any;
    if (showUndoBanner && undoTimer > 0) {
      interval = setInterval(() => {
        setUndoTimer(prev => {
          if (prev <= 1) {
            setShowUndoBanner(false);
            setDeletedInvoice(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showUndoBanner, undoTimer]);

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(term) || 
                          inv.customerName.toLowerCase().includes(term) || 
                          inv.customerPhone.toLowerCase().includes(term);

    let matchesDate = true;
    if (startDate) {
      const start = new Date(startDate).getTime();
      matchesDate = matchesDate && inv.dateTime >= start;
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1; // End of that day
      matchesDate = matchesDate && inv.dateTime <= end;
    }

    return matchesSearch && matchesDate;
  }).sort((a, b) => b.dateTime - a.dateTime); // Sorted newest first

  // Delete invoice with inventory replenishment
  const handleDeleteInvoice = async (inv: Invoice) => {
    if (!inv.id) return;
    if (window.confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}? This will restock the inventory items.`)) {
      try {
        // Replenish stock for all items
        for (const item of inv.items) {
          const prod = await db.products.get(item.productId);
          if (prod) {
            const newStock = prod.stock + item.quantity;
            await db.products.update(item.productId, { stock: newStock, updatedAt: Date.now() });
          }
        }

        // Store backup for Undo
        setDeletedInvoice(inv);
        setUndoTimer(6);
        setShowUndoBanner(true);

        // Delete invoice
        await db.invoices.delete(inv.id);

      } catch (err: any) {
        console.error(err);
        alert(`Error deleting invoice: ${err.message}`);
      }
    }
  };

  // Undo delete
  const handleUndoDelete = async () => {
    if (!deletedInvoice) return;
    try {
      // Re-deduct stock
      for (const item of deletedInvoice.items) {
        const prod = await db.products.get(item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          await db.products.update(item.productId, { stock: newStock, updatedAt: Date.now() });
        }
      }

      // Add invoice back
      await db.invoices.add(deletedInvoice);

      // Reset undo states
      setShowUndoBanner(false);
      setDeletedInvoice(null);
    } catch (err: any) {
      console.error(err);
      alert(`Error during undo: ${err.message}`);
    }
  };

  // WhatsApp Message share link
  const getWhatsAppLink = (inv: Invoice) => {
    const phone = inv.customerPhone.replace(/\D/g, '');
    const countryCode = phone.length === 10 ? '91' + phone : phone;

    const itemsText = inv.items.map(item => 
      `• ${item.productName} - ${item.quantity} ${item.unit} x ₹${item.sellingPrice} = ₹${item.subtotal}`
    ).join('\n');

    const message = `*INVOICE: ${inv.invoiceNumber}*\n\nHello *${inv.customerName}*,\nThank you for shopping at *${shopDetails.businessName || 'Shop'}*.\n\n*Bill Summary:*\n${itemsText}\n\n*GST Tax Content:* ₹${inv.gstTotal}\n*Discount:* ₹${inv.discount}\n*Grand Total:* *₹${inv.grandTotal}*\n*Payment Mode:* ${inv.paymentMode}\n\nHave a great day!`;

    return `https://api.whatsapp.com/send?phone=${countryCode}&text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-12">
      
      {/* Undo Banner */}
      {showUndoBanner && deletedInvoice && (
        <div className="bg-slate-900 border border-slate-700 text-white p-4 rounded-xl flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center gap-2 text-xs md:text-sm font-semibold">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <span>Deleted invoice {deletedInvoice.invoiceNumber}. Restoring stock levels...</span>
          </div>
          <button 
            onClick={handleUndoDelete}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 transition active:scale-95 shadow shrink-0"
          >
            <Undo className="h-4 w-4" />
            Undo ({undoTimer}s)
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Sales Invoice History</h1>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
            Search invoices, duplicate records, re-download PDFs, or share bills on WhatsApp.
          </p>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-card text-card-foreground p-4 border rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Search bar */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-3 text-muted-foreground h-4.5 w-4.5" />
            <input 
              type="text"
              placeholder="Search by Invoice number, customer name, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          {/* Date Range Start */}
          <div className="md:col-span-3 relative">
            <Calendar className="absolute left-3 top-3 text-muted-foreground h-4.5 w-4.5" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold text-muted-foreground"
              placeholder="Start Date"
            />
          </div>

          {/* Date Range End */}
          <div className="md:col-span-3 relative">
            <Calendar className="absolute left-3 top-3 text-muted-foreground h-4.5 w-4.5" />
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold text-muted-foreground"
              placeholder="End Date"
            />
          </div>

        </div>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <ShoppingBag className="h-10 w-10 text-slate-300 mb-2 animate-pulse" />
          <p className="font-bold text-sm text-muted-foreground">No invoices matching filters found</p>
          <p className="text-xs text-muted-foreground mt-1">Check search criteria or create a new invoice.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map(inv => {
            const isExpanded = expandedInvoiceId === inv.id;
            const itemNames = inv.items.map(item => item.productName).join(', ');

            return (
              <div 
                key={inv.id} 
                className="bg-card text-card-foreground border rounded-2xl shadow-sm overflow-hidden"
              >
                
                {/* Invoice Main Header Row */}
                <div 
                  onClick={() => setExpandedInvoiceId(isExpanded ? null : (inv.id || null))}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-muted/20 cursor-pointer transition select-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-sm">{inv.invoiceNumber}</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-muted-foreground font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(inv.dateTime).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {inv.customerName} ({inv.customerPhone})
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[340px] md:max-w-[450px]">
                      Items: {itemNames}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto border-t sm:border-0 pt-2 sm:pt-0 mt-1 sm:mt-0 gap-1.5">
                    <span className="text-xs text-muted-foreground font-semibold flex items-center gap-0.5">
                      <CreditCard className="h-3 w-3" />
                      {inv.paymentMode}
                    </span>
                    <span className="font-black text-primary text-base">
                      {currencySymbol}{inv.grandTotal.toFixed(2)}
                    </span>
                    <button className="text-muted-foreground hidden sm:block">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Invoice Detail View */}
                {isExpanded && (
                  <div className="border-t bg-slate-50/50 dark:bg-slate-900/10 p-5 space-y-5 animate-fadeIn">
                    
                    {/* Invoice Products list */}
                    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900 border-b text-[10px] font-black uppercase text-muted-foreground">
                            <th className="text-left px-4 py-2">Item Description</th>
                            <th className="text-center px-4 py-2 w-20">Qty</th>
                            <th className="text-right px-4 py-2">Rate</th>
                            <th className="text-right px-4 py-2">GST</th>
                            <th className="text-right px-4 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {inv.items.map((item, i) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-semibold">{item.productName}</td>
                              <td className="px-4 py-3 text-center font-bold">{item.quantity} {item.unit}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{currencySymbol}{item.sellingPrice.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{item.gstRate}%</td>
                              <td className="px-4 py-3 text-right font-bold">{currencySymbol}{item.subtotal.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Tax & Totals Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      
                      {/* Left: Invoice words & Info */}
                      <div className="md:col-span-7 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Amount In Words</p>
                          <p className="text-xs font-bold text-muted-foreground mt-0.5">{inv.amountInWords}</p>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-4 font-medium">
                          Created on {new Date(inv.dateTime).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Right: Tax Breakdown */}
                      <div className="md:col-span-5 bg-card border rounded-xl p-4 shadow-sm space-y-1.5 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal (Excl. Tax):</span>
                          <span>{currencySymbol}{inv.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Total Tax (CGST + SGST):</span>
                          <span>{currencySymbol}{inv.gstTotal.toFixed(2)}</span>
                        </div>
                        {inv.discount > 0 && (
                          <div className="flex justify-between text-green-600 font-medium">
                            <span>Discount Applied:</span>
                            <span>-{currencySymbol}{inv.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-muted-foreground border-b pb-1.5">
                          <span>Round Off:</span>
                          <span>{inv.roundOff > 0 ? '+' : ''}{inv.roundOff.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-black text-sm text-primary pt-1">
                          <span>Grand Total Paid:</span>
                          <span>{currencySymbol}{inv.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>

                    </div>

                    {/* Invoice Action Panel */}
                    <div className="flex flex-wrap gap-2.5 border-t pt-4 border-slate-200 dark:border-slate-800">
                      
                      <button 
                        onClick={() => downloadInvoicePDF(inv, shopDetails)}
                        className="bg-primary hover:bg-blue-600 active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition shadow"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </button>

                      <a 
                        href={getWhatsAppLink(inv)}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition shadow"
                      >
                        <Share2 className="h-4 w-4" />
                        Share WhatsApp
                      </a>

                      <button 
                        onClick={() => handleDeleteInvoice(inv)}
                        className="bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition ml-auto active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Invoice
                      </button>

                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
