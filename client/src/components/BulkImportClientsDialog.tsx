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
import { Upload, FileText, X, Download, AlertCircle, Users } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { parseClientFile, ParsedClientData } from "@/lib/clientFileParsers";
import { generateClientTemplate } from "@/lib/clientTemplateGenerator";
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
import { ClientProduct } from "@/hooks/useClients";

interface BulkImportClientsDialogProps {
  onImportComplete?: () => void;
}

interface ClientToImport extends ParsedClientData {
  matchedProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    type: 'buy' | 'rent';
    purchasePrice: number;
    sellingPrice: number;
    rentPrice: number;
  }>;
  unmatchedProducts: Array<{
    productName: string;
    quantity: number;
    type: 'buy' | 'rent';
  }>;
}

export function BulkImportClientsDialog({ onImportComplete }: BulkImportClientsDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [clientsToImport, setClientsToImport] = useState<ClientToImport[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  
  const { createClient } = useClients();
  const { products: existingProducts } = useProducts();
  const { toast } = useToast();

  // Match products by name and prepare client data
  const processParsedClients = useCallback((parsedClients: ParsedClientData[]): ClientToImport[] => {
    return parsedClients.map((client) => {
      const matchedProducts: ClientToImport['matchedProducts'] = [];
      const unmatchedProducts: ClientToImport['unmatchedProducts'] = [];
      
      client.products.forEach((productRequest) => {
        // Find product by name (case-insensitive)
        const product = existingProducts.find(
          p => p.name.toLowerCase() === productRequest.productName.toLowerCase()
        );
        
        if (product) {
          matchedProducts.push({
            productId: product.id,
            productName: product.name,
            quantity: productRequest.quantity,
            type: productRequest.type,
            purchasePrice: product.purchase_price,
            sellingPrice: product.selling_price,
            rentPrice: product.rent_price || 0,
          });
        } else {
          unmatchedProducts.push({
            productName: productRequest.productName,
            quantity: productRequest.quantity,
            type: productRequest.type,
          });
        }
      });
      
      return {
        ...client,
        matchedProducts,
        unmatchedProducts,
      };
    });
  }, [existingProducts]);

  const handleDownloadTemplate = () => {
    generateClientTemplate();
    toast({
      title: "Modèle téléchargé",
      description: "Le fichier Excel modèle a été téléchargé. Remplissez-le et réimportez-le.",
    });
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setErrors([]);
    setClientsToImport([]);
    
    try {
      const result = await parseClientFile(selectedFile);
      setErrors(result.errors);
      
      // Process clients and match products
      const processedClients = processParsedClients(result.clients);
      setClientsToImport(processedClients);
      
      if (result.clients.length === 0) {
        toast({
          title: "Aucun client trouvé",
          description: "Le fichier ne contient pas de données de clients valides.",
          variant: "destructive",
        });
      } else {
        const totalUnmatched = processedClients.reduce((sum, c) => sum + c.unmatchedProducts.length, 0);
        toast({
          title: "Fichier analysé",
          description: `${result.clients.length} client(s) trouvé(s). ${result.errors.length > 0 ? `${result.errors.length} erreur(s) détectée(s).` : ''} ${totalUnmatched > 0 ? `${totalUnmatched} produit(s) non trouvé(s).` : ''}`,
          variant: totalUnmatched > 0 ? "destructive" : "default",
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
  }, [toast, processParsedClients]);

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

  const handleImport = async () => {
    if (clientsToImport.length === 0) return;
    
    // Check if all products are matched
    const hasUnmatched = clientsToImport.some(c => c.unmatchedProducts.length > 0);
    if (hasUnmatched) {
      toast({
        title: "Produits non trouvés",
        description: "Veuillez d'abord importer tous les produits nécessaires.",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    const totalClients = clientsToImport.length;
    setImportProgress({ current: 0, total: totalClients });
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ client: string; error: string }>,
    };
    
    for (let i = 0; i < clientsToImport.length; i++) {
      const clientData = clientsToImport[i];
      setImportProgress({ current: i + 1, total: totalClients });
      
      try {
        // Prepare client products array
        const now = new Date().toISOString();
        const clientProducts: ClientProduct[] = clientData.matchedProducts.map((mp) => {
          const product = existingProducts.find(p => p.id === mp.productId)!;
          
          // Calculate prices based on type
          const purchasePrice = mp.purchasePrice;
          const clientPrice = mp.type === 'rent' 
            ? mp.rentPrice 
            : mp.purchasePrice; // Client pays purchase price when buying
          
          // Monthly fee is rent_price if type is rent, otherwise 0
          const monthlyFee = mp.type === 'rent' ? mp.rentPrice : 0;
          
          return {
            productId: mp.productId,
            name: mp.productName,
            quantity: mp.quantity,
            monthlyFee: monthlyFee,
            type: mp.type,
            addedAt: now,
            purchasePrice: purchasePrice,
            clientPrice: clientPrice,
          };
        });
        
        // Calculate totals
        let installationAmount = 0; // Sum of purchase prices for buy products
        let hardwarePrice = 0; // Sum of purchase prices for buy products (what client pays)
        let totalMonthlyFee = 0; // Sum of monthly fees for rent products
        
        clientProducts.forEach((cp) => {
          if (cp.type === 'buy') {
            installationAmount += (cp.purchasePrice || 0) * cp.quantity;
            hardwarePrice += (cp.purchasePrice || 0) * cp.quantity;
          } else if (cp.type === 'rent') {
            totalMonthlyFee += cp.monthlyFee; // Monthly fee is per product, not per unit
          }
        });
        
        // Calculate months_left (simplified - will be recalculated by the system)
        const monthsLeft = totalMonthlyFee > 0 ? Math.ceil(installationAmount / totalMonthlyFee) : 0;
        
        await createClient({
          client_name: clientData.clientName,
          total_sold_amount: installationAmount,
          monthly_fee: totalMonthlyFee,
          product_quantity: clientProducts.reduce((sum, p) => sum + p.quantity, 0),
          months_left: monthsLeft,
          products: clientProducts,
          starter_pack_price: 0, // Can be edited later
          hardware_price: hardwarePrice,
          contract_start_date: new Date().toISOString().split('T')[0], // Today's date
          status: 'active',
        });
        
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          client: clientData.clientName,
          error: error.message || 'Erreur inconnue',
        });
      }
    }
    
    setIsImporting(false);
    
    toast({
      title: "Import terminé",
      description: `${results.success} client(s) importé(s) avec succès. ${results.failed > 0 ? `${results.failed} échec(s).` : ''}`,
      variant: results.failed > 0 ? "destructive" : "default",
    });
    
    if (results.success > 0) {
      setOpen(false);
      setFile(null);
      setClientsToImport([]);
      setErrors([]);
      onImportComplete?.();
    }
  };

  const handleReset = () => {
    setFile(null);
    setClientsToImport([]);
    setErrors([]);
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalProducts = clientsToImport.reduce((sum, c) => sum + c.matchedProducts.length + c.unmatchedProducts.length, 0);
    const totalMatched = clientsToImport.reduce((sum, c) => sum + c.matchedProducts.length, 0);
    const totalUnmatched = clientsToImport.reduce((sum, c) => sum + c.unmatchedProducts.length, 0);
    
    return {
      totalClients: clientsToImport.length,
      totalProducts,
      totalMatched,
      totalUnmatched,
    };
  }, [clientsToImport]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Importer clients en masse
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des clients en masse</DialogTitle>
          <DialogDescription>
            Téléchargez le modèle Excel, remplissez-le avec vos clients et leurs produits (Client Name, Product Name, Quantity, Type), puis importez-le ici.
            Les calculs seront effectués automatiquement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Étape 1: Télécharger le modèle</p>
              <p className="text-xs text-muted-foreground">
                Téléchargez le fichier Excel modèle et remplissez-le avec vos clients et produits
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
              <Label htmlFor="client-file-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:underline">
                  Étape 2: Cliquez pour télécharger
                </span>
                {" ou glissez-déposez votre fichier rempli ici"}
              </Label>
              <Input
                id="client-file-upload"
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

          {/* Unmatched Products Warning */}
          {summary.totalUnmatched > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">{summary.totalUnmatched} produit(s) non trouvé(s):</div>
                <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                  {clientsToImport.flatMap(c => 
                    c.unmatchedProducts.map((p, idx) => (
                      <li key={idx}>{c.clientName}: {p.productName}</li>
                    ))
                  ).slice(0, 10)}
                  {summary.totalUnmatched > 10 && <li>... et {summary.totalUnmatched - 10} autre(s)</li>}
                </ul>
                <p className="text-sm mt-2">Veuillez d'abord importer ces produits dans le système.</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          {clientsToImport.length > 0 && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Clients</p>
                <p className="text-lg font-semibold">{summary.totalClients}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Produits Totaux</p>
                <p className="text-lg font-semibold">{summary.totalProducts}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Produits Trouvés</p>
                <p className="text-lg font-semibold text-green-600">{summary.totalMatched}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Produits Manquants</p>
                <p className="text-lg font-semibold text-red-600">{summary.totalUnmatched}</p>
              </div>
            </div>
          )}

          {/* Clients Preview */}
          {clientsToImport.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Aperçu ({clientsToImport.length} client(s))
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
                      <TableHead>Client</TableHead>
                      <TableHead>Produits</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientsToImport.map((client, clientIdx) => (
                      <>
                        {client.matchedProducts.map((product, prodIdx) => (
                          <TableRow key={`${clientIdx}-${prodIdx}`}>
                            <TableCell className="font-medium">
                              {prodIdx === 0 ? client.clientName : ''}
                            </TableCell>
                            <TableCell>{product.productName}</TableCell>
                            <TableCell>{product.quantity}</TableCell>
                            <TableCell>
                              <Badge variant={product.type === 'rent' ? 'default' : 'secondary'}>
                                {product.type === 'rent' ? 'Location' : 'Achat'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {client.unmatchedProducts.map((product, prodIdx) => (
                          <TableRow key={`${clientIdx}-unmatched-${prodIdx}`} className="bg-red-50 dark:bg-red-950">
                            <TableCell className="font-medium">
                              {prodIdx === 0 ? client.clientName : ''}
                            </TableCell>
                            <TableCell className="text-red-600">{product.productName} (non trouvé)</TableCell>
                            <TableCell>{product.quantity}</TableCell>
                            <TableCell>
                              <Badge variant={product.type === 'rent' ? 'default' : 'secondary'}>
                                {product.type === 'rent' ? 'Location' : 'Achat'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
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
            disabled={clientsToImport.length === 0 || isImporting || summary.totalUnmatched > 0}
          >
            {isImporting ? (
              `Import en cours... (${importProgress.current}/${importProgress.total})`
            ) : (
              `Importer ${clientsToImport.length} client(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

