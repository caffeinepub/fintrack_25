import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Account,
  type Transaction,
  getAllAccounts,
  getAllTransactions,
} from "@/lib/db";
import { calculateNetWorth, formatINR, getMonthlyStats } from "@/lib/finance";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function getLastNMonths(n: number): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("en-IN", { month: "long", year: "numeric" });
    months.push({ value, label });
  }
  return months;
}

export default function Reports() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    savingsRate: 0,
  });
  const [netWorthData, setNetWorthData] = useState({
    netWorth: 0,
    accountsTotal: 0,
    investmentsTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  const months = getLastNMonths(12);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTxs, accs, nwData, monthStats] = await Promise.all([
        getAllTransactions(),
        getAllAccounts(),
        calculateNetWorth(),
        getMonthlyStats(selectedMonth),
      ]);
      const monthTxs = allTxs.filter((tx) => tx.date.startsWith(selectedMonth));
      setTransactions(monthTxs);
      setAccounts(accs);
      setNetWorthData(nwData);
      setStats(monthStats);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || id;

  const expenseByCategory = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc: Record<string, number>, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

  const expenseRows = Object.entries(expenseByCategory).sort(
    ([, a], [, b]) => b - a,
  );

  const top5Txs = [...transactions]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const incomeByCategory = transactions
    .filter((tx) => tx.type === "income")
    .reduce((acc: Record<string, number>, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

  // CSV Export
  const exportCSV = async () => {
    try {
      const allTxs = await getAllTransactions();
      const headers = [
        "Date",
        "Type",
        "Amount",
        "Category",
        "Subcategory",
        "Account",
        "Notes",
      ];
      const rows = allTxs.map((tx) => [
        tx.date,
        tx.type,
        tx.amount.toString(),
        tx.category,
        tx.subcategory || "",
        getAccountName(tx.accountId),
        tx.notes || "",
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fintrack-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  // PDF Export
  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const monthLabel =
        months.find((m) => m.value === selectedMonth)?.label || selectedMonth;

      // Header
      doc.setFillColor(13, 17, 23);
      doc.rect(0, 0, 210, 297, "F");
      doc.setTextColor(150, 180, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("FinTrack Report", 15, 20);
      doc.setFontSize(11);
      doc.setTextColor(150, 150, 180);
      doc.text(monthLabel, 15, 28);

      // Summary
      doc.setFontSize(13);
      doc.setTextColor(220, 230, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Financial Summary", 15, 42);

      const summaryData = [
        ["Total Income", formatINR(stats.income)],
        ["Total Expenses", formatINR(stats.expenses)],
        ["Savings", formatINR(stats.savings)],
        ["Savings Rate", `${stats.savingsRate.toFixed(1)}%`],
        ["Net Worth", formatINR(netWorthData.netWorth)],
      ];

      autoTable(doc, {
        startY: 46,
        body: summaryData,
        theme: "plain",
        styles: { textColor: [200, 210, 255], fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { textColor: [150, 160, 200] },
          1: { textColor: [100, 200, 130], halign: "right" },
        },
      });

      // Expense Breakdown
      const docWithTable = doc as unknown as {
        lastAutoTable: { finalY: number };
      };
      const currentY = docWithTable.lastAutoTable?.finalY + 10 || 100;
      doc.setFontSize(13);
      doc.setTextColor(220, 230, 255);
      doc.text("Expense Breakdown", 15, currentY);

      if (expenseRows.length > 0) {
        autoTable(doc, {
          startY: currentY + 4,
          head: [["Category", "Amount"]],
          body: expenseRows.map(([cat, amt]) => [cat, formatINR(amt)]),
          theme: "plain",
          headStyles: { textColor: [150, 160, 200], fontSize: 9 },
          styles: { textColor: [200, 210, 255], fontSize: 9, cellPadding: 2.5 },
          columnStyles: { 1: { textColor: [255, 130, 100], halign: "right" } },
        });
      }

      // Top Transactions
      const y2 = docWithTable.lastAutoTable?.finalY + 10 || 160;
      doc.setFontSize(13);
      doc.setTextColor(220, 230, 255);
      doc.text("Top Transactions", 15, y2);

      if (top5Txs.length > 0) {
        autoTable(doc, {
          startY: y2 + 4,
          head: [["Date", "Category", "Account", "Amount"]],
          body: top5Txs.map((tx) => [
            tx.date,
            tx.category,
            getAccountName(tx.accountId),
            formatINR(tx.amount),
          ]),
          theme: "plain",
          headStyles: { textColor: [150, 160, 200], fontSize: 9 },
          styles: { textColor: [200, 210, 255], fontSize: 9, cellPadding: 2.5 },
          columnStyles: { 3: { textColor: [255, 180, 100], halign: "right" } },
        });
      }

      doc.save(`fintrack-report-${selectedMonth}.pdf`);
      toast.success("PDF report generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-xl font-bold">Reports</h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              data-ocid="reports.csv_button"
              className="text-xs gap-1"
            >
              <FileSpreadsheet size={14} /> CSV
            </Button>
            <Button
              size="sm"
              onClick={exportPDF}
              data-ocid="reports.pdf_button"
              className="text-xs gap-1"
              style={{ background: "oklch(0.65 0.18 300)" }}
            >
              <FileText size={14} /> PDF
            </Button>
          </div>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="bg-muted" data-ocid="reports.month.select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {loading ? (
          <div data-ocid="reports.loading_state">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-card animate-pulse mb-3"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Income Summary */}
            <div className="fintrack-card p-4" data-ocid="reports.income.card">
              <h3
                className="font-display font-semibold text-sm mb-3"
                style={{ color: "oklch(0.65 0.2 145)" }}
              >
                Income Summary
              </h3>
              {Object.entries(incomeByCategory).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No income this month
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(incomeByCategory).map(([cat, amt]) => (
                    <div
                      key={cat}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm text-muted-foreground">
                        {cat}
                      </span>
                      <span
                        className="font-semibold text-sm"
                        style={{ color: "oklch(0.65 0.2 145)" }}
                      >
                        {formatINR(amt)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t border-border pt-2 mt-2">
                    <span className="text-sm font-semibold">Total</span>
                    <span
                      className="font-display font-bold"
                      style={{ color: "oklch(0.65 0.2 145)" }}
                    >
                      {formatINR(stats.income)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Expense Breakdown */}
            <div className="fintrack-card p-4" data-ocid="reports.expense.card">
              <h3
                className="font-display font-semibold text-sm mb-3"
                style={{ color: "oklch(0.6 0.22 25)" }}
              >
                Expense Breakdown
              </h3>
              {expenseRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No expenses this month
                </p>
              ) : (
                <div className="space-y-2">
                  {expenseRows.map(([cat, amt]) => {
                    const pct =
                      stats.expenses > 0 ? (amt / stats.expenses) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-muted-foreground">
                            {cat}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {pct.toFixed(0)}%
                            </span>
                            <span
                              className="font-semibold text-sm"
                              style={{ color: "oklch(0.6 0.22 25)" }}
                            >
                              {formatINR(amt)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: "oklch(0.6 0.22 25)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center border-t border-border pt-2 mt-2">
                    <span className="text-sm font-semibold">Total</span>
                    <span
                      className="font-display font-bold"
                      style={{ color: "oklch(0.6 0.22 25)" }}
                    >
                      {formatINR(stats.expenses)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Top Transactions */}
            <div
              className="fintrack-card p-4"
              data-ocid="reports.top_transactions.card"
            >
              <h3 className="font-display font-semibold text-sm mb-3">
                Top 5 Transactions
              </h3>
              {top5Txs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No transactions this month
                </p>
              ) : (
                <div className="space-y-2">
                  {top5Txs.map((tx, idx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 py-1"
                      data-ocid={`reports.transaction.item.${idx + 1}`}
                    >
                      <span className="text-xs text-muted-foreground w-4 flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{tx.category}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {getAccountName(tx.accountId)} · {tx.date}
                        </p>
                      </div>
                      <p className="font-semibold text-sm flex-shrink-0">
                        {formatINR(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Net Worth Summary */}
            <div
              className="fintrack-card p-4"
              data-ocid="reports.networth.card"
            >
              <h3
                className="font-display font-semibold text-sm mb-3"
                style={{ color: "oklch(0.6 0.2 255)" }}
              >
                Net Worth Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Bank & Cash Accounts
                  </span>
                  <span className="font-semibold text-sm">
                    {formatINR(netWorthData.accountsTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Investments
                  </span>
                  <span
                    className="font-semibold text-sm"
                    style={{ color: "oklch(0.7 0.18 50)" }}
                  >
                    {formatINR(netWorthData.investmentsTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-border pt-3">
                  <span className="font-semibold">Net Worth</span>
                  <span
                    className="font-display font-bold text-lg"
                    style={{ color: "oklch(0.6 0.2 255)" }}
                  >
                    {formatINR(netWorthData.netWorth)}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Summary */}
            <div
              className="fintrack-card p-4"
              data-ocid="reports.monthly_summary.card"
            >
              <h3 className="font-display font-semibold text-sm mb-3">
                Monthly Summary
              </h3>
              <div className="space-y-2">
                {[
                  {
                    label: "Income",
                    value: stats.income,
                    color: "oklch(0.65 0.2 145)",
                  },
                  {
                    label: "Expenses",
                    value: stats.expenses,
                    color: "oklch(0.6 0.22 25)",
                  },
                  {
                    label: "Savings",
                    value: stats.savings,
                    color:
                      stats.savings >= 0
                        ? "oklch(0.65 0.2 145)"
                        : "oklch(0.6 0.22 25)",
                  },
                  {
                    label: "Savings Rate",
                    value: null,
                    extra: `${stats.savingsRate.toFixed(1)}%`,
                    color: "oklch(0.65 0.18 300)",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between items-center py-1"
                  >
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                    <span
                      className="font-semibold text-sm"
                      style={{ color: item.color }}
                    >
                      {item.extra || formatINR(item.value || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
