import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Fuse from 'fuse.js';
import { db, type Product, type Invoice, type InvoiceItem, type Customer } from '../db/db';
import { numberToWords } from '../utils/numberToWords';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { 
  Search, 
  User, 
  Phone, 
  Plus, 
  Trash2, 
  Mic, 
  MicOff, 
  Percent, 
  CreditCard, 
  FileText,
  Share2, 
  RefreshCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';

interface BillingProps {
  shopDetails: Record<string, any>;
}

export const Billing: React.FC<BillingProps> = ({ shopDetails }) => {
  // DB States
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  // Customer State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showCustomerSug, setShowCustomerSug] = useState(false);

  // GST Toggle & GSTIN States
  const [invoiceType, setInvoiceType] = useState<'gst' | 'non-gst'>('gst');
  const [billingGstin, setBillingGstin] = useState('');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);

  // Bill Items State
  const [billItems, setBillItems] = useState<InvoiceItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Credit'>('Cash');

  // UI States
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  // Setup Fuse.js for fuzzy product search
  const fuse = new Fuse(products, {
    keys: ['name', 'category', 'sku'],
    threshold: 0.3
  });

  // Generate unique invoice number on mount/reset
  useEffect(() => {
    generateInvoiceNum();
  }, []);

  // Sync GSTIN state with settings profile
  useEffect(() => {
    if (shopDetails.gstin) {
      setBillingGstin(shopDetails.gstin);
      setInvoiceType('gst');
    } else {
      setBillingGstin('');
      setInvoiceType('non-gst');
    }
  }, [shopDetails]);

  const generateInvoiceNum = async () => {
    const prefix = shopDetails.invoicePrefix || 'SB';
    const startingNumStr = shopDetails.startingBillNo || '1';
    let startingNum = parseInt(startingNumStr, 10);
    if (isNaN(startingNum)) startingNum = 1;

    // Get count of invoices in DB to increment
    const count = await db.invoices.count();
    const currentNum = startingNum + count;
    const formattedNum = String(currentNum).padStart(4, '0');
    setInvoiceNumber(`${prefix}-${new Date().getFullYear()}-${formattedNum}`);
  };

  // Handle Search Input Change
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    const results = fuse.search(searchQuery).map(r => r.item);
    setSearchResults(results);
    setActiveSearchIndex(0);
  }, [searchQuery, products]);

  // Handle customer phone autocomplete
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerPhone(val);
    if (val.length >= 3) {
      setShowCustomerSug(true);
    } else {
      setShowCustomerSug(false);
    }
  };

  const selectCustomer = (cust: Customer) => {
    setCustomerPhone(cust.phone);
    setCustomerName(cust.name);
    setShowCustomerSug(false);
  };

  // Smart suggestions helper: get complementary items
  const getSmartSuggestions = (): Product[] => {
    if (billItems.length === 0) {
      // If empty, suggest standard fast-moving items
      return products.slice(0, 4);
    }
    
    // Find what categories are in the cart
    const cartProductNames = billItems.map(item => item.productName.toLowerCase());
    
    // Simple rule-based complementary suggestions
    const suggestions: Product[] = [];

    const hasBulb = cartProductNames.some(name => name.includes('bulb') || name.includes('led'));
    const hasWire = cartProductNames.some(name => name.includes('wire') || name.includes('cable'));
    const hasSwitch = cartProductNames.some(name => name.includes('switch') || name.includes('socket'));

    products.forEach(p => {
      const name = p.name.toLowerCase();
      // Avoid adding items already in cart
      if (cartProductNames.some(cartName => name.includes(cartName) || cartName.includes(name))) return;

      if (hasBulb && (name.includes('switch') || name.includes('socket') || name.includes('tape') || name.includes('plate'))) {
        suggestions.push(p);
      } else if (hasWire && (name.includes('tape') || name.includes('mcb') || name.includes('switch'))) {
        suggestions.push(p);
      } else if (hasSwitch && (name.includes('plate') || name.includes('socket') || name.includes('box'))) {
        suggestions.push(p);
      }
    });

    // Fallback: fill with products from other categories if list is short
    if (suggestions.length < 4) {
      products.forEach(p => {
        if (suggestions.length >= 4) return;
        const name = p.name.toLowerCase();
        const alreadyInCart = cartProductNames.some(cartName => name.includes(cartName));
        const alreadySuggested = suggestions.some(sp => sp.id === p.id);
        if (!alreadyInCart && !alreadySuggested) {
          suggestions.push(p);
        }
      });
    }

    return suggestions.slice(0, 4);
  };

  // Quantity entry parser
  // e.g. "250 gm" of product with kg unit -> quantity = 0.25
  // "2 kg" -> quantity = 2
  // "10 meters" -> quantity = 10
  // "3" -> quantity = 3
  const parseQuantityAndUnit = (input: string, baseUnit: string): { quantity: number; label: string } => {
    const cleanInput = input.toLowerCase().trim();
    if (!cleanInput) return { quantity: 1, label: `1 ${baseUnit}` };

    const numMatch = cleanInput.match(/^([\d.]+)\s*([a-zA-Z\s]+)?$/);
    if (!numMatch) {
      return { quantity: 1, label: `1 ${baseUnit}` };
    }

    const value = parseFloat(numMatch[1]);
    const inputUnit = numMatch[2] ? numMatch[2].trim() : '';

    if (isNaN(value)) {
      return { quantity: 1, label: `1 ${baseUnit}` };
    }

    // Conversion Logic
    // If product base unit is kg
    if (baseUnit.toLowerCase() === 'kg') {
      if (inputUnit === 'gm' || inputUnit === 'g' || inputUnit === 'grams') {
        return { quantity: value / 1000, label: `${value} gm` };
      }
    }

    // If product base unit is litre/liter
    if (baseUnit.toLowerCase() === 'litre' || baseUnit.toLowerCase() === 'liter' || baseUnit.toLowerCase() === 'l') {
      if (inputUnit === 'ml' || inputUnit === 'milliliter' || inputUnit === 'milliliters') {
        return { quantity: value / 1000, label: `${value} ml` };
      }
    }

    // If product unit is coil, pieces, meters, boxes etc.
    return { quantity: value, label: `${value} ${inputUnit || baseUnit}` };
  };

  // Add product to bill
  const handleAddProduct = (product: Product, quantityInput: string = '1') => {
    if (!product.id) return;

    const baseUnit = product.unit;
    const { quantity, label } = parseQuantityAndUnit(quantityInput, baseUnit);

    // Verify stock
    if (product.stock < quantity) {
      speakNotification(`Warning: Low stock for ${product.name}. Available is only ${product.stock}`);
    }

    // Check if product is already in bill
    const existingIndex = billItems.findIndex(item => item.productId === product.id);

    // Compute GST amount and subtotal (sellingPrice is inclusive of GST as standard Indian MRP or exclusive. Let's assume inclusive for shop owners ease, then back-calculate)
    // Inclusive GST calculation: Taxable = MRP / (1 + Rate/100). Tax = MRP - Taxable
    const mrp = product.sellingPrice;
    const gstRate = product.gstRate;
    const itemSubtotal = parseFloat((mrp * quantity).toFixed(2));
    
    // Back-calculate tax components
    const taxableValue = parseFloat((itemSubtotal / (1 + gstRate / 100)).toFixed(2));
    const gstAmount = parseFloat((itemSubtotal - taxableValue).toFixed(2));

    const newItem: InvoiceItem = {
      productId: product.id,
      productName: product.name,
      sellingPrice: mrp,
      gstRate: gstRate,
      quantity: quantity,
      unit: baseUnit,
      gstAmount: gstAmount,
      subtotal: itemSubtotal
    };

    if (existingIndex > -1) {
      const updated = [...billItems];
      const newQty = updated[existingIndex].quantity + quantity;
      
      const newSubtotal = parseFloat((mrp * newQty).toFixed(2));
      const newTaxable = parseFloat((newSubtotal / (1 + gstRate / 100)).toFixed(2));
      const newGst = parseFloat((newSubtotal - newTaxable).toFixed(2));

      updated[existingIndex].quantity = newQty;
      updated[existingIndex].subtotal = newSubtotal;
      updated[existingIndex].gstAmount = newGst;
      setBillItems(updated);
    } else {
      setBillItems([...billItems, newItem]);
    }

    // Reset Search
    setSearchQuery('');
    setSearchResults([]);
    speakNotification(`Added ${label} of ${product.name}`);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    const item = billItems[index];
    const updated = billItems.filter((_, i) => i !== index);
    setBillItems(updated);
    speakNotification(`Removed ${item.productName}`);
  };

  // Change quantity directly in table
  const handleQtyChange = (index: number, qtyStr: string) => {
    const updated = [...billItems];
    const qty = parseFloat(qtyStr);
    if (isNaN(qty) || qty <= 0) return;

    const item = updated[index];
    const gstRate = item.gstRate;
    const mrp = item.sellingPrice;
    const newSubtotal = parseFloat((mrp * qty).toFixed(2));
    const newTaxable = parseFloat((newSubtotal / (1 + gstRate / 100)).toFixed(2));
    const newGst = parseFloat((newSubtotal - newTaxable).toFixed(2));

    updated[index].quantity = qty;
    updated[index].subtotal = newSubtotal;
    updated[index].gstAmount = newGst;
    setBillItems(updated);
  };

  // Totals calculations
  const calculateBillTotals = () => {
    const itemsTotal = billItems.reduce((acc, item) => acc + item.subtotal, 0);
    const discountAmount = parseFloat(((itemsTotal * discountPercent) / 100).toFixed(2));
    const totalAfterDiscount = itemsTotal - discountAmount;
    
    // Tax is included. Let's compute total tax collected
    const totalGst = invoiceType === 'gst' ? billItems.reduce((acc, item) => {
      // Calculate fraction of discount for this item
      const itemRatio = itemsTotal > 0 ? item.subtotal / itemsTotal : 0;
      const itemDiscount = discountAmount * itemRatio;
      const itemNet = item.subtotal - itemDiscount;
      const itemTaxable = itemNet / (1 + item.gstRate / 100);
      return acc + (itemNet - itemTaxable);
    }, 0) : 0;

    const roundedTotal = Math.round(totalAfterDiscount);
    const roundOff = parseFloat((roundedTotal - totalAfterDiscount).toFixed(2));
    const words = numberToWords(roundedTotal);

    return {
      subtotal: parseFloat((totalAfterDiscount - totalGst).toFixed(2)),
      gstTotal: parseFloat(totalGst.toFixed(2)),
      discount: discountAmount,
      grandTotal: roundedTotal,
      roundOff: roundOff,
      amountInWords: words
    };
  };

  const { subtotal, gstTotal, discount, grandTotal, roundOff, amountInWords } = calculateBillTotals();

  // Voice speech feedback
  const speakNotification = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Voice Billing web speech initialization
  const toggleVoiceBilling = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Google Chrome or Android WebView.");
      return;
    }

    if (isVoiceListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-IN'; // Indian accent support

    rec.onstart = () => {
      setIsVoiceListening(true);
      setVoiceTranscript('Listening... Speak command like "Add 5 LED Bulb"');
    };

    rec.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      await parseVoiceCommand(transcript);
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setIsVoiceListening(false);
      setVoiceTranscript('Error listening. Try again.');
    };

    rec.onend = () => {
      setIsVoiceListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  // Simple Speech NLP command parsing
  const parseVoiceCommand = async (text: string) => {
    const cleanText = text.toLowerCase().trim();
    
    // Command 1: Generate Bill
    if (cleanText.includes('generate bill') || cleanText.includes('create invoice') || cleanText.includes('save invoice')) {
      await handleSaveInvoice();
      return;
    }

    // Command 2: Clear Bill
    if (cleanText.includes('clear bill') || cleanText.includes('reset bill') || cleanText.includes('clear cart')) {
      setBillItems([]);
      speakNotification('Bill cleared.');
      return;
    }

    // Word to number helper for speech
    const wordToNumber = (word: string): number => {
      const numbers: Record<string, number> = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'a': 1, 'an': 1, 'single': 1, 'double': 2, 'pair': 2, 'half': 0.5
      };
      return numbers[word] !== undefined ? numbers[word] : parseFloat(word);
    };

    // Command 3: Delete/Remove product
    const deleteMatch = cleanText.match(/(?:delete|remove)\s+(.+)/);
    if (deleteMatch) {
      const prodName = deleteMatch[1].trim();
      const idx = billItems.findIndex(item => item.productName.toLowerCase().includes(prodName));
      if (idx > -1) {
        handleRemoveItem(idx);
      } else {
        speakNotification(`Could not find ${prodName} in current bill.`);
      }
      return;
    }

    // Command 4: Change last item quantity
    const qtyChangeMatch = cleanText.match(/(?:change quantity to|increase quantity to|set quantity to|quantity)\s+([\d\w]+)/);
    if (qtyChangeMatch && billItems.length > 0) {
      const qtyVal = wordToNumber(qtyChangeMatch[1].trim());
      if (!isNaN(qtyVal)) {
        handleQtyChange(billItems.length - 1, String(qtyVal));
        speakNotification(`Changed quantity of ${billItems[billItems.length - 1].productName} to ${qtyVal}`);
      } else {
        speakNotification("Could not understand quantity number.");
      }
      return;
    }

    // Command 5: Add product
    // Supports patterns: "add 5 LED bulb", "add ten meters red wire", "add two holders"
    // Also captures direct: "5 led bulb" or "one tape"
    // Let's write a regex to capture quantity and name
    // Format: (add)? (qty)? (unit)? (product name)
    const quantityWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'a', 'an', 'single'];
    const qtyPattern = `(\\d+|${quantityWords.join('|')})`;
    const unitPattern = `(meters|meter|meters|m|kg|coil|coils|pieces|piece|box|boxes|gm|g)?`;
    
    // Regexp: (add )? (qty) (unit)? (productName)
    const addRegex = new RegExp(`(?:add\\s+)?${qtyPattern}\\s*${unitPattern}\\s*(.+)`);
    const addMatch = cleanText.match(addRegex);

    if (addMatch) {
      const speechQtyStr = addMatch[1];
      const speechUnitStr = addMatch[2] || '';
      const productNameSpeech = addMatch[3].trim();

      const parsedQty = isNaN(parseFloat(speechQtyStr)) ? wordToNumber(speechQtyStr) : parseFloat(speechQtyStr);
      const fullQtyInput = speechUnitStr ? `${parsedQty} ${speechUnitStr}` : `${parsedQty}`;

      // Fuzzy search database
      const voiceFuse = new Fuse(products, { keys: ['name', 'category'], threshold: 0.5 });
      const results = voiceFuse.search(productNameSpeech);

      if (results.length > 0) {
        handleAddProduct(results[0].item, fullQtyInput);
      } else {
        speakNotification(`Could not find any product matching ${productNameSpeech}`);
      }
    } else {
      // Fallback: match product directly if user just said the name
      const voiceFuse = new Fuse(products, { keys: ['name', 'category'], threshold: 0.4 });
      const results = voiceFuse.search(cleanText.replace('add ', ''));
      if (results.length > 0) {
        handleAddProduct(results[0].item, '1');
      } else {
        speakNotification(`Command not recognized. I heard: ${text}`);
      }
    }
  };

  // Validate and Save Invoice
  const handleSaveInvoice = async () => {
    setErrors([]);
    const validationErrors: string[] = [];

    if (billItems.length === 0) {
      validationErrors.push("Please add at least one item to generate bill.");
    }

    // Business GST number is mandatory if GST Invoice is selected
    if (invoiceType === 'gst' && !billingGstin.trim()) {
      validationErrors.push("Business GST number (GSTIN) is mandatory for GST Invoice.");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      speakNotification("Billing failed. Please check validation errors.");
      return;
    }

    try {
      const invoiceData: Invoice = {
        invoiceNumber,
        dateTime: Date.now(),
        customerName: customerName.trim() || 'Cash Customer',
        customerPhone: customerPhone.trim() || 'N/A',
        items: billItems,
        subtotal,
        gstTotal,
        discount,
        grandTotal,
        roundOff,
        amountInWords,
        paymentMode,
        isGst: invoiceType === 'gst',
        billingGstin: invoiceType === 'gst' ? billingGstin.trim() : ''
      };

      // Add to IndexedDB
      await db.invoices.add(invoiceData);

      // Deduct Stock in Inventory
      for (const item of billItems) {
        const prod = await db.products.get(item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          await db.products.update(item.productId, { stock: newStock, updatedAt: Date.now() });
        }
      }

      // Add/Update Customer Record if phone provided
      if (customerPhone.trim()) {
        const existingCust = await db.customers.get(customerPhone.trim());
        if (existingCust) {
          await db.customers.put({
            phone: customerPhone.trim(),
            name: customerName.trim() || existingCust.name,
            lastBilledDate: Date.now(),
            totalOrders: existingCust.totalOrders + 1
          });
        } else {
          await db.customers.put({
            phone: customerPhone.trim(),
            name: customerName.trim() || 'Customer',
            lastBilledDate: Date.now(),
            totalOrders: 1
          });
        }
      }

      setGeneratedInvoice(invoiceData);
      setSuccessMsg(`Invoice ${invoiceNumber} created successfully!`);
      speakNotification(`Invoice generated successfully. Total amount is ${grandTotal} rupees.`);
      setShowShareModal(true);

      // Trigger automatic PDF download
      downloadInvoicePDF(invoiceData, shopDetails);

    } catch (e: any) {
      console.error(e);
      setErrors([`Failed to save invoice: ${e.message}`]);
    }
  };

  // Reset page for new bill
  const handleResetBill = () => {
    setBillItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountPercent(0);
    setPaymentMode('Cash');
    setGeneratedInvoice(null);
    setSuccessMsg('');
    setErrors([]);
    setShowShareModal(false);
    if (shopDetails.gstin) {
      setBillingGstin(shopDetails.gstin);
      setInvoiceType('gst');
    } else {
      setBillingGstin('');
      setInvoiceType('non-gst');
    }
    generateInvoiceNum();
  };

  // Generate and Download PDF using jsPDF
  const handleDownloadPDF = (inv: Invoice) => {
    downloadInvoicePDF(inv, shopDetails);
  };

  // WhatsApp share url generator
  const getWhatsAppShareLink = () => {
    if (!generatedInvoice) return '';
    const phone = customerPhone.replace(/\D/g, ''); // Strip non-numeric
    const countryCode = phone.length === 10 ? '91' + phone : phone; // Assume Indian default

    const itemsText = generatedInvoice.items.map(item => 
      `• ${item.productName} - ${item.quantity} ${item.unit} x ₹${item.sellingPrice} = ₹${item.subtotal}`
    ).join('\n');

    const message = `*INVOICE: ${generatedInvoice.invoiceNumber}*\n\nHello *${generatedInvoice.customerName}*,\nThank you for shopping at *${shopDetails.businessName || 'Gupta Electricals'}*.\n\n*Bill Summary:*\n${itemsText}\n\n*GST Tax Content:* ₹${generatedInvoice.gstTotal}\n*Discount:* ₹${generatedInvoice.discount}\n*Grand Total:* *₹${generatedInvoice.grandTotal}*\n*Mode of Payment:* ${generatedInvoice.paymentMode}\n\n_Offline Invoice PDF has been generated._\nHave a great day!`;

    return `https://api.whatsapp.com/send?phone=${countryCode}&text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-12">
      {/* Invoice Mode Selection Toggle */}
      <div className="bg-card text-card-foreground border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base tracking-tight text-primary">Invoice Mode Selection</h3>
          <p className="text-xs text-muted-foreground">Select whether this invoice will carry tax split details or is a standard cash receipt.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border">
          <button
            type="button"
            onClick={() => setInvoiceType('gst')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition active:scale-95 ${invoiceType === 'gst' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground dark:hover:text-white'}`}
          >
            GST Invoice
          </button>
          <button
            type="button"
            onClick={() => setInvoiceType('non-gst')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition active:scale-95 ${invoiceType === 'non-gst' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground dark:hover:text-white'}`}
          >
            Non-GST Invoice
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Success!</span> {successMsg}
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-green-800 font-bold hover:scale-105">✕</button>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-3 font-bold">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            Billing Validation Error
          </div>
          <ul className="list-disc pl-8 text-sm">
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {/* Main Grid: Input Details (Left) & Bill Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Invoice Details & Product Entry */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Customer Metadata Card */}
          <div className="bg-card text-card-foreground border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold flex items-center gap-2 text-primary">
                <User className="h-5 w-5" />
                Customer Information
              </h3>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Optional</span>
            </div>

            <div className="space-y-3">
              {/* Phone */}
              <div className="relative">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
                  <input 
                    type="tel"
                    placeholder="Enter 10-digit mobile"
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background"
                  />
                </div>

                {/* Autocomplete suggestions */}
                {showCustomerSug && customers.filter(c => c.phone.includes(customerPhone)).length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-card border rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y">
                    {customers.filter(c => c.phone.includes(customerPhone)).map(c => (
                      <button 
                        key={c.phone}
                        onClick={() => selectCustomer(c)}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-muted text-xs flex justify-between items-center"
                      >
                        <span className="font-bold">{c.name}</span>
                        <span className="text-muted-foreground">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Customer Name</label>
                <input 
                  type="text"
                  placeholder="Enter full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background"
                />
              </div>

              {/* Business GSTIN (only shown for GST Invoice) */}
              {invoiceType === 'gst' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Business GSTIN <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter Business GSTIN (e.g. 07AAAAA1111A1Z2)"
                    value={billingGstin}
                    onChange={(e) => setBillingGstin(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background font-bold tracking-wider"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Product Search & Entry Card */}
          <div className="bg-card text-card-foreground border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-primary border-b pb-2">
              <Search className="h-5 w-5" />
              Add Products to Bill
            </h3>

            {/* Product Search Input */}
            <div className="relative">
              <input 
                type="text"
                placeholder="Type bulb, wire, switch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background font-medium"
              />
              <Search className="absolute right-3 top-3 text-muted-foreground h-5 w-5" />

              {/* Search Suggestions dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-card border rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y">
                  {searchResults.map((product, idx) => (
                    <button 
                      key={product.id}
                      onClick={() => handleAddProduct(product, '1')}
                      className={`w-full text-left px-4 py-3 hover:bg-muted flex justify-between items-center ${activeSearchIndex === idx ? 'bg-muted' : ''}`}
                    >
                      <div>
                        <p className="font-semibold text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Category: {product.category}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-primary block">{shopDetails.currency}{product.sellingPrice}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${product.stock <= product.lowStockLimit ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                          Stock: {product.stock} {product.unit}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Voice Command Billing */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-dashed flex flex-col items-center justify-center text-center relative overflow-hidden">
              {isVoiceListening && (
                <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
              )}
              
              <button 
                onClick={toggleVoiceBilling}
                className={`p-3 rounded-full flex items-center justify-center transition active:scale-95 shadow ${isVoiceListening ? 'bg-red-500 text-white animate-bounce' : 'bg-primary text-white hover:bg-blue-600'}`}
              >
                {isVoiceListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              
              <p className="text-xs font-bold mt-2">
                {isVoiceListening ? 'Listening...' : 'Voice Smart Billing (Pro)'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 max-w-[280px]">
                {voiceTranscript || 'Tap mic and say "Add 5 LED Bulb 9W" or "Generate bill"'}
              </p>
            </div>
          </div>

          {/* Smart Complementary Suggestions */}
          <div className="bg-card text-card-foreground border rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
              Smart Recommendations
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {getSmartSuggestions().map(prod => (
                <button
                  key={prod.id}
                  onClick={() => handleAddProduct(prod, '1')}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border hover:bg-muted text-left rounded-xl transition flex flex-col justify-between h-20 active:scale-95"
                >
                  <span className="text-[11px] font-bold line-clamp-2 leading-tight">{prod.name}</span>
                  <div className="flex justify-between items-center w-full mt-1 border-t pt-1 border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-black text-primary">{shopDetails.currency}{prod.sellingPrice}</span>
                    <Plus className="h-3.5 w-3.5 text-primary bg-blue-100 dark:bg-blue-950 p-0.5 rounded-full shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Invoice Items Table & Invoice Summary */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card text-card-foreground border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold flex items-center gap-2 text-primary">
                  <FileText className="h-5 w-5" />
                  Current Invoice Items
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">INV NO: {invoiceNumber}</p>
              </div>
              
              <button 
                onClick={handleResetBill}
                className="text-xs text-muted-foreground hover:text-red-500 font-bold flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border px-3 py-1.5 rounded-lg active:scale-95 transition"
              >
                <RefreshCw className="h-3 w-3" />
                Reset Bill
              </button>
            </div>

            {/* Bill Cart Table */}
            {billItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <Sparkles className="h-10 w-10 text-slate-300 animate-pulse mb-3" />
                <p className="font-bold text-sm">Invoice is empty</p>
                <p className="text-xs max-w-xs mt-1">Search and select items or use voice command to start billing!</p>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground font-bold">
                      <th className="text-left pb-2 font-semibold">Item</th>
                      <th className="text-center pb-2 w-20 font-semibold">Qty</th>
                      <th className="text-right pb-2 font-semibold">Rate</th>
                      {invoiceType === 'gst' && <th className="text-right pb-2 font-semibold">GST</th>}
                      <th className="text-right pb-2 font-semibold">Total</th>
                      <th className="text-center pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {billItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/40">
                        <td className="py-3">
                          <p className="font-bold text-sm">{item.productName}</p>
                          <span className="text-[9px] text-muted-foreground uppercase bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                            {item.unit}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <input 
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            className="w-16 px-1.5 py-1 border rounded text-center font-bold bg-background text-xs"
                          />
                        </td>
                        <td className="py-3 text-right font-semibold">
                          {shopDetails.currency}{item.sellingPrice.toFixed(2)}
                        </td>
                        {invoiceType === 'gst' && (
                          <td className="py-3 text-right text-[10px] text-muted-foreground">
                            {item.gstRate}%
                            <span className="block text-[8px]">({shopDetails.currency}{item.gstAmount.toFixed(2)})</span>
                          </td>
                        )}
                        <td className="py-3 text-right font-bold text-sm">
                          {shopDetails.currency}{item.subtotal.toFixed(2)}
                        </td>
                        <td className="py-3 text-center">
                          <button 
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700 active:scale-95 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bill Summary Calculations */}
            {billItems.length > 0 && (
              <div className="border-t pt-4 mt-auto space-y-4">
                
                {/* Inputs for Discount & Payment */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Discount */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <Percent className="h-3.5 w-3.5" />
                      Discount %
                    </label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent || ''}
                      placeholder="0"
                      onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full px-3 py-1.5 border rounded-xl text-xs font-bold bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <CreditCard className="h-3.5 w-3.5" />
                      Payment Mode
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full px-3 py-1.5 border rounded-xl text-xs font-bold bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI Payment</option>
                      <option value="Card">Credit/Debit Card</option>
                      <option value="Credit">Udhaar / Credit</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Rows */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border space-y-2">
                  {invoiceType === 'gst' ? (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Taxable Amount (Excl. Tax):</span>
                        <span>{shopDetails.currency}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>GST Tax (CGST + SGST):</span>
                        <span>{shopDetails.currency}{gstTotal.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>{shopDetails.currency}{(subtotal + discount).toFixed(2)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-green-600 font-medium">
                      <span>Discount Amount:</span>
                      <span>-{shopDetails.currency}{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Round Off:</span>
                    <span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black border-t pt-2 border-slate-200 dark:border-slate-800">
                    <span className="text-primary">GRAND TOTAL:</span>
                    <span className="text-primary">{shopDetails.currency}{grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground italic border-t pt-1 mt-1 border-dashed">
                    {amountInWords}
                  </div>
                </div>

                {/* Submit Action */}
                <button 
                  onClick={handleSaveInvoice}
                  className="w-full bg-primary hover:bg-blue-600 active:scale-98 text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg glow-primary"
                >
                  <FileText className="h-5 w-5" />
                  Save & Generate Bill (Download PDF)
                </button>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* Share / Success Modal */}
      {showShareModal && generatedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-5">
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-green-100 dark:bg-green-950 text-green-600 rounded-full">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="font-extrabold text-xl">Bill Saved Successfully!</h3>
              <p className="text-xs text-muted-foreground">Invoice: <span className="font-bold">{generatedInvoice.invoiceNumber}</span></p>
              <p className="text-xs text-muted-foreground">Total Paid: <span className="font-extrabold text-sm text-primary">{shopDetails.currency}{generatedInvoice.grandTotal}</span></p>
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-[10px] text-center font-semibold text-muted-foreground uppercase tracking-wide">Share via WhatsApp</p>
              <a 
                href={getWhatsAppShareLink()}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Share2 className="h-4.5 w-4.5" />
                Share on WhatsApp
              </a>
              
              <button 
                onClick={() => handleDownloadPDF(generatedInvoice)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-muted active:scale-95 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition border"
              >
                <FileText className="h-4.5 w-4.5" />
                Re-download PDF
              </button>
            </div>

            <button 
              onClick={handleResetBill}
              className="w-full bg-primary hover:bg-blue-600 active:scale-95 text-white font-bold py-2.5 rounded-xl transition"
            >
              Start New Bill
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
