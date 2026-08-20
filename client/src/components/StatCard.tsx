import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * R0 — le filet de tête reprend les rôles de la marque, pas une palette
 * décorative : menthe (service), jaune (argent), encre (neutre), rouge
 * (alerte). Les noms historiques sont conservés pour ne pas casser les appels.
 */
const ACCENT_BAR: Record<
  NonNullable<StatCardProps["accent"]>,
  string
> = {
  indigo: "bg-ink-850 dark:bg-[#F6F8F7]",
  emerald: "bg-mint-500",
  amber: "bg-brand-500",
  rose: "bg-mint-700",   // le rouge ne sert jamais de décor : il signale.
  cyan: "bg-mint-600",
  slate: "bg-ink-300",
};

export interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  testId?: string;
  /** Colored top accent stripe */
  accent?: "indigo" | "emerald" | "amber" | "rose" | "cyan" | "slate";
  /** When set (and not loading), value counts up from 0 over `durationMs`. */
  animatedNumber?: number;
  /** Format animated numeric value for display */
  formatAnimated?: (n: number) => string;
}

function useAnimatedNumber(
  target: number,
  enabled: boolean,
  durationMs: number
) {
  const [display, setDisplay] = useState(enabled ? 0 : target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, enabled, durationMs]);

  return display;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  testId,
  accent = "slate",
  animatedNumber,
  formatAnimated,
}: StatCardProps) {
  const isLoading = value === "...";
  const useAnimation =
    animatedNumber !== undefined && !isLoading && !Number.isNaN(animatedNumber);
  // Compteur chiffré R0 : 1400ms, cubic-out, au montage.
  const animated = useAnimatedNumber(
    animatedNumber ?? 0,
    !!useAnimation,
    1400
  );
  const displayValue =
    useAnimation && formatAnimated
      ? formatAnimated(animated)
      : value;

  return (
    <Card
      data-testid={testId ?? undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border border-card-border bg-card shadow-card",
        "ro-lift"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5",
          ACCENT_BAR[accent]
        )}
        aria-hidden
      />
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 pt-6">
        {/* Overline R0 : mono, 0.14em, uppercase — le libellé n'est jamais un titre. */}
        <CardTitle className="ro-overline text-[11px] sm:text-xs">
          {title}
        </CardTitle>
        <Icon className="size-4 shrink-0 text-[color:var(--ro-icon-low)]" />
      </CardHeader>
      <CardContent className="pb-5">
        {/* Le chiffre porte la phrase : mono, zéro barré, chiffres tabulaires. */}
        <div
          className="ro-figure text-[28px] sm:text-[32px]"
          data-testid={testId ? `${testId}-value` : undefined}
        >
          {displayValue}
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            {trend.isPositive ? (
              <TrendingUp className="size-3.5 text-status-success" />
            ) : (
              <TrendingDown className="size-3.5 text-status-error" />
            )}
            <span
              className={cn(
                "ro-data text-xs font-bold",
                trend.isPositive ? "text-status-success" : "text-status-error"
              )}
            >
              {trend.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
