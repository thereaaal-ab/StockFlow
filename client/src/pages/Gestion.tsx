import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RecurringCostsTab } from "@/components/settings/RecurringCostsTab";
import { useRecurringCosts } from "@/hooks/useRecurringCosts";
import { useClients } from "@/hooks/useClients";
import { computeSummary } from "@shared/recurringCosts";
import { formatCurrencyFull } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Gestion 2A — le fond de roulement.
 *
 * Un fond de roulement, c'est ce qui est fixe : loyer, comptable, électricité,
 * assurances. Chaque facture est ramenée au mois quelle que soit sa
 * périodicité — une facture trimestrielle pèse un tiers par mois.
 *
 * En face, on ne met que le RÉCURRENT : les mensualités des clients actifs.
 * Les starter packs et les ventes de matériel sont des encaissements uniques ;
 * les mélanger au net mensuel donnerait un mois faussement bon et le suivant
 * faussement mauvais. Ils sont affichés à côté, pas dans le calcul.
 */
export default function Gestion() {
  const { entries, isLoading } = useRecurringCosts();
  const { clients, isLoading: clientsLoading } = useClients();

  // Un achat pour revente est une facture, mais pas une charge fixe.
  // L'interrupteur change le regard, pas la donnée.
  const [includeResale, setIncludeResale] = useState(false);

  const summary = useMemo(
    () => computeSummary(entries, undefined, { includeResale }),
    [entries, includeResale]
  );

  /** Ce qui rentre chaque mois, sans les encaissements uniques. */
  const monthlyRecurring = useMemo(
    () =>
      clients
        .filter((c) => (c.status || "active") === "active")
        .reduce((sum, c) => sum + (c.monthly_fee || 0), 0),
    [clients]
  );

  const fixedCosts = summary.totalMonthlyExpenses;
  const adjustments = summary.totalMonthlyPositiveAdjustments;
  const net = monthlyRecurring + adjustments - fixedCosts;

  const loading = isLoading || clientsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-heading" data-testid="text-page-title">
            Gestion 2A
          </h1>
          <p className="mt-1 text-muted-foreground">
            Le fond de roulement : ce qui est fixe, ramené au mois
          </p>
        </div>

        {/* L'interrupteur de vue, à portée immédiate du chiffre qu'il change. */}
        <div className="flex items-center gap-3 rounded-lg border border-card-border bg-card px-4 py-3">
          <Switch
            id="include-resale"
            checked={includeResale}
            onCheckedChange={setIncludeResale}
            data-testid="switch-include-resale"
          />
          <div className="min-w-0">
            <Label htmlFor="include-resale" className="cursor-pointer text-sm font-bold">
              Compter les achats pour revente
            </Label>
            <p className="ro-data text-[11px] text-muted-foreground">
              {formatCurrencyFull(summary.totalMonthlyResale)} / mois
              {includeResale ? " · comptés" : " · exclus"}
            </p>
          </div>
        </div>
      </div>

      {/* Les quatre chiffres du mois. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-card">
          <div className="ro-overline text-[10px]">Coûts fixes</div>
          <div className="ro-figure mt-2 text-2xl text-status-error">
            −{loading ? "…" : formatCurrencyFull(fixedCosts)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">par mois</p>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shadow-card">
          <div className="ro-overline text-[10px]">Mensualités clients</div>
          <div className="ro-figure mt-2 text-2xl text-status-success">
            +{loading ? "…" : formatCurrencyFull(monthlyRecurring)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            récurrent, clients actifs
          </p>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shadow-card">
          <div className="ro-overline text-[10px]">Ajustements</div>
          <div className="ro-figure mt-2 text-2xl">
            {loading ? "…" : `+${formatCurrencyFull(adjustments)}`}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            entrées récurrentes hors clients
          </p>
        </div>

        {/* Le chiffre qui décide : ce qui reste une fois le fixe payé. */}
        <div
          className={cn(
            "rounded-xl border-2 bg-card p-5 shadow-card",
            net >= 0 ? "border-mint-500" : "border-[#E5484D]"
          )}
        >
          <div className="ro-overline text-[10px]">Net mensuel</div>
          <div
            className={cn(
              "ro-figure mt-2 text-2xl",
              net >= 0 ? "text-status-success" : "text-status-error"
            )}
          >
            {loading ? "…" : `${net >= 0 ? "+" : ""}${formatCurrencyFull(net)}`}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {net >= 0
              ? "le récurrent couvre le fixe"
              : "le récurrent ne couvre pas le fixe"}
          </p>
        </div>
      </div>

      {/* Ce qui rentre une fois et ne se répète pas : dit, mais tenu hors du
          net mensuel pour ne pas donner un mois faussement bon. */}
      <div className="rounded-xl border border-dashed border-border px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Les starter packs et les ventes de matériel sont des encaissements
          uniques : ils n&apos;entrent pas dans le net mensuel ci-dessus. Leur
          cumul est sur le{" "}
          <a href="/" className="font-bold text-mint-600 dark:text-mint-400">
            Dashboard
          </a>
          .
        </p>
      </div>

      {/* On lui passe le récurrent client : son « profit après overhead »
          affiche alors le même net que la tuile ci-dessus, au lieu de
          « Indisponible » — deux nets qui se contredisent seraient pires
          que pas de net du tout. */}
      <RecurringCostsTab baseMonthlyProfit={monthlyRecurring} />
    </div>
  );
}
