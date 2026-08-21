import { Fragment, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle, Check, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { UnitPicker } from "@/components/UnitPicker";
import {
  useQuote,
  useAcceptQuote,
  lineTotal,
  QUOTE_BLOCK_LABELS,
  QUOTE_BLOCK_HINTS,
  QUOTE_STATUS_LABELS,
  type QuoteBlock,
  type QuoteLine,
} from "@/hooks/useQuotes";
import type { PipelineClient } from "@/hooks/usePipelineClients";

const BLOCKS: QuoteBlock[] = ["initial", "equipment", "monthly"];

interface QuoteEditorProps {
  prospect: PipelineClient | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Le devis d'un prospect.
 *
 * Trois blocs, comme le document Rushorder. Les lignes de service n'ont pas
 * de référence catalogue ; celles qui en ont une ouvrent le choix des
 * machines — c'est là qu'on décide de donner la borne à 950 € plutôt que
 * celle à 1000 €.
 *
 * À l'acceptation, le devis devient un client : on connaît alors ce qu'on a
 * encaissé ET ce que les machines nous ont coûté, donc quand le retour sur
 * investissement tombe.
 */
export function QuoteEditor({ prospect, onOpenChange }: QuoteEditorProps) {
  const { toast } = useToast();
  const { products } = useProducts();
  const {
    quote,
    lines,
    totals,
    isLoading,
    migrationMissing,
    createQuote,
    addLine,
    deleteLine,
    reserveUnits,
    setStatus,
    isMutating,
  } = useQuote(prospect?.id);
  const { acceptQuote, isAccepting } = useAcceptQuote();

  const [openBlock, setOpenBlock] = useState<QuoteBlock | null>(null);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    description: "",
    productId: "",
    quantity: "1",
    unitPrice: "",
    discountPct: "0",
    discountNote: "",
  });

  if (!prospect) return null;

  const vatRate = quote?.vat_rate ?? 21;
  const isLocked = quote?.status === "accepte";

  const resetDraft = () =>
    setDraft({
      description: "",
      productId: "",
      quantity: "1",
      unitPrice: "",
      discountPct: "0",
      discountNote: "",
    });

  const handleAddLine = async (block: QuoteBlock) => {
    if (!quote) return;
    const quantity = parseInt(draft.quantity) || 1;
    const unitPrice = parseFloat(draft.unitPrice.replace(",", ".")) || 0;
    if (!draft.description.trim()) return;

    try {
      await addLine({
        quoteId: quote.id,
        block,
        description: draft.description.trim(),
        productId: draft.productId || null,
        quantity,
        unitPrice,
        discountPct: parseFloat(draft.discountPct.replace(",", ".")) || 0,
        discountNote: draft.discountNote.trim() || null,
        position: lines.filter((l) => l.block === block).length,
      });
      resetDraft();
      setOpenBlock(null);
    } catch (error: any) {
      toast({
        title: "Ligne non ajoutée",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

  const handleAccept = async () => {
    if (!quote) return;
    try {
      await acceptQuote({ quote, lines });
      toast({
        title: "Devis accepté",
        description: `${quote.client_name} est maintenant client. Le matériel réservé lui est affecté.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Conversion impossible",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

  /** Une ligne ouvre le choix des machines si sa référence est suivie à l'unité. */
  const isTracked = (line: QuoteLine) =>
    !!line.product_id &&
    !!products.find((p) => p.id === line.product_id)?.tracked_by_unit;

  return (
    <Sheet open={!!prospect} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="text-left">
          <div className="ro-overline text-[10px]">Devis</div>
          <SheetTitle className="text-2xl">{prospect.name}</SheetTitle>
          <SheetDescription>
            {prospect.company || "Sans société"} · montants hors taxes, TVA{" "}
            {vatRate} % appliquée à l&apos;affichage
          </SheetDescription>
        </SheetHeader>

        {migrationMissing ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[color:var(--ro-feedback-warning-bd)] bg-[color:var(--ro-feedback-warning-bg)] px-5 py-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[color:var(--ro-feedback-warning-fg)]" />
            <div>
              <p className="font-bold text-[color:var(--ro-feedback-warning-fg)]">
                Les devis ne sont pas encore installés
              </p>
              <p className="mt-1 text-sm text-[color:var(--ro-feedback-warning-fg)]">
                Exécutez{" "}
                <span className="ro-data font-bold">
                  migrations/0005_quotes.sql
                </span>{" "}
                dans l&apos;éditeur SQL Supabase.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <p className="ro-overline mt-8 text-center text-[11px]">Chargement</p>
        ) : !quote ? (
          <div className="mt-8 rounded-xl border border-card-border bg-card px-6 py-10 text-center">
            <p className="font-bold">Aucun devis pour ce prospect</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez-en un pour saisir ce qu&apos;il paie et choisir son matériel.
            </p>
            <Button
              className="mt-5"
              disabled={isMutating}
              onClick={() =>
                createQuote({
                  crmClientId: prospect.id,
                  clientName: prospect.company || prospect.name,
                  contact: prospect.name,
                })
              }
              data-testid="button-create-quote"
            >
              <Plus />
              Créer le devis
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  quote.status === "accepte" && "ro-badge-success",
                  quote.status === "refuse" && "ro-badge-error",
                  quote.status === "envoye" && "ro-badge-info"
                )}
              >
                {QUOTE_STATUS_LABELS[quote.status]}
              </Badge>
              <Badge variant="outline">{quote.mode}</Badge>
              {quote.quote_number && (
                <span className="code-pill">{quote.quote_number}</span>
              )}
            </div>

            {/* Les trois blocs du devis. */}
            {BLOCKS.map((block) => {
              const blockLines = lines.filter((l) => l.block === block);
              const blockTotal = blockLines.reduce(
                (s, l) => s + lineTotal(l),
                0
              );

              return (
                <section key={block} className="mt-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="ro-overline text-[11px]">
                        {QUOTE_BLOCK_LABELS[block]}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {QUOTE_BLOCK_HINTS[block]}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="ro-figure text-lg">
                        {formatCurrencyFull(blockTotal)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          HT{block === "monthly" ? " /mois" : ""}
                        </span>
                      </span>
                      <div className="ro-data text-xs text-muted-foreground">
                        {formatCurrencyFull(blockTotal * (1 + vatRate / 100))} TTC
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl border border-card-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qté</TableHead>
                          <TableHead className="text-right">PU HT</TableHead>
                          <TableHead className="text-right">Remise</TableHead>
                          <TableHead className="text-right">Total HT</TableHead>
                          <TableHead className="text-right">Total TTC</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blockLines.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center text-sm text-muted-foreground"
                            >
                              Aucune ligne
                            </TableCell>
                          </TableRow>
                        )}
                        {blockLines.map((line) => {
                          const tracked = isTracked(line);
                          const missing =
                            tracked && line.unit_ids.length < line.quantity;

                          return (
                            <Fragment key={line.id}>
                              <TableRow>
                                <TableCell className="font-medium">
                                  {line.description}
                                  {line.discount_note && (
                                    <span className="ro-data ml-2 text-[10px] text-muted-foreground">
                                      {line.discount_note}
                                    </span>
                                  )}
                                  {tracked && (
                                    <span
                                      className={cn(
                                        "ro-data ml-2 text-[10px] font-bold",
                                        missing
                                          ? "text-[color:var(--ro-feedback-warning-fg)]"
                                          : "text-mint-600 dark:text-mint-400"
                                      )}
                                    >
                                      {line.unit_ids.length}/{line.quantity}{" "}
                                      machine{line.quantity > 1 ? "s" : ""}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="ro-data text-right">
                                  {line.quantity}
                                </TableCell>
                                <TableCell className="ro-data text-right">
                                  {formatCurrencyFull(line.unit_price)}
                                </TableCell>
                                <TableCell className="ro-data text-right">
                                  {line.discount_pct > 0
                                    ? `−${line.discount_pct}%`
                                    : "—"}
                                </TableCell>
                                <TableCell className="ro-data text-right font-bold">
                                  {formatCurrencyFull(lineTotal(line))}
                                </TableCell>
                                <TableCell className="ro-data text-right text-muted-foreground">
                                  {formatCurrencyFull(lineTotal(line) * (1 + vatRate / 100))}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1">
                                    {tracked && !isLocked && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        title="Choisir les machines"
                                        onClick={() =>
                                          setExpandedLine(
                                            expandedLine === line.id
                                              ? null
                                              : line.id
                                          )
                                        }
                                        data-testid={`button-pick-units-${line.id}`}
                                      >
                                        <Cpu />
                                      </Button>
                                    )}
                                    {!isLocked && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => deleteLine(line.id)}
                                        disabled={isMutating}
                                      >
                                        <Trash2 />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Le choix des machines, sous sa ligne. */}
                              {expandedLine === line.id && line.product_id && (
                                <TableRow>
                                  <TableCell colSpan={7} className="bg-muted">
                                    <UnitPicker
                                      productId={line.product_id}
                                      reserved={line.units}
                                      value={line.unit_ids}
                                      onChange={(ids) =>
                                        reserveUnits({
                                          lineId: line.id,
                                          unitIds: ids,
                                        })
                                      }
                                      disabled={isMutating || isLocked}
                                    />
                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                      Les machines cochées sont réservées : elles
                                      sortent du stock disponible sans être
                                      encore livrées.
                                    </p>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Le formulaire d'ajout, replié par défaut. */}
                  {!isLocked &&
                    (openBlock === block ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-card-border bg-card p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Référence catalogue</Label>
                            <Select
                              value={draft.productId}
                              onValueChange={(v) => {
                                const p = products.find((x) => x.id === v);
                                setDraft((d) => ({
                                  ...d,
                                  productId: v,
                                  description: p ? p.name : d.description,
                                }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Aucune — ligne de service" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.code} — {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Description</Label>
                            <Input
                              value={draft.description}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Création du Menu"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="grid gap-2">
                            <Label>Qté</Label>
                            <Input
                              type="number"
                              min="1"
                              value={draft.quantity}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  quantity: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>
                              PU HT{block === "monthly" ? " /mois" : ""}
                            </Label>
                            <Input
                              inputMode="decimal"
                              value={draft.unitPrice}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  unitPrice: e.target.value,
                                }))
                              }
                              placeholder="162"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Remise %</Label>
                            <Input
                              inputMode="decimal"
                              value={draft.discountPct}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  discountPct: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Durée remise</Label>
                            <Input
                              value={draft.discountNote}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  discountNote: e.target.value,
                                }))
                              }
                              placeholder="12 mois"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              resetDraft();
                              setOpenBlock(null);
                            }}
                          >
                            Annuler
                          </Button>
                          <Button
                            onClick={() => handleAddLine(block)}
                            disabled={isMutating || !draft.description.trim()}
                          >
                            Ajouter la ligne
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          resetDraft();
                          setOpenBlock(block);
                        }}
                        data-testid={`button-add-line-${block}`}
                      >
                        <Plus />
                        Ajouter une ligne
                      </Button>
                    ))}
                </section>
              );
            })}

            {/* Le récapitulatif, dans l'ordre du document Rushorder. */}
            <section className="mt-10 rounded-xl border border-card-border bg-card p-5">
              <h3 className="ro-overline text-[11px]">Récapitulatif</h3>
              <div className="mt-4 space-y-2 text-sm">
                {[
                  ["Paiement initial (unique)", totals.initial],
                  ["Achat de l'équipement (unique)", totals.equipment],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="ro-data font-bold">
                      {formatCurrencyFull(value as number)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-dashed border-border pt-2">
                  <span className="font-bold">Total unique HT</span>
                  <span className="ro-figure text-base">
                    {formatCurrencyFull(totals.oneShot)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    TVA {vatRate} %
                  </span>
                  <span className="ro-data">
                    {formatCurrencyFull(totals.oneShot * (vatRate / 100))}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Total unique TTC</span>
                  <span className="ro-data font-bold">
                    {formatCurrencyFull(totals.oneShot * (1 + vatRate / 100))}
                  </span>
                </div>

                <div className="flex justify-between gap-3 border-t border-dashed border-border pt-3">
                  <span className="font-bold">Total mensuel HT</span>
                  <span className="ro-figure text-base">
                    {formatCurrencyFull(totals.monthly)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Total mensuel TTC
                  </span>
                  <span className="ro-data font-bold">
                    {formatCurrencyFull(totals.monthly * (1 + vatRate / 100))}
                  </span>
                </div>
              </div>
            </section>

            {/* L'acceptation : le devis devient client. */}
            <section className="mt-5 mb-10 flex flex-wrap items-center justify-between gap-3">
              {!isLocked ? (
                <>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setStatus({ quoteId: quote.id, status: "envoye" })
                      }
                      disabled={isMutating || quote.status === "envoye"}
                    >
                      Marquer envoyé
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setStatus({ quoteId: quote.id, status: "refuse" })
                      }
                      disabled={isMutating}
                    >
                      Refusé
                    </Button>
                  </div>
                  <Button
                    onClick={handleAccept}
                    disabled={isAccepting || lines.length === 0}
                    data-testid="button-accept-quote"
                  >
                    <Check />
                    {isAccepting ? "Conversion…" : "Accepter et créer le client"}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Devis accepté : le client existe et le matériel réservé lui a
                  été affecté. Son retour sur investissement est visible sur sa
                  fiche.
                </p>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
