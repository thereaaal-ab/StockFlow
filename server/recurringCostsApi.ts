import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { recurringFinancialEntries } from "@shared/schema";
import {
  computeSummary,
  createRecurringEntryBodySchema,
  updateRecurringEntryBodySchema,
  type RecurringFinancialEntry,
  recurringFrequencySchema,
  recurringEntryTypeSchema,
} from "@shared/recurringCosts";
import { checkCanMutate } from "./authMiddleware";
import { z } from "zod";

function mapRow(row: typeof recurringFinancialEntries.$inferSelect): RecurringFinancialEntry {
  const amount =
    typeof row.amount === "string"
      ? parseFloat(row.amount)
      : Number(row.amount);

  const frequency = recurringFrequencySchema.parse(row.frequency);
  const type = recurringEntryTypeSchema.parse(row.type);

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    type,
    frequency,
    amount,
    description: row.description ?? null,
    is_active: row.is_active,
    created_by: row.created_by ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listRecurringCosts(req: Request, res: Response): Promise<void> {
  const rows = await db
    .select()
    .from(recurringFinancialEntries)
    .orderBy(desc(recurringFinancialEntries.created_at));

  const entries = rows.map(mapRow);
  const summary = computeSummary(entries);
  const canMutate = checkCanMutate(req.supabaseUser);

  res.json({ entries, summary, canMutate });
}

export async function createRecurringCost(req: Request, res: Response): Promise<void> {
  const parsed = createRecurringEntryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    res.status(400).json({
      message: "Validation failed",
      errors: msg,
    });
    return;
  }

  const body = parsed.data;
  const userId = req.supabaseUser?.id ?? null;

  const [inserted] = await db
    .insert(recurringFinancialEntries)
    .values({
      name: body.name.trim(),
      category: body.category.trim(),
      type: body.type,
      frequency: body.frequency,
      amount: body.amount.toFixed(4),
      description: body.description?.trim() || null,
      is_active: body.is_active ?? true,
      created_by: userId,
      updated_at: new Date(),
    })
    .returning();

  if (!inserted) {
    res.status(500).json({ message: "Failed to create entry" });
    return;
  }

  res.status(201).json({ entry: mapRow(inserted) });
}

const idParamSchema = z.string().uuid("Invalid id");

export async function updateRecurringCost(req: Request, res: Response): Promise<void> {
  const idResult = idParamSchema.safeParse(req.params.id);
  if (!idResult.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const id = idResult.data;

  const parsed = updateRecurringEntryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const body = parsed.data;

  const [updated] = await db
    .update(recurringFinancialEntries)
    .set({
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.category !== undefined ? { category: body.category.trim() } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.frequency !== undefined ? { frequency: body.frequency } : {}),
      ...(body.amount !== undefined ? { amount: body.amount.toFixed(4) } : {}),
      ...(body.description !== undefined
        ? { description: body.description?.trim() || null }
        : {}),
      ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
      updated_at: new Date(),
    })
    .where(eq(recurringFinancialEntries.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ message: "Entry not found" });
    return;
  }

  res.json({ entry: mapRow(updated) });
}

export async function deleteRecurringCost(req: Request, res: Response): Promise<void> {
  const idResult = idParamSchema.safeParse(req.params.id);
  if (!idResult.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const id = idResult.data;

  const removed = await db
    .delete(recurringFinancialEntries)
    .where(eq(recurringFinancialEntries.id, id))
    .returning({ id: recurringFinancialEntries.id });

  if (!removed.length) {
    res.status(404).json({ message: "Entry not found" });
    return;
  }

  res.status(204).send();
}
