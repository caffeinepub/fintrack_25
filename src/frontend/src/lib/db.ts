import { type DBSchema, type IDBPDatabase, openDB } from "idb";

export type AccountType = "bank" | "cash" | "credit" | "wallet";
export type TransactionType =
  | "income"
  | "expense"
  | "investment_purchase"
  | "investment_withdrawal"
  | "reconciliation";
export type InvestmentType =
  | "stocks"
  | "mutual_funds"
  | "fixed_deposits"
  | "crypto"
  | "other";
export type CategoryType = "income" | "expense";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  subcategory?: string;
  accountId: string;
  investmentId?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  amountInvested: number;
  currentValue: number;
  accountId: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  subcategories: string[];
  color?: string;
}

export interface NetWorthSnapshot {
  id: string;
  month: string; // YYYY-MM
  netWorth: number;
  accountsTotal: number;
  investmentsTotal: number;
  createdAt: string;
}

export interface Milestone {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: string;
  amount?: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

interface FinTrackDB extends DBSchema {
  accounts: {
    key: string;
    value: Account;
    indexes: { "by-type": string };
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      "by-date": string;
      "by-accountId": string;
      "by-category": string;
      "by-type": string;
    };
  };
  investments: {
    key: string;
    value: Investment;
    indexes: { "by-type": string };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { "by-type": string };
  };
  netWorthSnapshots: {
    key: string;
    value: NetWorthSnapshot;
    indexes: { "by-month": string };
  };
  milestones: {
    key: string;
    value: Milestone;
    indexes: { "by-date": string };
  };
  settings: {
    key: string;
    value: Setting;
  };
}

const DB_NAME = "fintrack-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FinTrackDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<FinTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FinTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Accounts
        if (!db.objectStoreNames.contains("accounts")) {
          const accountStore = db.createObjectStore("accounts", {
            keyPath: "id",
          });
          accountStore.createIndex("by-type", "type");
        }

        // Transactions
        if (!db.objectStoreNames.contains("transactions")) {
          const txStore = db.createObjectStore("transactions", {
            keyPath: "id",
          });
          txStore.createIndex("by-date", "date");
          txStore.createIndex("by-accountId", "accountId");
          txStore.createIndex("by-category", "category");
          txStore.createIndex("by-type", "type");
        }

        // Investments
        if (!db.objectStoreNames.contains("investments")) {
          const invStore = db.createObjectStore("investments", {
            keyPath: "id",
          });
          invStore.createIndex("by-type", "type");
        }

        // Categories
        if (!db.objectStoreNames.contains("categories")) {
          const catStore = db.createObjectStore("categories", {
            keyPath: "id",
          });
          catStore.createIndex("by-type", "type");
        }

        // Net Worth Snapshots
        if (!db.objectStoreNames.contains("netWorthSnapshots")) {
          const nwStore = db.createObjectStore("netWorthSnapshots", {
            keyPath: "id",
          });
          nwStore.createIndex("by-month", "month");
        }

        // Milestones
        if (!db.objectStoreNames.contains("milestones")) {
          const msStore = db.createObjectStore("milestones", { keyPath: "id" });
          msStore.createIndex("by-date", "date");
        }

        // Settings
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise as Promise<IDBPDatabase<FinTrackDB>>;
}

// Generate a UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// ========================
// ACCOUNTS
// ========================
export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDB();
  return db.getAll("accounts");
}

export async function getAccount(id: string): Promise<Account | undefined> {
  const db = await getDB();
  return db.get("accounts", id);
}

export async function saveAccount(account: Account): Promise<void> {
  const db = await getDB();
  await db.put("accounts", account);
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("accounts", id);
}

// ========================
// TRANSACTIONS
// ========================
export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const all = await db.getAll("transactions");
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTransaction(
  id: string,
): Promise<Transaction | undefined> {
  const db = await getDB();
  return db.get("transactions", id);
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  const db = await getDB();
  await db.put("transactions", tx);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("transactions", id);
}

export async function getTransactionsByMonth(
  month: string,
): Promise<Transaction[]> {
  const db = await getDB();
  const all = await db.getAll("transactions");
  return all.filter((tx) => tx.date.startsWith(month));
}

// ========================
// INVESTMENTS
// ========================
export async function getAllInvestments(): Promise<Investment[]> {
  const db = await getDB();
  return db.getAll("investments");
}

export async function getInvestment(
  id: string,
): Promise<Investment | undefined> {
  const db = await getDB();
  return db.get("investments", id);
}

export async function saveInvestment(inv: Investment): Promise<void> {
  const db = await getDB();
  await db.put("investments", inv);
}

export async function deleteInvestment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("investments", id);
}

// ========================
// CATEGORIES
// ========================
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  return db.getAll("categories");
}

export async function saveCategory(cat: Category): Promise<void> {
  const db = await getDB();
  await db.put("categories", cat);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("categories", id);
}

// ========================
// NET WORTH SNAPSHOTS
// ========================
export async function getAllNetWorthSnapshots(): Promise<NetWorthSnapshot[]> {
  const db = await getDB();
  const all = await db.getAll("netWorthSnapshots");
  return all.sort((a, b) => a.month.localeCompare(b.month));
}

export async function saveNetWorthSnapshot(
  snapshot: NetWorthSnapshot,
): Promise<void> {
  const db = await getDB();
  await db.put("netWorthSnapshots", snapshot);
}

// ========================
// MILESTONES
// ========================
export async function getAllMilestones(): Promise<Milestone[]> {
  const db = await getDB();
  const all = await db.getAll("milestones");
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveMilestone(milestone: Milestone): Promise<void> {
  const db = await getDB();
  await db.put("milestones", milestone);
}

// ========================
// SETTINGS
// ========================
export async function getSetting(key: string): Promise<unknown> {
  const db = await getDB();
  const setting = await db.get("settings", key);
  return setting?.value;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("settings", { key, value });
}

// ========================
// SEED DEFAULT DATA
// ========================
const DEFAULT_INCOME_CATEGORIES: Category[] = [
  {
    id: "cat-salary",
    name: "Salary",
    type: "income",
    subcategories: [],
    color: "#22c55e",
  },
  {
    id: "cat-wife-salary",
    name: "Wife Salary",
    type: "income",
    subcategories: [],
    color: "#16a34a",
  },
  {
    id: "cat-interest",
    name: "Interest",
    type: "income",
    subcategories: [],
    color: "#4ade80",
  },
  {
    id: "cat-dividends",
    name: "Dividends",
    type: "income",
    subcategories: [],
    color: "#86efac",
  },
  {
    id: "cat-other-income",
    name: "Other Income",
    type: "income",
    subcategories: [],
    color: "#bbf7d0",
  },
];

const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  {
    id: "cat-groceries",
    name: "Groceries",
    type: "expense",
    subcategories: [],
    color: "#f97316",
  },
  {
    id: "cat-fuel",
    name: "Fuel",
    type: "expense",
    subcategories: [],
    color: "#ef4444",
  },
  {
    id: "cat-shopping",
    name: "Shopping",
    type: "expense",
    subcategories: [],
    color: "#ec4899",
  },
  {
    id: "cat-utilities",
    name: "Utilities",
    type: "expense",
    subcategories: [],
    color: "#a855f7",
  },
  {
    id: "cat-dining",
    name: "Dining",
    type: "expense",
    subcategories: [],
    color: "#f59e0b",
  },
  {
    id: "cat-healthcare",
    name: "Healthcare",
    type: "expense",
    subcategories: [],
    color: "#06b6d4",
  },
  {
    id: "cat-entertainment",
    name: "Entertainment",
    type: "expense",
    subcategories: [],
    color: "#8b5cf6",
  },
  {
    id: "cat-other-expense",
    name: "Other",
    type: "expense",
    subcategories: [],
    color: "#6b7280",
  },
];

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: "acc-hdfc",
    name: "HDFC Bank",
    type: "bank",
    balance: 85000,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-icici",
    name: "ICICI Bank",
    type: "bank",
    balance: 42000,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-cash",
    name: "Cash",
    type: "cash",
    balance: 8500,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_INVESTMENTS: Investment[] = [
  {
    id: "inv-nifty",
    name: "Nifty 50 Index Fund",
    type: "mutual_funds",
    amountInvested: 50000,
    currentValue: 58500,
    accountId: "acc-hdfc",
    createdAt: new Date().toISOString(),
  },
  {
    id: "inv-tcs",
    name: "TCS Shares",
    type: "stocks",
    amountInvested: 25000,
    currentValue: 29800,
    accountId: "acc-icici",
    createdAt: new Date().toISOString(),
  },
];

function getMonthStr(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 7);
}

function getDateStr(monthsAgo: number, day: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
}

function makeDefaultTransactions(): Transaction[] {
  const now = new Date().toISOString();
  return [
    // Current month
    {
      id: "tx-1",
      type: "income",
      amount: 75000,
      category: "Salary",
      accountId: "acc-hdfc",
      date: getDateStr(0, 1),
      notes: "Monthly salary",
      createdAt: now,
    },
    {
      id: "tx-2",
      type: "income",
      amount: 45000,
      category: "Wife Salary",
      accountId: "acc-icici",
      date: getDateStr(0, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-3",
      type: "expense",
      amount: 12500,
      category: "Groceries",
      accountId: "acc-hdfc",
      date: getDateStr(0, 5),
      notes: "Monthly groceries",
      createdAt: now,
    },
    {
      id: "tx-4",
      type: "expense",
      amount: 4800,
      category: "Fuel",
      accountId: "acc-hdfc",
      date: getDateStr(0, 8),
      notes: "Petrol refill",
      createdAt: now,
    },
    {
      id: "tx-5",
      type: "expense",
      amount: 8200,
      category: "Shopping",
      accountId: "acc-icici",
      date: getDateStr(0, 12),
      notes: "Clothing",
      createdAt: now,
    },
    {
      id: "tx-6",
      type: "expense",
      amount: 3500,
      category: "Dining",
      accountId: "acc-hdfc",
      date: getDateStr(0, 15),
      notes: "Restaurant",
      createdAt: now,
    },
    {
      id: "tx-7",
      type: "expense",
      amount: 2800,
      category: "Utilities",
      accountId: "acc-hdfc",
      date: getDateStr(0, 7),
      notes: "Electricity + internet",
      createdAt: now,
    },
    // Last month
    {
      id: "tx-8",
      type: "income",
      amount: 75000,
      category: "Salary",
      accountId: "acc-hdfc",
      date: getDateStr(1, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-9",
      type: "income",
      amount: 45000,
      category: "Wife Salary",
      accountId: "acc-icici",
      date: getDateStr(1, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-10",
      type: "expense",
      amount: 11800,
      category: "Groceries",
      accountId: "acc-hdfc",
      date: getDateStr(1, 5),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-11",
      type: "expense",
      amount: 4200,
      category: "Fuel",
      accountId: "acc-hdfc",
      date: getDateStr(1, 8),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-12",
      type: "expense",
      amount: 15000,
      category: "Shopping",
      accountId: "acc-icici",
      date: getDateStr(1, 20),
      notes: "Electronics",
      createdAt: now,
    },
    {
      id: "tx-13",
      type: "expense",
      amount: 2500,
      category: "Utilities",
      accountId: "acc-hdfc",
      date: getDateStr(1, 7),
      notes: "",
      createdAt: now,
    },
    // 2 months ago
    {
      id: "tx-14",
      type: "income",
      amount: 75000,
      category: "Salary",
      accountId: "acc-hdfc",
      date: getDateStr(2, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-15",
      type: "income",
      amount: 45000,
      category: "Wife Salary",
      accountId: "acc-icici",
      date: getDateStr(2, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-16",
      type: "expense",
      amount: 10200,
      category: "Groceries",
      accountId: "acc-hdfc",
      date: getDateStr(2, 5),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-17",
      type: "expense",
      amount: 3800,
      category: "Fuel",
      accountId: "acc-hdfc",
      date: getDateStr(2, 10),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-18",
      type: "expense",
      amount: 6500,
      category: "Healthcare",
      accountId: "acc-hdfc",
      date: getDateStr(2, 18),
      notes: "Doctor visit + medicines",
      createdAt: now,
    },
    {
      id: "tx-19",
      type: "investment_purchase",
      amount: 10000,
      category: "Investment",
      accountId: "acc-hdfc",
      investmentId: "inv-nifty",
      date: getDateStr(2, 15),
      notes: "SIP",
      createdAt: now,
    },
    // 3 months ago
    {
      id: "tx-20",
      type: "income",
      amount: 75000,
      category: "Salary",
      accountId: "acc-hdfc",
      date: getDateStr(3, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-21",
      type: "income",
      amount: 45000,
      category: "Wife Salary",
      accountId: "acc-icici",
      date: getDateStr(3, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-22",
      type: "expense",
      amount: 11500,
      category: "Groceries",
      accountId: "acc-hdfc",
      date: getDateStr(3, 5),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-23",
      type: "expense",
      amount: 4500,
      category: "Fuel",
      accountId: "acc-hdfc",
      date: getDateStr(3, 8),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-24",
      type: "expense",
      amount: 9800,
      category: "Entertainment",
      accountId: "acc-icici",
      date: getDateStr(3, 22),
      notes: "Concert tickets",
      createdAt: now,
    },
    // 4 months ago
    {
      id: "tx-25",
      type: "income",
      amount: 75000,
      category: "Salary",
      accountId: "acc-hdfc",
      date: getDateStr(4, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-26",
      type: "income",
      amount: 45000,
      category: "Wife Salary",
      accountId: "acc-icici",
      date: getDateStr(4, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-27",
      type: "income",
      amount: 3500,
      category: "Dividends",
      accountId: "acc-hdfc",
      date: getDateStr(4, 10),
      notes: "Quarterly dividend",
      createdAt: now,
    },
    {
      id: "tx-28",
      type: "expense",
      amount: 12000,
      category: "Groceries",
      accountId: "acc-hdfc",
      date: getDateStr(4, 5),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-29",
      type: "expense",
      amount: 5500,
      category: "Shopping",
      accountId: "acc-icici",
      date: getDateStr(4, 18),
      notes: "",
      createdAt: now,
    },
    // 5 months ago
    {
      id: "tx-30",
      type: "income",
      amount: 75000,
      category: "Salary",
      accountId: "acc-hdfc",
      date: getDateStr(5, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-31",
      type: "income",
      amount: 45000,
      category: "Wife Salary",
      accountId: "acc-icici",
      date: getDateStr(5, 1),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-32",
      type: "expense",
      amount: 11000,
      category: "Groceries",
      accountId: "acc-hdfc",
      date: getDateStr(5, 5),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-33",
      type: "expense",
      amount: 4000,
      category: "Fuel",
      accountId: "acc-hdfc",
      date: getDateStr(5, 8),
      notes: "",
      createdAt: now,
    },
    {
      id: "tx-34",
      type: "investment_purchase",
      amount: 25000,
      category: "Investment",
      accountId: "acc-icici",
      investmentId: "inv-tcs",
      date: getDateStr(5, 20),
      notes: "TCS stock purchase",
      createdAt: now,
    },
  ];
}

function makeDefaultSnapshots(): NetWorthSnapshot[] {
  const now = new Date().toISOString();
  const values = [210000, 228000, 253000, 271000, 289000, 318000];
  return values.map((nw, i) => ({
    id: `snapshot-${i}`,
    month: getMonthStr(5 - i),
    netWorth: nw,
    accountsTotal: nw - (i * 5000 + 70000),
    investmentsTotal: 70000 + i * 5000,
    createdAt: now,
  }));
}

function makeDefaultMilestones(): Milestone[] {
  return [
    {
      id: "ms-1",
      date: getDateStr(5, 1),
      title: "First Transaction",
      description: "Recorded first salary income",
      icon: "🎉",
      amount: 75000,
    },
    {
      id: "ms-2",
      date: getDateStr(5, 20),
      title: "First Investment",
      description: "Purchased TCS shares",
      icon: "📈",
      amount: 25000,
    },
    {
      id: "ms-3",
      date: getDateStr(3, 1),
      title: "Net Worth ₹2,50,000",
      description: "Net worth crossed ₹2.5 Lakh milestone",
      icon: "🏆",
      amount: 250000,
    },
    {
      id: "ms-4",
      date: getDateStr(1, 1),
      title: "Highest Savings Month",
      description: "Saved ₹93,700 in a single month",
      icon: "💰",
      amount: 93700,
    },
  ];
}

export async function initializeDB(): Promise<void> {
  const db = await getDB();

  // Check if already seeded
  const existingCategories = await db.getAll("categories");
  if (existingCategories.length > 0) return;

  // Seed categories
  const allCats = [...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES];
  for (const cat of allCats) {
    await db.put("categories", cat);
  }

  // Seed accounts
  for (const acc of DEFAULT_ACCOUNTS) {
    await db.put("accounts", acc);
  }

  // Seed investments
  for (const inv of DEFAULT_INVESTMENTS) {
    await db.put("investments", inv);
  }

  // Seed transactions
  for (const tx of makeDefaultTransactions()) {
    await db.put("transactions", tx);
  }

  // Seed net worth snapshots
  for (const snap of makeDefaultSnapshots()) {
    await db.put("netWorthSnapshots", snap);
  }

  // Seed milestones
  for (const ms of makeDefaultMilestones()) {
    await db.put("milestones", ms);
  }

  // Default settings
  await db.put("settings", { key: "entryMode", value: "simple" });
  await db.put("settings", { key: "reminderEnabled", value: false });
  await db.put("settings", { key: "reminderTime", value: "20:00" });
}

// ========================
// BACKUP / RESTORE
// ========================
export async function exportBackup(): Promise<string> {
  const db = await getDB();
  const [
    accounts,
    transactions,
    investments,
    categories,
    netWorthSnapshots,
    milestones,
  ] = await Promise.all([
    db.getAll("accounts"),
    db.getAll("transactions"),
    db.getAll("investments"),
    db.getAll("categories"),
    db.getAll("netWorthSnapshots"),
    db.getAll("milestones"),
  ]);

  const settingsStore = db.transaction("settings").store;
  const settingsKeys = await settingsStore.getAllKeys();
  const settingsValues = await Promise.all(
    settingsKeys.map((k) => settingsStore.get(k)),
  );
  const settings = settingsValues.filter(Boolean);

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      accounts,
      transactions,
      investments,
      categories,
      netWorthSnapshots,
      milestones,
      settings,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export async function importBackup(jsonStr: string): Promise<void> {
  const backup = JSON.parse(jsonStr);
  if (!backup.data) throw new Error("Invalid backup file");

  const db = await getDB();
  const {
    accounts,
    transactions,
    investments,
    categories,
    netWorthSnapshots,
    milestones,
    settings,
  } = backup.data;

  const stores = [
    "accounts",
    "transactions",
    "investments",
    "categories",
    "netWorthSnapshots",
    "milestones",
    "settings",
  ] as const;

  for (const storeName of stores) {
    const store = db.transaction(storeName, "readwrite").store;
    await store.clear();
  }

  if (accounts) for (const item of accounts) await db.put("accounts", item);
  if (transactions)
    for (const item of transactions) await db.put("transactions", item);
  if (investments)
    for (const item of investments) await db.put("investments", item);
  if (categories)
    for (const item of categories) await db.put("categories", item);
  if (netWorthSnapshots)
    for (const item of netWorthSnapshots)
      await db.put("netWorthSnapshots", item);
  if (milestones)
    for (const item of milestones) await db.put("milestones", item);
  if (settings) for (const item of settings) await db.put("settings", item);
}
