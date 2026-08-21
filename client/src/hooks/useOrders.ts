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
  /** Référence catalogue commandée. Sans elle, la réception ne sait pas quel stock alimenter. */
  productId?: string;
  quantity: number;
  /** Le prix TOTAL payé. Le coût unitaire s'en déduit : total ÷ quantité. */
  totalPrice?: number;
  /** Non nul = commande déjà réceptionnée. Garde-fou contre le double stock. */
  receivedLotId?: string;
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
    productId: row.product_id ?? undefined,
    quantity: Number(row.quantity),
    totalPrice: row.total_price !== null && row.total_price !== undefined
      ? Number(row.total_price)
      : undefined,
    status: row.status as OrderStatus,
    priority: row.priority as OrderPriority,
    requestedBy: row.requested_by ?? undefined,
    supplier: row.supplier ?? undefined,
    linkedClientId: row.linked_client_id ?? undefined,
    dueDate: row.due_date ?? undefined,
    notes: row.notes ?? undefined,
    receivedLotId: row.received_lot_id ?? undefined,
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
      product_id: payload.productId ?? null,
      quantity: payload.quantity,
      total_price: payload.totalPrice ?? null,
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
  if (payload.productId !== undefined) updateData.product_id = payload.productId || null;
  if (payload.quantity !== undefined) updateData.quantity = payload.quantity;
  if (payload.totalPrice !== undefined) {
    updateData.total_price = payload.totalPrice ?? null;
  }
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

/**
 * Réception d'une commande.
 *
 * C'est le point d'entrée du matériel : le lot est créé avec son coût
 * unitaire (total ÷ quantité), les machines sont numérotées, le stock monte.
 * La fonction Postgres est idempotente — re-glisser une carte dans « Reçu »
 * ne crée pas un second lot.
 */
async function receiveOrder(orderId: string) {
  const { data, error } = await supabase.rpc("receive_order", {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Annule une réception. Refusée si une machine du lot a déjà quitté le stock. */
async function unreceiveOrder(orderId: string) {
  const { error } = await supabase.rpc("unreceive_order", {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
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

  // La réception touche les lots, les unités, le stock et la vue consolidée :
  // tout doit être rafraîchi ensemble.
  const invalidateHardware = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["hardware_summary"] });
    queryClient.invalidateQueries({ queryKey: ["hardware_lots"] });
    queryClient.invalidateQueries({ queryKey: ["hardware_units"] });
    queryClient.invalidateQueries({ queryKey: ["available_hardware_units"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const receiveMutation = useMutation({
    mutationFn: receiveOrder,
    onSuccess: invalidateHardware,
  });

  const unreceiveMutation = useMutation({
    mutationFn: unreceiveOrder,
    onSuccess: invalidateHardware,
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
    receiveOrder: receiveMutation.mutateAsync,
    unreceiveOrder: unreceiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isReceiving: receiveMutation.isPending,
  };
}
