import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface DashboardCounts {
  productCount: number;
  clientCount: number;
  availableStockCount: number;
  totalValue: number;
}

export function useDashboardCounts() {
  const [counts, setCounts] = useState<DashboardCounts>({
    productCount: 0,
    clientCount: 0,
    availableStockCount: 0,
    totalValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial counts
  useEffect(() => {
    async function fetchInitialCounts() {
      try {
        // Get product count
        const { count: productCount, error: productError } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        if (productError) {
          console.error("Error fetching product count:", productError);
        }

        // Get client count
        const { count: clientCount, error: clientError } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true });

        if (clientError) {
          console.error("Error fetching client count:", clientError);
        }

        // Get available stock count and total value
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("quantity, hardware_total, stock_actuel, purchase_price, total_value");

        if (productsError) {
          console.error("Error fetching products:", productsError);
        }

        // Use stock_actuel if available, otherwise fall back to quantity
        const availableStockCount =
          products?.filter((p) => {
            const stock = p.stock_actuel ?? p.quantity ?? 0;
            return stock > 0;
          }).length || 0;
        const totalValue =
          products?.reduce((sum, p) => {
            const stock = p.stock_actuel ?? p.quantity ?? 0;
            const purchasePrice = parseFloat(p.purchase_price || "0");
            return sum + (stock * purchasePrice);
          }, 0) || 0;

        setCounts({
          productCount: productCount || 0,
          clientCount: clientCount || 0,
          availableStockCount,
          totalValue,
        });
      } catch (error) {
        console.error("Error fetching initial counts:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialCounts();
  }, []);

  // Set up realtime listeners
  useEffect(() => {
    // Products realtime listener
    const productsChannel = supabase
      .channel("products-realtime-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        async (payload) => {
          // Refetch counts when products change
          const { count: productCount } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true });

          const { data: products } = await supabase
            .from("products")
            .select("quantity, hardware_total, stock_actuel, purchase_price, total_value");

          // Use stock_actuel if available, otherwise fall back to quantity
          const availableStockCount =
            products?.filter((p) => {
              const stock = p.stock_actuel ?? p.quantity ?? 0;
              return stock > 0;
            }).length || 0;
          const totalValue =
            products?.reduce((sum, p) => {
              const stock = p.stock_actuel ?? p.quantity ?? 0;
              const purchasePrice = parseFloat(p.purchase_price || "0");
              return sum + (stock * purchasePrice);
            }, 0) || 0;

          setCounts((prev) => ({
            ...prev,
            productCount: productCount || 0,
            availableStockCount,
            totalValue,
          }));
        }
      )
      .subscribe();

    // Clients realtime listener
    const clientsChannel = supabase
      .channel("clients-realtime-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        async () => {
          // Refetch client count when clients change
          const { count: clientCount } = await supabase
            .from("clients")
            .select("*", { count: "exact", head: true });

          setCounts((prev) => ({
            ...prev,
            clientCount: clientCount || 0,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(clientsChannel);
    };
  }, []);

  return { counts, isLoading };
}

