import React from "react";
import { useApp } from "../contexts/AppContext";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  Wallet, 
  ShoppingCart, 
  AlertTriangle, 
  Receipt, 
  CalendarDays, 
  Coins 
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { sales, products, expenses, settings, t, language, currency = settings.currency } = useApp();

  // Helper date parsing
  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"

  // 1. Calculate Today's Sales
  const todaySales = sales
    .filter((s) => s.date.startsWith(todayStr))
    .reduce((sum, s) => sum + s.total, 0);

  // 2. Calculate Monthly Sales
  const monthlySales = sales
    .filter((s) => s.date.startsWith(thisMonthStr))
    .reduce((sum, s) => sum + s.total, 0);

  // 3. Calculate Real Net Profit
  // Profit = Sale Price - Product Cost (for each individual unit sold)
  let totalNetProfit = 0;
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      // Find historical product cost to derive actual gain
      const prod = products.find((p) => p.id === item.productId);
      const cost = prod ? prod.cost : item.price * 0.7; // default 30% margin if not found
      totalNetProfit += (item.price - cost) * item.quantity;
    });
    // Subtract tax if profit is considered on base prices, or keep simple gross profit after VAT
    // Let's add direct discount reductions to profit
    totalNetProfit -= (sale.discount || 0);
  });

  // 4. Calculate total expenses
  const totalExpensesSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 5. Gather low stock alerts
  const lowStockProducts = products.filter((p) => p.quantity <= p.minQuantity);

  // 6. Generate Recharts Data for last 7 active days of activity
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  const chartData = last7Days.map((dateStr) => {
    const daySales = sales.filter((s) => s.date.startsWith(dateStr));
    const salesSum = daySales.reduce((sum, s) => sum + s.total, 0);
    
    // Calculate profit for this specific day
    let profitSum = 0;
    daySales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cost = prod ? prod.cost : item.price * 0.7;
        profitSum += (item.price - cost) * item.quantity;
      });
      profitSum -= (sale.discount || 0);
    });

    const dayName = new Date(dateStr).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
      weekday: "short",
    });

    return {
      date: dayName,
      sales: Number(salesSum.toFixed(2)),
      profit: Number(profitSum.toFixed(2)),
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Upper Cards Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today Sales */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="blue-glass-panel rounded-3xl p-6 flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight block mb-1">
              {t("daily_sales")}
            </span>
            <span className="text-2xl font-bold text-slate-800 font-sans tracking-tight">
              {todaySales.toLocaleString()} <span className="text-sm font-normal text-blue-600">{currency}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-100/80 flex items-center justify-center text-blue-600">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Monthly Sales */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="glass-bg neumorphic-flat rounded-3xl p-6 flex items-center justify-between border"
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight block mb-1">
              {t("monthly_sales")}
            </span>
            <span className="text-2xl font-bold text-slate-800 font-sans tracking-tight">
              {monthlySales.toLocaleString()} <span className="text-sm font-normal text-slate-600">{currency}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-150 text-cyan-600 flex items-center justify-center bg-cyan-150/80">
            <CalendarDays className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Real profit estimation */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="green-glass-panel rounded-3xl p-6 flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-tight block mb-1">
              {t("net_revenue")}
            </span>
            <span className="text-2xl font-bold text-emerald-800 font-sans tracking-tight">
              {totalNetProfit.toLocaleString()} <span className="text-sm font-normal text-emerald-600">{currency}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Operating Expenses */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="red-glass-panel rounded-3xl p-6 flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-tight block mb-1">
              {t("total_expenses")}
            </span>
            <span className="text-2xl font-bold text-red-900 font-sans tracking-tight">
              {totalExpensesSum.toLocaleString()} <span className="text-sm font-normal text-red-700">{currency}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-100/80 flex items-center justify-center text-red-600">
            <Wallet className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Main Core Layout: Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Glass Card */}
        <div className="lg:col-span-2 glass-bg neumorphic-flat p-6 rounded-3xl border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-bold text-slate-700 flex items-center gap-2">
              <Coins className="w-5 h-5 text-blue-500" />
              {t("sales_over_time")}
            </h3>
            <span className="text-xs text-slate-400 font-mono">Last 7 Active Days</span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: "rgba(255, 255, 255, 0.9)", 
                    border: "1px solid rgba(226, 232, 240, 0.8)", 
                    borderRadius: "16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                  }} 
                />
                <Area 
                  name={language === "ar" ? "المبيعات" : "Sales"} 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
                <Area 
                  name={language === "ar" ? "الأرباح" : "Profit"} 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts list */}
        <div className="glass-bg neumorphic-flat p-6 rounded-3xl border flex flex-col">
          <h3 className="text-md font-bold text-slate-700 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
            {t("low_stock_alerts")}
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[260px] space-y-3.5 pr-1">
            {lowStockProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <p className="text-xs text-slate-400 font-medium">✨ {t("success")}</p>
                <span className="text-[10px] text-slate-400">كل المنتجات بمقدار آمن حالياً!</span>
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div 
                  key={p.id} 
                  className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border border-amber-200/60"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {language === "ar" ? p.name : p.nameEn}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400">SKU: {p.sku}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-amber-700 bg-amber-100/55 px-2.5 py-1 rounded-xl">
                      {p.quantity} {t("item_singular")}
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-1">الحد الأدنى: {p.minQuantity}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recents Transactions Table */}
      <div className="glass-bg neumorphic-flat p-6 rounded-3xl border overflow-hidden">
        <h3 className="text-md font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-cyan-600" />
          {t("recent_transactions")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200/60 text-slate-400 font-bold">
                <th className="pb-3 text-right">{t("invoice_no")}</th>
                <th className="pb-3 text-right">{t("date")}</th>
                <th className="pb-3 text-right">{t("customer")}</th>
                <th className="pb-3 text-right">{t("cashier")}</th>
                <th className="pb-3 text-right">{t("payment_method")}</th>
                <th className="pb-3 text-left">{t("total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 text-slate-600 font-medium">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 font-normal">
                    {t("no_data_available")}
                  </td>
                </tr>
              ) : (
                [...sales].reverse().slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-100/40 transition">
                    <td className="py-3 font-semibold font-mono text-blue-600">{sale.invoiceNumber}</td>
                    <td className="py-3 font-mono text-slate-400 text-[10px]">
                      {new Date(sale.date).toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="py-3 text-slate-750">
                      {sale.customerName || t("unknown_customer")}
                    </td>
                    <td className="py-3 text-slate-500 font-normal">
                      {sale.cashierName}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] uppercase font-semibold ${
                        sale.paymentMethod === "cash" 
                          ? "bg-blue-100 text-blue-700" 
                          : sale.paymentMethod === "card" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {sale.paymentMethod === "cash" 
                          ? t("payment_cash").split(" ")[0] 
                          : sale.paymentMethod === "card" 
                          ? t("payment_card").split(" ")[0] 
                          : t("payment_split").split(" ")[0]}
                      </span>
                    </td>
                    <td className="py-3 text-left font-bold text-slate-800 font-sans">
                      {sale.total.toFixed(2)} {currency}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
