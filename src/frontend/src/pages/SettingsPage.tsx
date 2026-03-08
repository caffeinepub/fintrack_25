import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type Category,
  deleteCategory,
  exportBackup,
  generateId,
  getAllCategories,
  getSetting,
  importBackup,
  saveCategory,
  setSetting,
} from "@/lib/db";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Download,
  List,
  Plus,
  Shield,
  Tag,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [entryMode, setEntryMode] = useState<"simple" | "detailed">("simple");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catType, setCatType] = useState<"income" | "expense">("expense");
  const [fCatName, setFCatName] = useState("");
  const [fSubcategories, setFSubcategories] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cats, mode, reminder, remTime] = await Promise.all([
        getAllCategories(),
        getSetting("entryMode"),
        getSetting("reminderEnabled"),
        getSetting("reminderTime"),
      ]);
      setCategories(cats);
      setEntryMode((mode as "simple" | "detailed") || "simple");
      setReminderEnabled(!!reminder);
      setReminderTime((remTime as string) || "20:00");
    } catch {
      // silently fail - keep defaults
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEntryModeChange = async (checked: boolean) => {
    const mode = checked ? "detailed" : "simple";
    setEntryMode(mode);
    await setSetting("entryMode", mode);
    toast.success(`Switched to ${mode} mode`);
  };

  const handleReminderToggle = async (checked: boolean) => {
    setReminderEnabled(checked);
    await setSetting("reminderEnabled", checked);
  };

  const handleReminderTimeChange = async (time: string) => {
    setReminderTime(time);
    await setSetting("reminderTime", time);
  };

  const openAddCategory = (type: "income" | "expense") => {
    setEditingCat(null);
    setCatType(type);
    setFCatName("");
    setFSubcategories("");
    setIsCatDialogOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatType(cat.type);
    setFCatName(cat.name);
    setFSubcategories(cat.subcategories.join(", "));
    setIsCatDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!fCatName.trim()) {
      toast.error("Category name required");
      return;
    }
    const subs = fSubcategories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      if (editingCat) {
        await saveCategory({
          ...editingCat,
          name: fCatName.trim(),
          subcategories: subs,
        });
        toast.success("Category updated");
      } else {
        await saveCategory({
          id: generateId(),
          name: fCatName.trim(),
          type: catType,
          subcategories: subs,
        });
        toast.success("Category added");
      }
      setIsCatDialogOpen(false);
      loadData();
    } catch {
      toast.error("Failed to save category");
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    try {
      await deleteCategory(cat.id);
      toast.success("Category deleted");
      loadData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup exported successfully");
    } catch {
      toast.error("Failed to export backup");
    }
  };

  const handleRestoreBackup = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true);
    try {
      const text = await file.text();
      await importBackup(text);
      toast.success("Backup restored! Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error("Invalid backup file");
    } finally {
      setRestoreLoading(false);
      e.target.value = "";
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const SettingSection = ({
    icon: Icon,
    title,
    children,
  }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <div className="fintrack-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-muted">
          <Icon size={14} className="text-muted-foreground" />
        </div>
        <h3 className="font-display font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border">
        <h1 className="font-display text-xl font-bold">Settings</h1>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Entry Mode */}
        <SettingSection icon={List} title="Transaction Entry Mode">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {entryMode === "detailed" ? "Detailed Mode" : "Simple Mode"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entryMode === "simple"
                  ? "Amount, Category, Account only"
                  : "All fields including Date, Notes, Subcategory"}
              </p>
            </div>
            <Switch
              checked={entryMode === "detailed"}
              onCheckedChange={handleEntryModeChange}
              data-ocid="settings.entry_mode.switch"
            />
          </div>
        </SettingSection>

        {/* Categories */}
        <SettingSection icon={Tag} title="Category Management">
          <Tabs defaultValue="expense">
            <TabsList
              className="w-full bg-muted"
              data-ocid="settings.categories.tab"
            >
              <TabsTrigger
                value="expense"
                className="flex-1 text-xs"
                data-ocid="settings.expense_cats.tab"
              >
                Expense
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="flex-1 text-xs"
                data-ocid="settings.income_cats.tab"
              >
                Income
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense" className="mt-3 space-y-2">
              {expenseCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="border border-border rounded-xl overflow-hidden"
                  data-ocid={`settings.expense_cat.item.${idx + 1}`}
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-accent transition-colors text-left"
                    onClick={() =>
                      setExpandedCat(expandedCat === cat.id ? null : cat.id)
                    }
                  >
                    <div className="flex items-center gap-2">
                      {cat.subcategories.length > 0 ? (
                        expandedCat === cat.id ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )
                      ) : (
                        <span className="w-3.5" />
                      )}
                      <span className="text-sm">{cat.name}</span>
                      {cat.subcategories.length > 0 && (
                        <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {cat.subcategories.length} sub
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCategory(cat);
                        }}
                        className="p-1 rounded hover:bg-accent text-muted-foreground"
                        data-ocid={`settings.expense_cat.edit_button.${idx + 1}`}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat);
                        }}
                        className="p-1 rounded hover:bg-destructive/20"
                        style={{ color: "oklch(0.6 0.22 25)" }}
                        data-ocid={`settings.expense_cat.delete_button.${idx + 1}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>
                  {expandedCat === cat.id && cat.subcategories.length > 0 && (
                    <div className="px-4 pb-2 pt-1 bg-muted/50 border-t border-border">
                      <div className="flex flex-wrap gap-1.5">
                        {cat.subcategories.map((sub) => (
                          <span
                            key={sub}
                            className="text-[10px] bg-muted px-2 py-1 rounded-lg text-muted-foreground"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => openAddCategory("expense")}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                data-ocid="settings.add_expense_cat.button"
              >
                <Plus size={14} /> Add Expense Category
              </button>
            </TabsContent>

            <TabsContent value="income" className="mt-3 space-y-2">
              {incomeCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="border border-border rounded-xl overflow-hidden"
                  data-ocid={`settings.income_cat.item.${idx + 1}`}
                >
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm">{cat.name}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditCategory(cat)}
                        className="p-1 rounded hover:bg-accent text-muted-foreground"
                        data-ocid={`settings.income_cat.edit_button.${idx + 1}`}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1 rounded hover:bg-destructive/20"
                        style={{ color: "oklch(0.6 0.22 25)" }}
                        data-ocid={`settings.income_cat.delete_button.${idx + 1}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => openAddCategory("income")}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                data-ocid="settings.add_income_cat.button"
              >
                <Plus size={14} /> Add Income Category
              </button>
            </TabsContent>
          </Tabs>
        </SettingSection>

        {/* Reminders */}
        <SettingSection icon={Bell} title="Daily Reminder">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Expense Reminder</p>
                <p className="text-xs text-muted-foreground">
                  Daily reminder to log expenses
                </p>
              </div>
              <Switch
                checked={reminderEnabled}
                onCheckedChange={handleReminderToggle}
                data-ocid="settings.reminder.switch"
              />
            </div>
            {reminderEnabled && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Reminder Time
                </Label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => handleReminderTimeChange(e.target.value)}
                  className="bg-muted mt-1 max-w-[120px]"
                  data-ocid="settings.reminder_time.input"
                />
              </div>
            )}
          </div>
        </SettingSection>

        {/* Backup */}
        <SettingSection icon={Shield} title="Backup & Restore">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Your data is stored locally on your device. Export regularly to
              prevent data loss.
            </p>
            <Button
              className="w-full gap-2"
              onClick={handleExportBackup}
              style={{ background: "oklch(0.6 0.2 255)" }}
              data-ocid="settings.export_backup.button"
            >
              <Download size={16} />
              Export Backup (JSON)
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={restoreLoading}
                data-ocid="settings.restore_backup.button"
                onClick={() =>
                  document.getElementById("backup-file-input")?.click()
                }
              >
                <Upload size={16} />
                {restoreLoading ? "Restoring..." : "Restore from Backup"}
              </Button>
              <input
                id="backup-file-input"
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
                data-ocid="settings.restore_backup_file.upload_button"
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              ⚠️ Restore will overwrite all current data
            </p>
          </div>
        </SettingSection>

        {/* Account Management link */}
        <SettingSection icon={Wallet} title="Account Management">
          <p className="text-xs text-muted-foreground">
            Manage your bank accounts, cash, and wallets from the Accounts tab.
          </p>
        </SettingSection>

        {/* App Info */}
        <div className="fintrack-card p-4 text-center">
          <p
            className="font-display font-bold text-lg"
            style={{ color: "oklch(0.6 0.2 255)" }}
          >
            FinTrack
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Personal Finance Manager
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Version 1.0.0 · All data stored locally
          </p>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              🔒 Your financial data never leaves your device
            </p>
          </div>
        </div>

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

      {/* Category Dialog */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent
          className="max-w-sm mx-auto rounded-2xl"
          style={{ background: "oklch(0.18 0.03 255)" }}
          data-ocid="settings.category.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingCat
                ? "Edit Category"
                : `Add ${catType === "income" ? "Income" : "Expense"} Category`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">
                Category Name *
              </Label>
              <Input
                placeholder="e.g. Groceries"
                value={fCatName}
                onChange={(e) => setFCatName(e.target.value)}
                className="bg-muted mt-1"
                data-ocid="settings.category_name.input"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Subcategories (comma-separated, optional)
              </Label>
              <Input
                placeholder="e.g. Vegetables, Dairy, Snacks"
                value={fSubcategories}
                onChange={(e) => setFSubcategories(e.target.value)}
                className="bg-muted mt-1"
                data-ocid="settings.subcategories.input"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsCatDialogOpen(false)}
                data-ocid="settings.category.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveCategory}
                style={{ background: "oklch(0.6 0.2 255)" }}
                data-ocid="settings.category.submit_button"
              >
                {editingCat ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
