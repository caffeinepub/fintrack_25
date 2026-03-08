import { Button } from "@/components/ui/button";
import { type Milestone, getAllMilestones } from "@/lib/db";
import { type Insight, generateInsights } from "@/lib/finance";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function InsightIcon({ type }: { type: string }) {
  if (type === "positive")
    return <CheckCircle size={18} style={{ color: "oklch(0.65 0.2 145)" }} />;
  if (type === "negative")
    return <AlertTriangle size={18} style={{ color: "oklch(0.6 0.22 25)" }} />;
  return <Info size={18} style={{ color: "oklch(0.65 0.18 300)" }} />;
}

function insightBg(type: string): string {
  if (type === "positive") return "oklch(0.28 0.08 145)";
  if (type === "negative") return "oklch(0.26 0.08 25)";
  return "oklch(0.26 0.07 300)";
}

function insightBorder(type: string): string {
  if (type === "positive") return "oklch(0.45 0.12 145)";
  if (type === "negative") return "oklch(0.45 0.12 25)";
  return "oklch(0.45 0.1 300)";
}

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ins, ms] = await Promise.all([
        generateInsights(),
        getAllMilestones(),
      ]);
      setInsights(ins);
      setMilestones(ms);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">Insights</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI-powered financial observations
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="gap-1.5"
            data-ocid="insights.refresh.button"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5">
        {loading ? (
          <div data-ocid="insights.loading_state">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-card animate-pulse mb-3"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Insights */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ background: "oklch(0.28 0.07 300)" }}
                >
                  <Zap size={14} style={{ color: "oklch(0.65 0.18 300)" }} />
                </div>
                <h2 className="font-display font-semibold text-base">
                  Financial Insights
                </h2>
              </div>

              {insights.length === 0 ? (
                <div
                  className="fintrack-card p-6 text-center"
                  data-ocid="insights.empty_state"
                >
                  <p className="text-muted-foreground text-sm">
                    Not enough data to generate insights yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add more transactions to see personalized observations.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, idx) => (
                    <div
                      key={insight.id}
                      data-ocid={`insights.item.${idx + 1}`}
                      className="rounded-2xl p-4 border"
                      style={{
                        background: insightBg(insight.type),
                        borderColor: insightBorder(insight.type),
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <InsightIcon type={insight.type} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {insight.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {insight.description}
                          </p>
                        </div>
                        <span className="text-xl flex-shrink-0">
                          {insight.icon}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Financial Timeline */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ background: "oklch(0.3 0.07 50)" }}
                >
                  <Trophy size={14} style={{ color: "oklch(0.7 0.18 50)" }} />
                </div>
                <h2 className="font-display font-semibold text-base">
                  Financial Timeline
                </h2>
              </div>

              {milestones.length === 0 ? (
                <div
                  className="fintrack-card p-6 text-center"
                  data-ocid="milestones.empty_state"
                >
                  <p className="text-muted-foreground text-sm">
                    No milestones yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep tracking to unlock financial milestones.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div
                    className="absolute left-6 top-3 bottom-3 w-0.5"
                    style={{ background: "oklch(0.28 0.04 255)" }}
                  />

                  <div className="space-y-4">
                    {milestones.map((ms, idx) => (
                      <div
                        key={ms.id}
                        data-ocid={`milestones.item.${idx + 1}`}
                        className="flex items-start gap-4"
                      >
                        {/* Icon */}
                        <div
                          className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
                          style={{
                            background: "oklch(0.22 0.05 255)",
                            border: "2px solid oklch(0.35 0.07 255)",
                          }}
                        >
                          {ms.icon}
                        </div>

                        {/* Content */}
                        <div className="fintrack-card flex-1 p-3">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-sm">{ms.title}</p>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                              {new Date(ms.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ms.description}
                          </p>
                          {ms.amount && (
                            <p
                              className="text-xs mt-1 font-semibold"
                              style={{ color: "oklch(0.7 0.18 50)" }}
                            >
                              ₹{ms.amount.toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Tips */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ background: "oklch(0.3 0.08 255)" }}
                >
                  <TrendingUp
                    size={14}
                    style={{ color: "oklch(0.6 0.2 255)" }}
                  />
                </div>
                <h2 className="font-display font-semibold text-base">
                  Financial Tips
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  {
                    icon: "💡",
                    tip: "Aim for a savings rate above 20% for long-term wealth building.",
                  },
                  {
                    icon: "📊",
                    tip: "Diversify investments across asset classes to reduce risk.",
                  },
                  {
                    icon: "🎯",
                    tip: "Track every expense — small daily spends add up quickly.",
                  },
                  {
                    icon: "🔄",
                    tip: "Reconcile your accounts monthly to catch discrepancies early.",
                  },
                ].map((item, idx) => (
                  <div
                    key={item.icon}
                    data-ocid={`insights.tip.${idx + 1}`}
                    className="fintrack-card p-3 flex items-start gap-3"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.tip}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
