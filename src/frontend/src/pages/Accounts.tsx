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
  type AccountType,
  deleteAccount,
  generateId,
  getAllAccounts,
  getAllTransactions,
  saveAccount,
  saveTransaction,
} from "@/lib/db";
import { applyTransaction, formatINR } from "@/lib/finance";
import {
  Banknote,
  CreditCard,
  Pencil,
  Plus,
  Scale,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit Card" },
  { value: "wallet", label: "Digital Wallet" },
];

function AccountIcon({ type }: { type: AccountType }) {
  if (type === "cash")
    return <Banknote size={20} style={{ color: "oklch(0.65 0.2 145)" }} />;
  if (type === "credit")
    return <CreditCard size={20} style={{ color: "oklch(0.65 0.18 300)" }} />;
  return <Wallet size={20} style={{ color: "oklch(0.6 0.2 255)" }} />;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [reconAccount, setReconAccount] = useState<Account | null>(null);
  const [reconActualBalance, setReconActualBalance] = useState("");
  const [reconVariance, setReconVariance] = useState<number | null>(null);

  // Form state
  const [fName, setFName] = useState("");
  const [fType, setFType] = useState<AccountType>("bank");
  const [fBalance, setFBalance] = useState("");
  const [fSaving, setFSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const accs = await getAllAccounts();
      setAccounts(accs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditingAccount(null);
    setFName("");
    setFType("bank");
    setFBalance("");
    setIsDialogOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditingAccount(acc);
    setFName(acc.name);
    setFType(acc.type);
    setFBalance(acc.balance.toString());
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!fName) {
      toast.error("Account name is required");
      return;
    }
    const balance = Number.parseFloat(fBalance) || 0;
    setFSaving(true);
    try {
      if (editingAccount) {
        await saveAccount({
          ...editingAccount,
          name: fName,
          type: fType,
          balance,
        });
        toast.success("Account updated");
      } else {
        await saveAccount({
          id: generateId(),
          name: fName,
          type: fType,
          balance,
          createdAt: new Date().toISOString(),
        });
        toast.success("Account created");
      }
      setIsDialogOpen(false);
      loadData();
    } catch {
      toast.error("Failed to save account");
    } finally {
      setFSaving(false);
    }
  };

  const handleDelete = async (acc: Account) => {
    try {
      const txs = await getAllTransactions();
      const hasTxs = txs.some((tx) => tx.accountId === acc.id);
      if (hasTxs) {
        toast.error("Cannot delete account with transactions");
        return;
      }
      await deleteAccount(acc.id);
      toast.success("Account deleted");
      loadData();
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const openReconcile = (acc: Account) => {
    setReconAccount(acc);
    setReconActualBalance("");
    setReconVariance(null);
    setIsReconcileOpen(true);
  };

  const handleReconCalc = () => {
    if (!reconAccount) return;
    const actual = Number.parseFloat(reconActualBalance);
    if (Number.isNaN(actual)) {
      toast.error("Enter valid balance");
      return;
    }
    setReconVariance(actual - reconAccount.balance);
  };

  const handleReconAdjust = async () => {
    if (!reconAccount || reconVariance === null) return;
    if (reconVariance === 0) {
      toast.success("Balances match, no adjustment needed");
      setIsReconcileOpen(false);
      return;
    }
    try {
      const tx = {
        id: generateId(),
        type: "reconciliation" as const,
        amount: Math.abs(reconVariance),
        category: "Reconciliation",
        accountId: reconAccount.id,
        date: new Date().toISOString().slice(0, 10),
        notes: `Reconciliation adjustment. Variance: ${formatINR(reconVariance)}`,
        createdAt: new Date().toISOString(),
      };
      // Directly adjust account balance
      const updated = {
        ...reconAccount,
        balance: reconAccount.balance + reconVariance,
      };
      await saveAccount(updated);
      await saveTransaction(tx);
      toast.success("Reconciliation adjustment created");
      setIsReconcileOpen(false);
      loadData();
    } catch {
      toast.error("Failed to create adjustment");
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">Accounts</h1>
          <Button
            size="sm"
            onClick={openAdd}
            data-ocid="accounts.open_modal_button"
            style={{ background: "oklch(0.6 0.2 255)" }}
          >
            <Plus size={16} className="mr-1" /> Add
          </Button>
        </div>
        <div className="mt-2 fintrack-card p-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Balance</span>
          <span
            className="font-display font-bold text-lg"
            style={{ color: "oklch(0.6 0.2 255)" }}
          >
            {formatINR(totalBalance)}
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <div data-ocid="accounts.loading_state">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="accounts.empty_state"
          >
            <Wallet size={32} className="text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No accounts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first account to get started
            </p>
          </div>
        ) : (
          accounts.map((acc, idx) => (
            <div
              key={acc.id}
              data-ocid={`accounts.item.${idx + 1}`}
              className="fintrack-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        acc.type === "cash"
                          ? "oklch(0.3 0.08 145)"
                          : acc.type === "credit"
                            ? "oklch(0.28 0.07 300)"
                            : "oklch(0.25 0.08 255)",
                    }}
                  >
                    <AccountIcon type={acc.type} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{acc.name}</p>
                    <Badge
                      className="text-[9px] px-1.5 py-0 mt-0.5 capitalize"
                      variant="secondary"
                    >
                      {ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label ||
                        acc.type}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="font-display font-bold text-base"
                    style={{
                      color:
                        acc.balance >= 0
                          ? "oklch(0.65 0.2 145)"
                          : "oklch(0.6 0.22 25)",
                    }}
                  >
                    {formatINR(acc.balance)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => openEdit(acc)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors"
                  data-ocid={`accounts.edit_button.${idx + 1}`}
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => openReconcile(acc)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs hover:bg-accent transition-colors"
                  style={{ color: "oklch(0.65 0.18 300)" }}
                  data-ocid={`accounts.reconcile_button.${idx + 1}`}
                >
                  <Scale size={12} /> Reconcile
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(acc)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs hover:bg-destructive/20 transition-colors"
                  style={{ color: "oklch(0.6 0.22 25)" }}
                  data-ocid={`accounts.delete_button.${idx + 1}`}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="max-w-sm mx-auto rounded-2xl"
          style={{ background: "oklch(0.18 0.03 255)" }}
          data-ocid="accounts.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingAccount ? "Edit Account" : "Add Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">
                Account Name *
              </Label>
              <Input
                placeholder="e.g. HDFC Savings"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                className="bg-muted mt-1"
                data-ocid="accounts.name.input"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Account Type
              </Label>
              <Select
                value={fType}
                onValueChange={(v) => setFType(v as AccountType)}
              >
                <SelectTrigger
                  className="bg-muted mt-1"
                  data-ocid="accounts.type.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Opening Balance (₹)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={fBalance}
                onChange={(e) => setFBalance(e.target.value)}
                className="bg-muted mt-1"
                data-ocid="accounts.balance.input"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
                data-ocid="accounts.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={fSaving}
                style={{ background: "oklch(0.6 0.2 255)" }}
                data-ocid="accounts.submit_button"
              >
                {fSaving ? "Saving..." : editingAccount ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconcile Dialog */}
      <Dialog open={isReconcileOpen} onOpenChange={setIsReconcileOpen}>
        <DialogContent
          className="max-w-sm mx-auto rounded-2xl"
          style={{ background: "oklch(0.18 0.03 255)" }}
          data-ocid="accounts.reconcile.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Reconcile {reconAccount?.name}
            </DialogTitle>
          </DialogHeader>
          {reconAccount && (
            <div className="space-y-4 mt-2">
              <div className="fintrack-card p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">App Balance</span>
                  <span className="font-semibold">
                    {formatINR(reconAccount.balance)}
                  </span>
                </div>
                {reconVariance !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Actual Balance
                    </span>
                    <span className="font-semibold">
                      {formatINR(Number.parseFloat(reconActualBalance))}
                    </span>
                  </div>
                )}
                {reconVariance !== null && (
                  <div className="flex justify-between text-sm border-t border-border pt-2">
                    <span className="text-muted-foreground">Variance</span>
                    <span
                      className="font-bold"
                      style={{
                        color:
                          reconVariance >= 0
                            ? "oklch(0.65 0.2 145)"
                            : "oklch(0.6 0.22 25)",
                      }}
                    >
                      {reconVariance >= 0 ? "+" : ""}
                      {formatINR(reconVariance)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Actual Bank Balance (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="Enter actual balance"
                  value={reconActualBalance}
                  onChange={(e) => {
                    setReconActualBalance(e.target.value);
                    setReconVariance(null);
                  }}
                  className="bg-muted mt-1"
                  data-ocid="accounts.reconcile.input"
                />
              </div>

              {reconVariance === null ? (
                <Button
                  className="w-full"
                  onClick={handleReconCalc}
                  style={{ background: "oklch(0.65 0.18 300)" }}
                  data-ocid="accounts.reconcile.calculate_button"
                >
                  Calculate Variance
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={handleReconAdjust}
                    style={{ background: "oklch(0.65 0.18 300)" }}
                    data-ocid="accounts.reconcile.confirm_button"
                  >
                    Create Adjustment Entry
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsReconcileOpen(false)}
                    data-ocid="accounts.reconcile.cancel_button"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
