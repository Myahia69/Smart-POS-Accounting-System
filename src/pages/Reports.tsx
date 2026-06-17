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
// @ts-ignore
import html2canvas from "html2canvas";

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

  // Generate Report pdf using html2canvas to perfectly support RTL Arabic shaping
  const handlePDFExport = () => {
    // We target the offscreen pdf-report-target element
    setTimeout(async () => {
      const element = document.getElementById("pdf-report-target");
      if (!element) return;

      try {
        const canvas = await html2canvas(element, {
          scale: 2.5, // High resolution rendering for sharp printing
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 1.0);

        // Standard A4 dimensions (210mm wide)
        const pdfWidth = 210;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [pdfWidth, pdfHeight],
        });

        doc.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
        doc.save(`Sales_Report_${startDate}_to_${endDate}.pdf`);
      } catch (err) {
        console.error("Failed to generate PDF Report with html2canvas", err);
        
        // Simple basic fallback in case of errors
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text("SALES & REVENUE STATS REPORT", 14, 15);
        doc.setFontSize(9);
        doc.text(`Duration: ${startDate} to ${endDate}`, 14, 22);
        doc.text(`Total Invoices: ${totalInvoices}`, 14, 28);
        doc.text(`Total Revenue: ${totalRevenue.toFixed(1)} ${currency}`, 14, 34);
        doc.save(`Sales_Report_${startDate}_to_${endDate}.pdf`);
      }
    }, 150);
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
                      {new Date(sale.date).toLocaleString(language === "ar" ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
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

      {/* Offscreen high-DPI container for HTML-to-PDF rendering with html2canvas (A4 format alignment) */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div 
          id="pdf-report-target" 
          className="text-black bg-white p-10 font-sans w-[800px] leading-relaxed" 
          style={{ direction: language === "ar" ? "rtl" : "ltr" }}
        >
          {/* Header Store Name & Info */}
          <div className="flex justify-between items-center border-b pb-4 mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="text-xl font-extrabold" style={{ margin: 0 }}>
                {language === "ar" ? settings.storeName : settings.storeNameEn}
              </h2>
              <p className="text-xs text-slate-500 mt-1" style={{ margin: 0 }}>
                {language === "ar" ? "تقرير المبيعات والضرائب والربحية" : "Sales, Tax & Profitability Summary Report"}
              </p>
            </div>
            <div className="text-left" style={{ textAlign: language === "ar" ? "left" : "right" }}>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold">
                {language === "ar" ? "بيانات موثقة بالنظام" : "System Verified"}
              </span>
              <p className="text-[9px] text-slate-400 mt-1.5" style={{ margin: 0 }}>
                {language === "ar" 
                  ? `تاريخ ووقت إصدار التقرير: ${new Date().toLocaleString("ar-SA")}` 
                  : `Generated: ${new Date().toLocaleString()}`}
              </p>
            </div>
          </div>

          {/* Period Details info banner */}
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200 flex justify-between text-[11px] text-slate-600" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <span className="font-bold">{language === "ar" ? "فترة التقرير المستخرجة:" : "Extracted Period:"}</span>{" "}
              <span className="font-mono">{startDate} {language === "ar" ? "إلى" : "to"} {endDate}</span>
            </div>
            <div>
              <span className="font-bold">{language === "ar" ? "محاسب مبيعات المحدد:" : "Selected Cashier:"}</span>{" "}
              <span>
                {filterCashierId === "all" 
                  ? (language === "ar" ? "جميع محاسبي المبيعات" : "All Sales Staff") 
                  : (users.find(u => u.id === filterCashierId)?.name || filterCashierId)
                }
              </span>
            </div>
          </div>

          {/* Core Stat Grid boxes */}
          <div className="grid grid-cols-4 gap-4 mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">
                {language === "ar" ? "إجمالي الفواتير" : "Total Invoices"}
              </span>
              <span className="text-lg font-bold text-blue-700 font-mono">{totalInvoices}</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">
                {language === "ar" ? "صافي الإيرادات" : "Total Revenue"}
              </span>
              <span className="text-lg font-bold text-emerald-700 font-mono">
                {totalRevenue.toFixed(2)} {currency}
              </span>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">
                {language === "ar" ? "ضريبة القيمة المضافة" : "Total VAT"}
              </span>
              <span className="text-lg font-bold text-purple-700 font-mono">
                {totalTax.toFixed(2)} {currency}
              </span>
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">
                {language === "ar" ? "الأرباح التقديرية" : "Est. Net Profit"}
              </span>
              <span className="text-lg font-bold text-cyan-700 font-mono">
                {totalNetProfit.toFixed(2)} {currency}
              </span>
            </div>
          </div>

          {/* Detailed table of transactions */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden mb-4">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
              <span className="text-[10px] font-bold text-slate-750 block">
                {language === "ar" ? "سجل العمليات التفصيلي للمبيعات" : "Transactions Ledger Block"}
              </span>
            </div>
            
            <table className="w-full text-right text-[9px] border-collapse" style={{ width: '100%' }}>
              <thead>
                <tr className="bg-slate-50/55 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-2.5" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("invoice_no")}</th>
                  <th className="p-2.5" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("date")}</th>
                  <th className="p-2.5" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("customer")}</th>
                  <th className="p-2.5" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t("cashier")}</th>
                  <th className="p-2.5" style={{ textAlign: 'center' }}>{t("payment_method")}</th>
                  <th className="p-2.5" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>الخصم</th>
                  <th className="p-2.5" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>الضريبة</th>
                  <th className="p-2.5" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>{t("total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-slate-400">
                      {t("no_data_available")}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="text-slate-700 font-medium whitespace-nowrap">
                      <td className="p-2.5 font-bold font-mono text-blue-600">{sale.invoiceNumber}</td>
                      <td className="p-2.5 font-mono text-slate-400">
                        {new Date(sale.date).toLocaleString(language === "ar" ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="p-2.5">{sale.customerName || t("unknown_customer")}</td>
                      <td className="p-2.5 text-slate-500">{sale.cashierName}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[8px] font-bold uppercase">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="p-2.5 text-red-500 text-left font-sans" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>-{sale.discount.toFixed(1)}</td>
                      <td className="p-2.5 text-slate-500 text-left font-sans" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>{sale.tax.toFixed(1)}</td>
                      <td className="p-2.5 font-bold text-slate-900 text-left font-sans" style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                        {sale.total.toFixed(2)} {currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer signature and timestamp */}
          <div className="text-center text-[8px] text-slate-400 border-t border-dashed border-slate-200 mt-6 pt-3">
            <p className="font-bold">
              {language === "ar" 
                ? "تم استخراج هذا التقرير آلياً من نظام نقطة مبيعات ذكي وموثق" 
                : "This report was generated automatically from compliant Smart POS system."}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
