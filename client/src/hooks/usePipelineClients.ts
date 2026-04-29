import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const CLIENT_STATUSES = [
  "prospect",
  "offre",
  "negociation",
  "valide",
  "refuse",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export type PipelineClient = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  needs: string;
  estimatedValue?: number;
  createdAt: string;
  updatedAt: string;
};

type ClientPayload = Omit<PipelineClient, "id" | "createdAt" | "updatedAt">;

const QUERY_KEY = ["pipeline-clients"];

function mapRow(row: Record<string, any>): PipelineClient {
  return {
    id: row.id,
    name: row.name,
    company: row.company ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    status: row.status as ClientStatus,
    needs: row.needs,
    estimatedValue:
      row.estimated_value !== null ? Number(row.estimated_value) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchClients(): Promise<PipelineClient[]> {
  const { data, error } = await supabase
    .from("crm_clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Impossible de charger les clients CRM: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

async function createClient(payload: ClientPayload): Promise<PipelineClient> {
  const { data, error } = await supabase
    .from("crm_clients")
    .insert({
      name: payload.name,
      company: payload.company ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      status: payload.status,
      needs: payload.needs,
      estimated_value: payload.estimatedValue ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Impossible de creer le client CRM: ${error.message}`);
  }

  return mapRow(data);
}

async function updateClient(
  id: string,
  payload: Partial<ClientPayload>
): Promise<PipelineClient> {
  const updateData: Record<string, any> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.company !== undefined) updateData.company = payload.company || null;
  if (payload.email !== undefined) updateData.email = payload.email || null;
  if (payload.phone !== undefined) updateData.phone = payload.phone || null;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.needs !== undefined) updateData.needs = payload.needs;
  if (payload.estimatedValue !== undefined) {
    updateData.estimated_value = payload.estimatedValue ?? null;
  }

  const { data, error } = await supabase
    .from("crm_clients")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Impossible de modifier le client CRM: ${error.message}`);
  }

  return mapRow(data);
}

async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("crm_clients").delete().eq("id", id);

  if (error) {
    throw new Error(`Impossible de supprimer le client CRM: ${error.message}`);
  }
}

export function usePipelineClients() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchClients,
  });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ClientPayload> }) =>
      updateClient(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  useEffect(() => {
    const channel = supabase
      .channel("crm-clients-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_clients" },
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
    clients: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createClient: createMutation.mutateAsync,
    updateClient: (id: string, payload: Partial<ClientPayload>) =>
      updateMutation.mutateAsync({ id, payload }),
    deleteClient: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
