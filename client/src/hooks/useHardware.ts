import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Suivi du matériel à l'unité.
 *
 * Trois niveaux : la référence catalogue (`products`), le lot d'acquisition
 * qui porte le coût réel, et l'unité physique qui porte son numéro
 * d'inventaire — celui qu'on colle sur la machine.
 */

export type UnitStatus = "en_stock" | "chez_client" | "vendu" | "sav" | "hs";

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  en_stock: "En stock",
  chez_client: "Chez client",
  vendu: "Vendu",
  sav: "SAV",
  hs: "Hors service",
};

/** Une ligne de la vue consolidée : ce qu'on possède par référence. */
export interface HardwareSummaryRow {
  product_id: string;
  code: string;
  name: string;
  category_id: string | null;
  tracked_by_unit: boolean;
  asset_prefix: string | null;
  quantity_total: number;
  quantity_in_stock: number;
  quantity_deployed: number;
  quantity_sold: number;
  quantity_out_of_service: number;
  lot_count: number;
  last_received_at: string | null;
  /** Null tant qu'aucun lot n'a été saisi pour cette référence. */
  unit_cost_min: number | null;
  unit_cost_max: number | null;
  unit_cost_avg: number;
  total_invested: number;
}

export interface HardwareLot {
  id: string;
  product_id: string;
  order_id: string | null;
  supplier: string | null;
  quantity: number;
  unit_cost: number;
  received_at: string;
  reference: string | null;
  notes: string | null;
  created_at?: string;
}

export interface HardwareUnit {
  id: string;
  product_id: string;
  lot_id: string;
  asset_tag: string;
  serial_number: string | null;
  status: UnitStatus;
  client_id: string | null;
  deployed_at: string | null;
  sale_price: number | null;
  sold_at: string | null;
  notes: string | null;
  /** Coût du lot d'origine, joint à la lecture — c'est tout l'intérêt. */
  unit_cost?: number;
  received_at?: string;
}

const num = (v: unknown, fallback: number | null = null) =>
  v === null || v === undefined ? fallback : parseFloat(String(v));

function mapSummary(row: any): HardwareSummaryRow {
  return {
    product_id: row.product_id,
    code: row.code,
    name: row.name,
    category_id: row.category_id ?? null,
    tracked_by_unit: !!row.tracked_by_unit,
    asset_prefix: row.asset_prefix ?? null,
    quantity_total: Number(row.quantity_total) || 0,
    quantity_in_stock: Number(row.quantity_in_stock) || 0,
    quantity_deployed: Number(row.quantity_deployed) || 0,
    quantity_sold: Number(row.quantity_sold) || 0,
    quantity_out_of_service: Number(row.quantity_out_of_service) || 0,
    lot_count: Number(row.lot_count) || 0,
    last_received_at: row.last_received_at ?? null,
    unit_cost_min: num(row.unit_cost_min),
    unit_cost_max: num(row.unit_cost_max),
    unit_cost_avg: num(row.unit_cost_avg, 0) as number,
    total_invested: num(row.total_invested, 0) as number,
  };
}

function mapLot(row: any): HardwareLot {
  return {
    id: row.id,
    product_id: row.product_id,
    order_id: row.order_id ?? null,
    supplier: row.supplier ?? null,
    quantity: Number(row.quantity) || 0,
    unit_cost: num(row.unit_cost, 0) as number,
    received_at: row.received_at,
    reference: row.reference ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
  };
}

function mapUnit(row: any): HardwareUnit {
  return {
    id: row.id,
    product_id: row.product_id,
    lot_id: row.lot_id,
    asset_tag: row.asset_tag,
    serial_number: row.serial_number ?? null,
    status: (row.status || "en_stock") as UnitStatus,
    client_id: row.client_id ?? null,
    deployed_at: row.deployed_at ?? null,
    sale_price: num(row.sale_price),
    sold_at: row.sold_at ?? null,
    notes: row.notes ?? null,
    unit_cost: num(row.hardware_lots?.unit_cost, undefined as any) ?? undefined,
    received_at: row.hardware_lots?.received_at ?? undefined,
  };
}

/**
 * La vue consolidée de Hardware Total.
 *
 * Tant que la migration `0001_hardware_tracking.sql` n'a pas été appliquée,
 * la vue n'existe pas : on le signale explicitement plutôt que de laisser
 * une page vide sans explication.
 */
export function useHardwareSummary() {
  const query = useQuery({
    queryKey: ["hardware_summary"],
    queryFn: async (): Promise<HardwareSummaryRow[]> => {
      const { data, error } = await supabase
        .from("hardware_summary")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []).map(mapSummary);
    },
    retry: false,
  });

  const message = query.error instanceof Error ? query.error.message : "";
  const migrationMissing =
    !!query.error &&
    /hardware_summary|does not exist|schema cache|relation/i.test(message);

  return {
    summary: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    migrationMissing,
  };
}

/** Les lots d'une référence, du plus récent au plus ancien. */
export function useHardwareLots(productId?: string) {
  const query = useQuery({
    queryKey: ["hardware_lots", productId],
    enabled: !!productId,
    queryFn: async (): Promise<HardwareLot[]> => {
      const { data, error } = await supabase
        .from("hardware_lots")
        .select("*")
        .eq("product_id", productId!)
        .order("received_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map(mapLot);
    },
  });

  return { lots: query.data ?? [], isLoading: query.isLoading };
}

/** Les unités d'une référence, avec le coût de leur lot. */
export function useHardwareUnits(productId?: string) {
  const query = useQuery({
    queryKey: ["hardware_units", productId],
    enabled: !!productId,
    queryFn: async (): Promise<HardwareUnit[]> => {
      const { data, error } = await supabase
        .from("hardware_units")
        .select("*, hardware_lots(unit_cost, received_at)")
        .eq("product_id", productId!)
        .order("asset_tag", { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []).map(mapUnit);
    },
  });

  return { units: query.data ?? [], isLoading: query.isLoading };
}

export interface ReceiveLotInput {
  productId: string;
  quantity: number;
  unitCost: number;
  supplier?: string;
  orderId?: string;
  receivedAt?: string;
  reference?: string;
  notes?: string;
}

/**
 * Réception d'un lot.
 *
 * Le lot et ses unités numérotées sont créés par une seule fonction Postgres,
 * dans une seule transaction : on ne peut pas se retrouver avec un lot sans
 * ses étiquettes, ni avec deux machines portant le même numéro.
 */
export function useReceiveLot() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: ReceiveLotInput) => {
      const { data, error } = await supabase.rpc("receive_hardware_lot", {
        p_product_id: input.productId,
        p_quantity: input.quantity,
        p_unit_cost: input.unitCost,
        p_supplier: input.supplier || null,
        p_order_id: input.orderId || null,
        p_received_at: input.receivedAt || new Date().toISOString().slice(0, 10),
        p_reference: input.reference || null,
        p_notes: input.notes || null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["hardware_summary"] });
      queryClient.invalidateQueries({ queryKey: ["hardware_lots", input.productId] });
      queryClient.invalidateQueries({ queryKey: ["hardware_units", input.productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    receiveLot: mutation.mutateAsync,
    isReceiving: mutation.isPending,
  };
}

export interface UpdateUnitInput {
  id: string;
  productId: string;
  status?: UnitStatus;
  serial_number?: string | null;
  client_id?: string | null;
  deployed_at?: string | null;
  sale_price?: number | null;
  sold_at?: string | null;
  notes?: string | null;
}

/** Mise à jour d'une unité : changement de statut, n° de série, prix de vente. */
export function useUpdateUnit() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, productId, ...patch }: UpdateUnitInput) => {
      const { error } = await supabase
        .from("hardware_units")
        .update(patch)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id, productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ["hardware_summary"] });
      queryClient.invalidateQueries({ queryKey: ["hardware_units", productId] });
    },
  });

  return {
    updateUnit: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// Affectation aux clients
//
// Deux bornes identiques n'ont pas coûté pareil. Quand on installe chez un
// client où il faut être compétitif, on choisit CELLE à 950 € — et on veut
// retrouver ensuite le coût exact de cette installation, pas une moyenne.
// ---------------------------------------------------------------------------

/** Une machine en stock, avec le coût de son lot. */
export interface AvailableUnit {
  id: string;
  product_id: string;
  lot_id: string;
  asset_tag: string;
  serial_number: string | null;
  product_code: string;
  product_name: string;
  unit_cost: number;
  received_at: string;
  supplier: string | null;
}

/** Ce que le matériel posé chez un client nous a réellement coûté. */
export interface ClientHardwareCost {
  client_id: string;
  units_count: number;
  hardware_cost_real: number;
  hardware_revenue: number;
  hardware_margin: number;
  units_sold: number;
  units_on_loan: number;
}

function mapAvailable(row: any): AvailableUnit {
  return {
    id: row.id,
    product_id: row.product_id,
    lot_id: row.lot_id,
    asset_tag: row.asset_tag,
    serial_number: row.serial_number ?? null,
    product_code: row.product_code,
    product_name: row.product_name,
    unit_cost: num(row.unit_cost, 0) as number,
    received_at: row.received_at,
    supplier: row.supplier ?? null,
  };
}

/**
 * Les machines disponibles, la moins chère en premier.
 *
 * L'ordre n'est pas cosmétique : c'est le geste métier. La première ligne est
 * celle qu'on propose quand il faut serrer le prix.
 */
export function useAvailableUnits(productId?: string) {
  const query = useQuery({
    queryKey: ["available_hardware_units", productId ?? "all"],
    queryFn: async (): Promise<AvailableUnit[]> => {
      let request = supabase
        .from("available_hardware_units")
        .select("*")
        .order("unit_cost", { ascending: true });
      if (productId) request = request.eq("product_id", productId);

      const { data, error } = await request;
      if (error) throw new Error(error.message);
      return (data || []).map(mapAvailable);
    },
    retry: false,
  });

  return { available: query.data ?? [], isLoading: query.isLoading };
}

/** Les machines posées chez un client, avec le coût de leur lot. */
export function useClientUnits(clientId?: string) {
  const query = useQuery({
    queryKey: ["client_hardware_units", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<HardwareUnit[]> => {
      const { data, error } = await supabase
        .from("hardware_units")
        .select("*, hardware_lots(unit_cost, received_at)")
        .eq("client_id", clientId!)
        .order("asset_tag", { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []).map(mapUnit);
    },
    retry: false,
  });

  const units = query.data ?? [];

  // Le coût réel de l'installation : la somme des coûts de lot des machines
  // effectivement posées, jamais une moyenne.
  const costReal = units.reduce((sum, u) => sum + (u.unit_cost ?? 0), 0);
  const revenue = units.reduce((sum, u) => sum + (u.sale_price ?? 0), 0);

  return {
    units,
    costReal,
    revenue,
    margin: revenue - costReal,
    isLoading: query.isLoading,
  };
}

export interface AssignUnitsInput {
  unitIds: string[];
  clientId: string;
  /** 'vendu' quand la machine devient au client, 'chez_client' si elle reste à nous. */
  mode: "vendu" | "chez_client";
  salePrice?: number | null;
  date?: string;
}

/** Affecter des machines précises à un client, et libérer une machine reprise. */
export function useAssignUnits() {
  const queryClient = useQueryClient();

  const invalidate = (clientId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["available_hardware_units"] });
    queryClient.invalidateQueries({ queryKey: ["hardware_summary"] });
    queryClient.invalidateQueries({ queryKey: ["hardware_units"] });
    queryClient.invalidateQueries({ queryKey: ["client_hardware_units", clientId] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const assign = useMutation({
    mutationFn: async (input: AssignUnitsInput) => {
      const { data, error } = await supabase.rpc("assign_hardware_units", {
        p_unit_ids: input.unitIds,
        p_client_id: input.clientId,
        p_mode: input.mode,
        p_sale_price: input.salePrice ?? null,
        p_date: input.date || new Date().toISOString().slice(0, 10),
      });
      if (error) throw new Error(error.message);
      return data as number;
    },
    onSuccess: (_d, input) => invalidate(input.clientId),
  });

  const release = useMutation({
    mutationFn: async ({ unitId }: { unitId: string; clientId?: string }) => {
      const { error } = await supabase.rpc("release_hardware_unit", {
        p_unit_id: unitId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => invalidate(vars.clientId),
  });

  return {
    assignUnits: assign.mutateAsync,
    isAssigning: assign.isPending,
    releaseUnit: release.mutateAsync,
    isReleasing: release.isPending,
  };
}
