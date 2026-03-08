import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Account,
  type Category,
  generateId,
  getAllAccounts,
  getAllCategories,
  getAllInvestments,
  getAllNetWorthSnapshots,
  getAllTransactions,
  saveTransaction,
} from "@/lib/db";
import {
  applyTransaction,
  calculateNetWorth,
  formatINR,
  formatINRCompact,
  getMonthlyStats,
  saveNetWorthSnapshotNow,
} from "@/lib/finance";
import {
  BarChart3,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { Page } from "../App";

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

const CHART_COLORS = [
  "oklch(0.6 0.2 255)",
  "oklch(0.65 0.2 145)",
  "oklch(0.6 0.22 25)",
  "oklch(0.7 0.18 50)",
  "oklch(0.65 0.18 300)",
  "oklch(0.7 0.15 200)",
  "oklch(0.75 0.14 100)",
  "oklch(0.6 0.15 340)",
];

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [netWorth, setNetWorth] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    savingsRate: 0,
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<
    { name: string; value: number }[]
  >([]);
  const [spendingTrend, setSpendingTrend] = useState<
    { month: string; income: number; expenses: number }[]
  >([]);
  const [netWorthHistory, setNetWorthHistory] = useState<
    { month: string; value: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Quick expense form
  const [qeAmount, setQeAmount] = useState("");
  const [qeCategory, setQeCategory] = useState("");
  const [qeAccount, setQeAccount] = useState("");
  const [qeSaving, setQeSaving] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        accountsData,
        categoriesData,
        transactions,
        nwData,
        snapshots,
        _investments,
      ] = await Promise.all([
        getAllAccounts(),
        getAllCategories(),
        getAllTransactions(),
        calculateNetWorth(),
        getAllNetWorthSnapshots(),
        getAllInvestments(),
      ]);

      setAccounts(accountsData);
      setCategories(categoriesData.filter((c) => c.type === "expense"));
      setNetWorth(nwData.netWorth);

      const stats = await getMonthlyStats(currentMonth);
      setMonthlyStats(stats);

      // Expense breakdown for current month
      const currentMonthTxs = transactions.filter(
        (tx) => tx.date.startsWith(currentMonth) && tx.type === "expense",
      );
      const categoryMap: Record<string, number> = {};
      for (const tx of currentMonthTxs) {
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
      }
      const breakdown = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);
      setExpenseBreakdown(breakdown);

      // Spending trend for last 6 months
      const trend: { month: string; income: number; expenses: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.toISOString().slice(0, 7);
        const monthTxs = transactions.filter((tx) => tx.date.startsWith(month));
        const inc = monthTxs
          .filter((tx) => tx.type === "income")
          .reduce((s, tx) => s + tx.amount, 0);
        const exp = monthTxs
          .filter((tx) => tx.type === "expense")
          .reduce((s, tx) => s + tx.amount, 0);
        trend.push({
          month: new Date(d).toLocaleString("en-IN", { month: "short" }),
          income: inc,
          expenses: exp,
        });
      }
      setSpendingTrend(trend);

      // Net worth history
      if (snapshots.length > 0) {
        const history = snapshots.slice(-6).map((s) => ({
          month: s.month.slice(5),
          value: s.netWorth,
        }));
        setNetWorthHistory(history);
      } else {
        setNetWorthHistory([
          { month: currentMonth.slice(5), value: nwData.netWorth },
        ]);
      }

      // Save snapshot
      await saveNetWorthSnapshotNow();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickExpense = async () => {
    if (!qeAmount || !qeCategory || !qeAccount) {
      toast.error("Please fill all fields");
      return;
    }
    const amount = Number.parseFloat(qeAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setQeSaving(true);
    try {
      const tx = {
        id: generateId(),
        type: "expense" as const,
        amount,
        category: qeCategory,
        accountId: qeAccount,
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };
      await saveTransaction(tx);
      await applyTransaction(tx);
      setQeAmount("");
      setQeCategory("");
      setQeAccount("");
      toast.success(`Expense of ${formatINR(amount)} recorded`);
      loadData();
    } catch {
      toast.error("Failed to save expense");
    } finally {
      setQeSaving(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const CustomTooltipINR = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="fintrack-card p-3 text-xs">
          <p className="text-muted-foreground mb-1">{label}</p>
          {payload.map((p) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: {formatINRCompact(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4" data-ocid="dashboard.loading_state">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      {/* Greeting Card */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.25 0.08 255), oklch(0.18 0.06 280))",
          border: "1px solid oklch(0.35 0.08 255)",
        }}
      >
        <div
          className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10"
          style={{ background: "oklch(0.6 0.2 255)" }}
        />
        <p className="text-blue-100 text-sm">{greeting()}</p>
        <h1 className="font-display text-2xl font-bold text-white mt-0.5">
          Your Finances
        </h1>
        <p className="text-xs text-blue-200 mt-1">{today}</p>
        <button
          type="button"
          onClick={loadData}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={16} className="text-blue-200" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Net Worth */}
        <button
          type="button"
          className="col-span-2 fintrack-card p-4 cursor-pointer active:scale-[0.99] transition-transform text-left w-full"
          data-ocid="dashboard.net_worth.card"
          onClick={() => onNavigate("reports")}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Net Worth
            </span>
            <Wallet size={16} style={{ color: "oklch(0.6 0.2 255)" }} />
          </div>
          <p
            className="font-display text-3xl font-bold"
            style={{ color: "oklch(0.6 0.2 255)" }}
          >
            {formatINRCompact(netWorth)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatINR(netWorth)}
          </p>
        </button>

        {/* Monthly Income */}
        <div className="fintrack-card p-4" data-ocid="dashboard.income.card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Income
            </span>
            <TrendingUp size={14} style={{ color: "oklch(0.65 0.2 145)" }} />
          </div>
          <p
            className="font-display text-xl font-bold"
            style={{ color: "oklch(0.65 0.2 145)" }}
          >
            {formatINRCompact(monthlyStats.income)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">This month</p>
        </div>

        {/* Monthly Expenses */}
        <div className="fintrack-card p-4" data-ocid="dashboard.expenses.card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Expenses
            </span>
            <TrendingDown size={14} style={{ color: "oklch(0.6 0.22 25)" }} />
          </div>
          <p
            className="font-display text-xl font-bold"
            style={{ color: "oklch(0.6 0.22 25)" }}
          >
            {formatINRCompact(monthlyStats.expenses)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">This month</p>
        </div>

        {/* Savings */}
        <div className="fintrack-card p-4" data-ocid="dashboard.savings.card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Savings
            </span>
            <PiggyBank size={14} style={{ color: "oklch(0.65 0.2 145)" }} />
          </div>
          <p
            className="font-display text-xl font-bold"
            style={{
              color:
                monthlyStats.savings >= 0
                  ? "oklch(0.65 0.2 145)"
                  : "oklch(0.6 0.22 25)",
            }}
          >
            {formatINRCompact(Math.abs(monthlyStats.savings))}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">This month</p>
        </div>

        {/* Savings Rate */}
        <div
          className="fintrack-card p-4"
          data-ocid="dashboard.savings_rate.card"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Savings Rate
            </span>
            <BarChart3 size={14} style={{ color: "oklch(0.65 0.18 300)" }} />
          </div>
          <p
            className="font-display text-xl font-bold"
            style={{ color: "oklch(0.65 0.18 300)" }}
          >
            {monthlyStats.savingsRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Of income</p>
        </div>
      </div>

      {/* Quick Expense */}
      <div
        className="fintrack-card p-4"
        data-ocid="dashboard.quick_expense.card"
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: "oklch(0.28 0.08 25)" }}
          >
            <Zap size={14} style={{ color: "oklch(0.6 0.22 25)" }} />
          </div>
          <h3 className="font-display font-semibold text-sm">Quick Expense</h3>
        </div>
        <div className="space-y-3">
          <Input
            type="number"
            placeholder="Amount ₹"
            value={qeAmount}
            onChange={(e) => setQeAmount(e.target.value)}
            className="bg-muted border-border"
            data-ocid="quick_expense.input"
          />
          <Select value={qeCategory} onValueChange={setQeCategory}>
            <SelectTrigger
              className="bg-muted border-border"
              data-ocid="quick_expense.category.select"
            >
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={qeAccount} onValueChange={setQeAccount}>
            <SelectTrigger
              className="bg-muted border-border"
              data-ocid="quick_expense.account.select"
            >
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleQuickExpense}
            disabled={qeSaving}
            className="w-full font-semibold"
            style={{ background: "oklch(0.6 0.22 25)", color: "white" }}
            data-ocid="quick_expense.submit_button"
          >
            {qeSaving ? "Saving..." : "Save Expense"}
          </Button>
        </div>
      </div>

      {/* Expense Breakdown */}
      {expenseBreakdown.length > 0 && (
        <div
          className="fintrack-card p-4"
          data-ocid="dashboard.expense_chart.card"
        >
          <h3 className="font-display font-semibold text-sm mb-4">
            Expense Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={expenseBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {expenseBreakdown.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="fintrack-card p-2 text-xs">
                        <p className="font-semibold">{payload[0].name}</p>
                        <p style={{ color: "oklch(0.6 0.22 25)" }}>
                          {formatINR(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {expenseBreakdown.slice(0, 6).map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-[10px] text-muted-foreground truncate">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Trend */}
      <div
        className="fintrack-card p-4"
        data-ocid="dashboard.spending_trend.card"
      >
        <h3 className="font-display font-semibold text-sm mb-4">
          6-Month Spending Trend
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={spendingTrend} barCategoryGap="30%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.28 0.04 255)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "oklch(0.55 0.02 255)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "oklch(0.55 0.02 255)" }}
              tickFormatter={(v) => formatINRCompact(v)}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltipINR />} />
            <Bar
              dataKey="income"
              name="Income"
              fill="oklch(0.65 0.2 145)"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="oklch(0.6 0.22 25)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net Worth Growth */}
      {netWorthHistory.length > 1 && (
        <div
          className="fintrack-card p-4"
          data-ocid="dashboard.networth_chart.card"
        >
          <h3 className="font-display font-semibold text-sm mb-4">
            Net Worth Growth
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={netWorthHistory}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.28 0.04 255)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "oklch(0.55 0.02 255)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "oklch(0.55 0.02 255)" }}
                tickFormatter={(v) => formatINRCompact(v)}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="fintrack-card p-2 text-xs">
                        <p className="text-muted-foreground">{label}</p>
                        <p style={{ color: "oklch(0.6 0.2 255)" }}>
                          {formatINR(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="oklch(0.6 0.2 255)"
                strokeWidth={2.5}
                dot={{ fill: "oklch(0.6 0.2 255)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-4">
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-muted-foreground/80"
        >
          © {new Date().getFullYear()}. Built with ♥ using caffeine.ai
        </a>
      </footer>
    </div>
  );
}
