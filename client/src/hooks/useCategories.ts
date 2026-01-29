import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export interface Category {
  id: string;
  name: string;
  created_at?: string;
}

// Convert Supabase category to our Category type
function mapCategory(category: any): Category {
  return {
    id: category.id,
    name: category.name,
    created_at: category.created_at,
  };
}

// Fetch all categories
async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data || []).map(mapCategory);
}

// Create a category
async function createCategory(name: string): Promise<Category> {
  // Validate: no duplicates, name stored in lowercase
  const normalizedName = name.trim().toLowerCase();
  
  if (!normalizedName) {
    throw new Error("Category name cannot be empty");
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: normalizedName })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      throw new Error("A category with this name already exists");
    }
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return mapCategory(data);
}

// Update a category
async function updateCategory(id: string, name: string): Promise<Category> {
  const normalizedName = name.trim().toLowerCase();
  
  if (!normalizedName) {
    throw new Error("Category name cannot be empty");
  }

  const { data, error } = await supabase
    .from("categories")
    .update({ name: normalizedName })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A category with this name already exists");
    }
    throw new Error(`Failed to update category: ${error.message}`);
  }

  return mapCategory(data);
}

// Delete a category
async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`);
  }
}

export function useCategories() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      // Also invalidate products since they reference categories
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Set up realtime listener for categories
  useEffect(() => {
    const channel = supabase
      .channel("categories-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createCategory: createMutation.mutateAsync,
    updateCategory: (id: string, name: string) =>
      updateMutation.mutateAsync({ id, name }),
    deleteCategory: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

