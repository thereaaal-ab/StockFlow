import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddHardwareDialog } from "@/components/AddHardwareDialog";
import { BulkImportProductsDialog } from "@/components/BulkImportProductsDialog";
import { ReceiveLotDialog } from "@/components/ReceiveLotDialog";
import { ProductHardwareSheet } from "@/components/ProductHardwareSheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, PackagePlus, AlertTriangle } from "lucide-react";
import { formatCurrencyFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  useHardwareSummary,
  type HardwareSummaryRow,
} from "@/hooks/useHardware";

/**
 * Hardware Total — tout le matériel qui est entré, consolidé par référence.
 *
 * La question à laquelle la page doit répondre : qu'est-ce qu'on possède,
 * combien il en reste, et combien ça nous a réellement coûté. Le coût vient
 * des lots d'acquisition, pas d'un prix unique sur la fiche produit : quand
 * un lot est monté de 1000 à 1200 € à cause du fret, les deux prix coexistent
 * et la fourchette est affichée telle quelle.
 */
export default function HardwareTotal() {
  const [searchTerm, setSearchTerm] = useState("");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selected, setSelected] = useState<HardwareSummaryRow | null>(null);

  const { summary, isLoading, migrationMissing, error } = useHardwareSummary();

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return summary;
    return summary.filter(
      (r) =>
        r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [summary, searchTerm]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          invested: acc.invested + r.total_invested,
          units: acc.units + r.quantity_total,
          inStock: acc.inStock + r.quantity_in_stock,
        }),
        { invested: 0, units: 0, inStock: 0 }
      ),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-heading" data-testid="text-page-title">
            Hardware Total
          </h1>
          <p className="mt-1 text-muted-foreground">
            Tout le matériel entré, avec son coût de revient réel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setReceiveOpen(true)}
            data-testid="button-receive-lot-global"
          >
            <PackagePlus />
            Réceptionner un lot
          </Button>
          <BulkImportProductsDialog />
          <AddHardwareDialog />
        </div>
      </div>

      {/* Tant que la migration n'est pas passée, on le dit franchement plutôt
          que d'afficher une page vide sans explication. */}
      {migrationMissing && (
        <div className="flex items-start gap-3 rounded-xl border border-[color:var(--ro-feedback-warning-bd)] bg-[color:var(--ro-feedback-warning-bg)] px-5 py-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[color:var(--ro-feedback-warning-fg)]" />
          <div className="min-w-0">
            <p className="font-bold text-[color:var(--ro-feedback-warning-fg)]">
              Le suivi du matériel n&apos;est pas encore installé
            </p>
            <p className="mt-1 text-sm text-[color:var(--ro-feedback-warning-fg)]">
              Exécutez <span className="ro-data font-bold">
                migrations/0001_hardware_tracking.sql
              </span>{" "}
              dans l&apos;éditeur SQL Supabase pour créer les lots et les unités.
            </p>
          </div>
        </div>
      )}

      {error && !migrationMissing && (
        <div className="rounded-xl border border-[color:var(--ro-feedback-error-bd)] bg-[color:var(--ro-feedback-error-bg)] px-5 py-4 text-sm text-[color:var(--ro-feedback-error-fg)]">
          {error.message}
        </div>
      )}

      {!migrationMissing && (
      <div className="relative max-w-sm flex-1">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par code ou nom…"
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search"
        />
      </div>
      )}

      {/* Migration absente : l'avertissement suffit, un « aucune référence »
          par-dessus laisserait croire que le catalogue est vide. */}
      {migrationMissing ? null : isLoading ? (
        <div className="ro-overline py-8 text-center text-[11px]">
          Chargement du matériel
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-card-border bg-card px-6 py-12 text-center">
          <p className="font-bold">Aucune référence</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez du matériel, puis réceptionnez un lot pour lui donner un
            coût réel.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-card-border bg-card shadow-card">
            <div className="max-h-[min(70vh,720px)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">En stock</TableHead>
                    <TableHead className="text-right">Déployé</TableHead>
                    <TableHead className="text-right">Coût unitaire</TableHead>
                    <TableHead className="text-right">Investi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const spread =
                      r.unit_cost_min !== null &&
                      r.unit_cost_max !== null &&
                      r.unit_cost_min !== r.unit_cost_max;

                    return (
                      <TableRow
                        key={r.product_id}
                        className="cursor-pointer"
                        onClick={() => setSelected(r)}
                        data-testid={`row-hardware-${r.code}`}
                      >
                        <TableCell>
                          <span className="code-pill">{r.code}</span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.name}
                          {r.tracked_by_unit && (
                            <span className="ml-2 ro-data text-[10px] text-mint-600 dark:text-mint-400">
                              suivi à l&apos;unité
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="ro-data text-right font-bold">
                          {r.quantity_total}
                        </TableCell>
                        <TableCell className="ro-data text-right">
                          {r.quantity_in_stock}
                        </TableCell>
                        <TableCell className="ro-data text-right">
                          {r.quantity_deployed || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "ro-data font-bold",
                              spread && "text-[color:var(--ro-text-brand-safe)]"
                            )}
                          >
                            {formatCurrencyFull(r.unit_cost_avg)}
                          </span>
                          {/* Deux lots au même prix ne méritent pas une
                              fourchette ; deux lots différents, si. */}
                          {spread && (
                            <span className="ro-data block text-[10px] text-muted-foreground">
                              {formatCurrencyFull(r.unit_cost_min!)} –{" "}
                              {formatCurrencyFull(r.unit_cost_max!)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="ro-data text-right">
                          {formatCurrencyFull(r.total_invested)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>
              {rows.length} référence{rows.length > 1 ? "s" : ""} ·{" "}
              <span className="ro-data font-bold text-foreground">
                {totals.units}
              </span>{" "}
              unités dont{" "}
              <span className="ro-data font-bold text-foreground">
                {totals.inStock}
              </span>{" "}
              en stock
            </div>
            <div>
              Investissement total :{" "}
              <span className="ro-data font-bold text-foreground">
                {formatCurrencyFull(totals.invested)}
              </span>
            </div>
          </div>
        </>
      )}

      <ReceiveLotDialog open={receiveOpen} onOpenChange={setReceiveOpen} />
      <ProductHardwareSheet
        row={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
