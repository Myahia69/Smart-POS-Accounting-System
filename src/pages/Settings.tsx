import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { motion } from "motion/react";
import { 
  Settings as SettingIcon, 
  Store, 
  Coins, 
  Percent, 
  Printer, 
  Save, 
  CheckCircle2,
  Image as ImageIcon,
  ShieldX
} from "lucide-react";

export default function Settings() {
  const { settings, saveSettings, t, language, currentUser } = useApp();

  // Guard block: ONLY admin can view/modify settings
  if (currentUser?.role !== "admin") {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-bg neumorphic-flat max-w-lg mx-auto py-16 px-8 rounded-3xl border border-red-200 text-center flex flex-col items-center justify-center space-y-4 text-right"
      >
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-650 mb-2">
          <ShieldX className="w-9 h-9" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">{t("access_denied")}</h3>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed text-center">
          {language === "ar" 
            ? "عذراً، إعدادات النظام وتغيير اسم المتجر متاحة فقط لحساب المسؤول الرئيسي (Admin)." 
            : "Sorry, system settings and store name changes are only accessible by the main Administrator account (Admin)."}
        </p>
      </motion.div>
    );
  }

  // Inputs
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeNameEn, setStoreNameEn] = useState(settings.storeNameEn);
  const [currency, setCurrency] = useState(settings.currency);
  const [taxRate, setTaxRate] = useState(String(settings.taxRate));
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || "");
  const [printType, setPrintType] = useState<"A4" | "thermal">(settings.printType);

  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      storeName,
      storeNameEn,
      currency,
      taxRate: Number(taxRate) || 0,
      logoUrl,
      printType,
    };

    const done = await saveSettings(payload);
    setSaving(false);
    if (done) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-6 text-right"
    >
      {/* Toast Pop Notifications */}
      {showToast && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 p-3 blue-glass-panel text-blue-800 text-xs font-bold rounded-2xl flex items-center gap-2 border z-50 shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-blue-600 animate-bounce" />
          <span>{t("save_success")}</span>
        </motion.div>
      )}

      {/* Settings Panel Card Box */}
      <div className="glass-bg neumorphic-flat p-6 rounded-3xl border flex flex-col justify-between">
        
        {/* Title Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-6">
          <span className="text-xs text-slate-400 font-mono">System Preferences</span>
          <h3 className="text-sm font-bold text-slate-750 flex items-center gap-1.5">
            <SettingIcon className="w-4.5 h-4.5 text-blue-500" />
            <span>{t("system_settings")}</span>
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Store Name Arabic & English */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 px-1 flex items-center justify-end gap-1">
                <span>{t("store_name_ar")}</span>
                <Store className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <input
                id="set-store-name-ar"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="سوبرماركت الواحة والمواد الغذائية"
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 px-1 flex items-center justify-end gap-1">
                <span>{t("store_name_en")}</span>
                <Store className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <input
                id="set-store-name-en"
                type="text"
                required
                value={storeNameEn}
                onChange={(e) => setStoreNameEn(e.target.value)}
                placeholder="Al-Waha Foods Mart"
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-left"
              />
            </div>
          </div>

          {/* Currency Settings & Tax config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 px-1 flex items-center justify-end gap-1">
                <span>{t("store_currency")}</span>
                <Coins className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <select
                id="set-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
              >
                <option value="SAR">SAR (ريال سعودي)</option>
                <option value="USD">USD (الدولار الأمريكي)</option>
                <option value="EGP">EGP (جنيه مصري)</option>
                <option value="AED">AED (درهم إماراتي)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 px-1 flex items-center justify-end gap-1">
                <span>{t("tax_rate_percent")}</span>
                <Percent className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <input
                id="set-tax-rate"
                type="number"
                min="0"
                max="100"
                required
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="15"
                className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-sans"
              />
            </div>
          </div>

          {/* Logo Brand upload url links */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 px-1 flex items-center justify-end gap-1">
              <span>{t("logo_upload_caption")}</span>
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <input
              id="set-logo-url"
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-mono"
            />
          </div>

          {/* Thermal print Format type selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 px-1 flex items-center justify-end gap-1">
              <span>{t("print_receipt_type")}</span>
              <Printer className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <div className="grid grid-cols-2 gap-3 select-none">
              <button
                id="set-print-thermal"
                type="button"
                onClick={() => setPrintType("thermal")}
                className={`py-2.5 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition ${
                  printType === "thermal"
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                }`}
              >
                <span>{t("print_thermal")}</span>
              </button>

              <button
                id="set-print-a4"
                type="button"
                onClick={() => setPrintType("A4")}
                className={`py-2.5 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition ${
                  printType === "A4"
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                }`}
              >
                <span>{t("print_a4")}</span>
              </button>
            </div>
          </div>

          {/* Action updating save */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              id="set-save-btn"
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center gap-2 cursor-pointer neumorphic-btn"
            >
              {saving ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                </svg>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t("save_settings_btn")}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </motion.div>
  );
}
