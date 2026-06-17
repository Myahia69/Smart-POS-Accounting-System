import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Trash2, 
  Coins, 
  Calendar, 
  FileText, 
  Tag,
  X,
  PlusCircle
} from "lucide-react";
import { Expense } from "../types";

export default function Expenses() {
  const { 
    expenses, 
    addExpense, 
    deleteExpense, 
    t, 
    language, 
    settings,
    currency = settings.currency 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("فواتير");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const totalSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    const payload = {
      title,
      amount: Number(amount) || 0,
      category,
      date,
      notes: notes || "",
    };

    const done = await addExpense(payload);
    if (done) {
      setIsModalOpen(false);
      setTitle("");
      setAmount("");
      setNotes("");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteExpense(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Overview expenses cost counters card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
        
        {/* Total stats card */}
        <div className="red-glass-panel rounded-3xl p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight block mb-1">
              إجمالي المصروفات المسجلة
            </span>
            <span className="text-2xl font-black text-red-900 font-sans tracking-tight">
              {totalSum.toLocaleString()} <span className="text-sm font-normal text-red-700">{currency}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-100/90 flex items-center justify-center text-red-650">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Action ADD button */}
        <div className="flex justify-end select-none">
          <button
            id="exp-add-btn"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90 font-bold hover:shadow-md cursor-pointer transition neumorphic-btn text-xs"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>{t("add_expense")}</span>
          </button>
        </div>
      </div>

      {/* Expenses Rows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {expenses.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium glass-bg rounded-3xl border">
            {t("no_data_available")}
          </div>
        ) : (
          expenses.map((e) => (
            <motion.div
              key={e.id}
              whileHover={{ y: -3 }}
              className="glass-bg neumorphic-flat p-5 rounded-3xl border relative flex flex-col justify-between text-right"
            >
              <div>
                <div className="flex items-start justify-between border-b pb-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{e.title}</h4>
                    <span className="text-[9px] text-slate-400 font-mono">CODE: {e.id}</span>
                  </div>

                  <span className="text-xs font-extrabold text-red-700 bg-red-50/70 border border-red-100/70 px-2.5 py-1 rounded-xl font-sans">
                    {e.amount.toFixed(2)} {currency}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-550 mb-4">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-semibold text-slate-600">{e.category}</span>
                    <Tag className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-mono">{e.date}</span>
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  {e.notes && (
                    <div className="flex items-start gap-2 justify-end">
                      <span className="text-[11px] text-slate-400 leading-normal">{e.notes}</span>
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  id={`exp-del-${e.id}`}
                  onClick={() => handleDelete(e.id)}
                  className="flex items-center gap-1 text-[10px] font-bold text-red-500 px-2 py-1 rounded-xl bg-red-50 hover:bg-red-100/55 cursor-pointer transition select-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t("delete")}</span>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Editing creation modal */}
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
                  id="exp-modal-close"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-md font-bold text-slate-850">
                  {t("add_expense")}
                </h3>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("expense_title")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="form-exp-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="فاتورة هاتف وانترنت المحل"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("expense_amount")} ({currency}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="form-exp-amount"
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      {t("expense_category")}
                    </label>
                    <select
                      id="form-exp-cat"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <option value="فواتيروطاقة">فواتير وطاقة</option>
                      <option value="إيجارات">إيجارات</option>
                      <option value="رواتب">رواتب وموظفون</option>
                      <option value="بضائع ومشتريات">بضائع ومشتريات</option>
                      <option value="مصاريف عامة">مصاريف عامة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      تاريخ الصرف
                    </label>
                    <input
                      id="form-exp-date"
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("notes")}
                  </label>
                  <textarea
                    id="form-exp-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات إضافية حول السداد وطريقة الدفع..."
                    rows={3}
                    className="w-full text-xs font-semibold p-3 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end items-center">
                  <button
                    id="form-exp-cancel"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    id="form-exp-submit"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition"
                  >
                    {t("add_btn")}
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
