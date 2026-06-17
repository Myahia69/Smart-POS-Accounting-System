import React, { useState } from "react";
import { AppProvider, useApp } from "./contexts/AppContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UsersPage from "./pages/Users";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Building2, 
  Wallet, 
  BarChart3, 
  Settings as SettingIcon, 
  UserSquare, 
  LogOut, 
  Globe, 
  Menu, 
  X,
  Sparkles,
  UserCheck
} from "lucide-react";

function MainAppLayout() {
  const { 
    currentUser, 
    logout, 
    language, 
    setLanguage, 
    isRtl, 
    t, 
    settings,
    loading 
  } = useApp();

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If loading seed assets
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-800">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-semibold text-slate-500 animate-pulse font-sans">
            جاري تهيئة النظام النقدي والمحاسبي...
          </p>
        </div>
      </div>
    );
  }

  // If user is offline/not logged in, present Login screen
  if (!currentUser) {
    return <Login />;
  }

  // Active Screen renderer
  const renderActiveScreen = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "pos": return <POS />;
      case "products": return <Products />;
      case "customers": return <Customers />;
      case "suppliers": return <Suppliers />;
      case "expenses": return <Expenses />;
      case "reports": return <Reports />;
      case "settings": return <Settings />;
      case "users": return <UsersPage />;
      default: return <Dashboard />;
    }
  };

  // Navigations Links definitions
  const navLinks = [
    { id: "dashboard", label: t("dashboard"), icon: LayoutDashboard, adminOnly: false },
    { id: "pos", label: t("pos"), icon: ShoppingCart, adminOnly: false },
    { id: "products", label: t("products"), icon: Package, adminOnly: false },
    { id: "customers", label: t("customers"), icon: Users, adminOnly: false },
    { id: "suppliers", label: t("suppliers"), icon: Building2, adminOnly: false },
    { id: "expenses", label: t("expenses"), icon: Wallet, adminOnly: false },
    { id: "reports", label: t("reports"), icon: BarChart3, adminOnly: true },
    { id: "settings", label: t("settings"), icon: SettingIcon, adminOnly: true },
    { id: "users", label: t("users"), icon: UserSquare, adminOnly: true },
  ];

  const filteredLinks = navLinks.filter((link) => !link.adminOnly || currentUser.role === "admin");

  return (
    <div 
      dir={isRtl ? "rtl" : "ltr"} 
      className="min-h-screen bg-slate-100 flex flex-col lg:flex-row relative text-slate-800 font-sans antialiased overflow-x-hidden selection:bg-blue-200"
    >
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 rounded-full bg-cyan-100/30 blur-3xl pointer-events-none" />

      {/* MOBILE BAR */}
      <div className="lg:hidden flex items-center justify-between p-4 glass-bg border-b z-20 sticky top-0">
        <button
          id="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <h3 className="text-sm font-bold text-slate-800">
          {language === "ar" ? settings.storeName : settings.storeNameEn}
        </h3>

        {/* Small avatar status */}
        <div className="w-8 h-8 rounded-full bg-blue-105 flex items-center justify-center text-blue-600 font-bold text-xs uppercase font-sans border">
          {currentUser.username.substring(0, 2)}
        </div>
      </div>

      {/* SIDEBAR NAVIGATION (Desktop & Drawer Mobile) */}
      <aside
        id="app-sidebar"
        className={`fixed lg:sticky top-0 bottom-0 ${
          isRtl ? "right-0 border-l" : "left-0 border-r"
        } w-64 h-screen glass-bg p-5 flex flex-col justify-between transition-transform duration-300 z-30 lg:translate-x-0 ${
          mobileMenuOpen 
            ? "translate-x-0 shadow-2xl" 
            : isRtl 
            ? "translate-x-full lg:translate-x-0" 
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-6">
          {/* Brand/Store Heading Logo */}
          <div className="flex items-center gap-2.5 px-2 pb-5 border-b border-slate-200/50 select-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 text-right">
              <h2 className="text-xs font-black text-slate-800 truncate leading-snug">
                {language === "ar" ? settings.storeName : settings.storeNameEn}
              </h2>
              <span className="text-[9px] font-mono font-bold text-blue-600 uppercase">Smart Accounting</span>
            </div>
          </div>

          {/* User profile details */}
          <div className="p-3 bg-white/70 border border-slate-200/50 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-blue-600 border border-slate-200">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="text-right min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-800 truncate leading-none mb-1">{currentUser.name}</h4>
              <span className={`inline-block text-[8px] font-extrabold px-2 py-0.5 rounded-lg uppercase border ${
                currentUser.role === "admin" 
                  ? "bg-blue-50 text-blue-600 border-blue-100" 
                  : "bg-purple-50 text-purple-600 border-purple-100"
              }`}>
                {currentUser.role === "admin" ? t("admin_badge") : t("cashier_badge")}
              </span>
            </div>
          </div>

          {/* Navigation Links list */}
          <nav className="space-y-1.5 select-none">
            {filteredLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`nav-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full py-2.5 px-3.5 rounded-2xl text-[11px] font-bold cursor-pointer transition flex items-center gap-3 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md font-extrabold scale-[1.02]"
                      : "text-slate-600 hover:bg-slate-100/50 border border-transparent hover:border-slate-200/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidemenu Foot Utility Controls: Lang change / Logout */}
        <div className="space-y-3.5 border-t border-slate-200/50 pt-4 select-none">
          {/* Lang toggle switcher */}
          <button
            id="sidebar-lang-switch"
            onClick={() => {
              setLanguage(language === "ar" ? "en" : "ar");
              setMobileMenuOpen(false);
            }}
            className="w-full py-2 px-3 rounded-xl border border-slate-200/80 hover:bg-slate-150 text-[10px] text-slate-500 font-bold flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>{language === "ar" ? "English" : "العربية"}</span>
            </span>
            <span className="text-[9px] font-normal opacity-50 font-mono">AR/EN</span>
          </button>

          {/* Log out */}
          <button
            id="sidebar-logout"
            onClick={logout}
            className="w-full py-2 px-3 rounded-xl bg-red-50 text-red-500 border border-red-150 hover:bg-red-100/80 text-[10px] font-semibold flex items-center gap-2 cursor-pointer transition duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("logout")}</span>
          </button>
        </div>

      </aside>

      {/* MAIN VIEWPORT SCRATCHPAD WORKSPACE AREA */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-[100vw]">
        
        {/* Upper Title Header Section (Desktop specific) */}
        <header className="hidden lg:flex items-center justify-between pb-6 mb-6 border-b border-slate-200/50 select-none">
          <div className="text-right">
            <h1 className="text-xl font-extrabold text-slate-850 tracking-tight">
              {navLinks.find((link) => link.id === activeTab)?.label}
            </h1>
            <span className="text-[10px] font-medium text-slate-400">
              {new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          {/* Core system branding */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/70 border border-slate-200/60 font-medium text-xs text-slate-500 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold">{t("success").split("!")[0]} (مستقر)</span>
          </div>
        </header>

        {/* Dynamic page render area with simple transition animate wrapping */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full min-h-[480px]"
          >
            {renderActiveScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppLayout />
    </AppProvider>
  );
}
