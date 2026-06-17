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
  UserPlus, 
  X,
  Phone,
  Mail,
  MapPin,
  CheckCircle2
} from "lucide-react";
import { Customer } from "../types";

export default function Customers() {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    t, 
    language, 
    settings,
    currency = settings.currency 
  } = useApp();

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Inputs
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");

  const filtered = customers.filter((c) => 
    (c.name + " " + c.phone + " " + c.address).toLowerCase().includes(query.toLowerCase())
  );

  const openFormModal = (cust: Customer | null = null) => {
    if (cust) {
      setEditingCustomer(cust);
      setName(cust.name);
      setPhone(cust.phone);
      setEmail(cust.email);
      setAddress(cust.address);
      setBalance(String(cust.balance));
    } else {
      setEditingCustomer(null);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setBalance("0");
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const payload = {
      name,
      phone,
      email: email || "",
      address: address || "",
      balance: Number(balance) || 0,
    };

    let done = false;
    if (editingCustomer) {
      done = await updateCustomer(editingCustomer.id, payload);
    } else {
      done = await addCustomer(payload);
    }

    if (done) setIsModalOpen(false);
  };

  const handleCSVExport = () => {
    const isAr = language === "ar";
    const title = isAr ? "قائمة بيانات العملاء والمديونيات" : "Customers Contact List & Debit Balances";
    const filename = isAr 
      ? `بيانات_العملاء_${new Date().toISOString().split("T")[0]}`
      : `Customers_${new Date().toISOString().split("T")[0]}`;

    const headersList = isAr
      ? ["اسم العميل", "رقم الهاتف", "البريد الإلكتروني", "العنوان", `الرصيد المستحق (${currency})`]
      : ["Customer Name", "Phone", "Email Address", "Address", `Balance Due (${currency})`];

    const rows = customers.map((c) => [
      c.name,
      c.phone || "",
      c.email || "",
      c.address || "",
      c.balance
    ]);

    exportToExcel(filename, title, headersList, rows, isAr);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteCustomer(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Upper Filter & Add */}
      <div className="glass-bg neumorphic-flat p-4 rounded-3xl border flex flex-col md:flex-row gap-4 items-center justify-between">
        
        <div className="relative w-full md:max-w-xs">
          <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="cust-search"
            type="text"
            placeholder={t("customer_mgmt").split(" ")[1] + " ..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-xs font-semibold"
          />
        </div>

        <div className="flex gap-3 items-center w-full md:w-auto justify-end">
          <button
            id="cust-csv-export"
            onClick={handleCSVExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-100/75 border border-emerald-350 text-emerald-700 hover:bg-emerald-200 cursor-pointer transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t("export_list_csv")}</span>
          </button>

          <button
            id="cust-add"
            onClick={() => openFormModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90 hover:shadow-md cursor-pointer transition neumorphic-btn"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t("add_customer")}</span>
          </button>
        </div>
      </div>

      {/* Grid List view of customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
            {t("no_data_available")}
          </div>
        ) : (
          filtered.map((c) => (
            <motion.div
              key={c.id}
              whileHover={{ y: -3 }}
              className="glass-bg neumorphic-flat p-5 rounded-3xl border relative flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-3 mb-3">
                <div className="text-right">
                  <h4 className="text-sm font-bold text-slate-800">{c.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {c.id}</span>
                </div>
                
                {/* Balance badge */}
                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-sans ${
                  c.balance > 0 
                    ? "bg-red-50 text-red-600 border border-red-100 animate-pulse" 
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                }`}>
                  {c.balance.toFixed(2)} {currency}
                </span>
              </div>

              {/* Contacts */}
              <div className="space-y-2 text-xs text-slate-550 mb-4 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="font-mono">{c.phone}</span>
                  <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                </div>
                {c.email && (
                  <div className="flex items-center gap-2 justify-end">
                    <span>{c.email}</span>
                    <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  </div>
                )}
                {c.address && (
                  <div className="flex items-center gap-2 justify-end">
                    <span className="truncate max-w-[200px]">{c.address}</span>
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  </div>
                )}
              </div>

              {/* Actions footer */}
              <div className="flex items-center justify-between pt-2 border-t text-slate-400 select-none">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {c.balance > 0 ? "ذمة مدينة معلقة" : "مخلص الحساب"}
                </span>

                <div className="flex items-center gap-2.5">
                  <button
                    id={`cust-edit-${c.id}`}
                    onClick={() => openFormModal(c)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    id={`cust-del-${c.id}`}
                    onClick={() => handleDelete(c.id)}
                    className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Editing modal popup */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-right relative overflow-hidden border"
            >
              <div className="flex items-center justify-between border-b pb-3.5 mb-5">
                <button
                  id="cust-modal-close"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-md font-bold text-slate-850">
                  {editingCustomer ? t("edit_customer") : t("add_customer")}
                </h3>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("fullname")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="form-cust-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="فهد محمد الحربي"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("phone")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="form-cust-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("email")}
                  </label>
                  <input
                    id="form-cust-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="fahad@example.com"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("address")}
                  </label>
                  <input
                    id="form-cust-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="حي النخيل، الرياض"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("customer_balance")} ({currency})
                  </label>
                  <input
                    id="form-cust-balance"
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end items-center">
                  <button
                    id="form-cust-cancel"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    id="form-cust-save"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition"
                  >
                    {editingCustomer ? t("save_changes") : t("add_btn")}
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
    </motion.div>
  );
}
