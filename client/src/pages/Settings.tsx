import { useState } from "react";
import { useCategories } from "@/hooks/useCategories";
import { useCommissions } from "@/hooks/useCommissions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Settings as SettingsIcon, Euro } from "lucide-react";
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
import { formatCurrencyFull } from "@/lib/utils";

export default function Settings() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory, isCreating, isUpdating, isDeleting } = useCategories();
  const { commissions, isLoading: commissionsLoading, createCommission, updateCommission, deleteCommission, isCreating: isCreatingCommission, isUpdating: isUpdatingCommission, isDeleting: isDeletingCommission } = useCommissions();
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Commission state
  const [editingCommission, setEditingCommission] = useState<{ id: string; month: string; amount: number } | null>(null);
  const [deleteCommissionId, setDeleteCommissionId] = useState<string | null>(null);
  const [commissionMonth, setCommissionMonth] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [isCreateCommissionDialogOpen, setIsCreateCommissionDialogOpen] = useState(false);
  const [isEditCommissionDialogOpen, setIsEditCommissionDialogOpen] = useState(false);

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la catégorie ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCategory(categoryName);
      setCategoryName("");
      setIsCreateDialogOpen(false);
      toast({
        title: "Succès",
        description: "Catégorie créée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de la catégorie",
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !categoryName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la catégorie ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateCategory(editingCategory.id, categoryName);
      setEditingCategory(null);
      setCategoryName("");
      setIsEditDialogOpen(false);
      toast({
        title: "Succès",
        description: "Catégorie modifiée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la modification de la catégorie",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;

    try {
      await deleteCategory(deleteCategoryId);
      setDeleteCategoryId(null);
      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression de la catégorie",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (category: { id: string; name: string }) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setCategoryName("");
    setIsCreateDialogOpen(true);
  };

  // Commission handlers
  const handleCreateCommission = async () => {
    if (!commissionMonth.trim() || !commissionAmount.trim()) {
      toast({
        title: "Erreur",
        description: "Le mois et le montant sont requis",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(commissionAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Erreur",
        description: "Le montant doit être un nombre positif",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCommission({ month: commissionMonth, amount });
      setCommissionMonth("");
      setCommissionAmount("");
      setIsCreateCommissionDialogOpen(false);
      toast({
        title: "Succès",
        description: "Commission créée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de la commission",
        variant: "destructive",
      });
    }
  };

  const handleEditCommission = async () => {
    if (!editingCommission || !commissionMonth.trim() || !commissionAmount.trim()) {
      toast({
        title: "Erreur",
        description: "Le mois et le montant sont requis",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(commissionAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Erreur",
        description: "Le montant doit être un nombre positif",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateCommission(editingCommission.id, commissionMonth, amount);
      setEditingCommission(null);
      setCommissionMonth("");
      setCommissionAmount("");
      setIsEditCommissionDialogOpen(false);
      toast({
        title: "Succès",
        description: "Commission modifiée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la modification de la commission",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCommission = async () => {
    if (!deleteCommissionId) return;

    try {
      await deleteCommission(deleteCommissionId);
      setDeleteCommissionId(null);
      toast({
        title: "Succès",
        description: "Commission supprimée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression de la commission",
        variant: "destructive",
      });
    }
  };

  const openEditCommissionDialog = (commission: { id: string; month: string; amount: number }) => {
    setEditingCommission(commission);
    setCommissionMonth(commission.month);
    setCommissionAmount(commission.amount.toString());
    setIsEditCommissionDialogOpen(true);
  };

  const openCreateCommissionDialog = () => {
    setCommissionMonth("");
    setCommissionAmount("");
    setIsCreateCommissionDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez les catégories de produits
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Catégories
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle Catégorie
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle catégorie</DialogTitle>
                  <DialogDescription>
                    Le nom sera automatiquement converti en minuscules et les doublons ne sont pas autorisés.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Nom de la catégorie</Label>
                    <Input
                      id="category-name"
                      placeholder="Ex: Phones, Laptops, Chargers..."
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateCategory();
                        }
                      }}
                      data-testid="input-category-name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleCreateCategory} disabled={isCreating}>
                    {isCreating ? "Création..." : "Créer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des catégories...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune catégorie. Créez-en une pour commencer.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium capitalize">
                        {category.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(category)}
                            disabled={isUpdating || isDeleting}
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteCategoryId(category.id)}
                            disabled={isUpdating || isDeleting}
                            data-testid={`button-delete-category-${category.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
            <DialogDescription>
              Le nom sera automatiquement converti en minuscules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Nom de la catégorie</Label>
              <Input
                id="edit-category-name"
                placeholder="Ex: Phones, Laptops, Chargers..."
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEditCategory();
                  }
                }}
                data-testid="input-edit-category-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingCategory(null);
                setCategoryName("");
              }}
              disabled={isUpdating}
            >
              Annuler
            </Button>
            <Button onClick={handleEditCategory} disabled={isUpdating}>
              {isUpdating ? "Modification..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteCategoryId !== null}
        onOpenChange={(open) => !open && setDeleteCategoryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement la catégorie. Les produits associés à cette catégorie
              verront leur catégorie définie sur null.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Commissions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Commissions
            </CardTitle>
            <Dialog open={isCreateCommissionDialogOpen} onOpenChange={setIsCreateCommissionDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateCommissionDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle Commission
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle commission</DialogTitle>
                  <DialogDescription>
                    Ajoutez une commission pour un mois spécifique (format: YYYY-MM, ex: 2024-01).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="commission-month">Mois (YYYY-MM)</Label>
                    <Input
                      id="commission-month"
                      placeholder="2024-01"
                      value={commissionMonth}
                      onChange={(e) => setCommissionMonth(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateCommission();
                        }
                      }}
                      data-testid="input-commission-month"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commission-amount">Montant (€)</Label>
                    <Input
                      id="commission-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={commissionAmount}
                      onChange={(e) => setCommissionAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateCommission();
                        }
                      }}
                      data-testid="input-commission-amount"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateCommissionDialogOpen(false)}
                    disabled={isCreatingCommission}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleCreateCommission} disabled={isCreatingCommission}>
                    {isCreatingCommission ? "Création..." : "Créer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des commissions...
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune commission. Créez-en une pour commencer.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">
                        {new Date(commission.month + "-01").toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrencyFull(commission.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditCommissionDialog(commission)}
                            disabled={isUpdatingCommission || isDeletingCommission}
                            data-testid={`button-edit-commission-${commission.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteCommissionId(commission.id)}
                            disabled={isUpdatingCommission || isDeletingCommission}
                            data-testid={`button-delete-commission-${commission.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Commission Dialog */}
      <Dialog open={isEditCommissionDialogOpen} onOpenChange={setIsEditCommissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la commission</DialogTitle>
            <DialogDescription>
              Modifiez le mois et le montant de la commission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-commission-month">Mois (YYYY-MM)</Label>
              <Input
                id="edit-commission-month"
                placeholder="2024-01"
                value={commissionMonth}
                onChange={(e) => setCommissionMonth(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEditCommission();
                  }
                }}
                data-testid="input-edit-commission-month"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-commission-amount">Montant (€)</Label>
              <Input
                id="edit-commission-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEditCommission();
                  }
                }}
                data-testid="input-edit-commission-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditCommissionDialogOpen(false);
                setEditingCommission(null);
                setCommissionMonth("");
                setCommissionAmount("");
              }}
              disabled={isUpdatingCommission}
            >
              Annuler
            </Button>
            <Button onClick={handleEditCommission} disabled={isUpdatingCommission}>
              {isUpdatingCommission ? "Modification..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Commission Confirmation Dialog */}
      <AlertDialog
        open={deleteCommissionId !== null}
        onOpenChange={(open) => !open && setDeleteCommissionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement la commission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCommission}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCommission}
              disabled={isDeletingCommission}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingCommission ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

