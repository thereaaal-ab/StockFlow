import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useAvailableUnits } from "@/hooks/useHardware";
import { UnitPicker } from "@/components/UnitPicker";
import { MonthPicker } from "@/components/MonthPicker";
import {
  useQuote,
  useAcceptQuote,
  lineTotal,
  QUOTE_BLOCK_LABELS,
  type QuoteLine,
} from "@/hooks/useQuotes";
import type { PipelineClient } from "@/hooks/usePipelineClients";

interface QuoteValidationSheetProps {
  prospect: PipelineClient | null;
  onOpenChange: (open: boolean) => void;
  /** Appelé quand la validation aboutit, pour rafraîchir le pipeline. */
  onValidated: () => void;
}

/**
 * Validation d'un prospect : le devis devient un client.
 *
 * C'est le moment où l'on décide QUELLE machine part. Deux bornes identiques
 * n'ont pas coûté pareil ; quand la facture est serrée pour rester compétitif,
 * on donne celle qui nous est revenue le moins cher. Cet écran met le coût
 * réel en face du montant facturé pendant qu'on choisit.
 */
export function QuoteValidationSheet({
  prospect,
  onOpenChange,
  onValidated,
}: QuoteValidationSheetProps) {
  const { toast } = useToast();
  const { products } = useProducts();
  const { available } = useAvailableUnits();
  const { quote, lines, totals, isLoading, reserveUnits, isMutating } =
    useQuote(prospect?.id);
  const { acceptQuote, isAccepting } = useAcceptQuote();

  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  /** Les lignes qui demandent une machine précise. */
  const hardwareLines = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.product_id &&
          products.find((p) => p.id === l.product_id)?.tracked_by_unit
      ),
    [lines, products]
  );

  const missing = hardwareLines.filter((l) => l.unit_ids.length < l.quantity);

  /** Ce que les machines choisies nous coûtent réellement. */
  const costReal = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + l.units.reduce((t, u) => t + u.unit_cost, 0),
        0
      ),
    [lines]
  );

  // Le matériel du bloc « mensualités » reste à nous : son retour est la
  // mensualité. Celui du bloc « équipement » est vendu ferme.
  const leaseCost = useMemo(
    () =>
      lines
        .filter((l) => l.block === "monthly")
        .reduce((s, l) => s + l.units.reduce((t, u) => t + u.unit_cost, 0), 0),
    [lines]
  );

  // Le retour anticipé doit venir APRÈS tous les hooks : React compte les
  // appels, et un retour au milieu en changerait le nombre d'un rendu à
  // l'autre.
  if (!prospect) return null;

  const soldCost = costReal - leaseCost;
  const soldRevenue = totals.equipment;
  const hardwareMargin = soldRevenue - soldCost;

  // Ce qu'il reste à couvrir une fois le one-shot encaissé, et en combien
  // de mensualités.
  const toCover = Math.max(0, costReal - totals.oneShot);
  const monthsToCover =
    totals.monthly > 0 ? Math.ceil(toCover / totals.monthly) : null;

  const handleValidate = async () => {
    if (!quote) return;
    try {
      await acceptQuote({ quote, lines, contractStartDate: startDate });
      toast({
        title: "Client créé",
        description: `${quote.client_name} · ${formatCurrencyFull(costReal)} de matériel affecté.`,
      });
      onValidated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Validation impossible",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={!!prospect} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="text-left">
          <div className="ro-overline text-[10px]">Valider le devis</div>
          <SheetTitle className="text-2xl">{prospect.name}</SheetTitle>
          <SheetDescription>
            Choisissez les machines qui partent, puis créez le client.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <p className="ro-overline mt-8 text-center text-[11px]">Chargement</p>
        ) : !quote ? (
          <div className="mt-8 rounded-xl border border-card-border bg-card px-6 py-10 text-center">
            <p className="font-bold">Aucun devis pour ce prospect</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Importez son devis PDF ou saisissez-le avant de le valider — sans
              devis, on ne sait pas ce qu&apos;il paie.
            </p>
          </div>
        ) : (
          <>
            {/* Ce que ça rapporte, et ce que ça coûte, côte à côte. */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md bg-muted px-3 py-3">
                <div className="ro-overline text-[9px]">One-shot</div>
                <div className="ro-figure mt-1 text-lg">
                  {formatCurrencyFull(totals.oneShot)}
                </div>
              </div>
              <div className="rounded-md bg-muted px-3 py-3">
                <div className="ro-overline text-[9px]">Par mois</div>
                <div className="ro-figure mt-1 text-lg">
                  {formatCurrencyFull(totals.monthly)}
                </div>
              </div>
              <div className="rounded-md bg-muted px-3 py-3">
                <div className="ro-overline text-[9px]">Nous coûte</div>
                <div className="ro-figure mt-1 text-lg">
                  {formatCurrencyFull(costReal)}
                </div>
              </div>
              <div className="rounded-md bg-muted px-3 py-3">
                <div className="ro-overline text-[9px]">Marge revente</div>
                <div
                  className={cn(
                    "ro-figure mt-1 text-lg",
                    soldCost > 0 &&
                      (hardwareMargin >= 0
                        ? "text-status-success"
                        : "text-status-error")
                  )}
                >
                  {soldCost > 0 ? formatCurrencyFull(hardwareMargin) : "—"}
                </div>
              </div>
            </div>

            {/* Le point de rentabilité, énoncé pendant qu'on choisit. */}
            <div className="mt-3 rounded-xl border border-card-border bg-card px-5 py-4">
              {costReal === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune machine choisie pour l&apos;instant : le coût réel de
                  cette installation est encore inconnu.
                </p>
              ) : toCover === 0 ? (
                <p className="text-sm">
                  <span className="ro-data font-bold text-status-success">
                    Remboursé dès le premier mois.
                  </span>{" "}
                  Le one-shot couvre déjà les {formatCurrencyFull(costReal)} de
                  matériel.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Après le one-shot, il reste{" "}
                  <span className="ro-data font-bold text-foreground">
                    {formatCurrencyFull(toCover)}
                  </span>{" "}
                  à couvrir
                  {monthsToCover !== null && (
                    <>
                      , soit{" "}
                      <span className="ro-data font-bold text-foreground">
                        {monthsToCover} mois
                      </span>{" "}
                      de mensualité
                    </>
                  )}
                  .
                </p>
              )}
            </div>

            {/* Une section par ligne matériel : on y choisit la machine. */}
            {hardwareLines.length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">
                Aucune ligne de ce devis ne demande de machine numérotée.
              </p>
            ) : (
              <section className="mt-8 space-y-5">
                <h3 className="ro-overline text-[11px]">
                  Matériel à attribuer
                </h3>
                {hardwareLines.map((line: QuoteLine) => {
                  const complete = line.unit_ids.length >= line.quantity;
                  return (
                    <div
                      key={line.id}
                      className={cn(
                        "rounded-xl border bg-card p-4",
                        complete
                          ? "border-card-border"
                          : "border-[color:var(--ro-feedback-warning-bd)]"
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <p className="font-bold">{line.description}</p>
                          <p className="ro-overline text-[9px]">
                            {QUOTE_BLOCK_LABELS[line.block]}
                            {line.block === "monthly"
                              ? " · la machine reste à nous"
                              : " · vendue au client"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              "ro-data text-sm font-bold",
                              complete
                                ? "text-mint-600 dark:text-mint-400"
                                : "text-[color:var(--ro-feedback-warning-fg)]"
                            )}
                          >
                            {line.unit_ids.length}/{line.quantity} choisie
                            {line.quantity > 1 ? "s" : ""}
                          </span>
                          <div className="ro-data text-xs text-muted-foreground">
                            facturé {formatCurrencyFull(lineTotal(line))}
                            {line.block === "monthly" ? " /mois" : ""}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <UnitPicker
                          productId={line.product_id!}
                          reserved={line.units}
                          value={line.unit_ids}
                          onChange={(ids) =>
                            reserveUnits({
                              lineId: line.id,
                              // Jamais plus que la quantité vendue.
                              unitIds: ids.slice(0, line.quantity),
                            })
                          }
                          disabled={isMutating}
                        />
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {missing.length > 0 && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-[color:var(--ro-feedback-warning-bd)] bg-[color:var(--ro-feedback-warning-bg)] px-5 py-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[color:var(--ro-feedback-warning-fg)]" />
                <p className="text-sm text-[color:var(--ro-feedback-warning-fg)]">
                  {missing.length} ligne{missing.length > 1 ? "s" : ""} sans
                  machine attribuée. Vous pouvez valider quand même — le
                  matériel manquant s&apos;attribue plus tard depuis la fiche
                  client, mais le coût réel sera incomplet en attendant.
                </p>
              </div>
            )}

            <div className="mt-6 grid max-w-xs gap-2">
              <Label htmlFor="start-date">Mois de démarrage</Label>
              <MonthPicker
                id="start-date"
                value={startDate}
                onChange={setStartDate}
              />
              <p className="text-xs text-muted-foreground">
                Reculez-le si le contrat tourne déjà : c&apos;est de ce mois que
                partent les mensualités encaissées.
              </p>
            </div>

            <div className="mt-6 mb-10 flex justify-end">
              <Button
                onClick={handleValidate}
                disabled={isAccepting}
                data-testid="button-validate-quote"
              >
                <Check />
                {isAccepting ? "Création…" : "Valider et créer le client"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
