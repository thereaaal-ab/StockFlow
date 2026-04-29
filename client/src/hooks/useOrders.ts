import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const ORDER_STATUSES = [
  "a_commander",
  "commande",
  "recu",
  "annule",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PRIORITIES = ["basse", "normale", "urgente"] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export type CurrentOrder = {
  id: string;
  item: string;
  quantity: number;
  status: OrderStatus;
  priority: OrderPriority;
  requestedBy?: string;
  supplier?: string;
  linkedClientId?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
};

type OrderPayload = Omit<CurrentOrder, "id" | "createdAt">;

const QUERY_KEY = ["current-orders"];

function mapRow(row: Record<string, any>): CurrentOrder {
  return {
    id: row.id,
    item: row.item,
    quantity: Number(row.quantity),
    status: row.status as OrderStatus,
    priority: row.priority as OrderPriority,
    requestedBy: row.requested_by ?? undefined,
    supplier: row.supplier ?? undefined,
    linkedClientId: row.linked_client_id ?? undefined,
    dueDate: row.due_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

async function fetchOrders(): Promise<CurrentOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Impossible de charger les commandes: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

async function createOrder(payload: OrderPayload): Promise<CurrentOrder> {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      item: payload.item,
      quantity: payload.quantity,
      status: payload.status,
      priority: payload.priority,
      requested_by: payload.requestedBy ?? null,
      supplier: payload.supplier ?? null,
      linked_client_id: payload.linkedClientId ?? null,
      due_date: payload.dueDate ?? null,
      notes: payload.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Impossible de creer la commande: ${error.message}`);
  }

  return mapRow(data);
}

async function updateOrder(
  id: string,
  payload: Partial<OrderPayload>
): Promise<CurrentOrder> {
  const updateData: Record<string, any> = {};
  if (payload.item !== undefined) updateData.item = payload.item;
  if (payload.quantity !== undefined) updateData.quantity = payload.quantity;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.priority !== undefined) updateData.priority = payload.priority;
  if (payload.requestedBy !== undefined) {
    updateData.requested_by = payload.requestedBy || null;
  }
  if (payload.supplier !== undefined) updateData.supplier = payload.supplier || null;
  if (payload.linkedClientId !== undefined) {
    updateData.linked_client_id = payload.linkedClientId || null;
  }
  if (payload.dueDate !== undefined) updateData.due_date = payload.dueDate || null;
  if (payload.notes !== undefined) updateData.notes = payload.notes || null;

  const { data, error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Impossible de modifier la commande: ${error.message}`);
  }

  return mapRow(data);
}

export function useOrders() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchOrders,
  });

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<OrderPayload> }) =>
      updateOrder(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    orders: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createOrder: createMutation.mutateAsync,
    updateOrder: (id: string, payload: Partial<OrderPayload>) =>
      updateMutation.mutateAsync({ id, payload }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
