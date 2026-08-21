import type { QuoteBlock } from "@/hooks/useQuotes";

/**
 * Lecture d'un devis Rushorder au format PDF.
 *
 * Les devis sortent d'un gabarit : leur structure est régulière, donc un
 * analyseur déterministe est plus fiable — et gratuit — qu'un modèle de
 * langage. Tout se passe dans le navigateur : le fichier ne quitte pas la
 * machine et aucun serveur n'est nécessaire.
 *
 * Ce qui n'est PAS fait ici : décider. L'analyseur propose, l'écran de
 * vérification dispose. Un PDF mal lu qui créerait un client directement,
 * ce sont des chiffres faux que personne ne verrait passer.
 */

export interface ParsedLine {
  block: QuoteBlock;
  description: string;
  quantity: number;
  /** Prix unitaire HT avant remise. */
  unitPrice: number;
  discountPct: number;
  discountNote: string | null;
  /** Le total lu sur le PDF, pour vérifier notre propre calcul. */
  statedTotal: number | null;
}

export interface ParsedQuote {
  quoteNumber: string | null;
  clientName: string | null;
  issuedOn: string | null;
  validUntil: string | null;
  mode: "achat" | "leasing";
  lines: ParsedLine[];
  /** Sous-totaux lus sur le document, bloc par bloc. */
  statedSubtotals: Partial<Record<QuoteBlock, number>>;
  /** Ce que l'analyseur n'a pas su lire, dit franchement. */
  warnings: string[];
}

/** Les trois en-têtes de bloc du gabarit Rushorder. */
const BLOCK_HEADINGS: Array<{ re: RegExp; block: QuoteBlock }> = [
  { re: /^Paiement\s+Initial/i, block: "initial" },
  { re: /^Achat\s+de\s+l['’]\s*équipement/i, block: "equipment" },
  { re: /^Mensualités\s+de\s+paiement/i, block: "monthly" },
];

/**
 * Un montant : « 49,99 € », « 1 234,56 € », « 1.234,56 € ».
 *
 * Le séparateur de milliers est UN caractère. Autoriser une suite d'espaces
 * ferait enjamber la colonne voisine : « 1        49,99 € » deviendrait
 * 149,99 € en absorbant la quantité.
 */
const AMOUNT_RE = /(\d{1,3}(?:[ \u00A0\u202F.]\d{3})*,\d{2})\s*€/g;

/** « 1 234,56 € » → 1234.56 */
function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/ | /g, "")
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** « 11/05/2026 » → « 2026-05-11 » */
function parseDate(raw: string): string | null {
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/**
 * Découpe une ligne de tableau.
 *
 * Format attendu, colonnes séparées par des espaces multiples :
 *   Description        Qté    Prix €    Réduction    [Durée]    Total €
 *
 * On travaille à partir de la fin : le dernier montant est le total, celui
 * d'avant est le prix unitaire. C'est plus robuste que de compter les
 * colonnes depuis la gauche, où la description peut contenir n'importe quoi.
 */
function parseTableRow(line: string, block: QuoteBlock): ParsedLine | null {
  const amounts = Array.from(line.matchAll(AMOUNT_RE));
  if (amounts.length < 2) return null;

  const statedTotal = parseAmount(amounts[amounts.length - 1][1]);
  const unitPrice = parseAmount(amounts[amounts.length - 2][1]);
  if (unitPrice === null) return null;

  const head = line.slice(0, amounts[amounts.length - 2].index).trim();

  // La quantité est le dernier entier isolé avant le prix unitaire.
  const qtyMatch = Array.from(head.matchAll(/(?:^|\s)(\d{1,4})(?:\s|$)/g));
  const quantity = qtyMatch.length
    ? parseInt(qtyMatch[qtyMatch.length - 1][1], 10)
    : 1;

  const description = (
    qtyMatch.length
      ? head.slice(0, qtyMatch[qtyMatch.length - 1].index).trim()
      : head
  ).replace(/\s{2,}/g, " ");

  if (!description) return null;

  // Entre le prix unitaire et le total : la réduction, et parfois sa durée.
  const middle = line.slice(
    (amounts[amounts.length - 2].index ?? 0) +
      amounts[amounts.length - 2][0].length,
    amounts[amounts.length - 1].index
  );
  const discountMatch = middle.match(/-\s*(\d{1,3})\s*%/);
  const discountPct = discountMatch ? parseInt(discountMatch[1], 10) : 0;

  const noteMatch = middle.match(/(Permanent|\d+\s*mois)/i);
  const discountNote = noteMatch ? noteMatch[1].trim() : null;

  return {
    block,
    description,
    quantity: quantity > 0 ? quantity : 1,
    unitPrice,
    discountPct,
    discountNote,
    statedTotal,
  };
}

/** Les lignes de tableau à ignorer : totaux, en-têtes, notes de bas de page. */
const NOISE =
  /^(Description|Sous-total|TVA\b|Total\b|\*|Ce tableau|En mode leasing|Client\b|Numéro de devis|Astuce|Important|Le paiement initial|Seuls les|Ensuite, chaque mois|Le montant total)/i;

/**
 * Analyse le texte d'un devis, déjà extrait du PDF.
 *
 * Séparé de l'extraction pour être testable sans PDF : on lui donne du texte,
 * il rend une structure.
 */
export function parseQuoteText(text: string): ParsedQuote {
  const lines = text.split(/\r?\n/);
  const warnings: string[] = [];
  const parsed: ParsedLine[] = [];
  const statedSubtotals: Partial<Record<QuoteBlock, number>> = {};

  let block: QuoteBlock | null = null;

  // Les métadonnées sont lues UNIQUEMENT sur la page qui porte le numéro de
  // devis. Le document commence par une page de garde commerciale : y chercher
  // un nom ou une date ramènerait du texte marketing.
  const header =
    text.split("\f").find((page) => /Numéro\s+de\s+devis/i.test(page)) ?? "";
  const headerLines = header.split(/\r?\n/);

  const quoteNumber = header.match(/\b(Q-\d{4}-\d{4,})\b/)?.[1] ?? null;
  const dates = Array.from(header.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)).map((m) => m[1]);
  const mode = /Devis\s*-\s*Leasing/i.test(text) ? "leasing" : "achat";

  // Le nom du client est dans la colonne de gauche, sous l'étiquette
  // « Client ». On écarte les libellés d'en-tête et les phrases : un nom de
  // restaurant est court.
  let clientName: string | null = null;
  // L'étiquette « Client » partage sa ligne avec les autres en-têtes de
  // colonne : on la reconnaît en début de ligne, pas comme ligne entière.
  const clientIdx = headerLines.findIndex((l) => /^\s*Client(\s|$)/i.test(l));
  if (clientIdx >= 0) {
    for (
      let i = clientIdx + 1;
      i < Math.min(clientIdx + 6, headerLines.length);
      i++
    ) {
      const candidate = headerLines[i].trim().split(/\s{2,}/)[0];
      if (
        candidate &&
        candidate.length <= 60 &&
        !/^(TVA|Numéro|Date|Valable|devis|jusqu)/i.test(candidate)
      ) {
        clientName = candidate;
        break;
      }
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    const heading = BLOCK_HEADINGS.find((h) => h.re.test(line.trim()));
    if (heading) {
      block = heading.block;
      continue;
    }

    if (!block) continue;

    const subtotal = line.match(/Sous-total\s+([\d\s.]+,\d{2})\s*€/i);
    if (subtotal) {
      const v = parseAmount(subtotal[1]);
      if (v !== null) statedSubtotals[block] = v;
      continue;
    }

    if (NOISE.test(line.trim())) continue;

    const row = parseTableRow(line, block);
    if (row) parsed.push(row);
  }

  if (!quoteNumber) warnings.push("Numéro de devis introuvable.");
  if (!clientName) warnings.push("Nom du client introuvable.");
  if (parsed.length === 0)
    warnings.push("Aucune ligne lue — le format du PDF n'est pas reconnu.");

  // On recalcule chaque bloc et on compare au sous-total imprimé. Un écart
  // signale une ligne mal lue : mieux vaut le dire que livrer un total faux.
  for (const [b, stated] of Object.entries(statedSubtotals)) {
    const computed = parsed
      .filter((l) => l.block === b)
      .reduce(
        (s, l) => s + l.quantity * l.unitPrice * (1 - l.discountPct / 100),
        0
      );
    if (stated !== undefined && Math.abs(computed - stated) > 0.02) {
      warnings.push(
        `Bloc « ${b} » : le PDF annonce ${stated.toFixed(2)} € mais les lignes lues donnent ${computed.toFixed(2)} €.`
      );
    }
  }

  return {
    quoteNumber,
    clientName,
    issuedOn: dates[0] ? parseDate(dates[0]) : null,
    validUntil: dates[1] ? parseDate(dates[1]) : null,
    mode,
    lines: parsed,
    statedSubtotals,
    warnings,
  };
}

/** Forme de comparaison : minuscules, sans accents ni ponctuation. */
export function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export interface MatchCandidate {
  productId: string;
  code: string;
  name: string;
  /** Comment le rapprochement a été trouvé — affiché à l'utilisateur. */
  via: "alias" | "code" | "nom";
}

/**
 * Rapproche un libellé de devis d'une référence du catalogue.
 *
 * Par ordre de fiabilité décroissante : un alias déjà validé à la main, puis
 * le code entre parenthèses — « Kiosk 32 (AKSW-32) » → `KIOSK_32''_(AKSW-32)`,
 * une clé très sûre — puis le nom normalisé.
 */
export function matchProduct(
  label: string,
  products: Array<{ id: string; code: string; name: string }>,
  aliases: Record<string, string | null> = {}
): MatchCandidate | null {
  const norm = normalizeLabel(label);

  if (norm in aliases) {
    const id = aliases[norm];
    if (id === null) return null; // ligne de service assumée
    const p = products.find((x) => x.id === id);
    if (p) return { productId: p.id, code: p.code, name: p.name, via: "alias" };
  }

  const parenthetical = label.match(/\(([A-Z0-9][A-Z0-9.\-]*)\)/);
  if (parenthetical) {
    const key = normalizeLabel(parenthetical[1]);
    const p = products.find((x) => normalizeLabel(x.code).includes(key));
    if (p) return { productId: p.id, code: p.code, name: p.name, via: "code" };
  }

  const exact = products.find((x) => normalizeLabel(x.name) === norm);
  if (exact)
    return { productId: exact.id, code: exact.code, name: exact.name, via: "nom" };

  const partial = products.find(
    (x) =>
      normalizeLabel(x.name).includes(norm) || norm.includes(normalizeLabel(x.name))
  );
  if (partial)
    return {
      productId: partial.id,
      code: partial.code,
      name: partial.name,
      via: "nom",
    };

  return null;
}
