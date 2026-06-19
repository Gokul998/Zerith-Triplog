"use client";
import { FileText, BarChart2 } from "lucide-react";

interface Props {
  expenses: any[];
  trip: any;
}

export function ExpenseExport({ expenses, trip }: Props) {
  function exportCSV() {
    const headers = ["Date", "Description", "Category", "Amount", "Currency", "Paid By", "Notes"];
    const rows = expenses.map(e => [
      e.date,
      `"${(e.title ?? "").replace(/"/g, '""')}"`,
      e.category,
      e.amount,
      e.currency,
      `"${(e.paid_by_name ?? "").replace(/"/g, '""')}"`,
      `"${(e.notes ?? "").replace(/"/g, '""')}"`
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(trip?.title ?? "trip").replace(/\s+/g, "_")}_expenses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const total = expenses.reduce((s: number, e: any) => s + e.amount, 0);
    const rows = expenses.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${e.title}</td>
        <td>${e.category}</td>
        <td>${e.paid_by_name ?? ""}</td>
        <td style="text-align:right">${e.currency} ${Number(e.amount).toFixed(2)}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${trip?.title ?? "Trip"} — Expenses</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a2e; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #666; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #4f46e5; color: #fff; padding: 8px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f8f8ff; }
    .total { margin-top: 16px; text-align: right; font-size: 15px; font-weight: bold; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${trip?.title ?? "Trip"} — Expense Report</h1>
  <p class="meta">Destination: ${trip?.destination ?? ""} &nbsp;|&nbsp; ${trip?.start_date ?? ""} to ${trip?.end_date ?? ""} &nbsp;|&nbsp; ${expenses.length} expenses</p>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Paid By</th><th>Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Total: ${trip?.currency ?? "USD"} ${total.toFixed(2)}</p>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportCSV}
        className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl px-3 py-1.5 transition-colors"
      >
        <BarChart2 size={13} />
        Export CSV
      </button>
      <button
        onClick={exportPDF}
        className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl px-3 py-1.5 transition-colors"
      >
        <FileText size={13} />
        Export PDF
      </button>
    </div>
  );
}
