import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  CreateRecurringEntryBody,
  RecurringFinancialEntry,
  RecurringSummary,
  UpdateRecurringEntryBody,
} from "@shared/recurringCosts";

export interface RecurringCostsResponse {
  entries: RecurringFinancialEntry[];
  summary: RecurringSummary;
  canMutate: boolean;
}

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Session expirée. Reconnectez-vous.");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

async function fetchRecurringCosts(): Promise<RecurringCostsResponse> {
  const res = await fetch("/api/settings/recurring-costs", {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || `Erreur ${res.status}`,
    );
  }
  return res.json();
}

export function useRecurringCosts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["recurring-costs"],
    queryFn: fetchRecurringCosts,
  });

  const createMutation = useMutation({
    mutationFn: async (body: CreateRecurringEntryBody) => {
      const res = await fetch("/api/settings/recurring-costs", {
        method: "POST",
        headers: {
          ...(await authHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message || "Création impossible",
        );
      }
      return res.json() as Promise<{ entry: RecurringFinancialEntry }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-costs"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateRecurringEntryBody;
    }) => {
      const res = await fetch(`/api/settings/recurring-costs/${id}`, {
        method: "PUT",
        headers: {
          ...(await authHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message || "Mise à jour impossible",
        );
      }
      return res.json() as Promise<{ entry: RecurringFinancialEntry }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-costs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/recurring-costs/${id}`, {
        method: "DELETE",
        headers: await authHeaders(),
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message || "Suppression impossible",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-costs"] });
    },
  });

  return {
    ...query,
    entries: query.data?.entries ?? [],
    summary: query.data?.summary,
    canMutate: query.data?.canMutate ?? false,
    createEntry: createMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
