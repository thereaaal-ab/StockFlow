import { formatCurrencyFull, formatCurrencyCompact } from "@/lib/utils";

/**
 * TVA belge.
 *
 * Toute la comptabilité de l'application est en HORS TAXES : une société
 * récupère la TVA, elle n'est donc ni un gain ni un coût. Mais le TVAC reste
 * le montant que le client paie et celui qui apparaît sur un relevé bancaire —
 * on l'affiche à côté pour pouvoir rapprocher, jamais pour calculer.
 */
export const VAT_RATE = 21;

/** Ajoute la TVA à un montant hors taxes. */
export function toTTC(ht: number, rate: number = VAT_RATE): number {
  return ht * (1 + rate / 100);
}

/** Retire la TVA d'un montant TTC. */
export function toHT(ttc: number, rate: number = VAT_RATE): number {
  return ttc / (1 + rate / 100);
}

/** « 925,64 € TTC » — la mention destinée à accompagner un montant HT. */
export function formatTTC(ht: number, rate: number = VAT_RATE): string {
  return `${formatCurrencyFull(toTTC(ht, rate))} TTC`;
}

/** Version courte, pour les tuiles où la place manque. */
export function formatTTCCompact(ht: number, rate: number = VAT_RATE): string {
  return `${formatCurrencyCompact(toTTC(ht, rate))} TTC`;
}
