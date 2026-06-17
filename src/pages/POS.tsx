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
// @ts-ignore
import printJS from "print-js";
// @ts-ignore
import html2canvas from "html2canvas";
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

  // New States for Custom Print Preview & verification with printJS
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewPaperWidth, setPreviewPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [includeReceiptLogo, setIncludeReceiptLogo] = useState(true);
  const [includeCashierName, setIncludeCashierName] = useState(true);
  const [includeCustomerName, setIncludeCustomerName] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includeQRCode, setIncludeQRCode] = useState(true);
  const [includeFooterMsg, setIncludeFooterMsg] = useState(true);

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

  // Generate jsPDF invoice download using html2canvas to perfectly support RTL Arabic shaping
  const handleSaveBillPDF = (saleBill: any) => {
    if (!saleBill) return;

    // Use a small delay to make sure the offscreen element is fully populated
    setTimeout(async () => {
      const element = document.getElementById("pdf-receipt-target");
      if (!element) return;

      try {
        const canvas = await html2canvas(element, {
          scale: 3.0, // High DPI rendering for absolutely crisp printing text output
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 1.0);

        // Standard thermal width: 80mm
        const pdfWidth = 80;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [pdfWidth, pdfHeight],
        });

        doc.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
        doc.save(`Invoice_${saleBill.invoiceNumber}.pdf`);
      } catch (err) {
        console.error("Failed to generate PDF with html2canvas", err);
        
        // Robust fallback to simple text jsPDF output
        const doc = new jsPDF({
          unit: "mm",
          format: [80, 150],
        });
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        const isEn = language === "en";
        const title = isEn ? settings.storeNameEn : settings.storeName;
        doc.text(title, 40, 10, { align: "center" });
        doc.setFontSize(7);
        doc.text(`Invoice: ${saleBill.invoiceNumber}`, 5, 20);
        doc.text(`Date: ${new Date(saleBill.date).toLocaleString()}`, 5, 24);
        doc.save(`Invoice_${saleBill.invoiceNumber}.pdf`);
      }
    }, 150);
  };

  // Visual helper to draw black/white alternating lines mimicking barcode
  const renderMockBarcodeLines = (invoiceNumber: string) => {
    const hash = invoiceNumber || "INV-0000";
    const bars = [];
    for (let i = 0; i < Math.min(hash.length, 12); i++) {
      const charCode = hash.charCodeAt(i);
      bars.push(charCode % 2 === 0 ? "w-[1px] h-8 bg-black" : "w-[3px] h-8 bg-black");
      bars.push("w-[1.5px] h-8 bg-transparent");
    }
    return (
      <div className="flex items-center justify-center space-x-[0.5px] h-8 overflow-hidden select-none mb-1">
        {bars}
      </div>
    );
  };

  // Visual helper for rendering simulated simplified QR code
  const renderElegentQRCode = (invoiceNumber: string, total: number) => {
    return (
      <div className="w-16 h-16 bg-white p-1 border border-slate-200 rounded mx-auto flex items-center justify-center">
        <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
          <path d="M 0,0 h 30 v 30 h -30 z M 10,10 h 10 v 10 h -10 z" />
          <path d="M 70,0 h 30 v 30 h -30 z M 80,10 h 10 v 10 h -10 z" />
          <path d="M 0,70 h 30 v 30 h -30 z M 10,80 h 10 v 10 h -10 z" />
          <path d="M 40,40 h 10 v 10 h -10 z M 50,50 h 10 v 10 h -10 z M 40,60 h 10 v 10 h -10 z C 60,60 70,60 80,60 h 10 v 10 h -10 z" />
          <path d="M 40,10 h 10 v 10 h -10 z M 50,20 h 10 v 10 h -10 z M 50,0 h 10 v 10 h -10 z M 30,40 h 10 v 10 h -10 z" />
          <path d="M 10,40 h 10 v 10 h -10 z M 20,50 h 10 v 10 h -10 z M 0,50 h 10 v 10 h -10 z" />
          <path d="M 70,40 h 10 v 10 h -10 z M 80,50 h 10 v 10 h -10 z M 90,40 h 10 v 10 h -10 z" />
        </svg>
      </div>
    );
  };

  // Direct physical print triggers (using PrintJS on a beautifully styled layout container)
  const triggerPrintJSReceipt = () => {
    if (!checkedOutBill) return;
    printJS({
      printable: "printjs-receipt-target",
      type: "html",
      scanStyles: false,
      style: `
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            direction: ${language === "ar" ? "rtl" : "ltr"} !important;
            font-family: 'Courier New', Courier, monospace !important;
            -webkit-print-color-adjust: exact;
          }
          .print-receipt-sheet {
            width: ${previewPaperWidth === "58mm" ? "54mm" : "74mm"} !important;
            margin: 0 auto !important;
            padding: 4mm 2mm !important;
            box-sizing: border-box !important;
            text-align: center !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
          }
          .print-receipt-logo {
            font-size: 15px !important;
            font-weight: bold !important;
            margin: 0 0 3px 0 !important;
            text-align: center !important;
            text-transform: uppercase !important;
          }
          .print-receipt-sub {
            font-size: 10px !important;
            margin: 0 0 10px 0 !important;
            text-align: center !important;
          }
          .print-receipt-meta {
            font-size: 10px !important;
            margin-bottom: 8px !important;
            text-align: right !important;
          }
          .print-receipt-meta-row {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 2px !important;
          }
          .print-receipt-divider {
            border-top: 1px dashed #000000 !important;
            margin: 8px 0 !important;
            height: 0 !important;
            width: 100% !important;
          }
          .print-receipt-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
            margin: 8px 0 !important;
          }
          .print-receipt-table th {
            border-bottom: 1px dashed #000000 !important;
            padding-bottom: 4px !important;
            text-align: ${language === "ar" ? "right" : "left"} !important;
            font-weight: bold !important;
          }
          .print-receipt-table td {
            padding: 4px 0 !important;
            vertical-align: top !important;
          }
          .print-receipt-item-name {
            text-align: ${language === "ar" ? "right" : "left"} !important;
            width: 50% !important;
          }
          .print-receipt-item-qty {
            text-align: center !important;
            width: 15% !important;
          }
          .print-receipt-item-price {
            text-align: ${language === "ar" ? "left" : "right"} !important;
            width: 15% !important;
          }
          .print-receipt-item-total {
            text-align: ${language === "ar" ? "left" : "right"} !important;
            font-weight: bold !important;
            width: 20% !important;
          }
          .print-receipt-total-section {
            font-size: 10px !important;
            margin-top: 8px !important;
          }
          .print-receipt-total-row {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 3px !important;
          }
          .print-receipt-grand-total {
            display: flex !important;
            justify-content: space-between !important;
            font-size: 12px !important;
            font-weight: bold !important;
            border-top: 1px dashed #000000 !important;
            border-bottom: 1px dashed #000000 !important;
            padding: 6px 0 !important;
            margin: 6px 0 !important;
          }
          .print-receipt-barcode-wrap {
            margin-top: 12px !important;
            text-align: center !important;
          }
          .print-receipt-barcode-text {
            font-size: 8px !important;
            letter-spacing: 2px !important;
          }
          .print-receipt-footer {
            font-size: 9px !important;
            margin-top: 12px !important;
            text-align: center !important;
          }
          .align-right {
            text-align: right !important;
          }
          .align-left {
            text-align: left !important;
          }
          .align-center {
            text-align: center !important;
          }
        }
      `
    });
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
                  onClick={() => setShowPrintPreview(true)}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold hover:shadow-md cursor-pointer transition text-[9px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === "ar" ? "معاينة وتعديل" : "Layout Preview"}</span>
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

      {/* Hidden printer-friendly compilation container for PrintJS */}
      <div style={{ display: "none" }}>
        {checkedOutBill && (
          <div id="printjs-receipt-target" className="text-black bg-white font-mono text-[11px]" style={{ direction: language === "ar" ? "rtl" : "ltr" }}>
            <div className="print-receipt-sheet">
              {/* 1. Logo Header */}
              {includeReceiptLogo && (
                <>
                  <div className="print-receipt-logo" style={{ fontSize: "16px", fontWeight: "bold", textAlign: "center", margin: "0 0 2px 0" }}>
                    {language === "ar" ? settings.storeName : settings.storeNameEn}
                  </div>
                  <div className="print-receipt-sub" style={{ fontSize: "10px", textAlign: "center", margin: "0 0 8px 0" }}>
                    {language === "ar" ? "فاتورة ضريبية مبسطة" : "Simplified Tax Invoice"}
                  </div>
                </>
              )}

              {/* 2. Metadata details */}
              <div className="print-receipt-meta" style={{ fontSize: "10px", textAlign: "right", marginBottom: "8px" }}>
                <div className="print-receipt-meta-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span>{t("invoice_no")}:</span>
                  <span>{checkedOutBill.invoiceNumber}</span>
                </div>
                <div className="print-receipt-meta-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span>{t("date")}:</span>
                  <span>{new Date(checkedOutBill.date).toLocaleString()}</span>
                </div>
                {includeCashierName && (
                  <div className="print-receipt-meta-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>{t("cashier")}:</span>
                    <span>{checkedOutBill.cashierName}</span>
                  </div>
                )}
                {includeCustomerName && (
                  <div className="print-receipt-meta-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>{t("customer")}:</span>
                    <span>{checkedOutBill.customerName}</span>
                  </div>
                )}
              </div>

              <div className="print-receipt-divider" style={{ borderTop: "1px dashed #000000", margin: "6px 0", height: "0" }}></div>

              {/* 3. Items list */}
              <table className="print-receipt-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", margin: "6px 0" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed #000000" }}>
                    <th className="align-right" style={{ width: "45%", paddingBottom: "4px", textAlign: language === "ar" ? "right" : "left", fontWeight: "bold" }}>{language === "ar" ? "الصنف" : "Item"}</th>
                    <th className="align-center" style={{ width: "15%", paddingBottom: "4px", textAlign: "center", fontWeight: "bold" }}>{language === "ar" ? "الكمية" : "Qty"}</th>
                    <th className="align-left" style={{ width: "20%", paddingBottom: "4px", textAlign: language === "ar" ? "left" : "right", fontWeight: "bold" }}>{language === "ar" ? "السعر" : "Price"}</th>
                    <th className="align-left" style={{ width: "20%", paddingBottom: "4px", textAlign: language === "ar" ? "left" : "right", fontWeight: "bold" }}>{language === "ar" ? "الإجمالي" : "Total"}</th>
                  </tr>
                </thead>
                <tbody>
                  {checkedOutBill.items.map((it: any) => (
                    <tr key={it.productId}>
                      <td className="print-receipt-item-name align-right" style={{ padding: "4px 0", textAlign: language === "ar" ? "right" : "left", verticalAlign: "top" }}>
                        {language === "ar" ? it.name : it.nameEn}
                      </td>
                      <td className="print-receipt-item-qty align-center" style={{ padding: "4px 0", textAlign: "center", verticalAlign: "top" }}>{it.quantity}</td>
                      <td className="print-receipt-item-price align-left" style={{ padding: "4px 0", textAlign: language === "ar" ? "left" : "right", verticalAlign: "top" }}>{it.price.toFixed(1)}</td>
                      <td className="print-receipt-item-total align-left" style={{ padding: "4px 0", textAlign: language === "ar" ? "left" : "right", verticalAlign: "top", fontWeight: "bold" }}>{(it.price * it.quantity).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="print-receipt-divider" style={{ borderTop: "1px dashed #000000", margin: "6px 0", height: "0" }}></div>

              {/* 4. Total and subtotal calculations */}
              <div className="print-receipt-total-section" style={{ fontSize: "10px", marginTop: "6px" }}>
                <div className="print-receipt-total-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span>{t("subtotal")}:</span>
                  <span>{(checkedOutBill.total - checkedOutBill.tax + checkedOutBill.discount).toFixed(2)} {currency}</span>
                </div>
                {checkedOutBill.discount > 0 && (
                  <div className="print-receipt-total-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", color: "#000000" }}>
                    <span>{t("discount")}:</span>
                    <span>-{checkedOutBill.discount.toFixed(2)} {currency}</span>
                  </div>
                )}
                <div className="print-receipt-total-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span>{t("tax_vat")} ({settings.taxRate}%):</span>
                  <span>{checkedOutBill.tax.toFixed(2)} {currency}</span>
                </div>
                <div className="print-receipt-grand-total" style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold", borderTop: "1px dashed #000000", borderBottom: "1px dashed #000000", padding: "3px 0", margin: "4px 0" }}>
                  <span>{t("total")}:</span>
                  <span>{checkedOutBill.total.toFixed(2)} {currency}</span>
                </div>
                <div className="print-receipt-total-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", marginTop: "4px" }}>
                  <span>{t("received_amount")}:</span>
                  <span>{checkedOutBill.received.toFixed(2)} {currency}</span>
                </div>
                <div className="print-receipt-total-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span>{t("change_amount")}:</span>
                  <span>{checkedOutBill.change.toFixed(2)} {currency}</span>
                </div>
              </div>

              <div className="print-receipt-divider" style={{ borderTop: "1px dashed #000000", margin: "6px 0", height: "0" }}></div>

              {/* 5. Simplified QR Code */}
              {includeQRCode && (
                <div style={{ margin: "10px 0", display: "flex", justifyContent: "center" }}>
                  <svg style={{ width: "55px", height: "55px" }} viewBox="0 0 100 100">
                    <path d="M 0,0 h 30 v 30 h -30 z M 10,10 h 10 v 10 h -10 z" fill="#000000" />
                    <path d="M 70,0 h 30 v 30 h -30 z M 80,10 h 10 v 10 h -10 z" fill="#000000" />
                    <path d="M 0,70 h 30 v 30 h -30 z M 10,80 h 10 v 10 h -10 z" fill="#000000" />
                    <path d="M 40,40 h 10 v 10 h -10 z M 50,50 h 10 v 10 h -10 z" fill="#000000" />
                    <path d="M 70,70 h 10 v 30 h -10 z M 90,80 h 10 v 20 h -10 z" fill="#000000" />
                    <path d="M 40,10 h 10 v 10 h -10 z M 50,20 h 10 v 10 h -10 z" fill="#000000" />
                  </svg>
                </div>
              )}

              {/* 6. Barcode */}
              {includeBarcode && (
                <div className="print-receipt-barcode-wrap" style={{ marginTop: "10px", textAlign: "center" }}>
                  <div className="print-receipt-barcode-text" style={{ fontSize: "9px", letterSpacing: "1px" }}>
                    *{checkedOutBill.invoiceNumber}*
                  </div>
                </div>
              )}

              {/* 7. Footer Message */}
              {includeFooterMsg && (
                <div className="print-receipt-footer" style={{ fontSize: "9px", marginTop: "10px", textAlign: "center" }}>
                  {language === "ar" ? "شكراً لزيارتكم وشرائكم!" : "Thank you for shopping with us!"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Offscreen high-DPI container for HTML-to-PDF rendering with html2canvas */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        {checkedOutBill && (
          <div 
            id="pdf-receipt-target" 
            className="text-black bg-white p-5 font-mono text-[9px] w-[300px] leading-relaxed" 
            style={{ direction: language === "ar" ? "rtl" : "ltr" }}
          >
            {/* Header store name */}
            <div className="text-center mb-3">
              <h4 className="text-[12px] font-extrabold" style={{ fontFamily: "Inter, sans-serif", textAlign: "center" }}>
                {language === "ar" ? settings.storeName : settings.storeNameEn}
              </h4>
              <div className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold text-center">
                {language === "ar" ? "فاتورة مبيعات مبسطة" : "Simplified Tax Invoice"}
              </div>
            </div>

            {/* Metadata fields */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2 text-[8px] space-y-1">
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("invoice_no")}:</span>
                <span className="font-bold">{checkedOutBill.invoiceNumber}</span>
              </div>
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("date")}:</span>
                <span>{new Date(checkedOutBill.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("cashier")}:</span>
                <span>{checkedOutBill.cashierName}</span>
              </div>
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("customer")}:</span>
                <span>{checkedOutBill.customerName}</span>
              </div>
            </div>

            {/* Items table */}
            <table className="w-full text-right text-[8px] border-collapse mb-2" style={{ width: '100%' }}>
              <thead>
                <tr className="border-b border-dashed border-slate-400 font-bold text-slate-500">
                  <th className="pb-1" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{language === "ar" ? "الصنف" : "Item"}</th>
                  <th className="pb-1" style={{ textAlign: 'center' }}>{language === "ar" ? "الكمية" : "Qty"}</th>
                  <th className="pb-1" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>{language === "ar" ? "السعر" : "Price"}</th>
                  <th className="pb-1" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>{language === "ar" ? "إجمالي" : "Total"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-slate-200">
                {checkedOutBill.items.map((it: any) => (
                  <tr key={it.productId} className="text-slate-900 font-medium">
                    <td className="py-1" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                      {language === "ar" ? it.name : it.nameEn}
                    </td>
                    <td className="py-1" style={{ textAlign: 'center' }}>{it.quantity}</td>
                    <td className="py-1" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>{it.price.toFixed(1)}</td>
                    <td className="py-1 font-bold" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>{(it.price * it.quantity).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations total block */}
            <div className="border-t border-dashed border-slate-400 pt-1.5 space-y-1 text-right text-[8px]" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
              <div className="flex justify-between text-slate-600" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("subtotal")}:</span>
                <span>{(checkedOutBill.total - checkedOutBill.tax + checkedOutBill.discount).toFixed(2)} {currency}</span>
              </div>
              {checkedOutBill.discount > 0 && (
                <div className="flex justify-between text-red-500 font-semibold" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t("discount")}:</span>
                  <span>-{checkedOutBill.discount.toFixed(2)} {currency}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("tax_vat")} ({settings.taxRate}%):</span>
                <span>{checkedOutBill.tax.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between font-bold text-[9px] text-slate-900 py-1 border-t border-dashed border-slate-300" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("total")}:</span>
                <span>{checkedOutBill.total.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-dashed border-slate-200 pt-0.5 text-[7.5px]" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("received_amount")}:</span>
                <span>{checkedOutBill.received.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[7.5px]" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("change_amount")}:</span>
                <span>{checkedOutBill.change.toFixed(2)} {currency}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="mt-3 text-center flex flex-col items-center justify-center">
              <svg style={{ width: "60px", height: "60px", margin: '0 auto' }} viewBox="0 0 100 100" fill="#000000">
                <path d="M 0,0 h 30 v 30 h -30 z M 10,10 h 10 v 10 h -10 z" />
                <path d="M 70,0 h 30 v 30 h -30 z M 80,10 h 10 v 10 h -10 z" />
                <path d="M 0,70 h 30 v 30 h -30 z M 10,80 h 10 v 10 h -10 z" />
                <path d="M 40,40 h 10 v 10 h -10 z M 50,50 h 10 v 10 h -10 z" />
                <path d="M 70,70 h 10 v 30 h -10 z M 90,80 h 10 v 20 h -10 z" />
                <path d="M 40,10 h 10 v 10 h -10 z M 50,20 h 10 v 10 h -10 z" />
              </svg>
              <div className="text-[6.5px] text-slate-400 mt-1 font-bold uppercase text-center w-full">
                {language === "ar" ? "الفوترة الإلكترونية مبسطة" : "Simplified VAT E-Invoice"}
              </div>
            </div>

            {/* Barcode */}
            <div className="mt-2.5 text-center flex flex-col items-center justify-center">
              <div className="flex items-center justify-center space-x-[0.5px] h-6 overflow-hidden select-none mb-1 mx-auto" style={{ display: 'flex' }}>
                {/* Simulated barcode bars */}
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
                  <div key={i} className={i % 2 === 0 ? "w-[1px] h-6 bg-black mr-[1px]" : "w-[2px] h-6 bg-black mr-[1px]"} />
                ))}
              </div>
              <span className="block text-center text-[7px] text-slate-500 font-bold text-center">
                *{checkedOutBill.invoiceNumber}*
              </span>
            </div>

            {/* Footer message */}
            <div className="mt-3 text-center text-[7.5px] text-slate-500 font-bold border-t border-dashed border-slate-200 pt-1.5 leading-normal text-center w-full">
              {language === "ar" ? "شكراً لزيارتكم وشرائكم!" : "Thank you for shopping with us!"}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Sizing Printer-Friendly Layout & Verification Modal */}
      <AnimatePresence>
        {showPrintPreview && checkedOutBill && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-4xl w-full text-slate-800 text-xs text-right border flex flex-col md:flex-row gap-6 relative"
            >
              {/* Left Column: Config Panel */}
              <div className="w-full md:w-1/2 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setShowPrintPreview(false)}
                      className="p-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold transition flex items-center gap-1 cursor-pointer text-[10px]"
                    >
                      ✕ {language === "ar" ? "إلغاء ورجوع" : "Cancel"}
                    </button>
                    <h3 className="text-xs font-bold text-slate-800">
                      {language === "ar" ? "معاينة وإعداد تخطيط الفاتورة" : "Invoice Print Layout Settings"}
                    </h3>
                  </div>

                  {/* Paper Width Config */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {language === "ar" ? "عرض ورق الطباعة" : "Paper Width"}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewPaperWidth("80mm")}
                        className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer text-[10px] ${
                          previewPaperWidth === "80mm"
                            ? "bg-blue-50 border-blue-400 text-blue-700 font-extrabold" 
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {language === "ar" ? "80 مم (قياسي)" : "80mm (Standard)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPaperWidth("58mm")}
                        className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer text-[10px] ${
                          previewPaperWidth === "58mm"
                            ? "bg-blue-50 border-blue-400 text-blue-700 font-extrabold" 
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {language === "ar" ? "58 مم (محمول)" : "58mm (Mobile)"}
                      </button>
                    </div>
                  </div>

                  {/* Detail Toggles */}
                  <div className="space-y-2.5 mt-4">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {language === "ar" ? "تعديل عناصر الفاتورة المعروضة" : "Customize Receipt Details"}
                    </span>

                    {/* Checkboxes */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-150 cursor-pointer hover:bg-slate-100 transition select-none">
                      <span className="text-[10px] text-slate-600 font-semibold">
                        {language === "ar" ? "تضمين شعار واسم المتجر الرئيسي" : "Include Main Store Name"}
                      </span>
                      <input
                        type="checkbox"
                        checked={includeReceiptLogo}
                        onChange={(e) => setIncludeReceiptLogo(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-150 cursor-pointer hover:bg-slate-100 transition select-none">
                      <span className="text-[10px] text-slate-600 font-semibold">
                        {language === "ar" ? "إظهار اسم محاسب المبيعات (الكاشير)" : "Display Active Cashier Name"}
                      </span>
                      <input
                        type="checkbox"
                        checked={includeCashierName}
                        onChange={(e) => setIncludeCashierName(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-150 cursor-pointer hover:bg-slate-100 transition select-none">
                      <span className="text-[10px] text-slate-600 font-semibold">
                        {language === "ar" ? "عرض اسم وبيانات العميل" : "Display Customer Records"}
                      </span>
                      <input
                        type="checkbox"
                        checked={includeCustomerName}
                        onChange={(e) => setIncludeCustomerName(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-150 cursor-pointer hover:bg-slate-100 transition select-none">
                      <span className="text-[10px] text-slate-600 font-semibold">
                        {language === "ar" ? "تضمين رمز QR المرمز للفحص" : "Include Simplified QR Code"}
                      </span>
                      <input
                        type="checkbox"
                        checked={includeQRCode}
                        onChange={(e) => setIncludeQRCode(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-150 cursor-pointer hover:bg-slate-100 transition select-none">
                      <span className="text-[10px] text-slate-600 font-semibold">
                        {language === "ar" ? "إظهار رمز الباركود الرقمي للفاتورة" : "Include Transaction Barcode"}
                      </span>
                      <input
                        type="checkbox"
                        checked={includeBarcode}
                        onChange={(e) => setIncludeBarcode(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-150 cursor-pointer hover:bg-slate-100 transition select-none">
                      <span className="text-[10px] text-slate-600 font-semibold">
                        {language === "ar" ? "إدراج رسالة الشكر والتذييل في الأسفل" : "Include Greeting/Footer Message"}
                      </span>
                      <input
                        type="checkbox"
                        checked={includeFooterMsg}
                        onChange={(e) => setIncludeFooterMsg(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Info notice box */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-150 mt-4 text-[10px] text-slate-500 flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-700">
                        {language === "ar" ? "توافق تخطيط طباعة الكاشير الحرة" : "Simplified Invoicing compliance"}
                      </p>
                      <p className="mt-0.5">
                        {language === "ar"
                          ? "تمت تهيئة التخطيط ليتطابق مع طابعات الفواتير وحجم الورق المحدد. يرجى مراجعة الجدول والهوامش الجانبية قبل بدء الطباعة."
                          : "This preview mirrors standard character alignments on continuous paper rolls. Adjust widths interactively for different terminal spacing."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Confirm Buttons */}
                <div className="pt-3 border-t flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={triggerPrintJSReceipt}
                    className="w-full sm:w-2/3 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{language === "ar" ? "تأكيد والطباعة عبر PrintJS" : "Confirm & Print (PrintJS)"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintPreview(false)}
                    className="w-full sm:w-1/3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer transition active:scale-95"
                  >
                    {language === "ar" ? "رجوع للفاتورة" : "Back to Invoice"}
                  </button>
                </div>
              </div>

              {/* Right Column: Physical Paper Roll Live Drawing */}
              <div className="w-full md:w-1/2 bg-slate-50 rounded-3xl p-4 flex flex-col items-center justify-center border border-slate-100 select-none relative overflow-hidden min-h-[440px]">
                <span className="absolute top-2 right-3 text-[9px] font-bold text-slate-300 tracking-wider uppercase">
                  {language === "ar" ? "ورقة المعاينة الحية" : "Receipt Live Paper"}
                </span>

                {/* Simulated continuous feed paper roll */}
                <div 
                  className="bg-[#fdfdfc] border-x border-slate-200/60 shadow-lg p-5 font-mono text-[9px] text-slate-900 transition-all duration-300 relative rounded-md"
                  style={{ 
                    width: previewPaperWidth === "58mm" ? "225px" : "295px",
                    minHeight: "400px"
                  }}
                >
                  {/* Rugged paper-cut zig-zags on top and bottom */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-repeat-x bg-[linear-gradient(45deg,transparent_25%,#f1f5f9_25%,#f1f5f9_50%,transparent_50%,transparent_75%,#f1f5f9_75%,#f1f5f9_100%)] bg-[length:6px_4px]" />

                  {/* Header logo */}
                  {includeReceiptLogo && (
                    <div className="text-center space-y-0.5 mb-2.5">
                      <h4 className="text-[11px] font-extrabold tracking-tight">
                        {language === "ar" ? settings.storeName : settings.storeNameEn}
                      </h4>
                      <div className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold">
                        {language === "ar" ? "فاتورة مبيعات تبسيطية ضريبية" : "Simplified Tax Invoice"}
                      </div>
                    </div>
                  )}

                  {/* Metadata fields */}
                  <div className="border-b border-dashed border-slate-300 pb-2 space-y-1 text-slate-500 text-right leading-normal text-[8.5px]">
                    <div className="flex justify-between">
                      <span>{t("invoice_no")}:</span>
                      <span className="font-bold font-sans text-slate-700">{checkedOutBill.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("date")}:</span>
                      <span className="font-sans text-slate-700">{new Date(checkedOutBill.date).toLocaleString()}</span>
                    </div>
                    {includeCashierName && (
                      <div className="flex justify-between">
                        <span>{t("cashier")}:</span>
                        <span className="font-bold text-slate-700">{checkedOutBill.cashierName}</span>
                      </div>
                    )}
                    {includeCustomerName && (
                      <div className="flex justify-between">
                        <span>{t("customer")}:</span>
                        <span className="font-bold text-slate-700">{checkedOutBill.customerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Table lists */}
                  <table className="w-full text-right my-2 text-[8px] border-collapse">
                    <thead>
                      <tr className="border-b border-dashed border-slate-300 font-bold text-slate-400">
                        <th className="pb-1 text-right">{language === "ar" ? "الصنف" : "Item"}</th>
                        <th className="pb-1 text-center">{language === "ar" ? "الكمية" : "Qty"}</th>
                        <th className="pb-1 text-left">{language === "ar" ? "السعر" : "Price"}</th>
                        <th className="pb-1 text-left">{language === "ar" ? "إجمالي" : "Total"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-slate-100">
                      {checkedOutBill.items.map((it: any) => (
                        <tr key={it.productId} className="text-slate-800 font-semibold">
                          <td className="py-1 leading-normal pr-1 truncate max-w-[90px]">
                            {language === "ar" ? it.name : it.nameEn}
                          </td>
                          <td className="py-1 text-center font-sans font-bold text-slate-700">{it.quantity}</td>
                          <td className="py-1 text-left font-sans text-slate-600">{it.price.toFixed(1)}</td>
                          <td className="py-1 text-left font-sans font-extrabold text-slate-900">{(it.price * it.quantity).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Calculations total block */}
                  <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-1 text-right text-[8.5px]">
                    <div className="flex justify-between text-slate-500">
                      <span>{t("subtotal")}:</span>
                      <span className="font-sans text-slate-700">{(checkedOutBill.total - checkedOutBill.tax + checkedOutBill.discount).toFixed(2)} {currency}</span>
                    </div>
                    {checkedOutBill.discount > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>{t("discount")}:</span>
                        <span className="font-sans font-bold">-{checkedOutBill.discount.toFixed(2)} {currency}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>{t("tax_vat")} ({settings.taxRate}%):</span>
                      <span className="font-sans text-slate-700">{checkedOutBill.tax.toFixed(2)} {currency}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-[10px] text-blue-600 py-1 border-t border-dashed border-slate-200">
                      <span>{t("total")}:</span>
                      <span className="font-sans">{checkedOutBill.total.toFixed(2)} {currency}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 border-t border-dashed border-slate-100 pt-0.5 text-[8px]">
                      <span>{t("received_amount")}:</span>
                      <span className="font-sans font-bold text-slate-650">{checkedOutBill.received.toFixed(2)} {currency}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[8px]">
                      <span>{t("change_amount")}:</span>
                      <span className="font-sans font-bold text-slate-650">{checkedOutBill.change.toFixed(2)} {currency}</span>
                    </div>
                  </div>

                  {/* QR Security scanner */}
                  {includeQRCode && (
                    <div className="mt-3.5 border-t border-dashed border-slate-200 pt-2.5">
                      {renderElegentQRCode(checkedOutBill.invoiceNumber, checkedOutBill.total)}
                      <div className="text-center text-[6.5px] text-slate-400 mt-1 font-bold uppercase">
                        {language === "ar" ? "الفوترة الإلكترونية مبسطة" : "Simplified VAT E-Invoice"}
                      </div>
                    </div>
                  )}

                  {/* Barcode System identifier */}
                  {includeBarcode && (
                    <div className="mt-3.5 border-t border-dashed border-slate-200 pt-2.5">
                      {renderMockBarcodeLines(checkedOutBill.invoiceNumber)}
                      <span className="block text-center text-[7px] text-slate-400 tracking-wider font-bold">
                        *{checkedOutBill.invoiceNumber}*
                      </span>
                    </div>
                  )}

                  {/* Bottom Store greeting signature */}
                  {includeFooterMsg && (
                    <div className="mt-3.5 text-center text-[7.5px] text-slate-500 font-bold border-t border-dashed border-slate-100 pt-1.5 leading-normal">
                      {language === "ar" ? "شكراً لزيارتكم وشرائكم!" : "Thank you for shopping with us!"}
                    </div>
                  )}

                  {/* Rugged paper-cut zig-zags on top and bottom */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-repeat-x bg-[linear-gradient(45deg,transparent_25%,#f1f5f9_25%,#f1f5f9_50%,transparent_50%,transparent_75%,#f1f5f9_75%,#f1f5f9_100%)] bg-[length:6px_4px]" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
