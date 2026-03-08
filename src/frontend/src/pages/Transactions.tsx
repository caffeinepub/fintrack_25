import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  type Investment,
  type Transaction,
  deleteTransaction,
  generateId,
  getAllAccounts,
  getAllCategories,
  getAllInvestments,
  getAllTransactions,
  getSetting,
  saveTransaction,
} from "@/lib/db";
import { applyTransaction, formatINR, revertTransaction } from "@/lib/finance";
import {
  ArrowLeftRight,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const TX_TYPES = [
  { value: "income", label: "Income", color: "oklch(0.65 0.2 145)" },
  { value: "expense", label: "Expense", color: "oklch(0.6 0.22 25)" },
  {
    value: "investment_purchase",
    label: "Investment Buy",
    color: "oklch(0.7 0.18 50)",
  },
  {
    value: "investment_withdrawal",
    label: "Investment Sell",
    color: "oklch(0.65 0.18 300)",
  },
  {
    value: "reconciliation",
    label: "Reconciliation",
    color: "oklch(0.6 0.02 255)",
  },
];

const PAGE_SIZE = 50;

function TxIcon({ type }: { type: string }) {
  if (type === "income")
    return <TrendingUp size={16} style={{ color: "oklch(0.65 0.2 145)" }} />;
  if (type === "expense")
    return <TrendingDown size={16} style={{ color: "oklch(0.6 0.22 25)" }} />;
  if (type === "investment_purchase" || type === "investment_withdrawal")
    return <ArrowLeftRight size={16} style={{ color: "oklch(0.7 0.18 50)" }} />;
  return <RefreshCw size={16} style={{ color: "oklch(0.6 0.02 255)" }} />;
}

function txAmountColor(type: string): string {
  if (type === "income") return "oklch(0.65 0.2 145)";
  if (type === "expense" || type === "reconciliation")
    return "oklch(0.6 0.22 25)";
  if (type === "investment_purchase") return "oklch(0.7 0.18 50)";
  if (type === "investment_withdrawal") return "oklch(0.65 0.18 300)";
  return "oklch(0.95 0.01 255)";
}

function txSign(type: string): string {
  if (type === "income" || type === "investment_withdrawal") return "+";
  return "-";
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [showCount, setShowCount] = useState(PAGE_SIZE);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [entryMode, setEntryMode] = useState<"simple" | "detailed">("simple");
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterType, setFilterType] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterNotes, setFilterNotes] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Form state
  const [fAmount, setFAmount] = useState("");
  const [fType, setFType] = useState("expense");
  const [fCategory, setFCategory] = useState("");
  const [fSubcategory, setFSubcategory] = useState("");
  const [fAccount, setFAccount] = useState("");
  const [fInvestment, setFInvestment] = useState("");
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fNotes, setFNotes] = useState("");
  const [fSaving, setFSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, accs, cats, invs, mode] = await Promise.all([
        getAllTransactions(),
        getAllAccounts(),
        getAllCategories(),
        getAllInvestments(),
        getSetting("entryMode"),
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setCategories(cats);
      setInvestments(invs);
      setEntryMode((mode as "simple" | "detailed") || "simple");
      setFiltered(txs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let result = [...transactions];
    if (filterType) result = result.filter((tx) => tx.type === filterType);
    if (filterAccount)
      result = result.filter((tx) => tx.accountId === filterAccount);
    if (filterCategory)
      result = result.filter((tx) =>
        tx.category.toLowerCase().includes(filterCategory.toLowerCase()),
      );
    if (filterNotes)
      result = result.filter((tx) =>
        tx.notes?.toLowerCase().includes(filterNotes.toLowerCase()),
      );
    if (filterDateFrom)
      result = result.filter((tx) => tx.date >= filterDateFrom);
    if (filterDateTo) result = result.filter((tx) => tx.date <= filterDateTo);
    setFiltered(result);
    setShowCount(PAGE_SIZE);
  }, [
    transactions,
    filterType,
    filterAccount,
    filterCategory,
    filterNotes,
    filterDateFrom,
    filterDateTo,
  ]);

  const clearFilters = () => {
    setFilterType("");
    setFilterAccount("");
    setFilterCategory("");
    setFilterNotes("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const openAdd = () => {
    setEditingTx(null);
    setFAmount("");
    setFType("expense");
    setFCategory("");
    setFSubcategory("");
    setFAccount(accounts[0]?.id || "");
    setFInvestment("");
    setFDate(new Date().toISOString().slice(0, 10));
    setFNotes("");
    setIsDialogOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFAmount(tx.amount.toString());
    setFType(tx.type);
    setFCategory(tx.category);
    setFSubcategory(tx.subcategory || "");
    setFAccount(tx.accountId);
    setFInvestment(tx.investmentId || "");
    setFDate(tx.date);
    setFNotes(tx.notes || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!fAmount || !fCategory || !fAccount) {
      toast.error("Please fill required fields");
      return;
    }
    const amount = Number.parseFloat(fAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setFSaving(true);
    try {
      if (editingTx) {
        await revertTransaction(editingTx);
        const updated: Transaction = {
          ...editingTx,
          amount,
          type: fType as Transaction["type"],
          category: fCategory,
          subcategory: fSubcategory || undefined,
          accountId: fAccount,
          investmentId: fInvestment || undefined,
          date: fDate,
          notes: fNotes || undefined,
        };
        await saveTransaction(updated);
        await applyTransaction(updated);
        toast.success("Transaction updated");
      } else {
        const newTx: Transaction = {
          id: generateId(),
          amount,
          type: fType as Transaction["type"],
          category: fCategory,
          subcategory: fSubcategory || undefined,
          accountId: fAccount,
          investmentId: fInvestment || undefined,
          date: fDate,
          notes: fNotes || undefined,
          createdAt: new Date().toISOString(),
        };
        await saveTransaction(newTx);
        await applyTransaction(newTx);
        toast.success("Transaction saved");
      }
      setIsDialogOpen(false);
      loadData();
    } catch {
      toast.error("Failed to save transaction");
    } finally {
      setFSaving(false);
    }
  };

  const handleDelete = async (tx: Transaction) => {
    try {
      await revertTransaction(tx);
      await deleteTransaction(tx.id);
      toast.success("Transaction deleted");
      loadData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const _getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || id;

  const filteredCategories = categories.filter((c) =>
    fType === "income" ? c.type === "income" : c.type === "expense",
  );
  const selectedCategory = categories.find((c) => c.name === fCategory);

  const hasActiveFilters =
    filterType ||
    filterAccount ||
    filterCategory ||
    filterNotes ||
    filterDateFrom ||
    filterDateTo;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">Transactions</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="relative p-2 rounded-lg hover:bg-accent transition-colors"
              data-ocid="transactions.filter.toggle"
            >
              <Filter
                size={18}
                className={hasActiveFilters ? "" : "text-muted-foreground"}
                style={hasActiveFilters ? { color: "oklch(0.6 0.2 255)" } : {}}
              />
              {hasActiveFilters && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: "oklch(0.6 0.22 25)" }}
                />
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {filtered.length} transactions
        </p>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-3 bg-card border-b border-border space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Filters
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-destructive flex items-center gap-1"
              >
                <X size={12} /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger
                className="bg-muted text-xs h-9"
                data-ocid="transactions.type.select"
              >
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TX_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger
                className="bg-muted text-xs h-9"
                data-ocid="transactions.account.select"
              >
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Category..."
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-muted text-xs h-9"
              data-ocid="transactions.category.input"
            />
            <Input
              placeholder="Notes keyword..."
              value={filterNotes}
              onChange={(e) => setFilterNotes(e.target.value)}
              className="bg-muted text-xs h-9"
              data-ocid="transactions.notes.input"
            />
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="bg-muted text-xs h-9"
              data-ocid="transactions.date_from.input"
            />
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="bg-muted text-xs h-9"
              data-ocid="transactions.date_to.input"
            />
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="flex-1 px-4 py-3 space-y-2">
        {loading ? (
          <div data-ocid="transactions.loading_state">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-card animate-pulse mb-2"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="transactions.empty_state"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <ArrowLeftRight size={24} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No transactions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first transaction
            </p>
          </div>
        ) : (
          <>
            {filtered.slice(0, showCount).map((tx, idx) => {
              const acc = accounts.find((a) => a.id === tx.accountId);
              const ocidIdx = idx + 1;
              return (
                <div
                  key={tx.id}
                  data-ocid={`transactions.item.${ocidIdx}`}
                  className="fintrack-card p-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `oklch(${tx.type === "income" ? "0.3 0.08 145" : tx.type === "expense" ? "0.28 0.08 25" : "0.3 0.07 50"})`,
                    }}
                  >
                    <TxIcon type={tx.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {tx.category}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {acc?.name} ·{" "}
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                      {tx.notes && ` · ${tx.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p
                      className="font-display font-semibold text-sm"
                      style={{ color: txAmountColor(tx.type) }}
                    >
                      {txSign(tx.type)}
                      {formatINR(tx.amount)}
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(tx)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        data-ocid={`transactions.edit_button.${ocidIdx}`}
                      >
                        <Pencil size={12} className="text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tx)}
                        className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
                        data-ocid={`transactions.delete_button.${ocidIdx}`}
                      >
                        <Trash2
                          size={12}
                          style={{ color: "oklch(0.6 0.22 25)" }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {showCount < filtered.length && (
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => setShowCount((c) => c + PAGE_SIZE)}
                data-ocid="transactions.pagination_next"
              >
                Load More ({filtered.length - showCount} remaining)
              </Button>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={openAdd}
        data-ocid="transactions.open_modal_button"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-elevated z-40 transition-transform active:scale-95"
        style={{ background: "oklch(0.6 0.2 255)" }}
        aria-label="Add transaction"
      >
        <Plus size={24} color="white" />
      </button>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="max-w-sm mx-auto rounded-2xl border-border"
          style={{ background: "oklch(0.18 0.03 255)" }}
          data-ocid="transactions.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingTx ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={fType} onValueChange={setFType}>
                <SelectTrigger
                  className="bg-muted mt-1"
                  data-ocid="transactions.form.type.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span style={{ color: t.color }}>{t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Amount (₹) *
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={fAmount}
                onChange={(e) => setFAmount(e.target.value)}
                className="bg-muted mt-1"
                data-ocid="transactions.amount.input"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Category *
              </Label>
              <Select value={fCategory} onValueChange={setFCategory}>
                <SelectTrigger
                  className="bg-muted mt-1"
                  data-ocid="transactions.form.category.select"
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="Other">Other</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {entryMode === "detailed" &&
              selectedCategory &&
              selectedCategory.subcategories.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Subcategory
                  </Label>
                  <Select value={fSubcategory} onValueChange={setFSubcategory}>
                    <SelectTrigger className="bg-muted mt-1">
                      <SelectValue placeholder="Subcategory (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory.subcategories.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            <div>
              <Label className="text-xs text-muted-foreground">Account *</Label>
              <Select value={fAccount} onValueChange={setFAccount}>
                <SelectTrigger
                  className="bg-muted mt-1"
                  data-ocid="transactions.form.account.select"
                >
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(fType === "investment_purchase" ||
              fType === "investment_withdrawal") && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Investment
                </Label>
                <Select value={fInvestment} onValueChange={setFInvestment}>
                  <SelectTrigger className="bg-muted mt-1">
                    <SelectValue placeholder="Select investment" />
                  </SelectTrigger>
                  <SelectContent>
                    {investments.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {entryMode === "detailed" && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                    className="bg-muted mt-1"
                    data-ocid="transactions.date.input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Input
                    placeholder="Optional notes..."
                    value={fNotes}
                    onChange={(e) => setFNotes(e.target.value)}
                    className="bg-muted mt-1"
                    data-ocid="transactions.notes_field.input"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
                data-ocid="transactions.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={fSaving}
                style={{ background: "oklch(0.6 0.2 255)" }}
                data-ocid="transactions.submit_button"
              >
                {fSaving ? "Saving..." : editingTx ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Type Badge helper */}
      {false && <Badge />}
    </div>
  );
}
