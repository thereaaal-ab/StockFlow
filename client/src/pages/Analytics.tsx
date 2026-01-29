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
import { useCategories } from "@/hooks/useCategories";
import { useMemo, useState } from "react";
import { formatCurrencyCompact, formatCurrencyFull } from "@/lib/utils";
import { diffInMonths, calculateClientMetrics } from "@/lib/clientCalculations";

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
  const { categories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Create a map of product_id to product for quick lookups
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  // Create a map of category_id to category name
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  // Helper function to get category name from product
  const getProductCategory = (product: any): string => {
    if (product.category_id && categoryMap.has(product.category_id)) {
      return categoryMap.get(product.category_id)!;
    }
    // Fallback to old category field or "Other"
    return product.category?.trim() || "Other";
  };

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
      // Get categories from client's products array
      const clientCategories = new Set<string>();
      
      if (client.products && client.products.length > 0) {
        // Use products array (new structure)
        client.products.forEach((clientProduct) => {
          const product = productMap.get(clientProduct.productId);
          if (product) {
            const category = getProductCategory(product);
            clientCategories.add(category);
          }
        });
      } else if (client.product_id) {
        // Fallback to old product_id field (backward compatibility)
        const product = productMap.get(client.product_id);
        if (product) {
          const category = getProductCategory(product);
          clientCategories.add(category);
        }
      }
      
      // If no categories found, use "Other"
      if (clientCategories.size === 0) {
        clientCategories.add("Other");
      }

      // Add revenue to each category this client belongs to
      // If client has multiple categories, distribute revenue proportionally
      const categoryCount = clientCategories.size;
      clientCategories.forEach((category) => {
        const current = stats.get(category) || { revenue: 0, clientCount: 0, totalMonthsLeft: 0, category };
        // Distribute revenue equally among categories if client has products from multiple categories
        current.revenue += client.total_sold_amount / categoryCount;
        current.clientCount += 1;
        current.totalMonthsLeft += client.months_left;
        stats.set(category, current);
      });
    });

    return Array.from(stats.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [clients, productMap]);

  // Filter clients by selected category
  const filteredClients = useMemo(() => {
    if (selectedCategory === "all") return clients;
    return clients.filter((client) => {
      // Check products array first (new structure)
      if (client.products && client.products.length > 0) {
        return client.products.some((clientProduct) => {
          const product = productMap.get(clientProduct.productId);
          if (!product) return false;
          const productCategory = getProductCategory(product);
          return productCategory === selectedCategory;
        });
      }
      // Fallback to old product_id field (backward compatibility)
      if (client.product_id) {
        const product = productMap.get(client.product_id);
        if (!product) return selectedCategory === "Other";
        const productCategory = getProductCategory(product);
        return productCategory === selectedCategory;
      }
      // No products, check if "Other" is selected
      return selectedCategory === "Other";
    });
  }, [clients, selectedCategory, productMap]);

  // Client value data - filtered by category
  // Shows installation costs (negative) vs collected revenue (positive)
  const clientValueData = useMemo(() => {
    return filteredClients.map((client) => {
      // Calculate metrics using the new cash flow logic
      const metrics = calculateClientMetrics(client, products);
      
      return {
        name: client.client_name,
        installation: metrics.installation_costs, // Negative: what we spent
        collected: metrics.total_revenue, // Positive: what we collected
      };
    });
  }, [filteredClients, products]);

  // Hardware distribution by category - percentage based
  const hardwareDistribution = useMemo(() => {
    if (products.length === 0) return [];
    
    const categoryCounts = new Map<string, number>();
    products.forEach((product) => {
      const category = getProductCategory(product);
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

  // Calculate revenue per client
  const clientRevenueData = useMemo(() => {
    return clients.map((client) => {
      const starterPack = client.starter_pack_price || 0;
      const hardware = client.hardware_price || 0; // Installation amount
      const monthlyFee = client.monthly_fee || 0;
      
      // Calculate current revenue based on months passed
      // Formula: starter pack + hardware + (monthly fee * number of months collected)
      // Example: If 2 months passed: starter pack + hardware + (monthly fee * 2)
      let currentRevenue = 0;
      if (client.contract_start_date) {
        const contractStartDate = new Date(client.contract_start_date);
        const today = new Date();
        const monthsPassed = diffInMonths(contractStartDate, today);
        
        if (monthsPassed >= 0) {
          // Number of months we've collected money for = monthsPassed + 1
          // (monthsPassed = 0 means we're in the first month, so we've collected for 1 month)
          const monthsCollected = monthsPassed + 1;
          currentRevenue = starterPack + hardware + (monthlyFee * monthsCollected);
        }
      } else {
        // No contract start date, just show starter pack + hardware + monthly fee (assume 1 month)
        currentRevenue = starterPack + hardware + monthlyFee;
      }
      
      const yearlyRevenue = monthlyFee * 12; // Annual projection
      
      return {
        clientName: client.client_name,
        starterPack,
        hardware,
        monthlyFee,
        currentRevenue,
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
            {Array.from(new Set(products.map(p => getProductCategory(p))))
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
          showGroupedBars={true}
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
                      <TableHead className="text-right">Starter Pack</TableHead>
                      <TableHead className="text-right">Hardware</TableHead>
                      <TableHead className="text-right">Frais Mensuels</TableHead>
                      <TableHead className="text-right">Revenu Actuel</TableHead>
                      <TableHead className="text-right">Revenu Annuel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRevenueData.map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{client.clientName}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyFull(client.starterPack)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyFull(client.hardware)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyFull(client.monthlyFee)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyFull(client.currentRevenue)}
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
