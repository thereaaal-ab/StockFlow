import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export interface Commission {
  id: string;
  month: string; // Date in ISO format
  amount: number;
  created_at?: string;
}

// Convert Supabase commission to our Commission type
function mapCommission(commission: any): Commission {
  return {
    id: commission.id,
    month: commission.month,
    amount: parseFloat(commission.amount || "0"),
    created_at: commission.created_at,
  };
}

// Fetch all commissions
async function fetchCommissions(): Promise<Commission[]> {
  const { data, error } = await supabase
    .from("commissions")
    .select("*")
    .order("month", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch commissions: ${error.message}`);
  }

  return (data || []).map(mapCommission);
}

// Create a commission
async function createCommission(month: string, amount: number): Promise<Commission> {
  const { data, error } = await supabase
    .from("commissions")
    .insert({ month, amount: amount.toString() })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create commission: ${error.message}`);
  }

  return mapCommission(data);
}

// Update a commission
async function updateCommission(id: string, month: string, amount: number): Promise<Commission> {
  const { data, error } = await supabase
    .from("commissions")
    .update({ month, amount: amount.toString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update commission: ${error.message}`);
  }

  return mapCommission(data);
}

// Delete a commission
async function deleteCommission(id: string): Promise<void> {
  const { error } = await supabase.from("commissions").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete commission: ${error.message}`);
  }
}

export function useCommissions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["commissions"],
    queryFn: fetchCommissions,
  });

  const createMutation = useMutation({
    mutationFn: ({ month, amount }: { month: string; amount: number }) =>
      createCommission(month, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, month, amount }: { id: string; month: string; amount: number }) =>
      updateCommission(id, month, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCommission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
  });

  // Set up realtime listener for commissions
  useEffect(() => {
    const channel = supabase
      .channel("commissions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commissions",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["commissions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate total commissions
  const totalCommissions = query.data?.reduce((sum, commission) => sum + commission.amount, 0) || 0;

  return {
    commissions: query.data || [],
    totalCommissions,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createCommission: createMutation.mutateAsync,
    updateCommission: (id: string, month: string, amount: number) =>
      updateMutation.mutateAsync({ id, month, amount }),
    deleteCommission: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

