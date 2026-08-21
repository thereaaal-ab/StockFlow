import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { PackagePlus, Tag, Pencil, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  useHardwareLots,
  useHardwareUnits,
  useUpdateUnit,
  UNIT_STATUS_LABELS,
  type HardwareSummaryRow,
  type UnitStatus,
} from "@/hooks/useHardware";
import { ReceiveLotDialog } from "@/components/ReceiveLotDialog";
import { EditProductModal } from "@/components/EditProductModal";
import { UnitLabelSheet } from "@/components/UnitLabelSheet";
import { useProducts } from "@/hooks/useProducts";

const STATUS_BADGE: Record<UnitStatus, string> = {
  en_stock: "ro-badge-success",
  chez_client: "ro-badge-info",
  vendu: "ro-badge-warning",
  sav: "ro-badge-warning",
  hs: "ro-badge-error",
};

interface ProductHardwareSheetProps {
  row: HardwareSummaryRow | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Le détail d'une référence : ses lots d'acquisition et, si elle est suivie
 * à l'unité, chaque machine avec son numéro d'inventaire et le coût du lot
 * dont elle vient.
 */
export function ProductHardwareSheet({
  row,
  onOpenChange,
}: ProductHardwareSheetProps) {
  const { toast } = useToast();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const { products, updateProduct } = useProducts();
  const { lots } = useHardwareLots(row?.product_id);
  const { units } = useHardwareUnits(row?.product_id);
  const { updateUnit } = useUpdateUnit();

  if (!row) return null;

  const spread =
    row.unit_cost_min !== null &&
    row.unit_cost_max !== null &&
    row.unit_cost_min !== row.unit_cost_max;

  const handleStatusChange = async (unitId: string, status: UnitStatus) => {
    try {
      await updateUnit({ id: unitId, productId: row.product_id, status });
    } catch (error: any) {
      toast({
        title: "Mise à jour impossible",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

  /** Les étiquettes à imprimer, avec le coût pour vérification à la pose. */
  const exportTags = () => {
    const header = "numero_inventaire;produit;code;cout_unitaire;statut";
    const lines = units.map((u) =>
      [
        u.asset_tag,
        row.name,
        row.code,
        u.unit_cost ?? "",
        UNIT_STATUS_LABELS[u.status],
      ].join(";")
    );
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etiquettes-${row.code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Sheet open={!!row} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-2xl"
        >
          <SheetHeader className="text-left">
            <div className="ro-overline text-[10px]">{row.code}</div>
            <SheetTitle className="text-2xl">{row.name}</SheetTitle>
            <SheetDescription>
              {row.tracked_by_unit
                ? "Chaque machine porte son numéro d'inventaire et le coût de son lot."
                : "Référence suivie en quantité : les lots portent le coût, sans étiquette par pièce."}
            </SheetDescription>
          </SheetHeader>

          {/* Le consolidé de la référence. */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total", value: row.quantity_total },
              { label: "En stock", value: row.quantity_in_stock },
              { label: "Déployé", value: row.quantity_deployed },
              { label: "Vendu", value: row.quantity_sold },
            ].map((s) => (
              <div key={s.label} className="rounded-md bg-muted px-3 py-3">
                <div className="ro-overline text-[9px]">{s.label}</div>
                <div className="ro-figure mt-1 text-xl">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-md bg-muted px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="ro-overline text-[10px]">Coût moyen pondéré</span>
              <span className="ro-figure text-xl">
                {formatCurrencyFull(row.unit_cost_avg)}
              </span>
            </div>
            {spread && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Les lots ne valaient pas le même prix :{" "}
                <span className="ro-data font-bold text-foreground">
                  {formatCurrencyFull(row.unit_cost_min!)} –{" "}
                  {formatCurrencyFull(row.unit_cost_max!)}
                </span>
              </p>
            )}
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="ro-overline text-[10px]">Investi</span>
              <span className="ro-data text-sm font-bold text-foreground">
                {formatCurrencyFull(row.total_invested)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button onClick={() => setReceiveOpen(true)} data-testid="button-receive-lot">
              <PackagePlus />
              Réceptionner un lot
            </Button>
            {row.tracked_by_unit && units.length > 0 && (
              <>
                <Button variant="outline" onClick={() => setLabelsOpen(true)}>
                  <Printer />
                  Imprimer les étiquettes
                </Button>
                <Button variant="ghost" onClick={exportTags}>
                  <Tag />
                  Exporter en CSV
                </Button>
              </>
            )}
            {/* C'est ici qu'on active le suivi à l'unité d'une référence
                existante, ou qu'on corrige sa fiche. */}
            <Button variant="ghost" onClick={() => setEditOpen(true)}>
              <Pencil />
              Éditer la fiche
            </Button>
          </div>

          {/* Les lots : l'historique du coût, dans l'ordre d'arrivée. */}
          <section className="mt-8">
            <h3 className="ro-overline text-[11px]">Lots d&apos;acquisition</h3>
            {lots.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Aucun lot enregistré. Réceptionnez-en un pour commencer à suivre
                le coût réel de cette référence.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-card-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reçu le</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">Coût unitaire</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lots.map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell className="ro-data">{lot.received_at}</TableCell>
                        <TableCell>
                          {lot.supplier || "—"}
                          {lot.notes && (
                            <span className="block text-xs text-muted-foreground">
                              {lot.notes}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="ro-data text-right">
                          {lot.quantity}
                        </TableCell>
                        <TableCell className="ro-data text-right font-bold">
                          {formatCurrencyFull(lot.unit_cost)}
                        </TableCell>
                        <TableCell className="ro-data text-right">
                          {formatCurrencyFull(lot.unit_cost * lot.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Les machines, une par ligne. */}
          {row.tracked_by_unit && (
            <section className="mt-8 pb-10">
              <h3 className="ro-overline text-[11px]">
                Unités · {units.length}
              </h3>
              {units.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucune unité. Elles seront numérotées automatiquement à la
                  première réception.
                </p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-xl border border-card-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° inventaire</TableHead>
                        <TableHead className="text-right">Coût</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell>
                            <span className="code-pill">{unit.asset_tag}</span>
                          </TableCell>
                          <TableCell className="ro-data text-right font-bold">
                            {unit.unit_cost !== undefined
                              ? formatCurrencyFull(unit.unit_cost)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={unit.status}
                              onValueChange={(v) =>
                                handleStatusChange(unit.id, v as UnitStatus)
                              }
                            >
                              <SelectTrigger className="h-8 w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(
                                  Object.keys(UNIT_STATUS_LABELS) as UnitStatus[]
                                ).map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {UNIT_STATUS_LABELS[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          )}
        </SheetContent>
      </Sheet>

      <ReceiveLotDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        productId={row.product_id}
      />

      <UnitLabelSheet
        open={labelsOpen}
        onOpenChange={setLabelsOpen}
        productName={row.name}
        productCode={row.code}
        units={units}
      />

      <EditProductModal
        open={editOpen}
        onOpenChange={setEditOpen}
        product={products.find((p) => p.id === row.product_id) ?? null}
        onSave={async (p) => {
          await updateProduct(p);
        }}
      />
    </>
  );
}

/** Le badge d'état d'une unité, réutilisable ailleurs. */
export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  return (
    <Badge variant="outline" className={cn(STATUS_BADGE[status])}>
      {UNIT_STATUS_LABELS[status]}
    </Badge>
  );
}
