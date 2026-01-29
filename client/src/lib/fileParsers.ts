import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ParsedProduct {
  code?: string;
  name: string;
  quantity: number;
  purchase_price?: number;
  selling_price?: number;
  rent_price?: number;
  category?: string;
  rowIndex: number;
}

export interface ParseResult {
  products: ParsedProduct[];
  errors: Array<{ row: number; message: string }>;
}

/**
 * Parse Excel file - expects exact template structure
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with headers - handle various column name formats
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: ['Product Code', 'Product Name', 'Quantity', 'Buying Price', 'Selling Price', 'Rent Price', 'Category'],
          defval: null,
          range: 1 // Skip first row (headers)
        }) as any[];
        
        const products: ParsedProduct[] = [];
        const errors: Array<{ row: number; message: string }> = [];
        
        jsonData.forEach((row: any, index: number) => {
          const rowNumber = index + 2; // +2 because header is row 1, and index is 0-based
          
          // Normalize column names (handle variations)
          const code = row['Product Code'] ? String(row['Product Code']).trim() : null;
          const name = row['Product Name'] ? String(row['Product Name']).trim() : null;
          const quantity = row['Quantity'];
          const buyingPrice = row['Buying Price'];
          const sellingPrice = row['Selling Price'];
          const rentPrice = row['Rent Price'];
          const category = row['Category'] ? String(row['Category']).trim() : null;
          
          // Validation
          if (!name || name === '') {
            errors.push({ row: rowNumber, message: 'Product Name is required' });
            return;
          }
          
          const qtyNum = typeof quantity === 'number' ? quantity : parseFloat(String(quantity));
          if (isNaN(qtyNum) || qtyNum <= 0) {
            errors.push({ row: rowNumber, message: 'Quantity must be a positive number' });
            return;
          }
          
          // Parse prices
          const purchasePrice = buyingPrice !== null && buyingPrice !== undefined && buyingPrice !== ''
            ? (typeof buyingPrice === 'number' ? buyingPrice : parseFloat(String(buyingPrice).replace(/[^\d.-]/g, '')))
            : undefined;
          
          const sellPrice = sellingPrice !== null && sellingPrice !== undefined && sellingPrice !== ''
            ? (typeof sellingPrice === 'number' ? sellingPrice : parseFloat(String(sellingPrice).replace(/[^\d.-]/g, '')))
            : undefined;
          
          const rentP = rentPrice !== null && rentPrice !== undefined && rentPrice !== ''
            ? (typeof rentPrice === 'number' ? rentPrice : parseFloat(String(rentPrice).replace(/[^\d.-]/g, '')))
            : undefined;
          
          // Validate prices are non-negative if provided
          if (purchasePrice !== undefined && (isNaN(purchasePrice) || purchasePrice < 0)) {
            errors.push({ row: rowNumber, message: 'Buying Price must be a non-negative number' });
            return;
          }
          
          if (sellPrice !== undefined && (isNaN(sellPrice) || sellPrice < 0)) {
            errors.push({ row: rowNumber, message: 'Selling Price must be a non-negative number' });
            return;
          }
          
          if (rentP !== undefined && (isNaN(rentP) || rentP < 0)) {
            errors.push({ row: rowNumber, message: 'Rent Price must be a non-negative number' });
            return;
          }
          
          products.push({
            code: code || undefined,
            name,
            quantity: Math.floor(qtyNum), // Ensure integer
            purchase_price: purchasePrice,
            selling_price: sellPrice,
            rent_price: rentP,
            category: category || undefined,
            rowIndex: rowNumber,
          });
        });
        
        resolve({ products, errors });
      } catch (error: any) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse CSV file - expects exact template structure
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize header names
        const normalized = header.trim();
        const lower = normalized.toLowerCase();
        if (lower.includes('code') || lower.includes('product code')) return 'Product Code';
        if (lower.includes('name') || lower.includes('product name')) return 'Product Name';
        if (lower === 'quantity' || lower === 'qty') return 'Quantity';
        if (lower.includes('buying') || lower.includes('purchase') || lower.includes('buy price')) return 'Buying Price';
        if (lower.includes('selling') || lower.includes('sell price')) return 'Selling Price';
        if (lower.includes('rent') || lower.includes('rental')) return 'Rent Price';
        if (lower === 'category') return 'Category';
        return normalized;
      },
      complete: (results) => {
        try {
          const products: ParsedProduct[] = [];
          const errors: Array<{ row: number; message: string }> = [];
          
          results.data.forEach((row: any, index: number) => {
            const rowNumber = index + 2; // +2 because header is row 1, and index is 0-based
            
            const code = row['Product Code'] ? String(row['Product Code']).trim() : null;
            const name = row['Product Name'] ? String(row['Product Name']).trim() : null;
            const quantity = row['Quantity'];
            const buyingPrice = row['Buying Price'];
            const sellingPrice = row['Selling Price'];
            const rentPrice = row['Rent Price'];
            const category = row['Category'] ? String(row['Category']).trim() : null;
            
            // Validation
            if (!name || name === '') {
              errors.push({ row: rowNumber, message: 'Product Name is required' });
              return;
            }
            
            const qtyNum = typeof quantity === 'number' ? quantity : parseFloat(String(quantity));
            if (isNaN(qtyNum) || qtyNum <= 0) {
              errors.push({ row: rowNumber, message: 'Quantity must be a positive number' });
              return;
            }
            
            // Parse prices
            const purchasePrice = buyingPrice !== null && buyingPrice !== undefined && buyingPrice !== ''
              ? (typeof buyingPrice === 'number' ? buyingPrice : parseFloat(String(buyingPrice).replace(/[^\d.-]/g, '')))
              : undefined;
            
            const sellPrice = sellingPrice !== null && sellingPrice !== undefined && sellingPrice !== ''
              ? (typeof sellingPrice === 'number' ? sellingPrice : parseFloat(String(sellingPrice).replace(/[^\d.-]/g, '')))
              : undefined;
            
            const rentP = rentPrice !== null && rentPrice !== undefined && rentPrice !== ''
              ? (typeof rentPrice === 'number' ? rentPrice : parseFloat(String(rentPrice).replace(/[^\d.-]/g, '')))
              : undefined;
            
            // Validate prices are non-negative if provided
            if (purchasePrice !== undefined && (isNaN(purchasePrice) || purchasePrice < 0)) {
              errors.push({ row: rowNumber, message: 'Buying Price must be a non-negative number' });
              return;
            }
            
            if (sellPrice !== undefined && (isNaN(sellPrice) || sellPrice < 0)) {
              errors.push({ row: rowNumber, message: 'Selling Price must be a non-negative number' });
              return;
            }
            
            if (rentP !== undefined && (isNaN(rentP) || rentP < 0)) {
              errors.push({ row: rowNumber, message: 'Rent Price must be a non-negative number' });
              return;
            }
            
            products.push({
              code: code || undefined,
              name,
              quantity: Math.floor(qtyNum),
              purchase_price: purchasePrice,
              selling_price: sellPrice,
              rent_price: rentP,
              category: category || undefined,
              rowIndex: rowNumber,
            });
          });
          
          resolve({ products, errors });
        } catch (error: any) {
          reject(new Error(`Failed to parse CSV file: ${error.message}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
}

/**
 * Main parser - routes to appropriate parser based on file type
 */
export async function parseProductFile(file: File): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcelFile(file);
  } else if (fileName.endsWith('.csv')) {
    return parseCSVFile(file);
  } else {
    throw new Error('Unsupported file type. Please use Excel (.xlsx, .xls) or CSV (.csv)');
  }
}

