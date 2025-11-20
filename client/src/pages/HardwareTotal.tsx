import { HardwareTable } from "@/components/HardwareTable";
import { AddHardwareDialog } from "@/components/AddHardwareDialog";
import { EditProductModal } from "@/components/EditProductModal";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useProducts, Product } from "@/hooks/useProducts";

export default function HardwareTotal() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { products, isLoading, updateProduct, deleteProduct } = useProducts();

  const filteredData = products.filter(
    (item) =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const totalInvestment = products.reduce(
    (sum, item) => sum + item.total_value,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Hardware Total
          </h1>
          <p className="text-muted-foreground mt-1">
            Catalogue complet de tout le matériel acheté
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <AddHardwareDialog />
        </div>
      </div>

      <div className="flex items-center gap-4">
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
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement des produits...
        </div>
      ) : (
        <>
          <HardwareTable
            data={filteredData}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>Total: {filteredData.length} produits</div>
            <div>
              Investissement total:{" "}
              <span className="font-semibold text-foreground">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(totalInvestment)}
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
