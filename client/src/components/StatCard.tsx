import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ACCENT_BAR: Record<
  NonNullable<StatCardProps["accent"]>,
  string
> = {
  indigo: "bg-[hsl(239_84%_67%)]",
  emerald: "bg-[hsl(142_71%_45%)]",
  amber: "bg-[hsl(38_92%_50%)]",
  rose: "bg-[hsl(330_81%_60%)]",
  cyan: "bg-[hsl(188_94%_43%)]",
  slate: "bg-[hsl(240_5%_46%)]",
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
  const animated = useAnimatedNumber(
    animatedNumber ?? 0,
    !!useAnimation,
    600
  );
  const displayValue =
    useAnimation && formatAnimated
      ? formatAnimated(animated)
      : value;

  return (
    <Card
      data-testid={testId ?? undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "transition-[border-color,box-shadow] duration-150 ease-out hover:border-[color:var(--enterprise-border-strong,hsl(var(--border)))]"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5",
          ACCENT_BAR[accent]
        )}
        aria-hidden
      />
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 pt-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pb-5">
        <div
          className="text-[1.25rem] font-bold leading-none tracking-tight text-foreground tabular-nums sm:text-[1.375rem]"
          data-testid={testId ? `${testId}-value` : undefined}
        >
          {displayValue}
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-status-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-status-error" />
            )}
            <span
              className={
                trend.isPositive ? "text-status-success" : "text-status-error"
              }
            >
              {trend.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
