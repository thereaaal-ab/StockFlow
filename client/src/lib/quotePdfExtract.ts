/**
 * Extraction du texte d'un PDF, dans le navigateur.
 *
 * Le fichier ne quitte pas la machine : pas d'envoi vers un serveur, pas de
 * clé d'API, pas de coût par document. C'est aussi ce qui rend la
 * fonctionnalité compatible avec le déploiement statique de l'application,
 * qui n'a pas de backend.
 */

/**
 * Reconstitue les lignes d'une page en respectant les colonnes.
 *
 * pdf.js rend des fragments de texte avec leur position. On regroupe par
 * ordonnée pour retrouver les lignes, puis on insère entre deux fragments un
 * nombre d'espaces proportionnel à leur écart horizontal — c'est ce qui
 * permet ensuite de distinguer les colonnes d'un tableau, exactement comme
 * le ferait `pdftotext -layout`.
 */
function itemsToLayoutText(
  items: Array<{ str: string; transform: number[]; width: number }>
): string {
  const rows = new Map<number, Array<{ x: number; str: string; w: number }>>();

  for (const item of items) {
    if (!item.str) continue;
    const x = item.transform[4];
    const y = Math.round(item.transform[5]);
    // Tolérance verticale : deux fragments à 2 points l'un de l'autre
    // appartiennent à la même ligne visuelle.
    let key = y;
    for (const existing of Array.from(rows.keys())) {
      if (Math.abs(existing - y) <= 2) {
        key = existing;
        break;
      }
    }
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key)!.push({ x, str: item.str, w: item.width });
  }

  // Largeur moyenne d'un caractère, pour convertir les points en espaces.
  const CHAR_WIDTH = 5;

  return Array.from(rows.entries())
    .sort((a, b) => b[0] - a[0]) // de haut en bas
    .map(([, frags]) => {
      frags.sort((a, b) => a.x - b.x);
      let line = "";
      let cursor = 0;
      for (const f of frags) {
        const col = Math.round(f.x / CHAR_WIDTH);
        if (col > cursor) line += " ".repeat(col - cursor);
        line += f.str;
        cursor = col + f.str.length;
      }
      return line.trimEnd();
    })
    .join("\n");
}

/**
 * Rend le texte d'un PDF, une page par bloc séparé par un saut de page.
 *
 * Le séparateur `\f` est celui qu'attend l'analyseur pour isoler la page
 * portant le numéro de devis.
 */
export async function extractPdfText(file: File): Promise<string> {
  // Import différé : pdf.js pèse lourd, on ne le charge que si un PDF est
  // effectivement déposé.
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(itemsToLayoutText(content.items as any));
  }

  await doc.destroy();
  return pages.join("\f");
}
