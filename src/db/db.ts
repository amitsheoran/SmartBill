import Dexie, { type Table } from 'dexie';

// Define Interfaces
export interface SystemSetting {
  id: string; // key name
  value: any;
}

export interface Product {
  id?: number;
  name: string;
  category: string;
  sku?: string;
  purchasePrice: number;
  sellingPrice: number;
  unit: string; // e.g., 'pieces', 'meters', 'kg', 'coil'
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  stock: number;
  lowStockLimit: number;
  supplierName?: string;
  updatedAt: number;
}

export interface InvoiceItem {
  productId: number;
  productName: string;
  sellingPrice: number;
  gstRate: number;
  quantity: number;
  unit: string;
  gstAmount: number;
  subtotal: number; // quantity * sellingPrice
}

export interface Invoice {
  id?: number;
  invoiceNumber: string; // unique
  dateTime: number; // timestamp
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number; // sum of items subtotals (excl. GST or total depending on calculation style. Typically subtotal = gross total before tax or inclusive)
  gstTotal: number;
  discount: number;
  grandTotal: number;
  roundOff: number;
  amountInWords: string;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit';
}

export interface Customer {
  phone: string; // primary key
  name: string;
  lastBilledDate: number;
  totalOrders: number;
}

class SmartBillDB extends Dexie {
  settings!: Table<SystemSetting, string>;
  products!: Table<Product, number>;
  invoices!: Table<Invoice, number>;
  customers!: Table<Customer, string>;

  constructor() {
    super('SmartBillDB');
    this.version(1).stores({
      settings: 'id',
      products: '++id, name, category, sku, updatedAt',
      invoices: '++id, invoiceNumber, dateTime, customerPhone, customerName',
      customers: 'phone, name, lastBilledDate',
    });
  }
}

export const db = new SmartBillDB();

// Default Business Profile Details
const defaultSettings = [
  { id: 'businessName', value: 'Gupta Electricals' },
  { id: 'ownerName', value: 'Amit Gupta' },
  { id: 'address', value: '104, Electric Market, Chandni Chowk, New Delhi - 110006' },
  { id: 'phone', value: '9876543210' },
  { id: 'whatsappNumber', value: '9876543210' },
  { id: 'gstin', value: '07AAAAA1111A1Z2' },
  { id: 'invoicePrefix', value: 'GE' },
  { id: 'startingBillNo', value: '1' },
  { id: 'currency', value: '₹' },
  { id: 'warrantyNotes', value: '1 Year Brand Warranty on LED Bulbs and Switchgears. Carry invoice for claim.' },
  { id: 'returnPolicy', value: 'Goods once sold can be exchanged within 7 days in original packing.' },
  { id: 'upiId', value: 'guptaelectricals@okaxis' },
  { id: 'theme', value: 'dark' },
  { id: 'footerMessage', value: 'Thank you for shopping with us!' }
];

// Seed initial electrical shop items
const defaultProducts: Product[] = [
  { name: 'Syska LED Bulb 9W', category: 'Lighting', purchasePrice: 65, sellingPrice: 99, unit: 'pieces', gstRate: 18, stock: 85, lowStockLimit: 15, supplierName: 'Syska Distributors New Delhi', updatedAt: Date.now() },
  { name: 'Syska LED Bulb 12W', category: 'Lighting', purchasePrice: 90, sellingPrice: 140, unit: 'pieces', gstRate: 18, stock: 60, lowStockLimit: 12, supplierName: 'Syska Distributors New Delhi', updatedAt: Date.now() },
  { name: 'Syska LED Panel Light 15W', category: 'Lighting', purchasePrice: 280, sellingPrice: 420, unit: 'pieces', gstRate: 18, stock: 24, lowStockLimit: 5, supplierName: 'Syska Distributors New Delhi', updatedAt: Date.now() },
  { name: 'Polycab 1.5 Sq mm Wire Red (90m)', category: 'Wires', purchasePrice: 1100, sellingPrice: 1450, unit: 'coil', gstRate: 18, stock: 12, lowStockLimit: 4, supplierName: 'Polycab Hub Delhi', updatedAt: Date.now() },
  { name: 'Polycab 2.5 Sq mm Wire Blue (90m)', category: 'Wires', purchasePrice: 1650, sellingPrice: 2150, unit: 'coil', gstRate: 18, stock: 8, lowStockLimit: 3, supplierName: 'Polycab Hub Delhi', updatedAt: Date.now() },
  { name: 'Anchor Modular Switch 6A', category: 'Switches', purchasePrice: 16, sellingPrice: 28, unit: 'pieces', gstRate: 18, stock: 150, lowStockLimit: 25, supplierName: 'Anchor Retail Depot', updatedAt: Date.now() },
  { name: 'Anchor Modular Socket 6A', category: 'Switches', purchasePrice: 24, sellingPrice: 42, unit: 'pieces', gstRate: 18, stock: 90, lowStockLimit: 15, supplierName: 'Anchor Retail Depot', updatedAt: Date.now() },
  { name: 'Anchor Switch Plate 6 Module', category: 'Switches', purchasePrice: 55, sellingPrice: 95, unit: 'pieces', gstRate: 18, stock: 45, lowStockLimit: 8, supplierName: 'Anchor Retail Depot', updatedAt: Date.now() },
  { name: 'Havells MCB 16A Single Pole', category: 'Switchgear', purchasePrice: 130, sellingPrice: 195, unit: 'pieces', gstRate: 18, stock: 22, lowStockLimit: 5, supplierName: 'Havells Agency', updatedAt: Date.now() },
  { name: 'Havells MCB 32A Double Pole', category: 'Switchgear', purchasePrice: 380, sellingPrice: 550, unit: 'pieces', gstRate: 18, stock: 12, lowStockLimit: 3, supplierName: 'Havells Agency', updatedAt: Date.now() },
  { name: 'Steel Grip Black Tape (1pc)', category: 'Accessories', purchasePrice: 8, sellingPrice: 15, unit: 'pieces', gstRate: 18, stock: 210, lowStockLimit: 40, supplierName: 'Local Distributor', updatedAt: Date.now() },
  { name: 'Finolex Flexible Wire Twin Flat 10m', category: 'Wires', purchasePrice: 120, sellingPrice: 180, unit: 'meters', gstRate: 18, stock: 100, lowStockLimit: 20, supplierName: 'Finolex Wire Center', updatedAt: Date.now() }
];

export async function seedDatabase() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    for (const setting of defaultSettings) {
      await db.settings.put(setting);
    }
  }

  const productsCount = await db.products.count();
  if (productsCount === 0) {
    for (const prod of defaultProducts) {
      await db.products.put(prod);
    }
  }
}
