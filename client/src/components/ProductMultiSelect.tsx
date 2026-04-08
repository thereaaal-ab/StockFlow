import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/hooks/useProducts";

interface ProductMultiSelectProps {
  products: Product[];
  selectedProductIds: string[];
  onSelectionChange: (productIds: string[]) => void;
  disabled?: boolean;
}

export function ProductMultiSelect({
  products,
  selectedProductIds,
  onSelectionChange,
  disabled = false,
}: ProductMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (productId: string) => {
    onSelectionChange(selectedProductIds.filter((id) => id !== productId));
  };

  const handleSelect = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      handleUnselect(productId);
    } else {
      onSelectionChange([...selectedProductIds, productId]);
    }
  };

  const selectedProducts = products.filter((p) =>
    selectedProductIds.includes(p.id)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-[2.5rem] h-auto"
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {selectedProducts.length === 0 ? (
              <span className="text-muted-foreground">
                Sélectionner des produits...
              </span>
            ) : (
              selectedProducts.map((product) => (
                <Badge
                  variant="secondary"
                  key={product.id}
                  className="mr-1 mb-1"
                >
                  {product.name}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex items-center"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnselect(product.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(product.id);
                    }}
                    aria-label={`Retirer ${product.name}`}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un produit..." />
          <CommandList>
            <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => {
                const isSelected = selectedProductIds.includes(product.id);
                return (
                  <CommandItem
                    key={product.id}
                    onSelect={() => handleSelect(product.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Stock disponible: {product.stock_actuel ?? product.quantity ?? 0} • Prix d'achat: {product.purchase_price.toFixed(2)}€
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

