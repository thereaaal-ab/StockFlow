import { InventoryChart } from "@/components/InventoryChart";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, Package, Users, Euro } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function Analytics() {
  const clientValueData = [
    { name: "SameSame", value: 12500 },
    { name: "O'Comptoir", value: 8200 },
    { name: "CuzCup", value: 18900 },
    { name: "GameSame", value: 6700 },
  ];

  const hardwareDistribution = [
    { name: "Kiosks", value: 6, fill: "hsl(var(--chart-1))" },
    { name: "Tablettes", value: 1, fill: "hsl(var(--chart-2))" },
    { name: "Bipers", value: 44, fill: "hsl(var(--chart-3))" },
    { name: "Licences", value: 7, fill: "hsl(var(--chart-4))" },
    { name: "Autres", value: 6, fill: "hsl(var(--chart-5))" },
  ];

  const monthlyTrend = [
    { name: "Sept", value: 38500 },
    { name: "Oct", value: 42300 },
    { name: "Nov", value: 40100 },
    { name: "Déc", value: 45200 },
    { name: "Jan", value: 46600 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Analyses et tendances de votre inventaire
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Taux d'utilisation"
          value="68%"
          icon={TrendingUp}
          trend={{ value: "+5%", isPositive: true }}
          testId="card-usage-rate"
        />
        <StatCard
          title="Matériel déployé"
          value="97"
          icon={Package}
          testId="card-deployed"
        />
        <StatCard
          title="Clients actifs"
          value="8"
          icon={Users}
          testId="card-clients"
        />
        <StatCard
          title="Valeur déployée"
          value="43,760 €"
          icon={Euro}
          trend={{ value: "+12%", isPositive: true }}
          testId="card-deployed-value"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryChart
          title="Valeur par Client"
          data={clientValueData}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribution du Matériel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={hardwareDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {hardwareDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <InventoryChart
          title="Évolution de la Valeur Totale"
          data={monthlyTrend}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Indicateurs Clés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taux de disponibilité</span>
                <span className="font-semibold">32%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: "32%" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Matériel en stock bas</span>
                <span className="font-semibold text-status-warning">3 produits</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-status-warning h-2 rounded-full"
                  style={{ width: "21%" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valeur moyenne par client</span>
                <span className="font-semibold">11,575 €</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Croissance mensuelle</span>
                <span className="font-semibold text-status-success">+3.1%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
