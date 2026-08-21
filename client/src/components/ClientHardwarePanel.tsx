import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PackagePlus, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyFull } from "@/lib/utils";
import { formatTTC } from "@/lib/vat";
import { cn } from "@/lib/utils";
import {
  useClientUnits,
  useAssignUnits,
  UNIT_STATUS_LABELS,
} from "@/hooks/useHardware";
import { AssignUnitsDialog } from "@/components/AssignUnitsDialog";
import type { Client } from "@/hooks/useClients";

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
export function ClientHardwarePanel({
  client,
  monthlyFee,
}: ClientHardwarePanelProps) {
  const { toast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const { units, costReal } = useClientUnits(client.id);
  const { releaseUnit, isReleasing } = useAssignUnits();

  const lines = client.products ?? [];

  /** Ce que l'équipement revendu nous a coûté, ligne par ligne. */
  const equipmentCost = useMemo(
    () =>
      lines
        .filter((l) => (l.type ?? "buy") === "buy")
        .reduce((s, l) => s + (l.purchasePrice || 0) * (l.quantity || 0), 0),
    [lines]
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
        .filter((l) => l.type === "rent")
        .reduce((s, l) => s + (l.purchasePrice || 0) * (l.quantity || 0), 0),
    [lines]
  );

  const hasUnits = units.length > 0;
  const leaseCost = hasUnits ? costReal : leaseCostCatalog;

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

  const handleRelease = async (unitId: string, tag: string) => {
    try {
      await releaseUnit({ unitId, clientId: client.id });
      toast({
        title: "Machine reprise",
        description: `${tag} est de retour en stock.`,
      });
    } catch (error: any) {
      toast({
        title: "Reprise impossible",
        description: error?.message,
        variant: "destructive",
      });
    }
  };

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

          <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-border pt-3">
            <div className="min-w-0">
              <div className="text-sm font-bold">Marge sur l&apos;équipement</div>
              <div className="ro-data text-[11px] text-muted-foreground">
                facturé {formatCurrencyFull(equipmentBilled)} · payé{" "}
                {formatCurrencyFull(equipmentCost)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div
                className={cn(
                  "ro-figure text-lg",
                  equipmentMargin >= 0
                    ? "text-status-success"
                    : "text-status-error"
                )}
              >
                {equipmentMargin >= 0 ? "+" : ""}
                {formatCurrencyFull(equipmentMargin)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                acheté pour lui, revendu
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
            <div className="mt-1 text-[10px] text-muted-foreground">
              initial + marge + 1 mensualité
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

      {/* Les machines, nommément. */}
      {hasUnits ? (
        <div className="overflow-hidden rounded-xl border border-card-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° inventaire</TableHead>
                <TableHead className="text-right">Nous a coûté</TableHead>
                <TableHead className="text-right">Facturé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className="code-pill">{u.asset_tag}</span>
                  </TableCell>
                  <TableCell className="ro-data text-right font-bold">
                    {u.unit_cost !== undefined
                      ? formatCurrencyFull(u.unit_cost)
                      : "—"}
                  </TableCell>
                  <TableCell className="ro-data text-right">
                    {u.sale_price !== null
                      ? formatCurrencyFull(u.sale_price)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {UNIT_STATUS_LABELS[u.status]}
                    {u.deployed_at ? ` · ${u.deployed_at}` : ""}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={isReleasing}
                      onClick={() => handleRelease(u.id, u.asset_tag)}
                      title="Reprendre la machine"
                      data-testid={`button-release-${u.asset_tag}`}
                    >
                      <Undo2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucune machine affectée. Le coût du leasing ci-dessus repose sur les
          prix catalogue — installez du matériel pour connaître le coût réel de
          ce client.
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
