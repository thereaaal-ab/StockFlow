import { useMemo, useState } from "react";
import {
  computeSummary,
  getMonthlyEquivalent,
  RECURRING_COST_DEFAULT_CATEGORIES,
  createRecurringEntryBodySchema,
  type RecurringFinancialEntry,
  type RecurringFrequency,
  type RecurringEntryType,
} from "@shared/recurringCosts";
import { useRecurringCosts } from "@/hooks/useRecurringCosts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrencyFull, cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  Scale,
  PiggyBank,
  Loader2,
} from "lucide-react";

const CUSTOM_CATEGORY = "__custom__";

type CategorySelectValue =
  | (typeof RECURRING_COST_DEFAULT_CATEGORIES)[number]
  | typeof CUSTOM_CATEGORY;

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  semi_annual: "Semestriel",
  yearly: "Annuel",
};

const TYPE_LABELS: Record<RecurringEntryType, string> = {
  expense: "Dépense",
  income_adjustment: "Ajustement revenu (+)",
};

interface RecurringCostsTabProps {
  /** Optional monthly base (e.g. sum of client monthly fees) for “profit after overhead”. */
  baseMonthlyProfit?: number;
}

function emptyForm(): {
  name: string;
  categorySelect: CategorySelectValue;
  categoryCustom: string;
  type: RecurringEntryType;
  frequency: RecurringFrequency;
  amount: string;
  description: string;
  is_active: boolean;
} {
  return {
    name: "",
    categorySelect: RECURRING_COST_DEFAULT_CATEGORIES[0],
    categoryCustom: "",
    type: "expense",
    frequency: "monthly",
    amount: "",
    description: "",
    is_active: true,
  };
}

export function RecurringCostsTab({ baseMonthlyProfit }: RecurringCostsTabProps) {
  const { toast } = useToast();
  const {
    entries,
    isLoading,
    isError,
    error,
    canMutate,
    createEntry,
    updateEntry,
    deleteEntry,
    isCreating,
    isUpdating,
    isDeleting,
  } = useRecurringCosts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringFinancialEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const displaySummary = useMemo(
    () => computeSummary(entries, baseMonthlyProfit),
    [entries, baseMonthlyProfit],
  );

  const resolvedCategory = () => {
    if (form.categorySelect === CUSTOM_CATEGORY) {
      return form.categoryCustom.trim();
    }
    return form.categorySelect;
  };

  const previewMonthly = useMemo(() => {
    const raw = parseFloat(form.amount.replace(",", "."));
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return getMonthlyEquivalent(raw, form.frequency);
  }, [form.amount, form.frequency]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (entry: RecurringFinancialEntry) => {
    setEditing(entry);
    const isPreset = (
      RECURRING_COST_DEFAULT_CATEGORIES as readonly string[]
    ).includes(entry.category);
    setForm({
      name: entry.name,
      categorySelect: isPreset
        ? (entry.category as CategorySelectValue)
        : CUSTOM_CATEGORY,
      categoryCustom: isPreset ? "" : entry.category,
      type: entry.type,
      frequency: entry.frequency,
      amount: String(entry.amount),
      description: entry.description ?? "",
      is_active: entry.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const cat = resolvedCategory();
    const amountNum = parseFloat(form.amount.replace(",", "."));

    const payload = {
      name: form.name.trim(),
      category: cat,
      type: form.type,
      frequency: form.frequency,
      amount: amountNum,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };

    const parsed = createRecurringEntryBodySchema.safeParse(payload);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast({
        title: "Validation",
        description: first || "Données invalides",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editing) {
        await updateEntry({
          id: editing.id,
          body: parsed.data,
        });
        toast({ title: "Mis à jour", description: "L'entrée a été enregistrée." });
      } else {
        await createEntry(parsed.data);
        toast({ title: "Créé", description: "Nouvelle entrée ajoutée." });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (e: unknown) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Action impossible",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEntry(deleteId);
      toast({ title: "Supprimé", description: "Entrée supprimée." });
      setDeleteId(null);
    } catch (e: unknown) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Suppression impossible",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Coûts récurrents & overhead
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Dépenses et ajustements de revenus normalisés au mois pour la rentabilité.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-destructive/30 bg-destructive/[0.06]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <TrendingDown className="h-4 w-4" />
              Dépenses mensuelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-destructive">
              {formatCurrencyFull(displaySummary.totalMonthlyExpenses)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Entrées actives uniquement</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/[0.06]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              Ajustements positifs / mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatCurrencyFull(displaySummary.totalMonthlyPositiveAdjustments)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Net overhead mensuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                displaySummary.netMonthlyOverhead < 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {formatCurrencyFull(displaySummary.netMonthlyOverhead)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajustements − dépenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Profit estimé après overhead
            </CardTitle>
          </CardHeader>
          <CardContent>
            {baseMonthlyProfit !== undefined && Number.isFinite(baseMonthlyProfit) ? (
              <>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatCurrencyFull(displaySummary.profitAfterOverhead ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Base: revenus mensuels clients ({formatCurrencyFull(baseMonthlyProfit)}) + net overhead
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Indisponible — aucune base de profit mensuelle fournie.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Entrées</CardTitle>
            <CardDescription>
              Les lignes inactives restent visibles mais sont exclues des totaux.
            </CardDescription>
          </div>
          {canMutate && (
            <Button onClick={openCreate} size="sm" data-testid="button-add-recurring">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement…
            </div>
          )}

          {isError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error instanceof Error ? error.message : "Impossible de charger les données."}
              <p className="text-xs mt-2 text-muted-foreground">
                Vérifiez que la table existe (SQL) et que le serveur API est disponible (ex. npm run dev).
              </p>
            </div>
          )}

          {!isLoading && !isError && entries.length === 0 && (
            <div className="text-center py-12 px-4 rounded-lg border border-dashed">
              <p className="text-muted-foreground mb-4">
                Aucune entrée récurrente. Ajoutez des dépenses (loyer, logiciels…) ou des ajustements de revenu positifs.
              </p>
              {canMutate && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer la première entrée
                </Button>
              )}
            </div>
          )}

          {!isLoading && !isError && entries.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Fréquence</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">Équiv. mensuel</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((row) => {
                    const monthly = getMonthlyEquivalent(row.amount, row.frequency);
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(!row.is_active && "opacity-50")}
                      >
                        <TableCell className="font-medium max-w-[180px] truncate">
                          {row.name}
                        </TableCell>
                        <TableCell className="capitalize">{row.category}</TableCell>
                        <TableCell>
                          <Badge
                            variant={row.type === "expense" ? "destructive" : "secondary"}
                            className={
                              row.type === "income_adjustment"
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                                : undefined
                            }
                          >
                            {TYPE_LABELS[row.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>{FREQUENCY_LABELS[row.frequency]}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrencyFull(row.amount)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrencyFull(monthly)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.is_active ? "default" : "outline"}>
                            {row.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canMutate ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEdit(row)}
                                disabled={isUpdating || isDeleting}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteId(row.id)}
                                disabled={isUpdating || isDeleting}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Lecture seule</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!canMutate && !isLoading && (
            <p className="text-xs text-muted-foreground mt-4">
              Seuls les administrateurs peuvent modifier les entrées (variable d'environnement{" "}
              <code className="rounded bg-muted px-1">ADMIN_EMAILS</code> ou rôle admin Supabase).
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'entrée" : "Nouvelle entrée"}</DialogTitle>
            <DialogDescription>
              Montant toujours positif ; le type indique s'il est retranché (dépense) ou ajouté (ajustement).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rc-name">Nom *</Label>
              <Input
                id="rc-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Loyer bureau"
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select
                value={form.categorySelect}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    categorySelect: v as CategorySelectValue,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_COST_DEFAULT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_CATEGORY}>Autre (personnalisé)</SelectItem>
                </SelectContent>
              </Select>
              {form.categorySelect === CUSTOM_CATEGORY && (
                <Input
                  placeholder="Nom de catégorie"
                  value={form.categoryCustom}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryCustom: e.target.value }))
                  }
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: v as RecurringEntryType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Dépense (−)</SelectItem>
                    <SelectItem value="income_adjustment">
                      Ajustement revenu (+)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fréquence *</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      frequency: v as RecurringFrequency,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FREQUENCY_LABELS) as RecurringFrequency[]).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {FREQUENCY_LABELS[k]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rc-amount">Montant (€) *</Label>
              <Input
                id="rc-amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="1249.50"
              />
              {previewMonthly !== null && (
                <p className="text-sm text-muted-foreground">
                  Équivalent mensuel:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrencyFull(previewMonthly)}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rc-desc">Description</Label>
              <Input
                id="rc-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optionnel"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="rc-active"
                checked={form.is_active}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, is_active: c === true }))
                }
              />
              <Label htmlFor="rc-active" className="font-normal cursor-pointer">
                Actif
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCreating || isUpdating}
            >
              {(isCreating || isUpdating) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
