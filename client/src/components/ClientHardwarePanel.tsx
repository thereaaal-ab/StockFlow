import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PackagePlus, Undo2, ChevronDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyFull } from "@/lib/utils";
import { formatTTC } from "@/lib/vat";
import { cn } from "@/lib/utils";
import { useClientUnits, useAssignUnits } from "@/hooks/useHardware";
import { AssignUnitsDialog } from "@/components/AssignUnitsDialog";
import { UnitPicker } from "@/components/UnitPicker";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import type { Client, ClientProduct } from "@/hooks/useClients";
import type { HardwareUnit } from "@/hooks/useHardware";

interface ClientHardwarePanelProps {
  client: Client;
  monthlyFee: number;
}

/**
 * Ce que ce client rapporte, ce qu'il coûte, et quand il est remboursé.
 *
 * La lecture suit la réalité de l'affaire, pas la comptabilité générale :
 *
 *  · Le paiement initial — services et starter pack — est de la marge pure :
 *    rien ne s'achète en face.
 *  · L'équipement revendu n'est pas un investissement : on l'achète POUR le
 *    client et on le refacture. Seule la différence compte.
 *  · Le matériel en leasing, lui, reste à nous : c'est le seul vrai
 *    investissement, et il se rembourse sur les mensualités.
 *
 * D'où la présentation en deux temps : le premier mois encaisse tout, les
 * suivants encaissent la mensualité.
 */

/**
 * Une ligne de matériel du client, dépliable.
 *
 * Le rapprochement se fait par référence : les machines affectées au client
 * pour ce produit comptent contre la quantité vendue. On voit d'un coup
 * combien il en manque, quelles bornes exactement sont posées, et lesquelles
 * on peut encore prendre dans le stock.
 */
function ClientProductLine({
  client,
  line,
  assigned,
}: {
  client: Client;
  line: ClientProduct;
  assigned: HardwareUnit[];
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const { assignUnits, isAssigning, releaseUnit, isReleasing } = useAssignUnits();

  const missing = Math.max(0, (line.quantity || 0) - assigned.length);
  const isLease = line.type === "rent";

  const handleAssign = async () => {
    if (picked.length === 0) return;
    try {
      await assignUnits({
        unitIds: picked.slice(0, missing),
        clientId: client.id,
        // En location la machine reste à nous ; à l'achat elle est vendue.
        mode: isLease ? "chez_client" : "vendu",
        salePrice: isLease ? null : line.clientPrice ?? null,
      });
      setPicked([]);
      toast({
        title: "Matériel attribué",
        description: `${line.name} · ${picked.length} machine${picked.length > 1 ? "s" : ""} chez ${client.client_name}.`,
      });
    } catch (error: any) {
      toast({
        title: "Attribution impossible",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card",
        missing > 0
          ? "border-[color:var(--ro-feedback-warning-bd)]"
          : "border-card-border"
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        data-testid={`line-${line.productId}`}
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-fast ease-ro",
            open && "rotate-180"
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{line.name}</div>
          <div className="ro-overline text-[9px]">
            {isLease ? "location · reste à nous" : "vendu au client"}
            {line.monthlyFee > 0
              ? ` · ${formatCurrencyFull(line.monthlyFee)} /mois`
              : ""}
          </div>
        </div>
        <span
          className={cn(
            "ro-data shrink-0 text-sm font-bold",
            missing > 0
              ? "text-[color:var(--ro-feedback-warning-fg)]"
              : "text-mint-600 dark:text-mint-400"
          )}
        >
          {assigned.length}/{line.quantity} attribuée
          {(line.quantity || 0) > 1 ? "s" : ""}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          {/* Les bornes déjà posées, nommément, avec ce qu'elles ont coûté. */}
          {assigned.length > 0 && (
            <div>
              <div className="ro-overline text-[9px]">Machines posées</div>
              <div className="mt-2 space-y-1.5">
                {assigned.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-md bg-muted px-3 py-2"
                  >
                    <span className="code-pill shrink-0">{u.asset_tag}</span>
                    <span className="ro-data ml-auto shrink-0 text-sm font-bold">
                      {u.unit_cost !== undefined
                        ? formatCurrencyFull(u.unit_cost)
                        : "—"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      disabled={isReleasing}
                      title="Reprendre la machine"
                      onClick={() =>
                        releaseUnit({ unitId: u.id, clientId: client.id })
                      }
                      data-testid={`release-${u.asset_tag}`}
                    >
                      <Undo2 />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ce qu'on peut encore prendre dans le stock, moins cher d'abord. */}
          {missing > 0 ? (
            <div className="space-y-3">
              <UnitPicker
                productId={line.productId}
                value={picked}
                onChange={(ids) => setPicked(ids.slice(0, missing))}
                disabled={isAssigning}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  {missing} machine{missing > 1 ? "s" : ""} encore à attribuer.
                </p>
                <Button
                  size="sm"
                  onClick={handleAssign}
                  disabled={isAssigning || picked.length === 0}
                  data-testid={`assign-${line.productId}`}
                >
                  <Check />
                  Attribuer {picked.length || ""}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Toutes les machines de cette ligne sont attribuées.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ClientHardwarePanel({
  client,
  monthlyFee,
}: ClientHardwarePanelProps) {
  const [assignOpen, setAssignOpen] = useState(false);
  const { units, costReal } = useClientUnits(client.id);
  const { products } = useProducts();
  const { categories } = useCategories();

  /**
   * Les références de service — création de menu, livraison, starter pack.
   *
   * Elles ne s'achètent à personne : leur « prix d'achat » au catalogue est
   * un tarif de référence, pas une sortie d'argent. Les compter gonflerait
   * l'investissement et écraserait la marge.
   *
   * La règle vaut pour les DEUX blocs : une licence facturée au mois n'est
   * pas plus un investissement qu'une création de menu n'est un achat.
   */
  const serviceProductIds = useMemo(() => {
    const serviceCats = new Set(
      categories
        .filter((c) => c.name.toLowerCase().startsWith("service"))
        .map((c) => c.id)
    );
    return new Set(
      products.filter((p) => p.category_id && serviceCats.has(p.category_id)).map((p) => p.id)
    );
  }, [products, categories]);

  const lines = client.products ?? [];

  /** Ce que l'équipement revendu nous a coûté, hors lignes de service. */
  const equipmentCost = useMemo(
    () =>
      lines
        .filter(
          (l) =>
            (l.type ?? "buy") === "buy" && !serviceProductIds.has(l.productId)
        )
        .reduce((s, l) => s + (l.purchasePrice || 0) * (l.quantity || 0), 0),
    [lines, serviceProductIds]
  );

  /**
   * Ce que le matériel en leasing nous a coûté.
   *
   * Le coût réel des machines affectées prime ; à défaut on retombe sur les
   * prix catalogue des lignes en location, en le disant.
   */
  const leaseCostCatalog = useMemo(
    () =>
      lines
        .filter(
          (l) => l.type === "rent" && !serviceProductIds.has(l.productId)
        )
        .reduce((s, l) => s + (l.purchasePrice || 0) * (l.quantity || 0), 0),
    [lines, serviceProductIds]
  );

  const hasUnits = units.length > 0;
  const leaseCost = hasUnits ? costReal : leaseCostCatalog;

  /**
   * Les lignes qui demandent des machines numérotées, avec celles qui leur
   * sont déjà attribuées. Le rapprochement se fait par référence : une unité
   * porte son `product_id`, pas le numéro de la ligne du devis.
   */
  const trackedLines = useMemo(
    () =>
      lines
        .filter(
          (l) => products.find((p) => p.id === l.productId)?.tracked_by_unit
        )
        .map((l) => ({
          line: l,
          assigned: units.filter((u) => u.product_id === l.productId),
        })),
    [lines, products, units]
  );

  const totalMissing = trackedLines.reduce(
    (s, t) => s + Math.max(0, (t.line.quantity || 0) - t.assigned.length),
    0
  );

  const initialPayment = client.starter_pack_price || 0;
  const equipmentBilled = client.hardware_price || 0;
  const equipmentMargin = equipmentBilled - equipmentCost;

  // Le premier mois encaisse tout : le paiement initial, la marge sur
  // l'équipement, et la première mensualité.
  const firstMonth = initialPayment + equipmentMargin + monthlyFee;
  const toCover = Math.max(0, leaseCost - firstMonth);
  const monthsToCover = monthlyFee > 0 ? Math.ceil(toCover / monthlyFee) : null;

  /** La date à laquelle l'investissement est couvert. */
  const breakEven = useMemo(() => {
    if (!client.contract_start_date || monthsToCover === null) return null;
    const d = new Date(client.contract_start_date);
    d.setMonth(d.getMonth() + monthsToCover);
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [client.contract_start_date, monthsToCover]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="ro-overline text-[11px]">Ce que ce client rapporte</h3>
        <Button size="sm" onClick={() => setAssignOpen(true)} data-testid="button-assign-open">
          <PackagePlus />
          Installer du matériel
        </Button>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-5">
        {/* Ce qui rentre, poste par poste, avec ce que chacun coûte en face. */}
        <div className="ro-overline text-[9px]">Ce qui rentre</div>
        <div className="mt-3 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold">Paiement initial</div>
              <div className="text-[11px] text-muted-foreground">
                Services et starter pack — aucun coût en face, c&apos;est de la
                marge pure.
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="ro-figure text-lg text-status-success">
                +{formatCurrencyFull(initialPayment)}
              </div>
              <div className="ro-data text-[10px] text-muted-foreground">
                {formatTTC(initialPayment)}
              </div>
            </div>
          </div>

          {/* L'équipement n'est pas un investissement qui reste : on le sort
              puis on le récupère par la facture. Montrer les deux mouvements
              plutôt que le seul net, sinon on ne voit pas que l'achat est
              remboursé. */}
          <div className="border-t border-dashed border-border pt-3">
            <div className="text-sm font-bold">
              Équipement — acheté pour lui, revendu
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-muted-foreground">
                  Facturé au client
                </span>
                <span className="ro-data text-sm font-bold text-status-success">
                  +{formatCurrencyFull(equipmentBilled)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-muted-foreground">
                  Payé au fournisseur
                </span>
                <span className="ro-data text-sm font-bold text-status-error">
                  −{formatCurrencyFull(equipmentCost)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-border pt-1.5">
                <span className="text-[12px] font-bold">
                  {equipmentCost > 0
                    ? "L'achat est remboursé, il reste"
                    : "Gain"}
                </span>
                <span
                  className={cn(
                    "ro-figure text-lg",
                    equipmentMargin >= 0
                      ? "text-status-success"
                      : "text-status-error"
                  )}
                >
                  {equipmentMargin >= 0 ? "+" : ""}
                  {formatCurrencyFull(equipmentMargin)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-border pt-3">
            <div className="min-w-0">
              <div className="text-sm font-bold">Mensualité</div>
              <div className="text-[11px] text-muted-foreground">
                Licences et location du matériel — chaque mois.
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="ro-figure text-lg text-status-success">
                +{formatCurrencyFull(monthlyFee)}
              </div>
              <div className="ro-data text-[10px] text-muted-foreground">
                {formatTTC(monthlyFee)}
              </div>
            </div>
          </div>
        </div>

        {/* Le seul vrai investissement : les machines qui restent à nous. */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="ro-overline text-[9px]">Ce qu&apos;on a investi</div>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold">Matériel en leasing</div>
              <div className="text-[11px] text-muted-foreground">
                {hasUnits
                  ? `${units.length} machine${units.length > 1 ? "s" : ""} — elles restent à nous`
                  : "Prix catalogue — aucune machine affectée pour l'instant"}
                {" · "}licences exclues, elles ne s&apos;achètent pas
              </div>
            </div>
            <div className="ro-figure shrink-0 text-lg text-status-error">
              −{formatCurrencyFull(leaseCost)}
            </div>
          </div>
        </div>

        {/* Les deux chiffres qui résument l'affaire. */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div className="rounded-md bg-muted px-4 py-3">
            <div className="ro-overline text-[9px]">Premier mois</div>
            <div className="ro-figure mt-1 text-xl text-status-success">
              +{formatCurrencyFull(firstMonth)}
            </div>
            <div className="ro-data mt-1 text-[10px] text-muted-foreground">
              {formatCurrencyFull(initialPayment)} + {formatCurrencyFull(equipmentMargin)} +{" "}
              {formatCurrencyFull(monthlyFee)}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              initial + gain équipement + 1 mensualité
            </div>
          </div>
          <div className="rounded-md bg-muted px-4 py-3">
            <div className="ro-overline text-[9px]">Puis chaque mois</div>
            <div className="ro-figure mt-1 text-xl text-status-success">
              +{formatCurrencyFull(monthlyFee)}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              récurrent
            </div>
          </div>
        </div>

        {/* Le remboursement, en une phrase. */}
        <div className="mt-4 border-t border-dashed border-border pt-4">
          {leaseCost === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun matériel en leasing chez ce client : il n&apos;y a rien à
              rembourser, tout ce qui rentre est du gain.
            </p>
          ) : toCover === 0 ? (
            <p className="text-sm">
              <span className="ro-data font-bold text-status-success">
                Remboursé dès le premier mois.
              </span>{" "}
              Les {formatCurrencyFull(firstMonth)} encaissés couvrent déjà les{" "}
              {formatCurrencyFull(leaseCost)} de matériel.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Après le premier mois, il reste{" "}
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
                  {breakEven && <> — remboursé en {breakEven}</>}
                </>
              )}
              .
            </p>
          )}
        </div>
      </div>

      {/* Chaque référence suivie à l'unité, dépliable : on y voit les bornes
          posées et on choisit les suivantes dans le stock. */}
      {trackedLines.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="ro-overline text-[11px]">Matériel de ce client</h3>
            {totalMissing > 0 && (
              <span className="ro-data text-[11px] font-bold text-[color:var(--ro-feedback-warning-fg)]">
                {totalMissing} machine{totalMissing > 1 ? "s" : ""} à attribuer
              </span>
            )}
          </div>
          {trackedLines.map(({ line, assigned }) => (
            <ClientProductLine
              key={line.productId}
              client={client}
              line={line}
              assigned={assigned}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucune référence de ce client n&apos;est suivie à l&apos;unité. Activez
          « Suivi à l&apos;unité » sur la fiche produit dans Hardware Total pour
          pouvoir attribuer des machines numérotées.
        </p>
      )}

      <AssignUnitsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        clientId={client.id}
        clientName={client.client_name}
      />
    </section>
  );
}
