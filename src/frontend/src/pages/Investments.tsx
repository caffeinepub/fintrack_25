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
  type Investment,
  type InvestmentType,
  deleteInvestment,
  generateId,
  getAllAccounts,
  getAllInvestments,
  saveInvestment,
} from "@/lib/db";
import { formatINR } from "@/lib/finance";
import {
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const INV_TYPES: { value: InvestmentType; label: string; color: string }[] = [
  { value: "stocks", label: "Stocks", color: "oklch(0.7 0.18 50)" },
  { value: "mutual_funds", label: "Mutual Funds", color: "oklch(0.6 0.2 255)" },
  {
    value: "fixed_deposits",
    label: "Fixed Deposits",
    color: "oklch(0.65 0.2 145)",
  },
  { value: "crypto", label: "Crypto", color: "oklch(0.65 0.18 300)" },
  { value: "other", label: "Other", color: "oklch(0.6 0.02 255)" },
];

export default function Investments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [pricingInv, setPricingInv] = useState<Investment | null>(null);
  const [newPrice, setNewPrice] = useState("");

  // Form state
  const [fName, setFName] = useState("");
  const [fType, setFType] = useState<InvestmentType>("mutual_funds");
  const [fInvested, setFInvested] = useState("");
  const [fCurrentValue, setFCurrentValue] = useState("");
  const [fAccount, setFAccount] = useState("");
  const [fSaving, setFSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invs, accs] = await Promise.all([
        getAllInvestments(),
        getAllAccounts(),
      ]);
      setInvestments(invs);
      setAccounts(accs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalInvested = investments.reduce((s, i) => s + i.amountInvested, 0);
  const totalCurrentValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalPnL = totalCurrentValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const openAdd = () => {
    setEditingInv(null);
    setFName("");
    setFType("mutual_funds");
    setFInvested("");
    setFCurrentValue("");
    setFAccount(accounts[0]?.id || "");
    setIsDialogOpen(true);
  };

  const openEdit = (inv: Investment) => {
    setEditingInv(inv);
    setFName(inv.name);
    setFType(inv.type);
    setFInvested(inv.amountInvested.toString());
    setFCurrentValue(inv.currentValue.toString());
    setFAccount(inv.accountId);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!fName || !fAccount) {
      toast.error("Name and account are required");
      return;
    }
    const invested = Number.parseFloat(fInvested) || 0;
    const currentValue = Number.parseFloat(fCurrentValue) || invested;
    setFSaving(true);
    try {
      if (editingInv) {
        await saveInvestment({
          ...editingInv,
          name: fName,
          type: fType,
          amountInvested: invested,
          currentValue,
          accountId: fAccount,
        });
        toast.success("Investment updated");
      } else {
        await saveInvestment({
          id: generateId(),
          name: fName,
          type: fType,
          amountInvested: invested,
          currentValue,
          accountId: fAccount,
          createdAt: new Date().toISOString(),
        });
        toast.success("Investment added");
      }
      setIsDialogOpen(false);
      loadData();
    } catch {
      toast.error("Failed to save investment");
    } finally {
      setFSaving(false);
    }
  };

  const handleDelete = async (inv: Investment) => {
    try {
      await deleteInvestment(inv.id);
      toast.success("Investment deleted");
      loadData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openPriceUpdate = (inv: Investment) => {
    setPricingInv(inv);
    setNewPrice(inv.currentValue.toString());
    setIsPriceDialogOpen(true);
  };

  const handlePriceUpdate = async () => {
    if (!pricingInv) return;
    const price = Number.parseFloat(newPrice);
    if (Number.isNaN(price) || price < 0) {
      toast.error("Enter a valid value");
      return;
    }
    try {
      await saveInvestment({ ...pricingInv, currentValue: price });
      toast.success("Current value updated");
      setIsPriceDialogOpen(false);
      loadData();
    } catch {
      toast.error("Failed to update");
    }
  };

  const getPnLColor = (pnl: number) =>
    pnl >= 0 ? "oklch(0.65 0.2 145)" : "oklch(0.6 0.22 25)";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-xl font-bold">Investments</h1>
          <Button
            size="sm"
            onClick={openAdd}
            data-ocid="investments.open_modal_button"
            style={{ background: "oklch(0.7 0.18 50)" }}
          >
            <Plus size={16} className="mr-1" /> Add
          </Button>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-3 gap-2">
          <div
            className="fintrack-card p-3 text-center"
            data-ocid="investments.invested.card"
          >
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
              Invested
            </p>
            <p
              className="font-display font-bold text-sm"
              style={{ color: "oklch(0.7 0.18 50)" }}
            >
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
                notation: "compact",
              }).format(totalInvested)}
            </p>
          </div>
          <div
            className="fintrack-card p-3 text-center"
            data-ocid="investments.current_value.card"
          >
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
              Current
            </p>
            <p
              className="font-display font-bold text-sm"
              style={{ color: "oklch(0.6 0.2 255)" }}
            >
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
                notation: "compact",
              }).format(totalCurrentValue)}
            </p>
          </div>
          <div
            className="fintrack-card p-3 text-center"
            data-ocid="investments.pnl.card"
          >
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
              P&L
            </p>
            <p
              className="font-display font-bold text-sm"
              style={{ color: getPnLColor(totalPnL) }}
            >
              {totalPnL >= 0 ? "+" : ""}
              {totalPnLPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <div data-ocid="investments.loading_state">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />
            ))}
          </div>
        ) : investments.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="investments.empty_state"
          >
            <TrendingUp size={32} className="text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No investments yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start tracking your investments
            </p>
          </div>
        ) : (
          investments.map((inv, idx) => {
            const pnl = inv.currentValue - inv.amountInvested;
            const pnlPct =
              inv.amountInvested > 0 ? (pnl / inv.amountInvested) * 100 : 0;
            const typeInfo = INV_TYPES.find((t) => t.value === inv.type);
            const accName =
              accounts.find((a) => a.id === inv.accountId)?.name || "";

            return (
              <div
                key={inv.id}
                data-ocid={`investments.item.${idx + 1}`}
                className="fintrack-card p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">
                        {inv.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${typeInfo?.color}22`,
                          color: typeInfo?.color,
                        }}
                      >
                        {typeInfo?.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {accName}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-bold text-base">
                      {formatINR(inv.currentValue)}
                    </p>
                    <p
                      className="text-xs font-semibold flex items-center justify-end gap-0.5"
                      style={{ color: getPnLColor(pnl) }}
                    >
                      {pnl >= 0 ? (
                        <TrendingUp size={11} />
                      ) : (
                        <TrendingDown size={11} />
                      )}
                      {pnl >= 0 ? "+" : ""}
                      {pnlPct.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-border">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">
                      Invested
                    </p>
                    <p className="text-sm font-medium mt-0.5">
                      {formatINR(inv.amountInvested)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">
                      P&L
                    </p>
                    <p
                      className="text-sm font-medium mt-0.5"
                      style={{ color: getPnLColor(pnl) }}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {formatINR(pnl)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openPriceUpdate(inv)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs hover:bg-accent transition-colors"
                    style={{ color: "oklch(0.7 0.18 50)" }}
                    data-ocid={`investments.update_price_button.${idx + 1}`}
                  >
                    <RefreshCw size={12} /> Update Price
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(inv)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors"
                    data-ocid={`investments.edit_button.${idx + 1}`}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(inv)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs hover:bg-destructive/20 transition-colors"
                    style={{ color: "oklch(0.6 0.22 25)" }}
                    data-ocid={`investments.delete_button.${idx + 1}`}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="max-w-sm mx-auto rounded-2xl"
          style={{ background: "oklch(0.18 0.03 255)" }}
          data-ocid="investments.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingInv ? "Edit Investment" : "Add Investment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">
                Investment Name *
              </Label>
              <Input
                placeholder="e.g. Nifty 50 Index Fund"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                className="bg-muted mt-1"
                data-ocid="investments.name.input"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select
                value={fType}
                onValueChange={(v) => setFType(v as InvestmentType)}
              >
                <SelectTrigger
                  className="bg-muted mt-1"
                  data-ocid="investments.type.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INV_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Amount Invested (₹)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={fInvested}
                onChange={(e) => setFInvested(e.target.value)}
                className="bg-muted mt-1"
                data-ocid="investments.invested.input"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Current Value (₹)
              </Label>
              <Input
                type="number"
                placeholder="Same as invested if new"
                value={fCurrentValue}
                onChange={(e) => setFCurrentValue(e.target.value)}
                className="bg-muted mt-1"
                data-ocid="investments.current_value.input"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Funded From Account
              </Label>
              <Select value={fAccount} onValueChange={setFAccount}>
                <SelectTrigger
                  className="bg-muted mt-1"
                  data-ocid="investments.account.select"
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
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
                data-ocid="investments.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={fSaving}
                style={{ background: "oklch(0.7 0.18 50)" }}
                data-ocid="investments.submit_button"
              >
                {fSaving ? "Saving..." : editingInv ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price Update Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent
          className="max-w-sm mx-auto rounded-2xl"
          style={{ background: "oklch(0.18 0.03 255)" }}
          data-ocid="investments.price_update.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Update Value</DialogTitle>
          </DialogHeader>
          {pricingInv && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">{pricingInv.name}</p>
              <div className="fintrack-card p-3">
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="font-semibold">
                  {formatINR(pricingInv.currentValue)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  New Value (₹)
                </Label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="bg-muted mt-1"
                  data-ocid="investments.new_price.input"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Note: Price update does not affect account balance
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsPriceDialogOpen(false)}
                  data-ocid="investments.price_cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePriceUpdate}
                  style={{ background: "oklch(0.7 0.18 50)" }}
                  data-ocid="investments.price_confirm_button"
                >
                  Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
