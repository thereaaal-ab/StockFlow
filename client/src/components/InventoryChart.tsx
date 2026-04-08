import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatChartValue, formatCurrencyCompact } from "@/lib/utils";

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
  color = "hsl(var(--chart-1))",
  showGroupedBars = false
}: InventoryChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => formatChartValue(value)}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              formatter={(value: number) => formatCurrencyCompact(value)}
            />
            <Legend />
            {showGroupedBars ? (
              <>
                <Bar 
                  dataKey="installation" 
                  fill="hsl(var(--chart-1))" 
                  radius={[4, 4, 0, 0]} 
                  name="Installation"
                />
                <Bar 
                  dataKey="collected" 
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]} 
                  name="Revenu Collecté"
                />
              </>
            ) : (
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
