import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../contexts/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  ScanLine, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  CircleDollarSign, 
  Users, 
  Printer, 
  FileDown, 
  RotateCcw,
  ShoppingBag,
  Maximize2,
  AlertCircle
} from "lucide-react";
import jsPDF from "jspdf";
import { Product, Customer } from "../types";

export default function POS() {
  const { 
    products, 
    customers, 
    settings, 
    currentUser, 
    checkout, 
    t, 
    language, 
    currency = settings.currency 
  } = useApp();

  // State managers
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "split">("cash");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // Alert message hooks
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Active checkout bill popup
  const [checkedOutBill, setCheckedOutBill] = useState<any | null>(null);

  // Ref to barcode hidden focus input
  const barcodeFocusRef = useRef<HTMLInputElement>(null);

  // Extract Categories
  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  // Filter products by query and selection
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    const normLine = (p.name + " " + p.nameEn + " " + p.sku).toLowerCase();
    const matchesQuery = normLine.includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Handle automatic barcode reader inputs (whenever a barcode sequence completes)
  const handleBarcodeSubmit = (skuText: string) => {
    if (!skuText.trim()) return;
    const match = products.find((p) => p.sku === skuText.trim());
    if (match) {
      addToCart(match);
      setBarcodeInput("");
      // show flashing notification
      triggerWarning(language === "ar" ? `تم المسح: ${match.name}` : `Scanned: ${match.nameEn}`);
    } else {
      triggerWarning(language === "ar" ? "رمز الباركود غير مسجل!" : "Barcode not registered!");
    }
  };

  // Helper trigger inline notices
  const triggerWarning = (msg: string) => {
    setWarningMsg(msg);
    setTimeout(() => setWarningMsg(null), 3000);
  };

  // 1. Add to basket
  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      triggerWarning(language === "ar" ? "المخزون نفد تماماً!" : "Stock is fully completed!");
      return;
    }

    setCart((prev) => {
      const matchIndex = prev.findIndex((item) => item.product.id === product.id);
      if (matchIndex > -1) {
        const item = prev[matchIndex];
        if (item.quantity >= product.quantity) {
          triggerWarning(t("low_qty_warning"));
          return prev;
        }
        const copy = [...prev];
        copy[matchIndex] = { ...item, quantity: item.quantity + 1 };
        return copy;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // 2. Decrement basket item count
  const decrementCart = (productId: string) => {
    setCart((prev) => {
      const matchIndex = prev.findIndex((item) => item.product.id === productId);
      if (matchIndex === -1) return prev;
      
      const item = prev[matchIndex];
      const copy = [...prev];
      if (item.quantity <= 1) {
        copy.splice(matchIndex, 1);
      } else {
        copy[matchIndex] = { ...item, quantity: item.quantity - 1 };
      }
      return copy;
    });
  };

  // 3. Remove item inside card
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // 4. Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const taxRate = settings.taxRate || 15; // default 15
  
  // Tax is calculated inclusive of pricing, or added on top. Let's do added on top (exclusive VAT)
  const taxAmount = (subtotal - discountValue) * (taxRate / 100);
  const totalAmount = Math.max(0, subtotal - discountValue + taxAmount);

  // Instantly reset checkout fields
  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId("");
    setDiscountValue(0);
    setReceivedAmount("");
  };

  // Change amount
  const changeAmt = Number(receivedAmount) ? Math.max(0, Number(receivedAmount) - totalAmount) : 0;

  // 5. Checkout click action
  const handlePayCheckout = async () => {
    if (cart.length === 0) return;
    
    // Validate split / debit payment
    const doubleReceived = Number(receivedAmount) || 0;
    if (paymentMethod === "cash" && doubleReceived < totalAmount) {
      triggerWarning(language === "ar" ? "المبلغ المستلم أقل من الإجمالي!" : "Received cash is less than payable!");
      return;
    }

    const customerObj = customers.find((c) => c.id === selectedCustomerId);
    
    const checkoutPayload = {
      customerId: selectedCustomerId || undefined,
      customerName: customerObj ? customerObj.name : t("unknown_customer"),
      total: Number(totalAmount.toFixed(2)),
      tax: Number(taxAmount.toFixed(2)),
      discount: discountValue,
      paymentMethod,
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        nameEn: item.product.nameEn,
        price: item.product.price,
        quantity: item.quantity,
      })),
      received: paymentMethod === "cash" ? doubleReceived : totalAmount,
      change: paymentMethod === "cash" ? Number(changeAmt.toFixed(2)) : 0,
    };

    const savedSale = await checkout(checkoutPayload);
    if (savedSale) {
      setCheckedOutBill(savedSale);
      clearCart();
    }
  };

  // Generate jsPDF invoice download
  const handleSaveBillPDF = (saleBill: any) => {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 150], // thermal dimensions
    });

    // Custom pure client-side PDF template for multilingual
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    
    // Header
    const isEn = language === "en";
    const title = isEn ? settings.storeNameEn : settings.storeName;
    doc.text(title, 40, 10, { align: "center" });
    
    doc.setFontSize(7);
    doc.text(isEn ? "INVOICE OF SALE" : "فاتورة مبيعات مبسطة", 40, 14, { align: "center" });
    doc.text(`Invoice: ${saleBill.invoiceNumber}`, 5, 20);
    doc.text(`Date: ${new Date(saleBill.date).toLocaleString()}`, 5, 24);
    doc.text(`Cashier: ${saleBill.cashierName}`, 5, 28);
    doc.text(`Customer: ${saleBill.customerName}`, 5, 32);
    
    doc.setLineWidth(0.1);
    doc.line(5, 34, 75, 34);

    // Items table headers
    doc.text(isEn ? "Item description" : "الصنف", 5, 38);
    doc.text("Qty", 50, 38);
    doc.text("Price", 60, 38);
    doc.text("Total", 70, 38);
    doc.line(5, 40, 75, 40);

    let y = 44;
    saleBill.items.forEach((item: any) => {
      // Due to Arabic PDF glyph limitations on standard jsPDF, we write transliterated / English name
      const displayName = isEn ? item.nameEn : (item.nameEn || item.name);
      doc.text(displayName.substring(0, 22), 5, y);
      doc.text(`${item.quantity}`, 50, y);
      doc.text(`${item.price.toFixed(1)}`, 60, y);
      const rowTotal = item.price * item.quantity;
      doc.text(`${rowTotal.toFixed(1)}`, 70, y);
      y += 4;
    });

    doc.line(5, y, 75, y);
    y += 4;
    doc.text(isEn ? "Subtotal:" : "المجموع الفرعي:", 35, y);
    doc.text(`${(saleBill.total - saleBill.tax + saleBill.discount).toFixed(2)} ${currency}`, 55, y);
    
    y += 4;
    doc.text(isEn ? "Discount:" : "الخصم:", 35, y);
    doc.text(`${saleBill.discount.toFixed(2)} ${currency}`, 55, y);

    y += 4;
    doc.text(isEn ? "Tax (VAT):" : "الضريبة المضافة:", 35, y);
    doc.text(`${saleBill.tax.toFixed(2)} ${currency}`, 55, y);

    y += 4;
    doc.setFontSize(8);
    doc.text(isEn ? "Grand Total:" : "المجموع النهائي:", 35, y);
    doc.text(`${saleBill.total.toFixed(2)} ${currency}`, 55, y);

    y += 5;
    doc.setFontSize(7);
    doc.text(isEn ? "Received Cash:" : "مسدد نقداً:", 35, y);
    doc.text(`${saleBill.received.toFixed(2)} ${currency}`, 55, y);

    y += 4;
    doc.text(isEn ? "Refund Cash:" : "متبقي للمستهلك:", 35, y);
    doc.text(`${saleBill.change.toFixed(2)} ${currency}`, 55, y);

    y += 8;
    doc.text(isEn ? "Thank you for shopping with us!" : "شكراً لزيارتكم وشرائكم!", 40, y, { align: "center" });

    doc.save(`Invoice_${saleBill.invoiceNumber}.pdf`);
  };

  // Direct physical print triggers
  const triggerThermalPrint = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top action layout: search product grid / category slide + barcode simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* RIGHT COLLUMN (8/12): Search & Filter, Products Grid */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="glass-bg neumorphic-flat p-4 rounded-3xl border flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input Box */}
            <div className="relative w-full md:max-w-md">
              <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="pos-search-input"
                type="text"
                placeholder={t("search_product")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-xs font-semibold"
              />
            </div>

            {/* Simulated Barcode hardware Scanner Gun input container */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-blue-50 border border-blue-150 shrink-0 text-blue-600">
                <ScanLine className="w-4 h-4 text-blue-500 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-tight">Scanner</span>
              </div>
              <input
                id="pos-barcode-feed"
                type="text"
                placeholder={language === "ar" ? "باركود يدوي..." : "SKU manual..."}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleBarcodeSubmit(barcodeInput);
                  }
                }}
                className="w-full md:w-32 px-3 py-2 rounded-2xl bg-slate-50/60 border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 text-xs font-mono font-medium text-slate-700"
              />
              <button
                id="pos-scan-simulator"
                onClick={() => handleBarcodeSubmit(barcodeInput)}
                className="px-3 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs neumorphic-btn"
              >
                {t("simulate_scan")}
              </button>
            </div>
          </div>

          {/* Warning banner flash pop */}
          <AnimatePresence>
            {warningMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3 blue-glass-panel rounded-2xl text-blue-800 text-xs font-bold flex items-center justify-center gap-2 border"
              >
                <AlertCircle className="w-4 h-4 text-blue-600 animate-bounce" />
                <span>{warningMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories Filters Bubble Slidings */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {categories.map((cat) => (
              <button
                id={`pos-cat-${cat}`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold capitalize whitespace-nowrap neumorphic-btn ${
                  selectedCategory === cat
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                    : "glass-bg border border-slate-200 text-slate-600"
                }`}
              >
                {cat === "all" ? (language === "ar" ? "الكل" : "All") : cat}
              </button>
            ))}
          </div>

          {/* Active Product Grid Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 font-medium">
                {t("no_data_available")}
              </div>
            ) : (
              filteredProducts.map((p) => {
                const stockEmpty = p.quantity <= 0;
                const lowStock = p.quantity <= p.minQuantity;
                return (
                  <motion.div
                    key={p.id}
                    whileHover={!stockEmpty ? { y: -3 } : {}}
                    onClick={() => !stockEmpty && addToCart(p)}
                    className={`relative overflow-hidden cursor-pointer p-3.5 rounded-3xl flex flex-col justify-between border ${
                      stockEmpty 
                        ? "bg-slate-200/50 border-slate-350 opacity-60 cursor-not-allowed" 
                        : "glass-bg neumorphic-flat hover:border-blue-400 transition"
                    }`}
                  >
                    {/* Floating alerts bubble badge */}
                    {stockEmpty ? (
                      <span className="absolute top-2 right-2 text-[8px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-lg uppercase z-10">
                        Out of stock
                      </span>
                    ) : lowStock ? (
                      <span className="absolute top-2 right-2 text-[8px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg uppercase z-10">
                        Low Stock: {p.quantity}
                      </span>
                    ) : (
                      <span className="absolute top-2 right-2 text-[8px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200/50 px-2 py-0.5 rounded-lg font-mono z-10">
                        {p.quantity} {t("item_singular")}
                      </span>
                    )}

                    {/* Standard visual placeholder */}
                    <div className="w-full h-24 rounded-2xl flex items-center justify-center bg-slate-100 mb-3 border border-slate-200/40 select-none">
                      <ShoppingBag className="w-10 h-10 text-slate-400/50" />
                    </div>

                    <div className="text-right">
                      <h4 className="text-xs font-bold text-slate-750 truncate">
                        {language === "ar" ? p.name : p.nameEn}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono tracking-tight block">SKU: {p.sku}</span>
                      
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/30">
                        <span className="text-[9px] text-slate-500 font-medium">{p.category}</span>
                        <span className="text-xs font-bold text-blue-600 font-sans">
                          {p.price.toFixed(2)} <span className="text-[10px] font-normal">{currency}</span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* LEFT COLUMN (4/12): Reactive Basket & Invoice calculations checkout */}
        <div className="lg:col-span-5 xl:col-span-4 glass-bg neumorphic-flat p-5 rounded-3xl border flex flex-col justify-between max-h-[720px] overflow-visible">
          
          {/* Header Cart Titles */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-3">
            <h3 className="text-sm font-bold text-slate-750 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-blue-500" />
              <span>{t("pos")}</span>
            </h3>
            <button
              id="pos-clear-cart"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex items-center gap-1 text-[10px] font-bold text-red-500 px-2 py-1 rounded-xl bg-red-50 border border-red-150 disabled:opacity-45 disabled:cursor-not-allowed hover:bg-red-100/50 cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t("logout").split(" ")[0]} السلة</span>
            </button>
          </div>

          {/* List of Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[220px] pr-1 pb-2 border-b border-slate-100 mb-3">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-slate-300 stroke-[1.2] mb-2" />
                <p className="text-xs font-medium">{t("cart_empty")}</p>
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={item.product.id} 
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white/60 border border-slate-200/50"
                >
                  <div className="min-w-0 pr-1 text-right">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {language === "ar" ? item.product.name : item.product.nameEn}
                    </p>
                    <span className="text-[10px] font-bold text-blue-600 font-sans">
                      {item.product.price.toFixed(2)} <span className="text-[9px] font-normal">{currency}</span>
                    </span>
                  </div>

                  {/* Quantity adjustments minus / count / plus */}
                  <div className="flex items-center gap-2">
                    <button
                      id={`pos-dec-${item.product.id}`}
                      onClick={() => decrementCart(item.product.id)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 border text-slate-600 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-slate-800 font-sans px-1">{item.quantity}</span>
                    <button
                      id={`pos-inc-${item.product.id}`}
                      onClick={() => addToCart(item.product.type || item.product)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 border text-slate-600 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id={`pos-del-${item.product.id}`}
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Settings inputs: select customer / discount value */}
          <div className="space-y-3 pt-1 text-right">
            {/* Customer Association */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 px-1 flex items-center gap-1 justify-end">
                <span>{t("select_customer")}</span>
                <Users className="w-3 h-3 text-slate-400" />
              </label>
              <select
                id="pos-customer-select"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs font-semibold pr-3 pl-8 py-2 rounded-xl bg-slate-50 border border-slate-200"
              >
                <option value="">-- {t("unknown_customer")} --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Flat Discount Amount */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 px-1">
                {t("add_custom_discount")} ({currency})
              </label>
              <input
                id="pos-discount-input"
                type="number"
                min="0"
                max={subtotal}
                value={discountValue || ""}
                onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right"
              />
            </div>

            {/* Calculations summaries breakdown */}
            <div className="p-3 bg-slate-50/70 border border-slate-150 rounded-2xl space-y-1.5 font-medium text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>{t("subtotal")}</span>
                <span className="font-sans font-semibold">{subtotal.toFixed(2)} {currency}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex items-center justify-between text-red-600">
                  <span>{t("discount")}</span>
                  <span className="font-sans font-semibold">-{discountValue.toFixed(2)} {currency}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>{t("tax_vat")} ({taxRate}%)</span>
                <span className="font-sans font-semibold">{taxAmount.toFixed(2)} {currency}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 font-bold text-slate-800">
                <span>{t("payable_amount")}</span>
                <span className="font-sans text-sm text-blue-600">{totalAmount.toFixed(2)} {currency}</span>
              </div>
            </div>

            {/* Payment Method selector Cash vs Card vs split */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                id="pos-pay-cash"
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition ${
                  paymentMethod === "cash"
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <CircleDollarSign className="w-4 h-4" />
                <span>نقدي (Cash)</span>
              </button>

              <button
                id="pos-pay-card"
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`py-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition ${
                  paymentMethod === "card"
                    ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>شبكة (Card)</span>
              </button>

              <button
                id="pos-pay-split"
                type="button"
                onClick={() => setPaymentMethod("split")}
                className={`py-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 cursor-pointer transition ${
                  paymentMethod === "split"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>شغل آجل (Split)</span>
              </button>
            </div>

            {/* Received cash input refund calculation (only if Cash is active) */}
            {paymentMethod === "cash" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    {t("received_amount")}
                  </label>
                  <input
                    id="pos-received-input"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-right"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    {t("change_amount")}
                  </label>
                  <div className="w-full text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 border text-slate-600 text-right font-sans">
                    {changeAmt.toFixed(2)} {currency}
                  </div>
                </div>
              </div>
            )}

            {/* Execute Check button */}
            <button
              id="pos-execute-checkout"
              onClick={handlePayCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 mt-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-md neumorphic-btn disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t("checkout_print")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bill receipt printer modal popup */}
      <AnimatePresence>
        {checkedOutBill && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full font-medium text-slate-800 text-xs text-right overflow-hidden relative border"
            >
              {/* Receipt Virtual Sheet wrapper */}
              <div id="thermal-rendered-bill" className="bg-white p-3 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-4">
                
                {/* Store layout logo */}
                <div>
                  <h3 className="text-md font-bold text-slate-800">
                    {language === "ar" ? settings.storeName : settings.storeNameEn}
                  </h3>
                  <span className="block text-[10px] text-slate-400">{t("invoice_no")}: {checkedOutBill.invoiceNumber}</span>
                  <span className="block text-[9px] text-slate-400 font-mono">
                    {new Date(checkedOutBill.date).toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-b border-light border-dashed py-2 space-y-1 text-slate-600/90 text-right text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>{t("cashier")}</span>
                    <span className="font-semibold">{checkedOutBill.cashierName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t("customer")}</span>
                    <span className="font-semibold">{checkedOutBill.customerName}</span>
                  </div>
                </div>

                {/* Items rows */}
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center justify-between font-bold border-b pb-1 text-slate-500">
                    <span className="w-1/2 text-right">الصنف (Item)</span>
                    <span className="w-1/6 text-center">الكمية</span>
                    <span className="w-1/6 text-left">السعر</span>
                    <span className="w-1/6 text-left">إجمالي</span>
                  </div>

                  {checkedOutBill.items.map((it: any) => (
                    <div key={it.productId} className="flex items-center justify-between text-slate-700">
                      <span className="w-1/2 text-right font-semibold truncate leading-tight">
                        {language === "ar" ? it.name : it.nameEn}
                      </span>
                      <span className="w-1/6 text-center font-bold font-sans">{it.quantity}</span>
                      <span className="w-1/6 text-left font-sans">{it.price.toFixed(1)}</span>
                      <span className="w-1/6 text-left font-sans font-bold">{(it.price * it.quantity).toFixed(1)}</span>
                    </div>
                  ))}
                </div>

                {/* Total receipt calculations */}
                <div className="border-t border-dashed pt-2 space-y-1 text-[11px] text-right">
                  <div className="flex items-center justify-between text-slate-550">
                    <span>{t("subtotal")}</span>
                    <span className="font-sans font-bold">{(checkedOutBill.total - checkedOutBill.tax + checkedOutBill.discount).toFixed(2)} {currency}</span>
                  </div>
                  {checkedOutBill.discount > 0 && (
                    <div className="flex items-center justify-between text-red-600">
                      <span>{t("discount")}</span>
                      <span className="font-sans font-bold">-{checkedOutBill.discount.toFixed(2)} {currency}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-550">
                    <span>{t("tax_vat")} ({settings.taxRate}%)</span>
                    <span className="font-sans font-bold">{checkedOutBill.tax.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex items-center justify-between font-extrabold text-xs text-blue-600 pt-1 border-t">
                    <span>{t("total")}</span>
                    <span className="font-sans">{checkedOutBill.total.toFixed(2)} {currency}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 border-t border-dashed pt-1 mt-1 text-[10px]">
                    <span>{t("received_amount")}</span>
                    <span className="font-sans font-bold">{checkedOutBill.received.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 text-[10px]">
                    <span>{t("change_amount")}</span>
                    <span className="font-sans font-bold">{checkedOutBill.change.toFixed(2)} {currency}</span>
                  </div>
                </div>

                {/* Bill bottom notices barcoding barcode visual representation */}
                <div className="flex flex-col items-center justify-center pt-3 border-t">
                  <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
                  <span className="text-[8px] font-mono mt-1 text-slate-400">*{checkedOutBill.invoiceNumber}*</span>
                </div>
              </div>

              {/* Popup Action buttons */}
              <div className="mt-5 grid grid-cols-3 gap-2 select-none">
                <button
                  id="bill-print"
                  onClick={triggerThermalPrint}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold hover:shadow-md cursor-pointer transition text-[9px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة حرارية</span>
                </button>

                <button
                  id="bill-pdf-download"
                  onClick={() => handleSaveBillPDF(checkedOutBill)}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold hover:shadow-md cursor-pointer transition text-[9px]"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تحميل PDF</span>
                </button>

                <button
                  id="bill-pop-dismiss"
                  onClick={() => setCheckedOutBill(null)}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold hover:shadow-sm cursor-pointer transition text-[9px]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>إغلاق الفاتورة</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
