import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { motion } from "motion/react";
import { exportToExcel } from "../utils/excelExport";
import { 
  BarChart3, 
  Calendar, 
  User, 
  Printer, 
  FileSpreadsheet, 
  ShieldX,
  FileDown,
  Coins,
  DollarSign,
  TrendingUp,
  Receipt
} from "lucide-react";
import jsPDF from "jspdf";

export default function Reports() {
  const { 
    sales, 
    products, 
    users, 
    currentUser, 
    t, 
    language, 
    settings,
    currency = settings.currency 
  } = useApp();

  // Guard: ONLY admin can view report queries
  if (currentUser?.role !== "admin") {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-bg neumorphic-flat max-w-lg mx-auto py-16 px-8 rounded-3xl border border-red-200 text-center flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-650 mb-2">
          <ShieldX className="w-9 h-9" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">{t("access_denied")}</h3>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
          عذراً، هذا القسم يحتوي على تقارير مالية سرية وأرقام المبيعات التشغيلية، ومتاح فقط لحساب المسؤول الرئيسي (Admin).
        </p>
      </motion.div>
    );
  }

  // Date filters
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(oneWeekAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [filterCashierId, setFilterCashierId] = useState("all");

  // Filter Sales list
  const filteredSales = sales.filter((sale) => {
    const saleDateStr = sale.date.split("T")[0];
    const matchesStart = !startDate || saleDateStr >= startDate;
    const matchesEnd = !endDate || saleDateStr <= endDate;
    const matchesCashier = filterCashierId === "all" || sale.cashierId === filterCashierId;
    return matchesStart && matchesEnd && matchesCashier;
  });

  // Financial statistics calculations
  const totalInvoices = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalTax = filteredSales.reduce((sum, s) => sum + s.tax, 0);

  // Calculate net profits
  let totalNetProfit = 0;
  filteredSales.forEach((sale) => {
    sale.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const cost = prod ? prod.cost : item.price * 0.7; // default 30% margin fallback
      totalNetProfit += (item.price - cost) * item.quantity;
    });
    totalNetProfit -= (sale.discount || 0);
  });

  // Print on-screen report
  const triggerPrintReport = () => {
    window.print();
  };

  // Export excel CSV
  const handleCSVExport = () => {
    const isAr = language === "ar";
    const title = isAr 
      ? `تقرير وملخص المبيعات من ${startDate} إلى ${endDate}` 
      : `Sales Summary Report (${startDate} to ${endDate})`;
    const filename = isAr 
      ? `تقرير_المبيعات_${startDate}_إلى_${endDate}`
      : `Sales_Report_${startDate}_to_${endDate}`;

    const headersList = isAr
      ? ["رقم الفاتورة", "التاريخ", "المحاسب كاشير", "اسم العميل", `مجموع المدفوع (${currency})`, `الضريبة (${currency})`, `الخصم (${currency})`, "طريقة الدفع"]
      : ["Invoice Number", "Date", "Cashier", "Customer Name", `Total Paid (${currency})`, `Tax (${currency})`, `Discount (${currency})`, "Payment Mode"];

    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      s.date.split("T")[0],
      s.cashierName,
      s.customerName || (isAr ? "عميل نقدي" : "Cash Customer"),
      s.total,
      s.tax,
      s.discount || 0,
      s.paymentMethod === "cash" ? (isAr ? "نقدي" : "Cash") : (isAr ? "شبكة / مدى" : "Card/Network")
    ]);

    exportToExcel(filename, title, headersList, rows, isAr);
  };

  // Generate Report pdf
  const handlePDFExport = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("SALES & REVENUE STATS REPORT", 14, 15);
    
    doc.setFontSize(9);
    doc.text(`Duration: ${startDate} to ${endDate}`, 14, 22);
    doc.text(`Total Invoices: ${totalInvoices}`, 14, 28);
    doc.text(`Total Revenue: ${totalRevenue.toFixed(1)} ${currency}`, 14, 34);
    doc.text(`Total VAT Tax: ${totalTax.toFixed(1)} ${currency}`, 14, 40);
    doc.text(`Est. Net Profit: ${totalNetProfit.toFixed(1)} ${currency}`, 14, 46);
    
    doc.line(14, 50, 196, 50);
    doc.text("Invoice", 14, 55);
    doc.text("Date", 50, 55);
    doc.text("Customer", 80, 55);
    doc.text("Method", 130, 55);
    doc.text("Total", 170, 55);
    doc.line(14, 57, 196, 57);

    let y = 62;
    filteredSales.forEach((s) => {
      doc.text(s.invoiceNumber, 14, y);
      doc.text(s.date.split("T")[0], 50, y);
      doc.text(String(s.customerName || "Cash Customer").substring(0, 18), 80, y);
      doc.text(s.paymentMethod.toUpperCase(), 130, y);
      doc.text(`${s.total.toFixed(1)}`, 170, y);
      y += 6;
      if (y > 280) { doc.addPage(); y = 20; }
    });

    doc.save(`Sales_Report_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Top filter queries box */}
      <div className="glass-bg neumorphic-flat p-5 rounded-3xl border grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-right">
        
        {/* Start Date */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 px-1 flex items-center justify-end gap-1">
            <span>{t("start_date")}</span>
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
          </label>
          <input
            id="rep-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 px-1 flex items-center justify-end gap-1">
            <span>{t("end_date")}</span>
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
          </label>
          <input
            id="rep-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
          />
        </div>

        {/* Cashier Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 px-1 flex items-center justify-end gap-1">
            <span>الموظف / الكاشير</span>
            <User className="w-3.5 h-3.5 text-blue-500" />
          </label>
          <select
            id="rep-cashier"
            value={filterCashierId}
            onChange={(e) => setFilterCashierId(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
          >
            <option value="all">-- كل الموظفين --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Downloads / Actions */}
        <div className="grid grid-cols-3 gap-2 text-center select-none">
          <button
            id="rep-action-print"
            onClick={triggerPrintReport}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-sm text-[9px] font-semibold"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة</span>
          </button>

          <button
            id="rep-action-excel"
            onClick={handleCSVExport}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-sm text-[9px] font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>تصدير Excel</span>
          </button>

          <button
            id="rep-action-pdf"
            onClick={handlePDFExport}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-sm text-[9px] font-semibold"
          >
            <FileDown className="w-4 h-4 text-cyan-500" />
            <span>تقرير PDF</span>
          </button>
        </div>
      </div>

      {/* Stats metrics upper grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Invoices Count */}
        <div className="glass-bg neumorphic-flat rounded-3xl p-5 flex items-center justify-between border">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-1">
              {t("total_sales_count")}
            </span>
            <span className="text-xl font-bold text-slate-800 font-sans">{totalInvoices}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100/60 text-blue-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Total revenue */}
        <div className="blue-glass-panel rounded-3xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-550 block mb-1">
              {t("total_revenue_stats")}
            </span>
            <span className="text-xl font-extrabold text-slate-850 font-sans">
              {totalRevenue.toFixed(1)} <span className="text-xs font-normal text-blue-600">{currency}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* VAT Tax Collected */}
        <div className="glass-bg neumorphic-flat rounded-3xl p-5 flex items-center justify-between border">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-1">
              {t("total_tax_collected")}
            </span>
            <span className="text-xl font-bold text-slate-800 font-sans">
              {totalTax.toFixed(1)} <span className="text-xs font-normal text-slate-500">{currency}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100/60 text-purple-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Real Net Profit summary */}
        <div className="green-glass-panel rounded-3xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-550 block mb-1">
              {t("total_net_profit")}
            </span>
            <span className="text-xl font-extrabold text-emerald-800 font-sans animate-fade">
              {totalNetProfit.toFixed(1)} <span className="text-xs font-normal text-emerald-600">{currency}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Detailed invoices tables list */}
      <div className="glass-bg neumorphic-flat p-5 rounded-3xl border overflow-hidden">
        <h3 className="text-md font-bold text-slate-750 flex items-center gap-1.5 mb-4">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span>{t("report_sales_cashier")}</span>
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
                <th className="pb-3 text-right">الخصم</th>
                <th className="pb-3 text-right">الضريبة</th>
                <th className="pb-3 text-left">{t("total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 text-slate-600 font-medium text-[11px]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400 font-normal">
                    {t("no_data_available")}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-100/40 transition">
                    <td className="py-3 font-semibold font-mono text-blue-600">{sale.invoiceNumber}</td>
                    <td className="py-3 font-mono text-slate-400 text-[10px]">
                      {new Date(sale.date).toISOString().split("T")[0]}
                    </td>
                    <td className="py-3 text-slate-700">{sale.customerName || t("unknown_customer")}</td>
                    <td className="py-3 text-slate-500">{sale.cashierName}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-lg text-[9px] uppercase font-bold bg-slate-100">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 text-red-500 font-sans">-{sale.discount.toFixed(1)}</td>
                    <td className="py-3 text-slate-500 font-sans">{sale.tax.toFixed(1)}</td>
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
