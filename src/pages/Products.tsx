import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { exportToExcel } from "../utils/excelExport";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  FileSpreadsheet, 
  Upload, 
  AlertTriangle, 
  Package,
  X,
  XCircle,
  TrendingDown,
  AlertCircle
} from "lucide-react";
import { Product } from "../types";

export default function Products() {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    importProducts, 
    currentUser, 
    t, 
    language, 
    settings,
    currency = settings.currency 
  } = useApp();

  // Search filter query
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Form modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Input states
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [category, setCategory] = useState("");

  const[errorLocal, setErrorLocal] = useState<string | null>(null);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  // Filters products list
  const filtered = products.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchesQuery = (p.name + " " + p.nameEn + " " + p.sku).toLowerCase().includes(query.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Open Form modal for edits / new items
  const openFormModal = (prod: Product | null = null) => {
    setErrorLocal(null);
    if (prod) {
      setEditingProduct(prod);
      setName(prod.name);
      setNameEn(prod.nameEn);
      setSku(prod.sku);
      setPrice(String(prod.price));
      setCost(String(prod.cost));
      setQuantity(String(prod.quantity));
      setMinQuantity(String(prod.minQuantity));
      setCategory(prod.category);
    } else {
      setEditingProduct(null);
      setName("");
      setNameEn("");
      setSku("");
      setPrice("");
      setCost("");
      setQuantity("");
      setMinQuantity("10"); // sensible default
      setCategory("مواد غذائية");
    }
    setIsModalOpen(true);
  };

  // Handle Form submit updates / creation
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!name || !nameEn || !sku || !price || !cost || !quantity) {
      setErrorLocal(language === "ar" ? "يرجى تعبئة جميع الحقول الإلزامية!" : "Please fill in all mandatory fields!");
      return;
    }

    const payload = {
      name,
      nameEn,
      sku,
      price: Number(price),
      cost: Number(cost),
      quantity: Number(quantity),
      minQuantity: Number(minQuantity) || 5,
      category,
    };

    let resolved = false;
    if (editingProduct) {
      resolved = await updateProduct(editingProduct.id, payload);
    } else {
      resolved = await addProduct(payload);
    }

    if (resolved) {
      setIsModalOpen(false);
    } else {
      setErrorLocal(t("error_occurred"));
    }
  };

  // CSV Import Parser Client-Side
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split("\n");
        const importedArray: any[] = [];
        
        // Skip header line [0]
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].trim();
          if (!row) continue;
          
          // Split by comma
          const cols = row.split(",");
          if (cols.length >= 6) {
            importedArray.push({
              name: cols[0]?.replace(/"/g, "") || "",
              nameEn: cols[1]?.replace(/"/g, "") || "",
              sku: cols[2]?.replace(/"/g, "") || "",
              price: Number(cols[3]) || 0,
              cost: Number(cols[4]) || 0,
              quantity: Number(cols[5]) || 0,
              minQuantity: Number(cols[6]) || 10,
              category: cols[7]?.replace(/"/g, "") || "عام",
            });
          }
        }
        
        if (importedArray.length > 0) {
          importProducts(importedArray);
          setAlertMsg(language === "ar" ? `تم استيراد ${importedArray.length} منتجات بنجاح!` : `Imported ${importedArray.length} items successfully!`);
        }
      } catch (err) {
        setAlertMsg("Error parsing CSV: " + err);
      }
    };
    reader.readAsText(file);
  };

  // CSV Export Generator Client-Side
  const handleCSVExport = () => {
    const isAr = language === "ar";
    const title = isAr ? "تقرير جرد ومخزون المنتجات بالتفصيل" : "Detailed Products Inventory & Warehousing Report";
    const filename = isAr 
      ? `جرد_المخزون_${new Date().toISOString().split("T")[0]}`
      : `Products_Inventory_${new Date().toISOString().split("T")[0]}`;

    const headersList = isAr
      ? ["الاسم العربي", "الاسم الإنجليزي", "الباركود (SKU)", `سعر البيع (${currency})`, `سعر التكلفة (${currency})`, "الكمية المتوفرة", "الحد الأدنى", "الفئة"]
      : ["Arabic Name", "English Name", "Barcode (SKU)", `Retail Price (${currency})`, `Unit Cost (${currency})`, "Available Qty", "Min Threshold", "Category"];

    const rows = products.map((p) => [
      p.name,
      p.nameEn || "",
      p.sku || "",
      p.price,
      p.cost,
      p.quantity,
      p.minQuantity,
      p.category || (isAr ? "عام" : "General")
    ]);

    exportToExcel(filename, title, headersList, rows, isAr);
  };

  // Delete product action (admin lock)
  const handleDeleteProduct = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteProduct(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Controls Headings layout */}
      <div className="glass-bg neumorphic-flat p-4 rounded-3xl border flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Field bar */}
        <div className="relative w-full md:max-w-xs">
          <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="prod-search-query"
            type="text"
            placeholder={t("search_by_name_sku")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-xs font-semibold"
          />
        </div>

        {/* Categories togglers */}
        <div className="flex gap-2.5 overflow-x-auto max-w-sm pb-1">
          {categories.slice(0, 5).map((cat) => (
            <button
              id={`prod-cat-${cat}`}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold capitalize whitespace-nowrap cursor-pointer transition ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {cat === "all" ? (language === "ar" ? "الكل" : "All") : cat}
            </button>
          ))}
        </div>

        {/* Action utility buttons: Export CSV, Import CSV, Add Product */}
        <div className="flex gap-3 items-center w-full md:w-auto overflow-x-auto justify-end">
          
          {/* CSV Import invisible input */}
          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-200/80 border border-slate-300 text-slate-600 hover:bg-slate-300 hover:shadow-sm cursor-pointer transition select-none">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>{t("import_csv")}</span>
            <input 
              id="prod-csv-import"
              type="file" 
              accept=".csv" 
              onChange={handleCSVImport} 
              className="hidden" 
            />
          </label>

          <button
            id="prod-csv-export"
            onClick={handleCSVExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-100/70 border border-emerald-350 text-emerald-700 hover:bg-emerald-200 hover:shadow-sm cursor-pointer transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t("export_csv")}</span>
          </button>

          <button
            id="prod-add-new-modal"
            onClick={() => openFormModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90 hover:shadow-md cursor-pointer transition neumorphic-btn"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_product")}</span>
          </button>
        </div>
      </div>

      {/* Main product inventory table */}
      <div className="glass-bg neumorphic-flat p-5 rounded-3xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200/60 text-slate-400 font-bold">
                <th className="pb-3 text-right">{t("product_name_ar").split(" ")[0]}</th>
                <th className="pb-3 text-right">{t("barcode_sku").split(" ")[0]}</th>
                <th className="pb-3 text-right">{t("category")}</th>
                <th className="pb-3 text-right">{t("cost_price").split(" ")[1]}</th>
                <th className="pb-3 text-right">{t("selling_price").split(" ")[1]}</th>
                <th className="pb-3 text-center">{t("available_qty").split(" ")[1]}</th>
                <th className="pb-3 text-left">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 text-slate-600 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-normal">
                    {t("no_data_available")}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const underLimit = p.quantity <= p.minQuantity;
                  return (
                    <tr key={p.id} className="hover:bg-slate-100/40 transition">
                      
                      {/* Name display bilingually */}
                      <td className="py-3.5 max-w-xs pr-1">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg shrink-0 ${underLimit ? "bg-amber-100 text-amber-600" : "bg-blue-50 text-blue-500"}`}>
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-750 truncate">
                              {language === "ar" ? p.name : p.nameEn}
                            </p>
                            <span className="text-[10px] text-slate-400 font-normal block leading-none">
                              {language === "ar" ? p.nameEn : p.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Barcode SKU */}
                      <td className="py-3.5 font-mono text-slate-500">{p.sku}</td>

                      {/* Category */}
                      <td className="py-3.5">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-semibold">
                          {p.category}
                        </span>
                      </td>

                      {/* Cost price */}
                      <td className="py-3.5 font-sans font-semibold text-slate-500">{p.cost.toFixed(2)} {currency}</td>

                      {/* Selling price */}
                      <td className="py-3.5 font-sans font-bold text-slate-750">{p.price.toFixed(2)} {currency}</td>

                      {/* Stock Level column */}
                      <td className="py-3.5 text-center">
                        <span className={`px-2 py-1 rounded-xl text-xs font-bold font-sans ${
                          underLimit 
                            ? "bg-red-50 text-red-600 border border-red-100 animate-pulse" 
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}>
                          {p.quantity} {t("item_singular")}
                        </span>
                        {underLimit && (
                          <span className="block text-[8px] font-bold text-red-500 mt-1 uppercase">
                            {t("low_stock")}
                          </span>
                        )}
                      </td>

                      {/* Action buttons (Trash locked for Cashiers) */}
                      <td className="py-3.5 text-left pl-1">
                        <div className="flex items-center gap-1.5 justify-start">
                          <button
                            id={`prod-edit-${p.id}`}
                            onClick={() => openFormModal(p)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          {currentUser?.role === "admin" && (
                            <button
                              id={`prod-del-${p.id}`}
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form editing/creation sliding modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-right relative overflow-hidden border"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3.5 mb-5">
                <button
                  id="prod-modal-close"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-md font-bold text-slate-850">
                  {editingProduct ? t("edit_product") : t("add_product")}
                </h3>
              </div>

              {errorLocal && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 justify-end">
                  <span>{errorLocal}</span>
                  <XCircle className="w-4 h-4" />
                </div>
              )}

              {/* Input Forms */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      {t("product_name_ar")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="form-prod-name-ar"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="أرز بسمتي الشعلان 5 كجم"
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      {t("product_name_en")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="form-prod-name-en"
                      type="text"
                      required
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder="Al Shalan Basmati Rice 5kg"
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-left focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("barcode_sku")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="form-prod-sku"
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="628100112233"
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      {t("cost_price")} ({currency}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="form-prod-cost"
                      type="number"
                      step="0.01"
                      required
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      {t("selling_price")} ({currency}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="form-prod-price"
                      type="number"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      {t("available_qty")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="form-prod-qty"
                      type="number"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="50"
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      {t("min_notify_qty")}
                    </label>
                    <input
                      id="form-prod-min"
                      type="number"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      placeholder="10"
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("category")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="form-prod-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <option value="مواد غذائية">مواد غذائية</option>
                    <option value="ألبان">ألبان</option>
                    <option value="مشروبات">مشروبات</option>
                    <option value="منظفات">منظفات</option>
                    <option value="عام">عام / آخر</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3 justify-end items-center">
                  <button
                    id="form-submit-cancel"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    id="form-submit-btn"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition"
                  >
                    {editingProduct ? t("save_changes") : t("add_btn")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Neumorphic Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTargetId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-right relative overflow-hidden border"
            >
              <div className="flex flex-col items-center text-center gap-4 py-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-2">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-slate-800">
                  {t("delete_confirm").split("؟")[0] + "؟"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed px-4">
                  {t("delete_confirm")}
                </p>
              </div>

              <div className="pt-4 flex gap-3 justify-center items-center">
                <button
                  id="delete-cancel-btn"
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  {t("cancel")}
                </button>

                <button
                  id="delete-confirm-btn"
                  type="button"
                  onClick={confirmDelete}
                  className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow hover:bg-red-700 transition cursor-pointer"
                >
                  {language === "ar" ? "حذف" : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert Message Modal */}
      <AnimatePresence>
        {alertMsg && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-right relative overflow-hidden border"
            >
              <div className="flex flex-col items-center text-center gap-4 py-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-2">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-slate-800">
                  {language === "ar" ? "تنبيه النظام" : "System Notification"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed px-4">
                  {alertMsg}
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  id="alert-ok-btn"
                  type="button"
                  onClick={() => setAlertMsg(null)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition cursor-pointer"
                >
                  {language === "ar" ? "حسنًا" : "OK"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
