import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '../db/db';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  ShoppingBag,
  Copy
} from 'lucide-react';

interface InventoryProps {
  currencySymbol: string;
}

export const Inventory: React.FC<InventoryProps> = ({ currencySymbol }) => {
  // DB query for products
  const products = useLiveQuery(() => db.products.toArray()) || [];

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'Out'>('All');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [unit, setUnit] = useState('pieces');
  const [gstRate, setGstRate] = useState('18');
  const [stock, setStock] = useState('');
  const [lowStockLimit, setLowStockLimit] = useState('');
  const [supplierName, setSupplierName] = useState('');

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    let matchesStock = true;
    if (stockFilter === 'Low') {
      matchesStock = p.stock <= p.lowStockLimit;
    } else if (stockFilter === 'Out') {
      matchesStock = p.stock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Open modal for Adding
  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Lighting');
    setSku('');
    setPurchasePrice('');
    setSellingPrice('');
    setUnit('pieces');
    setGstRate('18');
    setStock('');
    setLowStockLimit('10');
    setSupplierName('');
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const openEditModal = (p: Product) => {
    if (!p.id) return;
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setSku(p.sku || '');
    setPurchasePrice(String(p.purchasePrice));
    setSellingPrice(String(p.sellingPrice));
    setUnit(p.unit);
    setGstRate(String(p.gstRate));
    setStock(String(p.stock));
    setLowStockLimit(String(p.lowStockLimit));
    setSupplierName(p.supplierName || '');
    setIsModalOpen(true);
  };

  // Open modal for copying/duplicating product
  const openCopyModal = (p: Product) => {
    setEditingProduct(null);
    setName(`${p.name} - Copy`);
    setCategory(p.category);
    setSku(p.sku ? `${p.sku}-copy` : '');
    setPurchasePrice(String(p.purchasePrice));
    setSellingPrice(String(p.sellingPrice));
    setUnit(p.unit);
    setGstRate(String(p.gstRate));
    setStock(String(p.stock));
    setLowStockLimit(String(p.lowStockLimit));
    setSupplierName(p.supplierName || '');
    setIsModalOpen(true);
  };

  // Delete product
  const handleDeleteProduct = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      await db.products.delete(id);
    }
  };

  // Save product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !category || !sellingPrice || !stock) {
      alert("Please fill in all mandatory fields.");
      return;
    }

    const prodData: Product = {
      name: name.trim(),
      category: category.trim(),
      sku: sku.trim() || undefined,
      purchasePrice: parseFloat(purchasePrice) || 0,
      sellingPrice: parseFloat(sellingPrice),
      unit: unit,
      gstRate: parseFloat(gstRate) || 0,
      stock: parseFloat(stock) || 0,
      lowStockLimit: parseFloat(lowStockLimit) || 0,
      supplierName: supplierName.trim() || undefined,
      updatedAt: Date.now()
    };

    try {
      if (editingProduct && editingProduct.id) {
        await db.products.update(editingProduct.id, prodData);
      } else {
        await db.products.add(prodData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving product: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Inventory Catalog</h1>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
            Manage your electrical products stock, pricing, and tax details.
          </p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-primary hover:bg-blue-600 active:scale-95 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-1.5 transition shadow"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Product
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-card text-card-foreground p-4 border rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Search bar */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-3 text-muted-foreground h-4.5 w-4.5" />
            <input 
              type="text"
              placeholder="Search by name, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold text-muted-foreground"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat} Category</option>
              ))}
            </select>
          </div>

          {/* Stock filters */}
          <div className="md:col-span-3 flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border">
            <button 
              onClick={() => setStockFilter('All')}
              className={`flex-1 text-[10px] md:text-xs font-bold py-1.5 rounded-lg transition ${stockFilter === 'All' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}
            >
              All
            </button>
            <button 
              onClick={() => setStockFilter('Low')}
              className={`flex-1 text-[10px] md:text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-0.5 ${stockFilter === 'Low' ? 'bg-card text-red-500 shadow' : 'text-muted-foreground'}`}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              Low Stock
            </button>
            <button 
              onClick={() => setStockFilter('Out')}
              className={`flex-1 text-[10px] md:text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-0.5 ${stockFilter === 'Out' ? 'bg-card text-red-700 shadow' : 'text-muted-foreground'}`}
            >
              Out
            </button>
          </div>

        </div>
      </div>

      {/* Catalog Table Card */}
      <div className="bg-card text-card-foreground border rounded-2xl shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
            <p className="font-bold text-sm text-muted-foreground">No products found</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing filters or add a new product.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b text-muted-foreground font-extrabold text-[10px] uppercase tracking-wider">
                  <th className="text-left px-5 py-3.5">Product Details</th>
                  <th className="text-left px-4 py-3.5">Category</th>
                  <th className="text-right px-4 py-3.5">Purchase Rate</th>
                  <th className="text-right px-4 py-3.5">Selling Rate</th>
                  <th className="text-center px-4 py-3.5">GST Rate</th>
                  <th className="text-center px-4 py-3.5">Stock Status</th>
                  <th className="text-center px-5 py-3.5 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map(p => {
                  const isLow = p.stock <= p.lowStockLimit;
                  const isOut = p.stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      
                      {/* Name and SKU */}
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-sm text-foreground">{p.name}</p>
                        <div className="flex gap-2 items-center mt-1">
                          {p.sku && (
                            <span className="text-[9px] font-bold text-muted-foreground uppercase bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                              SKU: {p.sku}
                            </span>
                          )}
                          {p.supplierName && (
                            <span className="text-[9px] text-muted-foreground">
                              Supplier: {p.supplierName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 font-bold text-muted-foreground">
                        {p.category}
                      </td>

                      {/* Purchase Price */}
                      <td className="px-4 py-3.5 text-right font-semibold text-muted-foreground">
                        {currencySymbol}{p.purchasePrice.toFixed(2)}
                      </td>

                      {/* Selling Price */}
                      <td className="px-4 py-3.5 text-right font-extrabold text-sm text-primary">
                        {currencySymbol}{p.sellingPrice.toFixed(2)}
                      </td>

                      {/* GST */}
                      <td className="px-4 py-3.5 text-center font-bold">
                        {p.gstRate}%
                      </td>

                      {/* Stock Level */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-black text-sm ${isOut ? 'text-red-700' : isLow ? 'text-red-500' : 'text-green-600'}`}>
                            {p.stock} {p.unit}
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            limit: {p.lowStockLimit}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-90"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => openCopyModal(p)}
                            className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-90"
                            title="Duplicate/Copy"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => p.id && handleDeleteProduct(p.id)}
                            className="p-1.5 rounded-lg border border-red-200 dark:border-red-950 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition active:scale-90"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-extrabold text-lg border-b pb-2 mb-4">
              {editingProduct ? 'Edit Product Details' : name.includes('Copy') ? 'Copy / Add Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* Product Name */}
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Product Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Havells MCB 16A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Category *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Switchgear"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    list="cat-datalist"
                  />
                  <datalist id="cat-datalist">
                    <option value="Lighting" />
                    <option value="Wires" />
                    <option value="Switches" />
                    <option value="Switchgear" />
                    <option value="Accessories" />
                  </datalist>
                </div>

                {/* SKU */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">SKU / Model (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. HV-16A"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Purchase Price */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1 font-semibold">Purchase Price ({currencySymbol})</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1 font-semibold">Selling Price ({currencySymbol}) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Unit */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Unit of Measure *</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="pieces">pieces</option>
                    <option value="meters">meters</option>
                    <option value="coil">coil</option>
                    <option value="boxes">boxes</option>
                    <option value="kg">kg</option>
                    <option value="litre">litre</option>
                  </select>
                </div>

                {/* GST */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">GST Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Current Stock */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Current Stock *</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>

                {/* Low Stock Limit */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Low Stock Alert *</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="10"
                    value={lowStockLimit}
                    onChange={(e) => setLowStockLimit(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>
              </div>

              {/* Supplier Name */}
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Supplier Name (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. Havells Delhi Distributors"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-slate-200 font-bold py-2.5 rounded-xl text-xs transition border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs transition shadow glow-primary"
                >
                  Save Product
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
