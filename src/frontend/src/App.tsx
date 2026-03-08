import { Toaster } from "@/components/ui/sonner";
import { initializeDB } from "@/lib/db";
import { ThemeProvider, useTheme } from "@/lib/theme";
import Accounts from "@/pages/Accounts";
import Dashboard from "@/pages/Dashboard";
import Insights from "@/pages/Insights";
import Investments from "@/pages/Investments";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import Transactions from "@/pages/Transactions";
import {
  ArrowLeftRight,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

export type Page =
  | "dashboard"
  | "transactions"
  | "accounts"
  | "investments"
  | "reports"
  | "insights"
  | "settings";

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "investments", label: "Investments", icon: TrendingUp },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "settings", label: "Settings", icon: Settings },
];

function AppInner() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [isReady, setIsReady] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    initializeDB()
      .then(() => setIsReady(true))
      .catch(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground font-display text-lg">
            Loading FinTrack...
          </p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard onNavigate={setActivePage} />;
      case "transactions":
        return <Transactions />;
      case "accounts":
        return <Accounts />;
      case "investments":
        return <Investments />;
      case "reports":
        return <Reports />;
      case "insights":
        return <Insights />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <main
        className="flex-1 overflow-x-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        <div key={activePage} className="page-enter">
          {renderPage()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: "oklch(var(--card))",
          borderTop: "1px solid oklch(var(--border))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-stretch h-16">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activePage === id;
            return (
              <button
                type="button"
                key={id}
                data-ocid={`nav.${id}.link`}
                onClick={() => setActivePage(id)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative"
                style={{
                  color: isActive
                    ? "oklch(var(--primary))"
                    : "oklch(var(--muted-foreground))",
                }}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: "oklch(var(--primary))" }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{
                    filter: isActive
                      ? "drop-shadow(0 0 4px oklch(var(--primary) / 0.4))"
                      : "none",
                  }}
                />
                <span
                  className="text-[9px] font-medium tracking-wide leading-none"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Toaster
        theme={theme === "dark" ? "dark" : "light"}
        position="top-center"
        toastOptions={{
          style: {
            background: "oklch(var(--card))",
            border: "1px solid oklch(var(--border))",
            color: "oklch(var(--foreground))",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
