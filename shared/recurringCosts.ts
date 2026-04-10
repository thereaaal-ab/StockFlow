/**
 * Recurring financial overhead: monthly normalization and summary math.
 * Single source of truth for UI and API validation — do not duplicate formulas elsewhere.
 */

import { z } from "zod";

/** Default category options (custom values allowed at runtime). */
export const RECURRING_COST_DEFAULT_CATEGORIES = [
  "Accounting",
  "Rent / Location",
  "Office",
  "Hardware",
  "Software",
  "Salaries / Freelancers",
  "Insurance",
  "Utilities",
  "Marketing",
  "Transport",
  "Miscellaneous",
] as const;

export const recurringFrequencySchema = z.enum([
  "monthly",
  "quarterly",
  "semi_annual",
  "yearly",
]);

export type RecurringFrequency = z.infer<typeof recurringFrequencySchema>;

export const recurringEntryTypeSchema = z.enum([
  "expense",
  "income_adjustment",
]);

export type RecurringEntryType = z.infer<typeof recurringEntryTypeSchema>;

/** Serialized row from API / DB */
export interface RecurringFinancialEntry {
  id: string;
  name: string;
  category: string;
  type: RecurringEntryType;
  frequency: RecurringFrequency;
  /** Always stored as a positive decimal amount (> 0). */
  amount: number;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringSummary {
  /** Sum of monthly equivalents for active expense rows. */
  totalMonthlyExpenses: number;
  /** Sum of monthly equivalents for active income_adjustment rows. */
  totalMonthlyPositiveAdjustments: number;
  /**
   * totalPositiveAdjustments - totalMonthlyExpenses.
   * Often negative when overhead dominates.
   */
  netMonthlyOverhead: number;
  /** baseProfit + netMonthlyOverhead, only when baseProfit is provided. */
  profitAfterOverhead?: number;
}

/** Response shape for recurring-costs UI (Supabase or legacy API). */
export interface RecurringCostsResponse {
  entries: RecurringFinancialEntry[];
  summary: RecurringSummary;
  canMutate: boolean;
}

const FREQUENCY_DIVISORS: Record<RecurringFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  yearly: 12,
};

/**
 * Round to a fixed number of fraction digits to limit floating-point drift.
 */
function roundToFraction(value: number, fractionDigits: number): number {
  const factor = 10 ** fractionDigits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Normalizes a positive amount to its monthly equivalent per business rules.
 */
export function getMonthlyEquivalent(
  amount: number,
  frequency: RecurringFrequency,
): number {
  const divisor = FREQUENCY_DIVISORS[frequency];
  return roundToFraction(amount / divisor, 6);
}

/**
 * Aggregates active entries only. Inactive rows are excluded from all totals.
 */
export function computeSummary(
  entries: RecurringFinancialEntry[],
  baseProfit?: number,
): RecurringSummary {
  const active = entries.filter((e) => e.is_active);

  let totalExpenses = 0;
  let totalPositive = 0;

  for (const e of active) {
    const monthly = getMonthlyEquivalent(e.amount, e.frequency);
    if (e.type === "expense") {
      totalExpenses += monthly;
    } else {
      totalPositive += monthly;
    }
  }

  totalExpenses = roundToFraction(totalExpenses, 6);
  totalPositive = roundToFraction(totalPositive, 6);
  const netMonthlyOverhead = roundToFraction(
    totalPositive - totalExpenses,
    6,
  );

  const summary: RecurringSummary = {
    totalMonthlyExpenses: totalExpenses,
    totalMonthlyPositiveAdjustments: totalPositive,
    netMonthlyOverhead,
  };

  if (baseProfit !== undefined && Number.isFinite(baseProfit)) {
    summary.profitAfterOverhead = roundToFraction(
      baseProfit + netMonthlyOverhead,
      6,
    );
  }

  return summary;
}

export const createRecurringEntryBodySchema = z.object({
  name: z.string().min(1, "Name is required").max(500),
  category: z.string().min(1, "Category is required").max(200),
  type: recurringEntryTypeSchema,
  frequency: recurringFrequencySchema,
  amount: z.coerce
    .number({ invalid_type_error: "Amount is required" })
    .finite()
    .gt(0, "Amount must be greater than 0"),
  description: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updateRecurringEntryBodySchema = z
  .object({
    name: z.string().min(1).max(500).optional(),
    category: z.string().min(1).max(200).optional(),
    type: recurringEntryTypeSchema.optional(),
    frequency: recurringFrequencySchema.optional(),
    amount: z.coerce.number().finite().gt(0, "Amount must be greater than 0").optional(),
    description: z.string().max(2000).optional().nullable(),
    is_active: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field is required to update",
  });

export type CreateRecurringEntryBody = z.infer<
  typeof createRecurringEntryBodySchema
>;
export type UpdateRecurringEntryBody = z.infer<
  typeof updateRecurringEntryBodySchema
>;

/** Map a Supabase/Postgres row to `RecurringFinancialEntry` (shared by client and server). */
export function mapRecurringFinancialRowFromDb(row: {
  id: string;
  name: string;
  category: string;
  type: string;
  frequency: string;
  amount: unknown;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}): RecurringFinancialEntry {
  const amount =
    typeof row.amount === "string"
      ? parseFloat(row.amount)
      : Number(row.amount);

  const toIso = (v: string | Date) =>
    typeof v === "string" ? v : v.toISOString();

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    type: recurringEntryTypeSchema.parse(row.type),
    frequency: recurringFrequencySchema.parse(row.frequency),
    amount,
    description: row.description ?? null,
    is_active: row.is_active,
    created_by: row.created_by ?? null,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}
