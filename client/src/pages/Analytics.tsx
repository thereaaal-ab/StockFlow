import { InventoryChart } from "@/components/InventoryChart";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, Package, Users, Euro } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardCounts } from "@/hooks/useDashboardCounts";
import { useProducts } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { useMemo, useState } from "react";
import { formatCurrencyCompact, formatCurrencyFull } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Analytics() {
  const { counts, isLoading: countsLoading } = useDashboardCounts();
  const { products, isLoading: productsLoading } = useProducts();
  const { clients, isLoading: clientsLoading } = useClients();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Create a map of product_id to product for quick lookups
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  // Group clients by product category (dynamically detect all categories)
  const categoryStats = useMemo(() => {
    const stats = new Map<string, {
      revenue: number;
      clientCount: number;
      totalMonthsLeft: number;
      category: string;
    }>();

    // Aggregate client data by category
    clients.forEach((client) => {
      let category = "Other";
      if (client.product_id) {
        const product = productMap.get(client.product_id);
        if (product) {
          category = product.category?.trim() || "Other";
        }
      }

      const current = stats.get(category) || { revenue: 0, clientCount: 0, totalMonthsLeft: 0, category };
      current.revenue += client.total_sold_amount;
      current.clientCount += 1;
      current.totalMonthsLeft += client.months_left;
      stats.set(category, current);
    });

    return Array.from(stats.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [clients, productMap]);

  // Filter clients by selected category
  const filteredClients = useMemo(() => {
    if (selectedCategory === "all") return clients;
    return clients.filter((client) => {
      if (!client.product_id) {
        return selectedCategory === "Other";
      }
      const product = productMap.get(client.product_id);
      const productCategory = product?.category?.trim() || "Other";
      return productCategory === selectedCategory;
    });
  }, [clients, selectedCategory, productMap]);

  // Client value data - filtered by category
  const clientValueData = useMemo(() => {
    return filteredClients.map((client) => ({
      name: client.client_name,
      value: client.total_sold_amount,
    }));
  }, [filteredClients]);

  // Hardware distribution by category - percentage based
  const hardwareDistribution = useMemo(() => {
    if (products.length === 0) return [];
    
    const categoryCounts = new Map<string, number>();
    products.forEach((product) => {
      const category = product.category?.trim() || "Other";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const totalProducts = products.length;

    return Array.from(categoryCounts.entries())
      .map(([name, count], index) => {
        const percentage = (count / totalProducts) * 100;
        return {
          name: `${name} (${percentage.toFixed(1)}%)`,
          value: count,
          percentage: percentage,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        };
      })
      .sort((a, b) => b.value - a.value); // Sort by count descending
  }, [products]);

  // Revenue by category chart data
  const revenueByCategory = useMemo(() => {
    return categoryStats
      .filter((stat) => stat.revenue > 0)
      .map((stat, index) => ({
        name: stat.category,
        value: stat.revenue,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }));
  }, [categoryStats]);

  // Monthly trend - empty for now, can be enhanced with actual historical data
  const monthlyTrend: Array<{ name: string; value: number }> = [];

  // Calculate revenue per client
  const clientRevenueData = useMemo(() => {
    return clients.map((client) => {
      const monthlyFee = client.monthly_fee || 0;
      const monthlyRevenue = monthlyFee; // Same as monthly fee
      const yearlyRevenue = monthlyFee * 12;
      
      return {
        clientName: client.client_name,
        monthlyFee,
        monthlyRevenue,
        yearlyRevenue,
      };
    });
  }, [clients]);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    const totalMonthlyRevenue = clients.reduce((sum, client) => {
      return sum + (client.monthly_fee || 0);
    }, 0);
    const totalYearlyRevenue = totalMonthlyRevenue * 12;
    
    return {
      totalMonthlyRevenue,
      totalYearlyRevenue,
    };
  }, [clients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyses et tendances de votre inventaire
          </p>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue placeholder="Filtrer par catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {Array.from(new Set(products.map(p => p.category?.trim() || "Other")))
              .sort()
              .map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Taux d'utilisation"
          value={countsLoading ? "..." : counts.productCount > 0 
            ? `${Math.round((counts.availableStockCount / counts.productCount) * 100)}%`
            : "0%"}
          icon={TrendingUp}
          testId="card-usage-rate"
        />
        <StatCard
          title="Matériel déployé"
          value={countsLoading ? "..." : counts.availableStockCount.toString()}
          icon={Package}
          testId="card-deployed"
        />
        <StatCard
          title="Clients actifs"
          value={countsLoading ? "..." : counts.clientCount.toString()}
          icon={Users}
          testId="card-clients"
        />
        <StatCard
          title="Valeur déployée"
          value={countsLoading ? "..." : formatCurrencyCompact(counts.totalValue)}
          icon={Euro}
          testId="card-deployed-value"
        />
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Revenu Mensuel Total"
          value={clientsLoading ? "..." : formatCurrencyCompact(totalRevenue.totalMonthlyRevenue)}
          icon={Euro}
          testId="card-total-monthly-revenue"
        />
        <StatCard
          title="Revenu Annuel Total"
          value={clientsLoading ? "..." : formatCurrencyCompact(totalRevenue.totalYearlyRevenue)}
          icon={Euro}
          testId="card-total-yearly-revenue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryChart
          title={selectedCategory === "all" ? "Valeur par Client" : `Valeur par Client (${selectedCategory})`}
          data={clientValueData}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribution du Matériel par Catégorie (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {hardwareDistribution.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={hardwareDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => {
                      const categoryName = entry.name.split(' (')[0];
                      return `${categoryName}\n${entry.percentage.toFixed(1)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {hardwareDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => {
                      const categoryName = props.payload.name.split(' (')[0];
                      return [`${categoryName}: ${value} produits (${props.payload.percentage.toFixed(1)}%)`, "Nombre"];
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenus par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByCategory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueByCategory}
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
                    {revenueByCategory.map((entry, index) => (
                      <Cell key={`cell-revenue-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrencyCompact(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {monthlyTrend.length > 0 ? (
          <InventoryChart
            title="Évolution de la Valeur Totale"
            data={monthlyTrend}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Évolution de la Valeur Totale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée historique disponible
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistiques par Catégorie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryStats
              .filter((stat) => stat.clientCount > 0)
              .map((stat) => (
                <div key={stat.category} className="space-y-2 border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{stat.category}</span>
                    <span className="text-sm text-muted-foreground">
                      {stat.clientCount} {stat.clientCount === 1 ? "client" : "clients"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Revenu total: </span>
                      <span className="font-semibold">{formatCurrencyFull(stat.revenue)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mois moyens restants: </span>
                      <span className="font-semibold">
                        {stat.clientCount > 0
                          ? Math.round(stat.totalMonthsLeft / stat.clientCount)
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Client Revenue Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenus par Client</CardTitle>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : clientRevenueData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun client disponible
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du Client</TableHead>
                      <TableHead className="text-right">Frais Mensuels</TableHead>
                      <TableHead className="text-right">Revenu Mensuel</TableHead>
                      <TableHead className="text-right">Revenu Annuel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRevenueData.map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{client.clientName}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyFull(client.monthlyFee)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyFull(client.monthlyRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyFull(client.yearlyRevenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Indicateurs Clés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taux de disponibilité</span>
                <span className="font-semibold">
                  {countsLoading ? "..." : counts.productCount > 0 
                    ? `${Math.round((counts.availableStockCount / counts.productCount) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ 
                    width: countsLoading || counts.productCount === 0 
                      ? "0%" 
                      : `${Math.round((counts.availableStockCount / counts.productCount) * 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Matériel en stock bas</span>
                <span className="font-semibold text-status-warning">
                  {countsLoading ? "..." : products.filter(p => {
                    const stock = p.stock_actuel ?? p.quantity ?? 0;
                    return stock > 0 && stock < 5;
                  }).length} produits
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-status-warning h-2 rounded-full"
                  style={{ 
                    width: countsLoading || counts.productCount === 0 
                      ? "0%" 
                      : `${Math.round((products.filter(p => {
                        const stock = p.stock_actuel ?? p.quantity ?? 0;
                        return stock > 0 && stock < 5;
                      }).length / counts.productCount) * 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valeur moyenne par client</span>
                <span className="font-semibold">
                  {countsLoading || counts.clientCount === 0 
                    ? "0 €" 
                    : formatCurrencyFull(counts.totalValue / counts.clientCount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valeur totale</span>
                <span className="font-semibold text-status-success">
                  {countsLoading ? "..." : formatCurrencyCompact(counts.totalValue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
