import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export interface ClientProduct {
  productId: string;
  name: string;
  quantity: number;
  monthlyFee: number;
  type?: "buy" | "rent"; // "buy" for purchase, "rent" for rental
  addedAt?: string; // ISO timestamp when this hardware was added to the client
  purchasePrice?: number; // Purchase price (what we paid) - for investment calculation
  clientPrice?: number; // Price client pays (buy or rent) - for revenue calculation
}

export interface Client {
  id: string;
  client_name: string;
  total_sold_amount: number;
  monthly_fee: number;
  product_quantity: number;
  months_left: number;
  product_id?: string;
  products?: ClientProduct[];
  starter_pack_price?: number;
  hardware_price?: number;
  contract_start_date?: string; // Date in ISO format
  status?: string; // 'active' | 'inactive'
  created_at?: string;
  updated_at?: string;
}

// Convert Supabase client to our Client type
function mapClient(client: any): Client {
  // Parse products JSONB column
  let products: ClientProduct[] = [];
  if (client.products) {
    try {
      products = Array.isArray(client.products) 
        ? client.products 
        : JSON.parse(client.products);
    } catch (e) {
      console.error("Error parsing products:", e);
      products = [];
    }
  }

  return {
    id: client.id,
    client_name: client.client_name,
    total_sold_amount: parseFloat(client.total_sold_amount || "0"),
    monthly_fee: parseFloat(client.monthly_fee || "0"),
    product_quantity: parseInt(client.product_quantity || "0", 10),
    months_left: parseInt(client.months_left || "0", 10),
    product_id: client.product_id || undefined,
    products: products.length > 0 ? products : undefined,
    starter_pack_price: client.starter_pack_price ? parseFloat(client.starter_pack_price) : undefined,
    hardware_price: client.hardware_price ? parseFloat(client.hardware_price) : undefined,
    contract_start_date: client.contract_start_date || undefined,
    status: client.status || "active",
    created_at: client.created_at,
    updated_at: client.updated_at,
  };
}

// Fetch all clients
async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch clients: ${error.message}`);
  }

  return (data || []).map(mapClient);
}

// Create a client
async function createClient(client: Omit<Client, "id" | "created_at" | "updated_at">): Promise<Client> {
  const insertData: any = {
    client_name: client.client_name,
    product_quantity: client.product_quantity,
    total_sold_amount: client.total_sold_amount,
    monthly_fee: client.monthly_fee,
    months_left: client.months_left,
  };

  // Only include product_id if provided
  if (client.product_id) {
    insertData.product_id = client.product_id;
  }

  // Include products array if provided
  if (client.products && client.products.length > 0) {
    insertData.products = client.products;
  }

  // Include starter_pack_price and hardware_price if provided (only on create)
  if (client.starter_pack_price !== undefined) {
    insertData.starter_pack_price = client.starter_pack_price;
  }
  if (client.hardware_price !== undefined) {
    insertData.hardware_price = client.hardware_price;
  }
  if (client.contract_start_date) {
    insertData.contract_start_date = client.contract_start_date;
  }
  if (client.status) {
    insertData.status = client.status;
  }

  console.log("Inserting client data:", insertData);

  const { data, error } = await supabase
    .from("clients")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Supabase error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(`Failed to create client: ${error.message}${error.hint ? ` (${error.hint})` : ""}`);
  }

  return mapClient(data);
}

// Update a client
async function updateClient(
  id: string,
  client: Omit<Client, "id" | "created_at" | "updated_at">
): Promise<Client> {
  const updateData: any = {
    client_name: client.client_name,
    product_quantity: client.product_quantity,
    total_sold_amount: client.total_sold_amount,
    monthly_fee: client.monthly_fee,
    months_left: client.months_left,
  };

  // Only include product_id if provided
  if (client.product_id) {
    updateData.product_id = client.product_id;
  } else {
    // If product_id is explicitly undefined, set it to null
    updateData.product_id = null;
  }

  // Include products array if provided
  if (client.products !== undefined) {
    updateData.products = client.products.length > 0 ? client.products : [];
  }
  if (client.starter_pack_price !== undefined) {
    updateData.starter_pack_price = client.starter_pack_price || null;
  }
  if (client.hardware_price !== undefined) {
    updateData.hardware_price = client.hardware_price || null;
  }
  if (client.contract_start_date !== undefined) {
    updateData.contract_start_date = client.contract_start_date || null;
  }
  if (client.status !== undefined) {
    updateData.status = client.status;
  }

  // Note: We don't set updated_at here - let the database trigger handle it
  // This avoids Supabase schema cache issues

  const { data, error } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Supabase error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(
      `Failed to update client: ${error.message}${error.hint ? ` (${error.hint})` : ""}`
    );
  }

  return mapClient(data);
}

// Delete a client
async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete client: ${error.message}`);
  }
}

export function useClients() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, client }: { id: string; client: Omit<Client, "id" | "created_at" | "updated_at"> }) =>
      updateClient(id, client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  // Set up realtime listener for clients
  useEffect(() => {
    const channel = supabase
      .channel("clients-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        () => {
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    clients: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createClient: createMutation.mutateAsync,
    updateClient: (id: string, client: Omit<Client, "id" | "created_at" | "updated_at">) =>
      updateMutation.mutateAsync({ id, client }),
    deleteClient: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

