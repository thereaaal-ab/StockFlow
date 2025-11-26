import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, Download, AlertCircle, Edit } from "lucide-react";
import { useProducts, Product } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";
import { parseProductFile, ParsedProduct } from "@/lib/fileParsers";
import { generateProductTemplate } from "@/lib/templateGenerator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkImportProductsDialogProps {
  onImportComplete?: () => void;
}

interface ProductToImport extends ParsedProduct {
  category_id?: string;
}

export function BulkImportProductsDialog({ onImportComplete }: BulkImportProductsDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [productsToImport, setProductsToImport] = useState<ProductToImport[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [editingProduct, setEditingProduct] = useState<ProductToImport | null>(null);
  
  const { createProduct, products: existingProducts } = useProducts();
  const { categories } = useCategories();
  const { toast } = useToast();

  // Process parsed products - use provided prices from file
  const processParsedProducts = useCallback((parsedProducts: ParsedProduct[]): ProductToImport[] => {
    return parsedProducts.map((product) => {
      // Check if product with same name or code exists
      const existingProduct = existingProducts.find(
        p => (product.code && p.code.toLowerCase() === product.code.toLowerCase()) ||
            p.name.toLowerCase() === product.name.toLowerCase()
      );
      
      // Use provided code or generate from name
      const code = product.code || existingProduct?.code || 
        product.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) + 
        `-${Date.now().toString().slice(-4)}`;
      
      // Use prices from file, or fallback to existing product prices, or 0
      const purchase_price = product.purchase_price !== undefined 
        ? product.purchase_price 
        : (existingProduct?.purchase_price || 0);
      
      const selling_price = product.selling_price !== undefined 
        ? product.selling_price 
        : (existingProduct?.selling_price || 0);
      
      const rent_price = product.rent_price !== undefined 
        ? product.rent_price 
        : (existingProduct?.rent_price || 0);
      
      // Match category by name, or use existing product's category, or first category
      let category_id: string | undefined;
      if (product.category) {
        const foundCategory = categories.find(
          cat => cat.name.toLowerCase() === product.category?.toLowerCase()
        );
        category_id = foundCategory?.id;
      }
      if (!category_id) {
        category_id = existingProduct?.category_id || 
          (categories.length > 0 ? categories[0].id : undefined);
      }
      
      return {
        ...product,
        code,
        purchase_price,
        selling_price,
        rent_price,
        category_id,
      };
    });
  }, [existingProducts, categories]);

  const handleDownloadTemplate = () => {
    generateProductTemplate();
    toast({
      title: "Modèle téléchargé",
      description: "Le fichier Excel modèle a été téléchargé. Remplissez-le et réimportez-le.",
    });
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setErrors([]);
    setProductsToImport([]);
    
    try {
      const result = await parseProductFile(selectedFile);
      setErrors(result.errors);
      
      // Process products and auto-calculate prices
      const processedProducts = processParsedProducts(result.products);
      setProductsToImport(processedProducts);
      
      if (result.products.length === 0) {
        toast({
          title: "Aucun produit trouvé",
          description: "Le fichier ne contient pas de données de produits valides.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fichier analysé",
          description: `${result.products.length} produit(s) trouvé(s). ${result.errors.length > 0 ? `${result.errors.length} erreur(s) détectée(s).` : ''}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur d'analyse",
        description: error.message || "Impossible d'analyser le fichier.",
        variant: "destructive",
      });
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  }, [toast, processParsedProducts]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleEditProduct = (product: ProductToImport) => {
    setEditingProduct({ ...product });
  };

  const handleSaveEdit = (updatedProduct: ProductToImport) => {
    setProductsToImport(prev => 
      prev.map(p => p.rowIndex === updatedProduct.rowIndex ? updatedProduct : p)
    );
    setEditingProduct(null);
  };

  const handleImport = async () => {
    if (productsToImport.length === 0) return;
    
    setIsImporting(true);
    setImportProgress({ current: 0, total: productsToImport.length });
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ product: string; error: string }>,
    };
    
    for (let i = 0; i < productsToImport.length; i++) {
      const product = productsToImport[i];
      setImportProgress({ current: i + 1, total: productsToImport.length });
      
      try {
        // Find category by name if provided
        let finalCategoryId = product.category_id;
        if (product.category && !finalCategoryId) {
          const foundCategory = categories.find(
            cat => cat.name.toLowerCase() === product.category?.toLowerCase()
          );
          finalCategoryId = foundCategory?.id;
        }
        
        await createProduct({
          code: product.code || `AUTO-${Date.now()}-${i}`,
          name: product.name,
          quantity: product.quantity,
          hardware_total: product.quantity,
          stock_actuel: product.quantity,
          purchase_price: product.purchase_price || 0,
          selling_price: product.selling_price || 0,
          rent_price: product.rent_price || 0,
          profit: 0,
          total_value: 0,
          category: product.category || 'Other',
          category_id: finalCategoryId,
        });
        
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          product: product.name,
          error: error.message || 'Erreur inconnue',
        });
      }
    }
    
    setIsImporting(false);
    
    toast({
      title: "Import terminé",
      description: `${results.success} produit(s) importé(s) avec succès. ${results.failed > 0 ? `${results.failed} échec(s).` : ''}`,
      variant: results.failed > 0 ? "destructive" : "default",
    });
    
    if (results.success > 0) {
      setOpen(false);
      setFile(null);
      setProductsToImport([]);
      setErrors([]);
      onImportComplete?.();
    }
  };

  const handleReset = () => {
    setFile(null);
    setProductsToImport([]);
    setErrors([]);
    setEditingProduct(null);
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const buyProducts = productsToImport.filter(p => (p.rent_price || 0) === 0 && (p.selling_price || 0) > 0);
    const rentProducts = productsToImport.filter(p => (p.rent_price || 0) > 0);
    
    return {
      total: productsToImport.length,
      buy: buyProducts.length,
      rent: rentProducts.length,
      totalBuyQuantity: buyProducts.reduce((sum, p) => sum + p.quantity, 0),
      totalRentQuantity: rentProducts.reduce((sum, p) => sum + p.quantity, 0),
    };
  }, [productsToImport]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Importer en masse
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des produits en masse</DialogTitle>
          <DialogDescription>
            Téléchargez le modèle Excel, remplissez-le avec vos produits (Code, Nom, Quantité, Prix), puis importez-le ici.
            Tous les champs peuvent être modifiés avant l'import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Étape 1: Télécharger le modèle</p>
              <p className="text-xs text-muted-foreground">
                Téléchargez le fichier Excel modèle et remplissez-le avec vos produits
              </p>
            </div>
            <Button onClick={handleDownloadTemplate} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Télécharger le modèle
            </Button>
          </div>

          {/* File Upload Area */}
          {!file && (
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:underline">
                  Étape 2: Cliquez pour télécharger
                </span>
                {" ou glissez-déposez votre fichier rempli ici"}
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Formats supportés: Excel (.xlsx, .xls) ou CSV (.csv)
              </p>
            </div>
          )}

          {/* File Info */}
          {file && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                disabled={isParsing || isImporting}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Parsing Status */}
          {isParsing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Analyse du fichier en cours...</AlertDescription>
            </Alert>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">{errors.length} erreur(s) détectée(s):</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>Ligne {error.row}: {error.message}</li>
                  ))}
                  {errors.length > 5 && <li>... et {errors.length - 5} autre(s)</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          {productsToImport.length > 0 && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Total Produits</p>
                <p className="text-lg font-semibold">{summary.total}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type Achat</p>
                <p className="text-lg font-semibold">{summary.buy} ({summary.totalBuyQuantity} unités)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type Location</p>
                <p className="text-lg font-semibold">{summary.rent} ({summary.totalRentQuantity} unités)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prêt à importer</p>
                <p className="text-lg font-semibold text-green-600">✓</p>
              </div>
            </div>
          )}

          {/* Products Preview Table */}
          {productsToImport.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Aperçu ({productsToImport.length} produit(s))
                </h3>
                {isImporting && (
                  <div className="text-sm text-muted-foreground">
                    Import: {importProgress.current} / {importProgress.total}
                  </div>
                )}
              </div>

              <div className="border rounded-lg max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Prix Achat</TableHead>
                      <TableHead>Prix Vente</TableHead>
                      <TableHead>Prix Location</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsToImport.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{product.code || '-'}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>
                          {product.purchase_price !== undefined ? `${product.purchase_price.toFixed(2)}€` : '0.00€'}
                        </TableCell>
                        <TableCell>
                          {product.selling_price !== undefined ? `${product.selling_price.toFixed(2)}€` : '0.00€'}
                        </TableCell>
                        <TableCell>
                          {product.rent_price !== undefined ? `${product.rent_price.toFixed(2)}€` : '0.00€'}
                        </TableCell>
                        <TableCell>
                          {product.category || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                            disabled={isImporting}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modifier
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Edit Product Dialog */}
          {editingProduct && (
            <EditProductDialog
              product={editingProduct}
              categories={categories}
              onSave={handleSaveEdit}
              onCancel={() => setEditingProduct(null)}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              handleReset();
            }}
            disabled={isImporting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={productsToImport.length === 0 || isImporting}
          >
            {isImporting ? (
              `Import en cours... (${importProgress.current}/${importProgress.total})`
            ) : (
              `Importer ${productsToImport.length} produit(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Product Dialog Component
interface EditProductDialogProps {
  product: ProductToImport;
  categories: Array<{ id: string; name: string }>;
  onSave: (product: ProductToImport) => void;
  onCancel: () => void;
}

function EditProductDialog({ product, categories, onSave, onCancel }: EditProductDialogProps) {
  const [edited, setEdited] = useState<ProductToImport>({ ...product });

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Modifier le produit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Code Produit</Label>
            <Input
              value={edited.code || ''}
              onChange={(e) => setEdited({ ...edited, code: e.target.value })}
            />
          </div>
          <div>
            <Label>Nom du produit</Label>
            <Input
              value={edited.name}
              onChange={(e) => setEdited({ ...edited, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Quantité</Label>
            <Input
              type="number"
              min="1"
              value={edited.quantity}
              onChange={(e) => setEdited({ ...edited, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Prix d'achat (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={edited.purchase_price !== undefined ? edited.purchase_price : ''}
                onChange={(e) => setEdited({ ...edited, purchase_price: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Utilisé pour Installation Amount
              </p>
            </div>
            <div>
              <Label>Prix de vente (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={edited.selling_price !== undefined ? edited.selling_price : ''}
                onChange={(e) => setEdited({ ...edited, selling_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Prix location (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={edited.rent_price !== undefined ? edited.rent_price : ''}
                onChange={(e) => setEdited({ ...edited, rent_price: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Utilisé pour Monthly Fees
              </p>
            </div>
          </div>
          
          <div>
            <Label>Catégorie</Label>
            <Select
              value={edited.category_id || ''}
              onValueChange={(value) => {
                const selectedCategory = categories.find(cat => cat.id === value);
                setEdited({ 
                  ...edited, 
                  category_id: value || undefined,
                  category: selectedCategory?.name || edited.category
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onSave(edited)}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

