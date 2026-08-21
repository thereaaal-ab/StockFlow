import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatCurrencyFull } from "@/lib/utils";
import { useAvailableUnits } from "@/hooks/useHardware";

interface UnitPickerProps {
  productId: string;
  /** Les numéros d'inventaire déjà cochés pour cette référence. */
  value: string[];
  onChange: (unitIds: string[]) => void;
  disabled?: boolean;
  /**
   * Machines déjà réservées pour cette ligne.
   *
   * Une machine réservée quitte le stock disponible : sans elle ici, la case
   * cochée disparaîtrait de la liste et on ne pourrait plus la décocher.
   */
  reserved?: Array<{ id: string; asset_tag: string; unit_cost: number }>;
}

/**
 * La liste des machines disponibles d'une référence, avec ce que chacune nous
 * a coûté.
 *
 * C'est le geste métier au moment de composer une installation : deux bornes
 * identiques n'ont pas coûté pareil, et quand il faut serrer le prix pour
 * emporter le client, on donne celle à 950 € plutôt que celle à 1000 €. La
 * liste est donc triée du moins cher au plus cher, et le total se met à jour
 * à chaque case cochée.
 */
export function UnitPicker({
  productId,
  value,
  onChange,
  disabled = false,
  reserved = [],
}: UnitPickerProps) {
  const { available: inStock, isLoading } = useAvailableUnits(productId);

  // Les réservées d'abord fusionnées, puis tout retrié par prix : la liste
  // reste « la moins chère en tête » quel que soit ce qui est déjà coché.
  const available = useMemo(() => {
    const known = new Set(inStock.map((u) => u.id));
    const extra = reserved
      .filter((r) => !known.has(r.id))
      .map((r) => ({
        id: r.id,
        product_id: productId,
        lot_id: "",
        asset_tag: r.asset_tag,
        serial_number: null,
        product_code: "",
        product_name: "",
        unit_cost: r.unit_cost,
        received_at: "",
        supplier: null,
      }));
    return [...inStock, ...extra].sort((a, b) => a.unit_cost - b.unit_cost);
  }, [inStock, reserved, productId]);

  const picked = useMemo(() => new Set(value), [value]);

  // Le prix plancher du stock. On le repère sur TOUTES les machines qui le
  // partagent : s'il y en a trois à 950 €, les trois méritent le repère.
  const minCost = available.length > 0 ? available[0].unit_cost : 0;
  const hasSpread =
    available.length > 1 && available[available.length - 1].unit_cost > minCost;
  const selected = available.filter((u) => picked.has(u.id));
  const costReal = selected.reduce((sum, u) => sum + u.unit_cost, 0);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      picked.has(id) ? value.filter((v) => v !== id) : [...value, id]
    );
  };

  if (isLoading) {
    return (
      <p className="ro-overline text-[10px]">Chargement des machines</p>
    );
  }

  if (available.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-3">
        <p className="text-xs text-muted-foreground">
          Aucune machine en stock pour cette référence. Réceptionnez un lot
          dans Hardware Total pour pouvoir en affecter une.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="ro-overline text-[9px]">
          Machines disponibles · {available.length}
        </span>
        {selected.length > 0 && (
          <span className="ro-data text-[11px] font-bold text-foreground">
            {selected.length} × · {formatCurrencyFull(costReal)}
          </span>
        )}
      </div>

      <div className="max-h-[190px] overflow-y-auto rounded-md border border-border">
        {available.map((unit) => {
          const isPicked = picked.has(unit.id);
          // On nomme les moins chères plutôt que de laisser deviner : c'est
          // l'information qui décide quand il faut être compétitif.
          const cheapest = hasSpread && unit.unit_cost === minCost;

          return (
            <label
              key={unit.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-b-0",
                "transition-colors duration-fast ease-ro hover:bg-muted",
                isPicked && "bg-muted",
                disabled && "cursor-not-allowed opacity-60"
              )}
              data-testid={`unit-option-${unit.asset_tag}`}
            >
              <Checkbox
                checked={isPicked}
                onCheckedChange={() => toggle(unit.id)}
                disabled={disabled}
                aria-label={`Choisir ${unit.asset_tag}`}
              />

              <span className="code-pill shrink-0">{unit.asset_tag}</span>

              {cheapest && (
                <span className="ro-data shrink-0 text-[9px] font-bold uppercase tracking-label text-mint-600 dark:text-mint-400">
                  moins chère
                </span>
              )}

              <span className="ml-auto shrink-0 text-right">
                <span className="ro-data block text-sm font-bold text-foreground">
                  {formatCurrencyFull(unit.unit_cost)}
                </span>
                {unit.received_at && (
                  <span className="ro-data block text-[10px] text-muted-foreground">
                    reçue le {unit.received_at}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
