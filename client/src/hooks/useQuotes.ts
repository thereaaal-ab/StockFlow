import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Devis.
 *
 * Trois blocs, chacun avec un rôle économique distinct :
 *   · initial   — encaissement unique : services et starter pack
 *   · equipment — matériel non éligible au leasing, acheté puis revendu
 *   · monthly   — licences ET matériel en leasing
 *
 * Le matériel en leasing reste NOTRE propriété : on l'a payé, on le récupère
 * sur les mensualités. C'est de là que vient le retour sur investissement.
 *
 * Tous les montants sont HORS TAXES. La TVA n'est ni un gain ni un coût.
 */

export type QuoteBlock = "initial" | "equipment" | "monthly";
export type QuoteStatus = "brouillon" | "envoye" | "accepte" | "refuse";
export type QuoteMode = "achat" | "leasing";

export const QUOTE_BLOCK_LABELS: Record<QuoteBlock, string> = {
  initial: "Paiement initial",
  equipment: "Achat de l'équipement",
  monthly: "Mensualités de paiement",
};

export const QUOTE_BLOCK_HINTS: Record<QuoteBlock, string> = {
  initial: "Services et starter pack — encaissé une seule fois.",
  equipment: "Matériel non éligible au leasing, acheté puis revendu.",
  monthly: "Licences et matériel en leasing — récurrent.",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};

export interface Quote {
  id: string;
  quote_number: string | null;
  crm_client_id: string | null;
  client_id: string | null;
  client_name: string;
  contact: string | null;
  vat_number: string | null;
  mode: QuoteMode;
  status: QuoteStatus;
  vat_rate: number;
  issued_on: string;
  valid_until: string | null;
  notes: string | null;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  block: QuoteBlock;
  position: number;
  description: string;
  product_id: string | null;
  quantity: number;
  /** Prix unitaire HORS TAXES, avant remise. */
  unit_price: number;
  discount_pct: number;
  discount_note: string | null;
  /** Machines réservées pour cette ligne, jointes à la lecture. */
  unit_ids: string[];
}

const num = (v: unknown, fallback = 0) =>
  v === null || v === undefined ? fallback : parseFloat(String(v));

function mapQuote(row: any): Quote {
  return {
    id: row.id,
    quote_number: row.quote_number ?? null,
    crm_client_id: row.crm_client_id ?? null,
    client_id: row.client_id ?? null,
    client_name: row.client_name,
    contact: row.contact ?? null,
    vat_number: row.vat_number ?? null,
    mode: (row.mode || "leasing") as QuoteMode,
    status: (row.status || "brouillon") as QuoteStatus,
    vat_rate: num(row.vat_rate, 21),
    issued_on: row.issued_on,
    valid_until: row.valid_until ?? null,
    notes: row.notes ?? null,
  };
}

function mapLine(row: any): QuoteLine {
  return {
    id: row.id,
    quote_id: row.quote_id,
    block: row.block as QuoteBlock,
    position: Number(row.position) || 0,
    description: row.description,
    product_id: row.product_id ?? null,
    quantity: Number(row.quantity) || 1,
    unit_price: num(row.unit_price),
    discount_pct: num(row.discount_pct),
    discount_note: row.discount_note ?? null,
    unit_ids: (row.quote_line_units ?? []).map((u: any) => u.unit_id),
  };
}

/** Total HT d'une ligne, remise appliquée. */
export function lineTotal(line: {
  quantity: number;
  unit_price: number;
  discount_pct: number;
}): number {
  return line.quantity * line.unit_price * (1 - line.discount_pct / 100);
}

export interface QuoteTotals {
  initial: number;
  equipment: number;
  monthly: number;
  /** Encaissé une seule fois : initial + équipement. */
  oneShot: number;
}

export function computeQuoteTotals(lines: QuoteLine[]): QuoteTotals {
  const sum = (block: QuoteBlock) =>
    lines.filter((l) => l.block === block).reduce((s, l) => s + lineTotal(l), 0);

  const initial = sum("initial");
  const equipment = sum("equipment");
  return {
    initial,
    equipment,
    monthly: sum("monthly"),
    oneShot: initial + equipment,
  };
}

/** Le devis d'un prospect, avec ses lignes et les machines réservées. */
export function useQuote(crmClientId?: string) {
  const queryClient = useQueryClient();

  const quoteQuery = useQuery({
    queryKey: ["quote", crmClientId],
    enabled: !!crmClientId,
    retry: false,
    queryFn: async (): Promise<Quote | null> => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("crm_client_id", crmClientId!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw new Error(error.message);
      return data && data.length > 0 ? mapQuote(data[0]) : null;
    },
  });

  const quoteId = quoteQuery.data?.id;

  const linesQuery = useQuery({
    queryKey: ["quote_lines", quoteId],
    enabled: !!quoteId,
    retry: false,
    queryFn: async (): Promise<QuoteLine[]> => {
      const { data, error } = await supabase
        .from("quote_lines")
        .select("*, quote_line_units(unit_id)")
        .eq("quote_id", quoteId!)
        .order("block", { ascending: true })
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []).map(mapLine);
    },
  });

  const message =
    quoteQuery.error instanceof Error ? quoteQuery.error.message : "";
  const migrationMissing =
    !!quoteQuery.error && /quotes|does not exist|schema cache/i.test(message);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["quote", crmClientId] });
    queryClient.invalidateQueries({ queryKey: ["quote_lines", quoteId] });
    queryClient.invalidateQueries({ queryKey: ["available_hardware_units"] });
    queryClient.invalidateQueries({ queryKey: ["hardware_summary"] });
  };

  const createQuote = useMutation({
    mutationFn: async (input: {
      crmClientId: string;
      clientName: string;
      contact?: string;
      mode?: QuoteMode;
    }) => {
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          crm_client_id: input.crmClientId,
          client_name: input.clientName,
          contact: input.contact || null,
          mode: input.mode || "leasing",
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapQuote(data);
    },
    onSuccess: invalidate,
  });

  const addLine = useMutation({
    mutationFn: async (input: {
      quoteId: string;
      block: QuoteBlock;
      description: string;
      productId?: string | null;
      quantity: number;
      unitPrice: number;
      discountPct?: number;
      discountNote?: string | null;
      position?: number;
    }) => {
      const { data, error } = await supabase
        .from("quote_lines")
        .insert({
          quote_id: input.quoteId,
          block: input.block,
          description: input.description,
          product_id: input.productId || null,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          discount_pct: input.discountPct ?? 0,
          discount_note: input.discountNote || null,
          position: input.position ?? 0,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteLine = useMutation({
    mutationFn: async (lineId: string) => {
      // Les machines réservées pour cette ligne repartent en stock.
      await supabase.rpc("reserve_quote_units", {
        p_line_id: lineId,
        p_unit_ids: [],
      });
      const { error } = await supabase
        .from("quote_lines")
        .delete()
        .eq("id", lineId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /**
   * Réserve des machines précises pour une ligne.
   *
   * Réserver plutôt qu'affecter : la machine sort du stock disponible sans
   * sortir du stock physique. Sans cela, on peut promettre la même borne à
   * deux prospects et s'en apercevoir à la livraison.
   */
  const reserveUnits = useMutation({
    mutationFn: async ({
      lineId,
      unitIds,
    }: {
      lineId: string;
      unitIds: string[];
    }) => {
      const { error } = await supabase.rpc("reserve_quote_units", {
        p_line_id: lineId,
        p_unit_ids: unitIds,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: async ({
      quoteId: id,
      status,
    }: {
      quoteId: string;
      status: QuoteStatus;
    }) => {
      // Un devis refusé ou remis en brouillon rend ses machines au stock.
      if (status === "refuse" || status === "brouillon") {
        await supabase.rpc("release_quote_units", { p_quote_id: id });
      }
      const { error } = await supabase
        .from("quotes")
        .update({ status })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return {
    quote: quoteQuery.data ?? null,
    lines: linesQuery.data ?? [],
    totals: computeQuoteTotals(linesQuery.data ?? []),
    isLoading: quoteQuery.isLoading || linesQuery.isLoading,
    migrationMissing,
    createQuote: createQuote.mutateAsync,
    addLine: addLine.mutateAsync,
    deleteLine: deleteLine.mutateAsync,
    reserveUnits: reserveUnits.mutateAsync,
    setStatus: setStatus.mutateAsync,
    isMutating:
      createQuote.isPending ||
      addLine.isPending ||
      deleteLine.isPending ||
      reserveUnits.isPending ||
      setStatus.isPending,
    refetch: invalidate,
  };
}

// ---------------------------------------------------------------------------
// Acceptation — le devis devient un client
// ---------------------------------------------------------------------------

/**
 * Transforme un devis accepté en client.
 *
 * Le pont entre le commercial et l'exploitation : les trois totaux du devis
 * deviennent les trois montants du client, les machines réservées lui sont
 * affectées avec leur coût de lot réel, et le prospect passe en « Validé ».
 *
 * À partir de là, la fiche client sait ce qu'on a encaissé ET ce qu'on a
 * réellement payé : le retour sur investissement se calcule tout seul.
 */
export function useAcceptQuote() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      quote,
      lines,
      contractStartDate,
    }: {
      quote: Quote;
      lines: QuoteLine[];
      contractStartDate?: string;
    }) => {
      const totals = computeQuoteTotals(lines);
      const startDate =
        contractStartDate || new Date().toISOString().slice(0, 10);

      // Les lignes rattachées à une référence deviennent les produits du
      // client. Une ligne du bloc « mensualités » est du leasing : le
      // matériel reste à nous, sa contrepartie est la mensualité.
      const now = new Date().toISOString();
      const clientProducts = lines
        .filter((l) => l.product_id)
        .map((l) => ({
          productId: l.product_id!,
          name: l.description,
          quantity: l.quantity,
          monthlyFee: l.block === "monthly" ? lineTotal(l) : 0,
          type: l.block === "monthly" ? "rent" : "buy",
          addedAt: now,
          purchasePrice: 0,
          clientPrice: l.block === "monthly" ? 0 : lineTotal(l) / l.quantity,
        }));

      const totalProductQuantity = clientProducts.reduce(
        (sum, p) => sum + p.quantity,
        0
      );

      const { data: created, error: clientError } = await supabase
        .from("clients")
        .insert({
          client_name: quote.client_name,
          product_quantity: totalProductQuantity,
          total_sold_amount: totals.oneShot,
          monthly_fee: totals.monthly,
          months_left:
            totals.monthly > 0 ? Math.ceil(totals.oneShot / totals.monthly) : 0,
          products: clientProducts,
          starter_pack_price: totals.initial,
          hardware_price: totals.equipment,
          contract_start_date: startDate,
          status: "active",
        })
        .select()
        .single();

      if (clientError) throw new Error(clientError.message);

      // Les machines réservées partent chez le client. Le bloc « mensualités »
      // est du leasing (la machine reste à nous) ; le bloc « équipement » est
      // une vente ferme.
      for (const line of lines) {
        if (line.unit_ids.length === 0) continue;
        const isLease = line.block === "monthly";
        const { error } = await supabase.rpc("assign_hardware_units", {
          p_unit_ids: line.unit_ids,
          p_client_id: created.id,
          p_mode: isLease ? "chez_client" : "vendu",
          p_sale_price: isLease ? null : lineTotal(line) / line.quantity,
          p_date: startDate,
        });
        if (error) throw new Error(error.message);
      }

      const { error: quoteError } = await supabase
        .from("quotes")
        .update({ status: "accepte", client_id: created.id })
        .eq("id", quote.id);
      if (quoteError) throw new Error(quoteError.message);

      if (quote.crm_client_id) {
        await supabase
          .from("crm_clients")
          .update({ status: "valide" })
          .eq("id", quote.crm_client_id);
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-clients"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      queryClient.invalidateQueries({ queryKey: ["hardware_summary"] });
      queryClient.invalidateQueries({ queryKey: ["available_hardware_units"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    acceptQuote: mutation.mutateAsync,
    isAccepting: mutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// Import d'un devis PDF
// ---------------------------------------------------------------------------

/** La mémoire des rapprochements faits à la main. */
export function useQuoteAliases() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["quote_line_aliases"],
    retry: false,
    queryFn: async (): Promise<Record<string, string | null>> => {
      const { data, error } = await supabase
        .from("quote_line_aliases")
        .select("normalized, product_id");
      if (error) throw new Error(error.message);
      return Object.fromEntries(
        (data || []).map((r: any) => [r.normalized, r.product_id])
      );
    },
  });

  const remember = useMutation({
    mutationFn: async (input: {
      normalized: string;
      label: string;
      productId: string | null;
    }) => {
      const { error } = await supabase.from("quote_line_aliases").upsert(
        {
          normalized: input.normalized,
          label: input.label,
          product_id: input.productId,
        },
        { onConflict: "normalized" }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["quote_line_aliases"] }),
  });

  return {
    aliases: query.data ?? {},
    rememberAlias: remember.mutateAsync,
  };
}

export interface ImportLineInput {
  block: QuoteBlock;
  description: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  discountNote: string | null;
}

export interface ImportQuoteInput {
  crmClientId: string;
  quoteNumber: string | null;
  clientName: string;
  mode: QuoteMode;
  issuedOn: string | null;
  validUntil: string | null;
  sourceFile: string | null;
  lines: ImportLineInput[];
}

/**
 * Crée le devis à partir du PDF, ou met à jour celui qui porte déjà ce numéro.
 *
 * Réimporter le même fichier est un geste normal — on corrige une remise, on
 * ajoute une ligne, on ré-exporte. Le numéro de devis sert de clé : au lieu de
 * créer un doublon, on remplace les lignes.
 *
 * Deux précautions :
 *  · un devis déjà ACCEPTÉ refuse la réimportation, parce qu'un client a été
 *    créé à partir de lui et que remplacer ses lignes le désynchroniserait ;
 *  · les machines déjà réservées sont conservées pour les lignes qui
 *    subsistent, et rendues au stock pour celles qui disparaissent.
 */
export function useImportQuote() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: ImportQuoteInput) => {
      let existing: any = null;
      if (input.quoteNumber) {
        const { data } = await supabase
          .from("quotes")
          .select("*")
          .eq("quote_number", input.quoteNumber)
          .maybeSingle();
        existing = data;
      }

      if (existing?.status === "accepte") {
        throw new Error(
          `Le devis ${input.quoteNumber} a déjà été accepté et converti en client. Il ne peut plus être réimporté.`
        );
      }

      let quoteId: string;
      let replaced = false;

      if (existing) {
        replaced = true;
        quoteId = existing.id;

        // Ce qui était réservé, ligne par ligne, avant de tout remplacer.
        const { data: oldLines } = await supabase
          .from("quote_lines")
          .select("description, block, quote_line_units(unit_id)")
          .eq("quote_id", quoteId);

        const previous = new Map<string, string[]>();
        for (const l of oldLines || []) {
          const ids = ((l as any).quote_line_units || []).map(
            (u: any) => u.unit_id
          );
          if (ids.length) previous.set(`${l.block}|${l.description}`, ids);
        }

        // Les réservations partent avec les lignes ; on les rétablira sur
        // les lignes qui reviennent à l'identique.
        await supabase.rpc("release_quote_units", { p_quote_id: quoteId });
        await supabase.from("quote_lines").delete().eq("quote_id", quoteId);

        await supabase
          .from("quotes")
          .update({
            client_name: input.clientName,
            mode: input.mode,
            issued_on: input.issuedOn || existing.issued_on,
            valid_until: input.validUntil,
            source_file: input.sourceFile,
          })
          .eq("id", quoteId);

        await insertLines(quoteId, input.lines, previous);
      } else {
        const { data: created, error } = await supabase
          .from("quotes")
          .insert({
            crm_client_id: input.crmClientId,
            quote_number: input.quoteNumber,
            client_name: input.clientName,
            mode: input.mode,
            issued_on: input.issuedOn || new Date().toISOString().slice(0, 10),
            valid_until: input.validUntil,
            source_file: input.sourceFile,
          })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        quoteId = created.id;
        await insertLines(quoteId, input.lines);
      }

      return { quoteId, replaced };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      queryClient.invalidateQueries({ queryKey: ["quote_lines"] });
      queryClient.invalidateQueries({ queryKey: ["available_hardware_units"] });
      queryClient.invalidateQueries({ queryKey: ["hardware_summary"] });
    },
  });

  return {
    importQuote: mutation.mutateAsync,
    isImporting: mutation.isPending,
  };
}

/** Insère les lignes et rétablit les réservations des lignes inchangées. */
async function insertLines(
  quoteId: string,
  lines: ImportLineInput[],
  previous?: Map<string, string[]>
) {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const { data, error } = await supabase
      .from("quote_lines")
      .insert({
        quote_id: quoteId,
        block: l.block,
        description: l.description,
        product_id: l.productId,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        discount_pct: l.discountPct,
        discount_note: l.discountNote,
        position: i,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const kept = previous?.get(`${l.block}|${l.description}`);
    if (kept?.length) {
      // Jamais plus de machines que la nouvelle quantité : si la ligne est
      // passée de 3 à 2, la troisième retourne au stock.
      await supabase.rpc("reserve_quote_units", {
        p_line_id: data.id,
        p_unit_ids: kept.slice(0, l.quantity),
      });
    }
  }
}
