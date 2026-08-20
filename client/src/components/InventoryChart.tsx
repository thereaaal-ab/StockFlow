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
import { useChartPalette } from "@/lib/chartPalette";

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

export function InventoryChart({
  title,
  data,
  dataKey = "value",
  color,
  showGroupedBars = false,
}: InventoryChartProps) {
  // Palette R0, résolue selon le registre clair/sombre.
  const chart = useChartPalette();
  const ACCENT_BAR = chart.colors[0];   // menthe
  const SECOND_BAR = chart.colors[1];   // encre (clair en registre sombre)

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border border-card-border bg-card shadow-card"
      )}
    >
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={chart.grid}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: chart.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: chart.axis, fontSize: 11, fontFamily: "var(--ro-font-data)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatChartValue(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "14px",
                boxShadow: "var(--ro-shadow-raised)",
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
                fill={color ?? ACCENT_BAR}
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
