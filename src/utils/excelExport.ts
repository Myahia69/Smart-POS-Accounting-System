/**
 * Professional Excel Workbook Export utility for Microsoft Excel.
 * Generates styled spreadsheets with gridlines, RTL alignment support, 
 * bold headers, even-row zebra-striping, and currency/number helper styles.
 */
export function exportToExcel(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
  isRtl: boolean = true
) {
  const fileExt = ".xls";
  const finalFilename = filename.endsWith(fileExt) ? filename : filename + fileExt;

  const styles = `
    table {
      border-collapse: collapse;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      width: 100%;
    }
    th {
      background-color: #1e3a8a; /* Slate / Deep Blue header */
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      font-size: 13px;
    }
    td {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      text-align: center;
      font-size: 12px;
      color: #334155;
    }
    .title-cell {
      font-size: 16px;
      font-weight: bold;
      color: #1e3a8a;
      text-align: center;
      padding: 14px;
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
    }
    .meta-cell {
      font-size: 11px;
      color: #64748b;
      text-align: center;
      padding: 6px;
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
    }
    .even-row {
      background-color: #f8fafc;
    }
    .number {
      mso-number-format: "#,##0.00";
    }
    .integer {
      mso-number-format: "#,##0";
    }
    .text {
      mso-number-format: "\\@";
    }
  `;

  const headerHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${title.replace(/[\\*?:/[\]]/g, "").slice(0, 30) || "Sheet1"}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
                ${isRtl ? "<x:DisplayRightToLeft/>" : ""}
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>${styles}</style>
    </head>
    <body ${isRtl ? 'dir="rtl"' : 'dir="ltr"'}>
      <table>
        <thead>
          <tr>
            <th colspan="${headers.length}" class="title-cell">${title}</th>
          </tr>
          <tr>
            <th colspan="${headers.length}" class="meta-cell">
              ${isRtl ? "تاريخ التصدير: " : "Export date: "} ${new Date().toLocaleString()}
            </th>
          </tr>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
  `;

  let rowsHtml = "";
  rows.forEach((row, i) => {
    const isEven = i % 2 === 0;
    const rowClass = isEven ? 'class="even-row"' : "";
    rowsHtml += `<tr ${rowClass}>`;
    
    row.forEach(val => {
      let cellClass = "";
      
      if (typeof val === "number") {
        if (Number.isInteger(val)) {
          cellClass = 'class="integer"';
        } else {
          cellClass = 'class="number"';
        }
      } else {
        cellClass = 'class="text"';
      }

      const displayVal = val !== undefined && val !== null 
        ? String(val)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;") 
        : "";
        
      rowsHtml += `<td ${cellClass}>${displayVal}</td>`;
    });
    rowsHtml += "</tr>";
  });

  const footerHtml = `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const fullContent = headerHtml + rowsHtml + footerHtml;
  const blob = new Blob([fullContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", finalFilename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
