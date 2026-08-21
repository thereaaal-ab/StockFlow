import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";
import { formatCurrencyFull } from "@/lib/utils";
import {
  UNIT_STATUS_LABELS,
  type HardwareUnit,
  type UnitStatus,
} from "@/hooks/useHardware";

/** Une étiquette par machine, prête à découper et à coller. */
interface UnitLabelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productCode: string;
  units: HardwareUnit[];
}

type Filter = "all" | "en_stock" | "recent";

export function UnitLabelSheet({
  open,
  onOpenChange,
  productName,
  productCode,
  units,
}: UnitLabelSheetProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [columns, setColumns] = useState("3");

  const visible = useMemo(() => {
    if (filter === "en_stock") {
      return units.filter((u) => u.status === "en_stock");
    }
    if (filter === "recent") {
      // Les étiquettes du dernier lot reçu : celles qu'il reste à coller.
      const lastLot = units
        .map((u) => u.lot_id)
        .filter(Boolean)
        .at(-1);
      return units.filter((u) => u.lot_id === lastLot);
    }
    return units;
  }, [units, filter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="print-hide">
          <DialogTitle>Planche d&apos;étiquettes</DialogTitle>
          <DialogDescription>
            Une étiquette par machine. Imprimez, découpez, collez — le numéro
            imprimé est celui qui porte le coût dans l&apos;inventaire.
          </DialogDescription>
        </DialogHeader>

        <div className="print-hide flex flex-wrap items-end gap-4 border-b border-border pb-5">
          <div className="grid gap-2">
            <Label htmlFor="label-filter">Étiquettes à imprimer</Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger id="label-filter" className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes ({units.length})</SelectItem>
                <SelectItem value="en_stock">En stock seulement</SelectItem>
                <SelectItem value="recent">Dernier lot reçu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="label-columns">Colonnes</Label>
            <Select value={columns} onValueChange={setColumns}>
              <SelectTrigger id="label-columns" className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 — grandes</SelectItem>
                <SelectItem value="3">3 — moyennes</SelectItem>
                <SelectItem value="4">4 — petites</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => window.print()} className="ml-auto">
            <Printer />
            Imprimer {visible.length} étiquette{visible.length > 1 ? "s" : ""}
          </Button>
        </div>

        {visible.length === 0 ? (
          <p className="print-hide py-10 text-center text-sm text-muted-foreground">
            Aucune étiquette pour ce filtre.
          </p>
        ) : (
          /* La zone imprimée. Toujours sur fond blanc et en encre, quel que
             soit le registre de l'application : une étiquette s'imprime. */
          <div
            className="print-area mt-5 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {visible.map((unit) => (
              <div
                key={unit.id}
                className="print-label flex flex-col justify-between rounded-[8px] border border-[#C9C9CF] bg-white p-3"
                style={{ minHeight: 108, color: "#101B33" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      color: "#605F6B",
                      fontFeatureSettings: "'zero' 1, 'tnum' 1",
                    }}
                  >
                    {productCode}
                  </span>
                  {/* La tuile de marque, réduite : c'est notre matériel. */}
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-[5px] font-mono text-[8px] font-extrabold"
                    style={{
                      background: "#FFE500",
                      color: "#101B33",
                      fontFeatureSettings: "'zero' 1",
                    }}
                  >
                    R0
                  </span>
                </div>

                {/* Le numéro, lisible à bout de bras et sans lunettes. */}
                <div
                  className="font-mono font-extrabold leading-none"
                  style={{
                    fontSize: columns === "4" ? 20 : columns === "3" ? 24 : 30,
                    letterSpacing: "-0.02em",
                    fontFeatureSettings: "'zero' 1, 'tnum' 1",
                  }}
                >
                  {unit.asset_tag}
                </div>

                <div>
                  <div
                    className="truncate text-[10px] font-bold"
                    style={{ color: "#101B33" }}
                  >
                    {productName}
                  </div>
                  {unit.unit_cost !== undefined && (
                    <div
                      className="font-mono text-[9px]"
                      style={{
                        color: "#605F6B",
                        fontFeatureSettings: "'zero' 1, 'tnum' 1",
                      }}
                    >
                      {formatCurrencyFull(unit.unit_cost)} ·{" "}
                      {UNIT_STATUS_LABELS[unit.status as UnitStatus]}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
