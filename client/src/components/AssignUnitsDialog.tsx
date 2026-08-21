import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAvailableUnits, useAssignUnits } from "@/hooks/useHardware";

interface AssignUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

/**
 * Choisir les machines précises qui partent chez un client.
 *
 * Deux bornes identiques n'ont pas coûté pareil. La liste est triée du moins
 * cher au plus cher : quand il faut serrer le prix pour rester compétitif, la
 * machine à proposer est la première ligne. Le coût réel de l'installation se
 * met à jour à chaque case cochée.
 */
export function AssignUnitsDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: AssignUnitsDialogProps) {
  const { toast } = useToast();
  const { available, isLoading } = useAvailableUnits();
  const { assignUnits, isAssigning } = useAssignUnits();

  const [productId, setProductId] = useState<string>("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"vendu" | "chez_client">("vendu");
  const [salePrice, setSalePrice] = useState("");

  /** Les références qui ont au moins une machine disponible. */
  const productOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; count: number }>();
    for (const u of available) {
      const entry = seen.get(u.product_id);
      if (entry) entry.count += 1;
      else
        seen.set(u.product_id, {
          id: u.product_id,
          label: `${u.product_code} — ${u.product_name}`,
          count: 1,
        });
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [available]);

  const rows = useMemo(
    () =>
      productId ? available.filter((u) => u.product_id === productId) : [],
    [available, productId]
  );

  const selected = useMemo(
    () => available.filter((u) => picked.has(u.id)),
    [available, picked]
  );

  const costReal = selected.reduce((s, u) => s + u.unit_cost, 0);
  const unitSale = parseFloat(salePrice.replace(",", ".")) || 0;
  const revenue = mode === "vendu" ? unitSale * selected.length : 0;
  const margin = revenue - costReal;

  const toggle = (id: string) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  const reset = () => {
    setPicked(new Set());
    setSalePrice("");
    setProductId("");
  };

  const handleAssign = async () => {
    if (selected.length === 0) return;
    try {
      await assignUnits({
        unitIds: Array.from(picked),
        clientId,
        mode,
        salePrice: mode === "vendu" && unitSale > 0 ? unitSale : null,
      });
      toast({
        title: "Matériel affecté",
        description: `${selected.length} machine${selected.length > 1 ? "s" : ""} chez ${clientName} · coût réel ${formatCurrencyFull(costReal)}`,
      });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Affectation impossible",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Installer du matériel chez {clientName}</DialogTitle>
          <DialogDescription>
            Choisissez les machines exactes. La moins chère est en tête : c&apos;est
            celle à proposer quand il faut être compétitif.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="assign-product">Référence</Label>
            <Select value={productId} onValueChange={(v) => { setProductId(v); setPicked(new Set()); }}>
              <SelectTrigger id="assign-product" data-testid="select-assign-product">
                <SelectValue
                  placeholder={
                    isLoading
                      ? "Chargement du stock…"
                      : productOptions.length === 0
                        ? "Aucune machine disponible en stock"
                        : "Choisir une référence"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} · {p.count} dispo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {productId && (
            <div className="overflow-hidden rounded-xl border border-card-border">
              <div className="max-h-[280px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]">
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>N° inventaire</TableHead>
                      <TableHead className="text-right">Nous a coûté</TableHead>
                      <TableHead>Reçu le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((u, index) => {
                      const isPicked = picked.has(u.id);
                      // La première ligne est la moins chère du stock : on le
                      // dit, plutôt que de laisser deviner.
                      const cheapest =
                        index === 0 && rows.length > 1 && u.unit_cost < rows[1].unit_cost;

                      return (
                        <TableRow
                          key={u.id}
                          className={cn("cursor-pointer", isPicked && "bg-muted")}
                          onClick={() => toggle(u.id)}
                          data-testid={`row-unit-${u.asset_tag}`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isPicked}
                              onCheckedChange={() => toggle(u.id)}
                              aria-label={`Choisir ${u.asset_tag}`}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="code-pill">{u.asset_tag}</span>
                            {cheapest && (
                              <span className="ml-2 ro-data text-[10px] font-bold text-mint-600 dark:text-mint-400">
                                la moins chère
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="ro-data text-right font-bold">
                            {formatCurrencyFull(u.unit_cost)}
                          </TableCell>
                          <TableCell className="ro-data text-xs text-muted-foreground">
                            {u.received_at}
                            {u.supplier ? ` · ${u.supplier}` : ""}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assign-mode">Nature de l&apos;installation</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <SelectTrigger id="assign-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendu">
                    Vendu — la machine devient au client
                  </SelectItem>
                  <SelectItem value="chez_client">
                    Déployé — la machine reste à nous
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "vendu" && (
              <div className="grid gap-2">
                <Label htmlFor="assign-price">Prix de vente unitaire</Label>
                <Input
                  id="assign-price"
                  inputMode="decimal"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="1050"
                  data-testid="input-sale-price"
                />
              </div>
            )}
          </div>

          {/* Ce que l'installation coûte et rapporte, avant de valider. */}
          {selected.length > 0 && (
            <div className="rounded-md bg-muted px-4 py-4">
              <div className="ro-overline text-[10px]">
                {selected.length} machine{selected.length > 1 ? "s" : ""} sélectionnée
                {selected.length > 1 ? "s" : ""}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <div className="ro-overline text-[9px]">Nous coûte</div>
                  <div className="ro-figure mt-1 text-lg">
                    {formatCurrencyFull(costReal)}
                  </div>
                </div>
                <div>
                  <div className="ro-overline text-[9px]">On facture</div>
                  <div className="ro-figure mt-1 text-lg">
                    {mode === "vendu" ? formatCurrencyFull(revenue) : "—"}
                  </div>
                </div>
                <div>
                  <div className="ro-overline text-[9px]">Marge</div>
                  <div
                    className={cn(
                      "ro-figure mt-1 text-lg",
                      mode === "vendu" &&
                        (margin >= 0 ? "text-status-success" : "text-status-error")
                    )}
                  >
                    {mode === "vendu" ? formatCurrencyFull(margin) : "—"}
                  </div>
                </div>
              </div>
              <p className="ro-data mt-3 text-[11px] text-muted-foreground">
                {selected.map((u) => u.asset_tag).join(" · ")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={isAssigning || selected.length === 0}
            data-testid="button-assign-units"
          >
            {isAssigning
              ? "Affectation…"
              : `Installer ${selected.length || ""} machine${selected.length > 1 ? "s" : ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
