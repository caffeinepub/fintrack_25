import {
  type NetWorthSnapshot,
  type Transaction,
  generateId,
  getAccount,
  getAllAccounts,
  getAllInvestments,
  getAllTransactions,
  getInvestment,
  getTransactionsByMonth,
  saveAccount,
  saveInvestment,
  saveNetWorthSnapshot,
} from "./db";

// ========================
// FORMATTING
// ========================
export const formatINR = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatINRCompact = (amount: number): string => {
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatINR(amount);
};

// ========================
// TRANSACTION ENGINE
// ========================
export async function applyTransaction(tx: Transaction): Promise<void> {
  const account = await getAccount(tx.accountId);
  if (!account) return;

  switch (tx.type) {
    case "income":
      account.balance += tx.amount;
      break;
    case "expense":
    case "reconciliation":
      account.balance -= tx.amount;
      break;
    case "investment_purchase":
      account.balance -= tx.amount;
      if (tx.investmentId) {
        const inv = await getInvestment(tx.investmentId);
        if (inv) {
          inv.amountInvested += tx.amount;
          inv.currentValue += tx.amount;
          await saveInvestment(inv);
        }
      }
      break;
    case "investment_withdrawal":
      account.balance += tx.amount;
      if (tx.investmentId) {
        const inv = await getInvestment(tx.investmentId);
        if (inv) {
          inv.currentValue -= tx.amount;
          if (inv.currentValue < 0) inv.currentValue = 0;
          await saveInvestment(inv);
        }
      }
      break;
  }

  await saveAccount(account);
}

export async function revertTransaction(tx: Transaction): Promise<void> {
  const account = await getAccount(tx.accountId);
  if (!account) return;

  switch (tx.type) {
    case "income":
      account.balance -= tx.amount;
      break;
    case "expense":
    case "reconciliation":
      account.balance += tx.amount;
      break;
    case "investment_purchase":
      account.balance += tx.amount;
      if (tx.investmentId) {
        const inv = await getInvestment(tx.investmentId);
        if (inv) {
          inv.amountInvested -= tx.amount;
          inv.currentValue -= tx.amount;
          if (inv.amountInvested < 0) inv.amountInvested = 0;
          if (inv.currentValue < 0) inv.currentValue = 0;
          await saveInvestment(inv);
        }
      }
      break;
    case "investment_withdrawal":
      account.balance -= tx.amount;
      if (tx.investmentId) {
        const inv = await getInvestment(tx.investmentId);
        if (inv) {
          inv.currentValue += tx.amount;
          await saveInvestment(inv);
        }
      }
      break;
  }

  await saveAccount(account);
}

// ========================
// CALCULATIONS
// ========================
export async function calculateNetWorth(): Promise<{
  netWorth: number;
  accountsTotal: number;
  investmentsTotal: number;
}> {
  const [accounts, investments] = await Promise.all([
    getAllAccounts(),
    getAllInvestments(),
  ]);
  const accountsTotal = accounts.reduce((sum, a) => sum + a.balance, 0);
  const investmentsTotal = investments.reduce(
    (sum, i) => sum + i.currentValue,
    0,
  );
  return {
    netWorth: accountsTotal + investmentsTotal,
    accountsTotal,
    investmentsTotal,
  };
}

export interface MonthlyStats {
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  investmentsPurchased: number;
}

export async function getMonthlyStats(month: string): Promise<MonthlyStats> {
  const transactions = await getTransactionsByMonth(month);

  let income = 0;
  let expenses = 0;
  let investmentsPurchased = 0;

  for (const tx of transactions) {
    switch (tx.type) {
      case "income":
        income += tx.amount;
        break;
      case "expense":
      case "reconciliation":
        expenses += tx.amount;
        break;
      case "investment_purchase":
        investmentsPurchased += tx.amount;
        break;
    }
  }

  const savings = income - expenses - investmentsPurchased;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  return { income, expenses, savings, savingsRate, investmentsPurchased };
}

export async function saveNetWorthSnapshotNow(): Promise<void> {
  const { netWorth, accountsTotal, investmentsTotal } =
    await calculateNetWorth();
  const month = new Date().toISOString().slice(0, 7);

  const snapshot: NetWorthSnapshot = {
    id: `snapshot-${month}`,
    month,
    netWorth,
    accountsTotal,
    investmentsTotal,
    createdAt: new Date().toISOString(),
  };

  await saveNetWorthSnapshot(snapshot);
}

// ========================
// INSIGHTS ENGINE
// ========================
export interface Insight {
  id: string;
  type: "positive" | "negative" | "neutral";
  title: string;
  description: string;
  icon: string;
}

export async function generateInsights(): Promise<Insight[]> {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const prevDate = new Date(now);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  const [currentStats, prevStats, nwData, allTransactions] = await Promise.all([
    getMonthlyStats(currentMonth),
    getMonthlyStats(prevMonth),
    calculateNetWorth(),
    getAllTransactions(),
  ]);

  const insights: Insight[] = [];

  // Net worth delta
  const prevMonthTxs = allTransactions.filter((tx) =>
    tx.date.startsWith(prevMonth),
  );
  const prevNW =
    nwData.netWorth -
    (currentStats.income -
      currentStats.expenses -
      currentStats.investmentsPurchased);
  const nwDelta = nwData.netWorth - prevNW;
  if (nwDelta > 0) {
    insights.push({
      id: "nw-growth",
      type: "positive",
      title: `Net worth grew ${formatINR(nwDelta)} this month`,
      description: `Your total net worth is now ${formatINR(nwData.netWorth)}`,
      icon: "📈",
    });
  }

  // Savings rate trend
  if (currentStats.savingsRate > 0 && prevStats.income > 0) {
    const prevSavingsRate = prevStats.savingsRate;
    const diff = currentStats.savingsRate - prevSavingsRate;
    if (Math.abs(diff) > 2) {
      insights.push({
        id: "savings-rate",
        type: diff > 0 ? "positive" : "negative",
        title: `Savings rate ${diff > 0 ? "improved" : "declined"} by ${Math.abs(diff).toFixed(1)}%`,
        description: `Current savings rate: ${currentStats.savingsRate.toFixed(1)}%`,
        icon: diff > 0 ? "💹" : "📉",
      });
    }
  }

  // Category spending changes
  const currentTxs = allTransactions.filter(
    (tx) => tx.date.startsWith(currentMonth) && tx.type === "expense",
  );
  const prevTxsByCategory: Record<string, number> = {};
  const currentTxsByCategory: Record<string, number> = {};

  for (const tx of prevMonthTxs.filter((t) => t.type === "expense")) {
    prevTxsByCategory[tx.category] =
      (prevTxsByCategory[tx.category] || 0) + tx.amount;
  }
  for (const tx of currentTxs) {
    currentTxsByCategory[tx.category] =
      (currentTxsByCategory[tx.category] || 0) + tx.amount;
  }

  for (const [cat, amount] of Object.entries(currentTxsByCategory)) {
    const prev = prevTxsByCategory[cat] || 0;
    if (prev > 0) {
      const pctChange = ((amount - prev) / prev) * 100;
      if (pctChange > 15) {
        insights.push({
          id: `cat-up-${cat}`,
          type: "negative",
          title: `${cat} spending up ${pctChange.toFixed(0)}%`,
          description: `Spent ${formatINR(amount)} vs ${formatINR(prev)} last month`,
          icon: "⚠️",
        });
      } else if (pctChange < -15) {
        insights.push({
          id: `cat-down-${cat}`,
          type: "positive",
          title: `${cat} spending down ${Math.abs(pctChange).toFixed(0)}%`,
          description: `Saved ${formatINR(prev - amount)} compared to last month`,
          icon: "✅",
        });
      }
    }
  }

  // Top expense category
  if (Object.keys(currentTxsByCategory).length > 0) {
    const topCat = Object.entries(currentTxsByCategory).sort(
      ([, a], [, b]) => b - a,
    )[0];
    const totalExpenses = currentStats.expenses;
    if (totalExpenses > 0) {
      const pct = ((topCat[1] / totalExpenses) * 100).toFixed(0);
      insights.push({
        id: "top-expense",
        type: "neutral",
        title: `${topCat[0]} is your top expense`,
        description: `Accounts for ${pct}% of total expenses (${formatINR(topCat[1])})`,
        icon: "🏷️",
      });
    }
  }

  // Income comparison
  if (currentStats.income > 0 && prevStats.income > 0) {
    const diff = currentStats.income - prevStats.income;
    if (Math.abs(diff) > 1000) {
      insights.push({
        id: "income-delta",
        type: diff > 0 ? "positive" : "negative",
        title: `Income ${diff > 0 ? "increased" : "decreased"} by ${formatINR(Math.abs(diff))}`,
        description: `This month: ${formatINR(currentStats.income)} vs last month: ${formatINR(prevStats.income)}`,
        icon: diff > 0 ? "💰" : "📉",
      });
    }
  }

  return insights;
}
