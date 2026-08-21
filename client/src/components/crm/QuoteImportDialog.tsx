import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, AlertTriangle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { usePipelineClients } from "@/hooks/usePipelineClients";
import { extractPdfText } from "@/lib/quotePdfExtract";
import {
  parseQuoteText,
  matchProduct,
  normalizeLabel,
  type ParsedQuote,
} from "@/lib/quotePdfParser";
import {
  useQuoteAliases,
  useImportQuote,
  QUOTE_BLOCK_LABELS,
  type QuoteBlock,
} from "@/hooks/useQuotes";

/**
 * Total HT d'une ligne lue du PDF, remise appliquée.
 *
 * Même formule que `lineTotal` côté devis, mais sur la forme rendue par
 * l'analyseur, dont les champs sont nommés en camelCase.
 */
function parsedLineTotal(l: {
  quantity: number;
  unitPrice: number;
  discountPct: number;
}): number {
  return l.quantity * l.unitPrice * (1 - l.discountPct / 100);
}

const BLOCKS: QuoteBlock[] = ["initial", "equipment", "monthly"];

/** Ce que l'utilisateur décide pour chaque ligne lue. */
interface Decision {
  productId: string | null;
  /** true = « c'est une ligne de service, ne me le redemande plus ». */
  isService: boolean;
  via: string;
}

interface QuoteImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Import d'un devis PDF.
 *
 * L'analyseur propose, cet écran dispose. Rien n'est enregistré tant que les
 * lignes n'ont pas été vues : un PDF mal lu qui créerait directement un
 * client, ce sont des chiffres faux que personne ne verrait passer.
 */
export function QuoteImportDialog({
  open,
  onOpenChange,
}: QuoteImportDialogProps) {
  const { toast } = useToast();
  const { products } = useProducts();
  const { clients: prospects, createClient } = usePipelineClients();
  const { aliases, rememberAlias } = useQuoteAliases();
  const { importQuote, isImporting } = useImportQuote();

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedQuote | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [prospectId, setProspectId] = useState<string>("");
  const [isReading, setIsReading] = useState(false);

  const reset = () => {
    setParsed(null);
    setDecisions({});
    setFileName(null);
    setProspectId("");
  };

  const handleFile = async (file: File) => {
    setIsReading(true);
    try {
      const text = await extractPdfText(file);
      const result = parseQuoteText(text);

      // Rapprochement automatique, ligne par ligne.
      const next: Record<number, Decision> = {};
      result.lines.forEach((line, i) => {
        const m = matchProduct(line.description, products, aliases);
        next[i] = {
          productId: m?.productId ?? null,
          isService: normalizeLabel(line.description) in aliases && !m,
          via: m?.via ?? "",
        };
      });

      setParsed(result);
      setDecisions(next);
      setFileName(file.name);

      // Le prospect qui porte déjà ce nom, s'il existe.
      const existing = prospects.find(
        (p) =>
          normalizeLabel(p.company || p.name) ===
          normalizeLabel(result.clientName || "")
      );
      if (existing) setProspectId(existing.id);
    } catch (error: any) {
      toast({
        title: "Lecture impossible",
        description: error?.message || "Ce PDF n'a pas pu être lu.",
        variant: "destructive",
      });
    } finally {
      setIsReading(false);
    }
  };

  const unresolved = useMemo(() => {
    if (!parsed) return 0;
    return parsed.lines.filter(
      (_l, i) => !decisions[i]?.productId && !decisions[i]?.isService
    ).length;
  }, [parsed, decisions]);

  // Le taux belge par défaut : le PDF ne l'imprime pas en clair, seul le
  // montant de TVA apparaît. On garde 21 % et on le montre.
  const VAT_RATE = 21;

  const totals = useMemo(() => {
    if (!parsed) return { initial: 0, equipment: 0, monthly: 0 };
    const sum = (b: QuoteBlock) =>
      parsed.lines
        .filter((l) => l.block === b)
        .reduce((s, l) => s + parsedLineTotal(l), 0);
    return { initial: sum("initial"), equipment: sum("equipment"), monthly: sum("monthly") };
  }, [parsed]);

  const handleImport = async () => {
    if (!parsed) return;

    try {
      // Le prospect : celui choisi, ou créé à la volée depuis le devis.
      let target = prospectId;
      if (!target) {
        const created = await createClient({
          name: parsed.clientName || "Client sans nom",
          company: parsed.clientName || undefined,
          status: "offre",
          needs: `Devis ${parsed.quoteNumber ?? ""} importé`.trim(),
        });
        target = created.id;
      }

      // On retient les choix faits à la main : ils ne seront plus redemandés.
      for (let i = 0; i < parsed.lines.length; i++) {
        const d = decisions[i];
        const label = parsed.lines[i].description;
        const norm = normalizeLabel(label);
        if (d?.via === "alias") continue;
        if (d?.productId || d?.isService) {
          await rememberAlias({
            normalized: norm,
            label,
            productId: d.isService ? null : d.productId,
          });
        }
      }

      const { replaced } = await importQuote({
        crmClientId: target,
        quoteNumber: parsed.quoteNumber,
        clientName: parsed.clientName || "Client sans nom",
        mode: parsed.mode,
        issuedOn: parsed.issuedOn,
        validUntil: parsed.validUntil,
        sourceFile: fileName,
        lines: parsed.lines.map((l, i) => ({
          block: l.block,
          description: l.description,
          productId: decisions[i]?.isService ? null : decisions[i]?.productId ?? null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          discountNote: l.discountNote,
        })),
      });

      toast({
        title: replaced ? "Devis mis à jour" : "Devis importé",
        description: replaced
          ? `${parsed.quoteNumber} existait déjà : ses lignes ont été remplacées.`
          : `${parsed.lines.length} lignes lues. Choisissez maintenant les machines.`,
      });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Import impossible",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importer un devis</DialogTitle>
          <DialogDescription>
            Déposez le PDF. Il est lu sur votre machine — rien n&apos;est envoyé
            ailleurs. Vérifiez les lignes avant d&apos;enregistrer.
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div
            className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-6 py-14 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            <Upload className="size-8 text-muted-foreground" />
            <p className="mt-4 font-bold">
              {isReading ? "Lecture du PDF…" : "Déposez le devis ici"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ou choisissez un fichier
            </p>
            <Button
              variant="outline"
              className="mt-5"
              disabled={isReading}
              onClick={() => fileRef.current?.click()}
              data-testid="button-pick-pdf"
            >
              <FileText />
              Choisir un PDF
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {parsed.quoteNumber && (
                <span className="code-pill">{parsed.quoteNumber}</span>
              )}
              <Badge variant="outline">{parsed.mode}</Badge>
              <span className="text-sm font-bold">{parsed.clientName}</span>
              {parsed.issuedOn && (
                <span className="ro-data text-xs text-muted-foreground">
                  émis le {parsed.issuedOn}
                  {parsed.validUntil ? ` · valable jusqu'au ${parsed.validUntil}` : ""}
                </span>
              )}
            </div>

            {/* Ce que l'analyseur n'a pas su lire, dit franchement. */}
            {parsed.warnings.length > 0 && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[color:var(--ro-feedback-warning-bd)] bg-[color:var(--ro-feedback-warning-bg)] px-5 py-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[color:var(--ro-feedback-warning-fg)]" />
                <ul className="space-y-1 text-sm text-[color:var(--ro-feedback-warning-fg)]">
                  {parsed.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 grid gap-2">
              <label className="ro-overline text-[10px]">Prospect</label>
              <Select value={prospectId} onValueChange={setProspectId}>
                <SelectTrigger data-testid="select-import-prospect">
                  <SelectValue
                    placeholder={`Créer « ${parsed.clientName} » dans le pipeline`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {prospects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.company || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {BLOCKS.map((block) => {
              const rows = parsed.lines
                .map((l, i) => ({ line: l, index: i }))
                .filter(({ line }) => line.block === block);
              if (rows.length === 0) return null;

              return (
                <section key={block} className="mt-6">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="ro-overline text-[11px]">
                      {QUOTE_BLOCK_LABELS[block]}
                    </h3>
                    <div className="text-right">
                      <span className="ro-figure text-base">
                        {formatCurrencyFull(totals[block])}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          HT{block === "monthly" ? " /mois" : ""}
                        </span>
                      </span>
                      <div className="ro-data text-xs text-muted-foreground">
                        {formatCurrencyFull(totals[block] * (1 + VAT_RATE / 100))} TTC
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 overflow-hidden rounded-xl border border-card-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ligne lue</TableHead>
                          <TableHead className="text-right">Qté</TableHead>
                          <TableHead className="text-right">PU HT</TableHead>
                          <TableHead className="text-right">Total HT</TableHead>
                          <TableHead className="text-right">TTC</TableHead>
                          <TableHead className="w-[280px]">Référence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map(({ line, index }) => {
                          const d = decisions[index];
                          const resolved = !!d?.productId || !!d?.isService;

                          return (
                            <TableRow
                              key={index}
                              className={cn(!resolved && "bg-[color:var(--ro-feedback-warning-bg)]")}
                            >
                              <TableCell className="font-medium">
                                {line.description}
                                {line.discountPct > 0 && (
                                  <span className="ro-data ml-2 text-[10px] text-muted-foreground">
                                    −{line.discountPct}%
                                    {line.discountNote ? ` · ${line.discountNote}` : ""}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="ro-data text-right">
                                {line.quantity}
                              </TableCell>
                              <TableCell className="ro-data text-right">
                                {formatCurrencyFull(line.unitPrice)}
                              </TableCell>
                              <TableCell className="ro-data text-right font-bold">
                                {formatCurrencyFull(parsedLineTotal(line))}
                              </TableCell>
                              <TableCell className="ro-data text-right text-muted-foreground">
                                {formatCurrencyFull(parsedLineTotal(line) * (1 + VAT_RATE / 100))}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={
                                    d?.isService
                                      ? "__service__"
                                      : d?.productId ?? ""
                                  }
                                  onValueChange={(v) =>
                                    setDecisions((prev) => ({
                                      ...prev,
                                      [index]: {
                                        productId: v === "__service__" ? null : v,
                                        isService: v === "__service__",
                                        via: "manuel",
                                      },
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="À rapprocher" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__service__">
                                      Ligne de service — aucune référence
                                    </SelectItem>
                                    {products.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.code}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {d?.via && d.via !== "manuel" && (
                                  <span className="ro-data mt-1 block text-[10px] text-mint-600 dark:text-mint-400">
                                    trouvé par {d.via}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              );
            })}
          </>
        )}

        {parsed && (
          <DialogFooter className="mt-6 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {unresolved === 0 ? (
                <span className="font-bold text-status-success">
                  {parsed.lines.length} lignes rapprochées.
                </span>
              ) : (
                <span className="font-bold text-[color:var(--ro-feedback-warning-fg)]">
                  {unresolved} ligne{unresolved > 1 ? "s" : ""} sans référence.
                </span>
              )}{" "}
              Vos choix seront mémorisés.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                Changer de fichier
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                data-testid="button-confirm-import"
              >
                {isImporting ? "Enregistrement…" : "Enregistrer le devis"}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
