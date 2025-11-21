import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export interface Product {
  id: string;
  code: string;
  name: string;
  quantity: number; // Keep for backward compatibility
  hardware_total: number; // Original quantity, never changes automatically
  stock_actuel: number; // Current available stock, decreases when clients receive products
  purchase_price: number;
  selling_price: number;
  rent_price: number;
  profit: number;
  total_value: number;
  category: string; // Keep for backward compatibility
  category_id?: string; // Foreign key to categories table
  created_at?: string;
  updated_at?: string;
}

// Convert Supabase product to our Product type
function mapProduct(product: any): Product {
  // For backward compatibility: if hardware_total/stock_actuel don't exist, use quantity
  const hardwareTotal = product.hardware_total ?? product.quantity ?? 0;
  const stockActuel = product.stock_actuel ?? product.quantity ?? 0;
  
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    quantity: product.quantity || 0, // Keep for backward compatibility
    hardware_total: hardwareTotal,
    stock_actuel: stockActuel,
    purchase_price: parseFloat(product.purchase_price) || 0,
    selling_price: parseFloat(product.selling_price) || 0,
    rent_price: parseFloat(product.rent_price) || 0,
    profit: parseFloat(product.profit) || 0,
    total_value: parseFloat(product.total_value) || 0,
    category: product.category || "Other", // Keep for backward compatibility
    category_id: product.category_id || undefined,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

// Fetch all products
async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return (data || []).map(mapProduct);
}

// Update a product
async function updateProduct(product: Product): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update({
      code: product.code,
      name: product.name,
      quantity: product.quantity, // Keep for backward compatibility
      hardware_total: product.hardware_total,
      stock_actuel: product.stock_actuel,
      purchase_price: product.purchase_price.toString(),
      selling_price: product.selling_price.toString(),
      rent_price: (product.rent_price || 0).toString(),
      profit: product.profit.toString(),
      total_value: product.total_value.toString(),
      category: product.category, // Keep for backward compatibility
      category_id: product.category_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", product.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`);
  }

  return mapProduct(data);
}

// Delete a product
async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete product: ${error.message}`);
  }
}

// Create a product
async function createProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
  const profit = product.selling_price - product.purchase_price;
  // Use hardware_total if provided, otherwise use quantity for backward compatibility
  const hardwareTotal = product.hardware_total ?? product.quantity ?? 0;
  const stockActuel = product.stock_actuel ?? product.quantity ?? 0;
  const totalValue = stockActuel * product.purchase_price;

  const { data, error } = await supabase
    .from("products")
    .insert({
      code: product.code,
      name: product.name,
      quantity: product.quantity, // Keep for backward compatibility
      hardware_total: hardwareTotal,
      stock_actuel: stockActuel,
      purchase_price: product.purchase_price.toString(),
      selling_price: product.selling_price.toString(),
      rent_price: (product.rent_price || 0).toString(),
      profit: profit.toString(),
      total_value: totalValue.toString(),
      category: product.category || "Other", // Keep for backward compatibility
      category_id: product.category_id || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }

  return mapProduct(data);
}

export function useProducts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Set up realtime listener for products
  useEffect(() => {
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    createProduct: createMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCreating: createMutation.isPending,
  };
}

