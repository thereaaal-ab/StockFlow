import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  numeric,
  integer,
  timestamp,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(0), // Keep for backward compatibility
  hardware_total: integer("hardware_total").notNull().default(0), // Original quantity, never changes automatically
  stock_actuel: integer("stock_actuel").notNull().default(0), // Current available stock, decreases when clients receive products
  purchase_price: numeric("purchase_price", { precision: 10, scale: 2 }).notNull(),
  selling_price: numeric("selling_price", { precision: 10, scale: 2 }).notNull(),
  rent_price: numeric("rent_price", { precision: 10, scale: 2 }).notNull().default("0"),
  // Vrai pour une borne ou un POS (on colle un ID dessus), faux pour un câble.
  tracked_by_unit: boolean("tracked_by_unit").notNull().default(false),
  // Préfixe des numéros d'inventaire : BRN -> BRN-0042.
  asset_prefix: varchar("asset_prefix", { length: 8 }),
  // Dernier numéro attribué, incrémenté sous verrou par receive_hardware_lot().
  unit_counter: integer("unit_counter").notNull().default(0),
  profit: numeric("profit", { precision: 10, scale: 2 }).notNull().default("0"),
  total_value: numeric("total_value", { precision: 10, scale: 2 }).notNull().default("0"),
  category_id: varchar("category_id"), // Foreign key to categories table
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(products).pick({
  code: true,
  name: true,
  quantity: true,
  purchase_price: true,
  selling_price: true,
  tracked_by_unit: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const recurringFinancialEntries = pgTable("recurring_financial_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  /** expense | income_adjustment */
  type: varchar("type", { length: 32 }).notNull(),
  /** monthly | quarterly | semi_annual | yearly | one_shot */
  frequency: varchar("frequency", { length: 32 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 4 }).notNull(),
  description: text("description"),
  is_active: boolean("is_active").notNull().default(true),
  // Achat destiné à la revente : ce n'est pas une charge fixe, donc exclu
  // du fond de roulement par défaut.
  is_resale: boolean("is_resale").notNull().default(false),
  created_by: varchar("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type RecurringFinancialEntryRow =
  typeof recurringFinancialEntries.$inferSelect;

// ---------------------------------------------------------------------------
// Suivi du matériel à l'unité
//
// Le coût est une propriété de l'ACHAT, pas de la référence : recevoir 3
// bornes à 1200 € après en avoir acheté 10 à 1000 € ne doit pas réécrire le
// coût des dix premières. Il descend donc sur le lot, et chaque machine
// physique remonte à son lot.
// ---------------------------------------------------------------------------

/** Une réception de matériel à un coût donné. Le coût unitaire est figé. */
export const hardwareLots = pgTable("hardware_lots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  product_id: varchar("product_id").notNull(),
  // La commande qui a fait entrer le lot, si elle existe dans le kanban.
  order_id: varchar("order_id"),
  supplier: text("supplier"),
  quantity: integer("quantity").notNull(),
  // Coût de revient réel d'une unité, transport et douane inclus.
  unit_cost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  received_at: date("received_at").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

/** Une machine physique. Son coût se lit sur son lot, son prix de vente sur elle. */
export const hardwareUnits = pgTable("hardware_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  product_id: varchar("product_id").notNull(),
  lot_id: varchar("lot_id").notNull(),
  /** Le numéro imprimé et collé sur la machine (ex. BRN-0042). */
  asset_tag: varchar("asset_tag", { length: 32 }).notNull().unique(),
  serial_number: text("serial_number"),
  status: varchar("status", { length: 20 }).notNull().default("en_stock"),
  client_id: varchar("client_id"),
  deployed_at: date("deployed_at"),
  /** Le prix réel de la vente, saisi au moment où elle se fait. */
  sale_price: numeric("sale_price", { precision: 12, scale: 2 }),
  sold_at: date("sold_at"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type HardwareLot = typeof hardwareLots.$inferSelect;
export type HardwareUnit = typeof hardwareUnits.$inferSelect;
