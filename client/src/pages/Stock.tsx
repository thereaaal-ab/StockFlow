import { HardwareTable } from "@/components/HardwareTable";
import { EditProductModal } from "@/components/EditProductModal";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts, Product } from "@/hooks/useProducts";

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { products, isLoading, updateProduct, deleteProduct } = useProducts();

  const filteredData = useMemo(() => {
    let filtered = products.filter(
      (item) =>
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (statusFilter === "in-stock") {
      filtered = filtered.filter((item) => item.quantity > 0);
    } else if (statusFilter === "out-of-stock") {
      filtered = filtered.filter((item) => item.quantity === 0);
    } else if (statusFilter === "low-stock") {
      filtered = filtered.filter((item) => item.quantity > 0 && item.quantity < 5);
    }

    return filtered;
  }, [products, searchTerm, statusFilter]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleSave = async (product: Product) => {
    await updateProduct(product);
  };

  const handleDelete = async (productId: string) => {
    await deleteProduct(productId);
  };

  const availableStockValue = filteredData
    .filter((item) => item.quantity > 0)
    .reduce((sum, item) => sum + item.total_value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Stock Actuel
          </h1>
          <p className="text-muted-foreground mt-1">
            Inventaire en temps réel des disponibilités
          </p>
        </div>
        <Button variant="outline" data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par code ou nom..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="in-stock">En stock</SelectItem>
            <SelectItem value="low-stock">Stock bas</SelectItem>
            <SelectItem value="out-of-stock">Rupture</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement des produits...
        </div>
      ) : (
        <>
          <HardwareTable
            data={filteredData}
            showStock={true}
            showActions={true}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>Total: {filteredData.length} produits</div>
            <div>
              Valeur stock disponible:{" "}
              <span className="font-semibold text-foreground">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(availableStockValue)}
              </span>
            </div>
          </div>
        </>
      )}

      <EditProductModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        product={editingProduct}
        onSave={handleSave}
      />
    </div>
  );
}
