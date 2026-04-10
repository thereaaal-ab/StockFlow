import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { canMutateRecurringCosts } from "@/lib/recurringCostsAccess";
import {
  computeSummary,
  createRecurringEntryBodySchema,
  mapRecurringFinancialRowFromDb,
  type CreateRecurringEntryBody,
  type RecurringCostsResponse,
  type RecurringFinancialEntry,
  type UpdateRecurringEntryBody,
} from "@shared/recurringCosts";

/** Bump this if the data source changes (e.g. API → Supabase) so React Query does not reuse stale errors. */
const RECURRING_COSTS_QUERY_KEY = ["recurring-costs", "supabase"] as const;

async function fetchRecurringCosts(): Promise<RecurringCostsResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("recurring_financial_entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const msg = error.message ?? "";
    if (
      msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      error.code === "42P01"
    ) {
      throw new Error(
        "Table « recurring_financial_entries » introuvable. Exécutez la section SQL correspondante dans database_schema.sql (éditeur SQL Supabase).",
      );
    }
    throw new Error(msg);
  }

  const entries = (data ?? []).map((row) =>
    mapRecurringFinancialRowFromDb(
      row as Parameters<typeof mapRecurringFinancialRowFromDb>[0],
    ),
  );
  const summary = computeSummary(entries);
  const canMutate = canMutateRecurringCosts(user);
  return { entries, summary, canMutate };
}

export function useRecurringCosts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: RECURRING_COSTS_QUERY_KEY,
    queryFn: fetchRecurringCosts,
  });

  const createMutation = useMutation({
    mutationFn: async (body: CreateRecurringEntryBody) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!canMutateRecurringCosts(user)) {
        throw new Error("Droits administrateur requis.");
      }
      const parsed = createRecurringEntryBodySchema.parse(body);
      const { data, error } = await supabase
        .from("recurring_financial_entries")
        .insert({
          name: parsed.name.trim(),
          category: parsed.category.trim(),
          type: parsed.type,
          frequency: parsed.frequency,
          amount: parsed.amount,
          description: parsed.description?.trim() ?? null,
          is_active: parsed.is_active ?? true,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return {
        entry: mapRecurringFinancialRowFromDb(
          data as Parameters<typeof mapRecurringFinancialRowFromDb>[0],
        ),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_COSTS_QUERY_KEY });
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!canMutateRecurringCosts(user)) {
        throw new Error("Droits administrateur requis.");
      }

      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = body.name.trim();
      if (body.category !== undefined) patch.category = body.category.trim();
      if (body.type !== undefined) patch.type = body.type;
      if (body.frequency !== undefined) patch.frequency = body.frequency;
      if (body.amount !== undefined) patch.amount = body.amount;
      if (body.description !== undefined) {
        patch.description = body.description?.trim() || null;
      }
      if (body.is_active !== undefined) patch.is_active = body.is_active;
      patch.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("recurring_financial_entries")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return {
        entry: mapRecurringFinancialRowFromDb(
          data as Parameters<typeof mapRecurringFinancialRowFromDb>[0],
        ),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_COSTS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!canMutateRecurringCosts(user)) {
        throw new Error("Droits administrateur requis.");
      }
      const { error } = await supabase
        .from("recurring_financial_entries")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_COSTS_QUERY_KEY });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("recurring-financial-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recurring_financial_entries",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: RECURRING_COSTS_QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
