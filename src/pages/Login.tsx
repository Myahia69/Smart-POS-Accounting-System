import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { motion } from "motion/react";
import { Lock, User as UserIcon, Globe, ShieldAlert } from "lucide-react";

export default function Login() {
  const { login, t, language, setLanguage, errorMsg, setErrorMsg } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    const success = await login(username, password);
    setSubmitting(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-100 text-slate-800">
      {/* Dynamic Background Neumorphic Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-200/40 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-cyan-200/35 blur-3xl" />

      {/* Language Toggle in Login Head */}
      <div className="absolute top-6 right-6 z-10">
        <button
          id="login-lang-toggle"
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-bg neumorphic-btn text-sm font-medium text-slate-600"
        >
          <Globe className="w-4 h-4 text-blue-500" />
          <span>{language === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md glass-bg neumorphic-flat p-8 rounded-3xl z-10 text-center relative overflow-hidden"
      >
        {/* Soft gloss header badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl blue-glass-panel flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2 font-sans tracking-tight">
          {t("login_title")}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {t("login_subtitle")}
        </p>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 rounded-2xl bg-red-100/70 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-right justify-center"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-right">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 px-1">
              {t("username")}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg(null);
                }}
                dir={language === "ar" ? "rtl" : "ltr"}
                placeholder={language === "ar" ? "أدخل اسم المستخدم" : "Enter username"}
                className="w-full pr-10 pl-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/60 neumorphic-sunken focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 px-1">
              {t("password")}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                dir={language === "ar" ? "rtl" : "ltr"}
                placeholder="••••••••"
                className="w-full pr-10 pl-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/60 neumorphic-sunken focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-sm font-medium"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm shadow-md neumorphic-btn hover:from-blue-700 hover:to-cyan-600 focus:outline-none cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              t("login_btn")
            )}
          </button>
        </form>

        <div className="mt-8 p-3 rounded-2xl bg-blue-50/50 border border-blue-100 text-[10px] sm:text-xs text-slate-500 text-center">
          {t("default_credentials_hint")}
        </div>
      </motion.div>
    </div>
  );
}
