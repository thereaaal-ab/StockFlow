import { useState } from "react";
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
import type { ClientCalculationResult } from "@/lib/clientCalculations";

interface ClientHardwarePanelProps {
  clientId: string;
  clientName: string;
  metrics: ClientCalculationResult;
  monthlyFee: number;
  starterPack: number;
}

/**
 * Ce que ce client nous coûte vraiment, et quand il devient rentable.
 *
 * Le coût affiché est la somme des coûts de lot des machines réellement
 * posées chez lui. Tant qu'aucune machine n'est affectée, on retombe sur
 * l'estimation catalogue — et on le dit, plutôt que de faire passer une
 * estimation pour un chiffre réel.
 */
export function ClientHardwarePanel({
  clientId,
  clientName,
  metrics,
  monthlyFee,
  starterPack,
}: ClientHardwarePanelProps) {
  const { toast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const { units, costReal, revenue, margin } = useClientUnits(clientId);
  const { releaseUnit, isReleasing } = useAssignUnits();

  const hasUnits = units.length > 0;

  // L'estimation catalogue est un nombre négatif dans les métriques.
  const estimatedCost = Math.abs(metrics.installation_costs);
  const cost = hasUnits ? costReal : estimatedCost;

  // Ce qui rentre une seule fois : le starter pack et la revente du matériel.
  const hardwareRevenue = hasUnits ? revenue : metrics.profit_one_shot - starterPack;
  const oneShot = starterPack + hardwareRevenue;

  // Ce qu'il reste à couvrir après l'encaissement du premier mois.
  const toCover = Math.max(0, cost - oneShot);
  const monthsToCover =
    monthlyFee > 0 ? Math.ceil(toCover / monthlyFee) : null;

  const handleRelease = async (unitId: string, tag: string) => {
    try {
      await releaseUnit({ unitId, clientId });
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
        <h3 className="ro-overline text-[11px]">Matériel installé</h3>
        <Button size="sm" onClick={() => setAssignOpen(true)} data-testid="button-assign-open">
          <PackagePlus />
          Installer du matériel
        </Button>
      </div>

      {/* Les trois chiffres qui décident : ce qu'on met, ce qui rentre, quand
          c'est remboursé. */}
      <div className="rounded-xl border border-card-border bg-card p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="ro-overline text-[9px]">Nous a coûté</div>
            <div className="ro-figure mt-1 text-xl">
              {formatCurrencyFull(cost)}
            </div>
            {!hasUnits && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                estimation catalogue
              </div>
            )}
          </div>
          <div>
            <div className="ro-overline text-[9px]">One-shot HT</div>
            <div className="ro-figure mt-1 text-xl">
              {formatCurrencyFull(oneShot)}
            </div>
            <div className="ro-data mt-1 text-[10px] text-muted-foreground">
              {formatTTC(oneShot)}
            </div>
            <div className="ro-data mt-0.5 text-[10px] text-muted-foreground">
              {formatCurrencyFull(starterPack)} pack ·{" "}
              {formatCurrencyFull(hardwareRevenue)} matériel
            </div>
          </div>
          <div>
            <div className="ro-overline text-[9px]">Marge matériel</div>
            <div
              className={cn(
                "ro-figure mt-1 text-xl",
                hasUnits &&
                  (margin >= 0 ? "text-status-success" : "text-status-error")
              )}
            >
              {hasUnits ? formatCurrencyFull(margin) : "—"}
            </div>
            {hasUnits && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                sur la revente
              </div>
            )}
          </div>
          <div>
            <div className="ro-overline text-[9px]">Mensualité HT</div>
            <div className="ro-figure mt-1 text-xl">
              {formatCurrencyFull(monthlyFee)}
            </div>
            <div className="ro-data mt-1 text-[10px] text-muted-foreground">
              {formatTTC(monthlyFee)}
            </div>
          </div>
        </div>

        {/* Le point de rentabilité, énoncé en une phrase plutôt qu'en tableau. */}
        <div className="mt-5 border-t border-dashed border-border pt-4">
          {toCover === 0 ? (
            <p className="text-sm">
              <span className="ro-data font-bold text-status-success">
                Remboursé dès le premier mois.
              </span>{" "}
              L&apos;encaissement one-shot couvre déjà ce qu&apos;on a mis.
            </p>
          ) : monthsToCover === null ? (
            <p className="text-sm text-muted-foreground">
              Reste{" "}
              <span className="ro-data font-bold text-foreground">
                {formatCurrencyFull(toCover)}
              </span>{" "}
              à couvrir, et aucune mensualité n&apos;est enregistrée : le point
              de rentabilité ne peut pas être calculé.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Reste{" "}
              <span className="ro-data font-bold text-foreground">
                {formatCurrencyFull(toCover)}
              </span>{" "}
              à couvrir, soit{" "}
              <span className="ro-data font-bold text-foreground">
                {monthsToCover} mois
              </span>{" "}
              de mensualité.
              {metrics.months_passed > 0 && (
                <>
                  {" "}
                  {metrics.months_passed} mois se sont écoulés, encaissé à ce
                  jour :{" "}
                  <span className="ro-data font-bold text-foreground">
                    {formatCurrencyFull(metrics.profit_mensuel)}
                  </span>
                  .
                </>
              )}
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
          Aucune machine affectée. Les chiffres ci-dessus reposent sur les prix
          catalogue — installez du matériel pour connaître le coût réel de ce
          client.
        </p>
      )}

      <AssignUnitsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        clientId={clientId}
        clientName={clientName}
      />
    </section>
  );
}
