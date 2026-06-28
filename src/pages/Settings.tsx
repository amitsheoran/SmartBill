import React, { useState, useEffect } from 'react';
import { db, seedDatabase } from '../db/db';
import { getAllSettings, setSetting } from '../db/settingsHelper';
import { 
  Building, 
  Trash2, 
  Download, 
  Upload, 
  Sun, 
  Moon, 
  RefreshCcw,
  CheckCircle,
  QrCode
} from 'lucide-react';

interface SettingsProps {
  onSettingsSaved: () => void;
  toggleTheme: (theme: 'light' | 'dark') => void;
  activeTheme: 'light' | 'dark';
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsSaved, toggleTheme, activeTheme }) => {
  // Store info states
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [startingBillNo, setStartingBillNo] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [warrantyNotes, setWarrantyNotes] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [upiId, setUpiId] = useState('');
  const [footerMessage, setFooterMessage] = useState('');

  // UI state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  // Load current settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await getAllSettings();
    setBusinessName(s.businessName || '');
    setOwnerName(s.ownerName || '');
    setAddress(s.address || '');
    setPhone(s.phone || '');
    setWhatsappNumber(s.whatsappNumber || '');
    setGstin(s.gstin || '');
    setInvoicePrefix(s.invoicePrefix || '');
    setStartingBillNo(s.startingBillNo || '1');
    setCurrency(s.currency || '₹');
    setWarrantyNotes(s.warrantyNotes || '');
    setReturnPolicy(s.returnPolicy || '');
    setUpiId(s.upiId || '');
    setFooterMessage(s.footerMessage || '');
  };

  // Submit Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setSetting('businessName', businessName);
      await setSetting('ownerName', ownerName);
      await setSetting('address', address);
      await setSetting('phone', phone);
      await setSetting('whatsappNumber', whatsappNumber);
      await setSetting('gstin', gstin);
      await setSetting('invoicePrefix', invoicePrefix);
      await setSetting('startingBillNo', startingBillNo);
      await setSetting('currency', currency);
      await setSetting('warrantyNotes', warrantyNotes);
      await setSetting('returnPolicy', returnPolicy);
      await setSetting('upiId', upiId);
      await setSetting('footerMessage', footerMessage);

      setSaveSuccess(true);
      onSettingsSaved(); // Notify parent to reload settings
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    }
  };

  // Reset database & re-seed (dev feature)
  const handleReSeed = async () => {
    if (window.confirm("This will overwrite/seed the default products list if empty, or double seed. Continue?")) {
      await seedDatabase();
      loadSettings();
      alert("Database seeded successfully!");
    }
  };

  // Clear all data (for fresh start)
  const handleClearAllData = async () => {
    if (window.confirm("CRITICAL WARNING: This will permanently delete ALL products, invoices, and settings. Are you absolutely sure?")) {
      await db.invoices.clear();
      await db.products.clear();
      await db.customers.clear();
      await db.settings.clear();
      alert("All data cleared. Reloading page.");
      window.location.reload();
    }
  };

  // BACKUP FUNCTION: Export all IndexedDB stores to a JSON file
  const handleBackupExport = async () => {
    try {
      const settingsList = await db.settings.toArray();
      const productsList = await db.products.toArray();
      const invoicesList = await db.invoices.toArray();
      const customersList = await db.customers.toArray();

      const backupObj = {
        version: 1,
        appName: 'SmartBill PWA',
        createdAt: Date.now(),
        settings: settingsList,
        products: productsList,
        invoices: invoicesList,
        customers: customersList
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("download", `SmartBill_Backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

    } catch (err: any) {
      console.error(err);
      alert(`Export backup failed: ${err.message}`);
    }
  };

  // RESTORE FUNCTION: Import all stores from a JSON file
  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImportStatus('Restoring...');

    fileReader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;
        const backupObj = JSON.parse(fileContent);

        if (backupObj.appName !== 'SmartBill PWA') {
          throw new Error("Invalid backup file format. Must be a SmartBill backup JSON.");
        }

        // Clear existing tables
        await db.settings.clear();
        await db.products.clear();
        await db.invoices.clear();
        await db.customers.clear();

        // Restore tables
        if (backupObj.settings) {
          for (const item of backupObj.settings) await db.settings.put(item);
        }
        if (backupObj.products) {
          for (const item of backupObj.products) await db.products.put(item);
        }
        if (backupObj.invoices) {
          for (const item of backupObj.invoices) await db.invoices.put(item);
        }
        if (backupObj.customers) {
          for (const item of backupObj.customers) await db.customers.put(item);
        }

        setImportStatus('Backup Restored Successfully!');
        loadSettings();
        onSettingsSaved();
        
        setTimeout(() => setImportStatus(''), 4000);
      } catch (err: any) {
        console.error(err);
        setImportStatus(`Restore Failed: ${err.message}`);
      }
    };

    fileReader.readAsText(files[0]);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Business Settings</h1>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
            Configure invoices format, terms, tax parameters, business logo, QR codes, and system backups.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <span className="font-bold">Settings saved successfully!</span>
        </div>
      )}

      {importStatus && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${importStatus.includes('Failed') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="font-bold">{importStatus}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Business & Invoice parameters */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Shop details */}
          <div className="bg-card text-card-foreground border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b pb-2 uppercase tracking-wide">
              <Building className="h-4.5 w-4.5 text-primary" />
              Shop Metadata Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Business Name *</label>
                <input 
                  type="text" 
                  required
                  value={businessName} 
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Owner Name</label>
                <input 
                  type="text" 
                  value={ownerName} 
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Phone Number *</label>
                <input 
                  type="tel" 
                  required
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">WhatsApp Share Phone</label>
                <input 
                  type="tel" 
                  value={whatsappNumber} 
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Shop GSTIN (Optional)</label>
                <input 
                  type="text" 
                  value={gstin} 
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 07AAAAA1111A1Z2"
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Shop Address *</label>
              <textarea 
                rows={2}
                required
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Invoice Prefix & policies */}
          <div className="bg-card text-card-foreground border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground border-b pb-2 uppercase tracking-wide">
              Invoice Formatting & Terms
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Bill No Prefix</label>
                <input 
                  type="text" 
                  value={invoicePrefix} 
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="e.g. GE"
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Starting Number</label>
                <input 
                  type="number" 
                  value={startingBillNo} 
                  onChange={(e) => setStartingBillNo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Currency Symbol</label>
                <input 
                  type="text" 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Warranty notes</label>
                <textarea 
                  rows={2}
                  value={warrantyNotes} 
                  placeholder="e.g. 1 Year warranty on select items."
                  onChange={(e) => setWarrantyNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Return / Refund Policy</label>
                <textarea 
                  rows={2}
                  value={returnPolicy} 
                  placeholder="e.g. Exchange allowed within 7 days."
                  onChange={(e) => setReturnPolicy(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* UPI ID for Scan to Pay */}
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1 flex items-center gap-1">
                  <QrCode className="h-4 w-4" />
                  UPI ID for QR Pay
                </label>
                <input 
                  type="text" 
                  value={upiId} 
                  placeholder="e.g. shopname@upi"
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold text-blue-600"
                />
              </div>

              {/* Invoice footer message */}
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Invoice Footer Greeting</label>
                <input 
                  type="text" 
                  value={footerMessage} 
                  placeholder="Thank you for shopping with us!"
                  onChange={(e) => setFooterMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-blue-600 active:scale-98 text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-1.5 transition shadow glow-primary"
          >
            <CheckCircle className="h-5 w-5" />
            Save Configuration Changes
          </button>

        </div>

        {/* Right Side: Theme toggles & Offline Backup/Restore */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Theme Settings Card */}
          <div className="bg-card text-card-foreground border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b pb-2 uppercase tracking-wide">
              Theme Options
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl transition ${activeTheme === 'light' ? 'bg-primary text-white shadow' : 'bg-slate-50 dark:bg-slate-900 hover:bg-muted text-muted-foreground'}`}
              >
                <Sun className="h-4.5 w-4.5" />
                <span className="text-xs font-bold">Light</span>
              </button>
              <button
                type="button"
                onClick={() => toggleTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl transition ${activeTheme === 'dark' ? 'bg-primary text-white shadow' : 'bg-slate-50 dark:bg-slate-900 hover:bg-muted text-muted-foreground'}`}
              >
                <Moon className="h-4.5 w-4.5" />
                <span className="text-xs font-bold">Dark</span>
              </button>
            </div>
          </div>

          {/* Database Backup Export & Import Card */}
          <div className="bg-card text-card-foreground border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b pb-2 uppercase tracking-wide">
              Data Management (Offline Backup)
            </h3>
            
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              All your records are stored in browser memory. Use offline backups to transfer to another device or save copies.
            </p>

            <div className="space-y-3 pt-2">
              
              {/* Export backup button */}
              <button
                type="button"
                onClick={handleBackupExport}
                className="w-full bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700/80 active:scale-95 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition border"
              >
                <Download className="h-4 w-4" />
                Export Backup (JSON)
              </button>

              {/* Import backup input trigger */}
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleBackupImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button
                  type="button"
                  className="w-full bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700/80 active:scale-95 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition border"
                >
                  <Upload className="h-4 w-4" />
                  Restore Backup (JSON)
                </button>
              </div>

            </div>
          </div>

          {/* Catalog presets and reset */}
          <div className="bg-card text-card-foreground border border-red-100 dark:border-red-950/40 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-red-500 flex items-center gap-2 border-b pb-2 uppercase tracking-wide">
              Developer Settings
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleReSeed}
                className="w-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Seed Electrical Shop Catalog
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                className="w-full bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Wipe All Data / Reset App
              </button>
            </div>
          </div>

        </div>

      </form>
    </div>
  );
};
