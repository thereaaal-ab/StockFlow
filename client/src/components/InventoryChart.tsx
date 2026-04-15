import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatChartValue, formatCurrencyCompact, cn } from "@/lib/utils";

interface ChartData {
  name: string;
  value?: number;
  installation?: number;
  collected?: number;
}

interface InventoryChartProps {
  title: string;
  data: ChartData[];
  dataKey?: string;
  color?: string;
  showGroupedBars?: boolean;
}

const ACCENT_BAR = "hsl(239 84% 67% / 0.7)";
const SECOND_BAR = "hsl(188 94% 43% / 0.75)";

export function InventoryChart({
  title,
  data,
  dataKey = "value",
  color = ACCENT_BAR,
  showGroupedBars = false,
}: InventoryChartProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "transition-[border-color] duration-150 ease-out hover:border-[color:var(--enterprise-border-strong,hsl(var(--border)))]"
      )}
    >
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-sm font-semibold tracking-tight sm:text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
              opacity={0.6}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatChartValue(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              formatter={(value: number) => formatCurrencyCompact(value)}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            {showGroupedBars ? (
              <>
                <Bar
                  dataKey="installation"
                  fill={ACCENT_BAR}
                  radius={[4, 4, 0, 0]}
                  name="Installation"
                  maxBarSize={48}
                />
                <Bar
                  dataKey="collected"
                  fill={SECOND_BAR}
                  radius={[4, 4, 0, 0]}
                  name="Revenu Collecté"
                  maxBarSize={48}
                />
              </>
            ) : (
              <Bar
                dataKey={dataKey}
                fill={color}
                radius={[4, 4, 0, 0]}
                maxBarSize={56}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
