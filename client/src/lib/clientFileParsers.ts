import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ParsedClientProduct {
  clientName: string;
  productName: string;
  quantity: number;
  type: 'buy' | 'rent';
  rowIndex: number;
}

export interface ParsedClientData {
  clientName: string;
  products: Array<{
    productName: string;
    quantity: number;
    type: 'buy' | 'rent';
  }>;
}

export interface ClientParseResult {
  clients: ParsedClientData[];
  errors: Array<{ row: number; message: string }>;
}

/**
 * Parse Excel file for client import
 */
export async function parseClientExcelFile(file: File): Promise<ClientParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: ['Client Name', 'Product Name', 'Quantity', 'Type'],
          defval: null,
          range: 1 // Skip first row (headers)
        }) as any[];
        
        const parsedRows: ParsedClientProduct[] = [];
        const errors: Array<{ row: number; message: string }> = [];
        
        jsonData.forEach((row: any, index: number) => {
          const rowNumber = index + 2; // +2 because header is row 1, and index is 0-based
          
          // Normalize column names
          const clientName = row['Client Name'] ? String(row['Client Name']).trim() : null;
          const productName = row['Product Name'] ? String(row['Product Name']).trim() : null;
          const quantity = row['Quantity'];
          const type = row['Type'] ? String(row['Type']).trim().toLowerCase() : null;
          
          // Validation
          if (!clientName || clientName === '') {
            errors.push({ row: rowNumber, message: 'Client Name is required' });
            return;
          }
          
          if (!productName || productName === '') {
            errors.push({ row: rowNumber, message: 'Product Name is required' });
            return;
          }
          
          const qtyNum = typeof quantity === 'number' ? quantity : parseFloat(String(quantity));
          if (isNaN(qtyNum) || qtyNum <= 0) {
            errors.push({ row: rowNumber, message: 'Quantity must be a positive number' });
            return;
          }
          
          if (type !== 'buy' && type !== 'rent') {
            errors.push({ row: rowNumber, message: 'Type must be "buy" or "rent"' });
            return;
          }
          
          parsedRows.push({
            clientName,
            productName,
            quantity: Math.floor(qtyNum), // Ensure integer
            type: type as 'buy' | 'rent',
            rowIndex: rowNumber,
          });
        });
        
        // Group by client name
        const clientsMap = new Map<string, ParsedClientData>();
        
        parsedRows.forEach((row) => {
          if (!clientsMap.has(row.clientName)) {
            clientsMap.set(row.clientName, {
              clientName: row.clientName,
              products: [],
            });
          }
          
          const client = clientsMap.get(row.clientName)!;
          client.products.push({
            productName: row.productName,
            quantity: row.quantity,
            type: row.type,
          });
        });
        
        resolve({
          clients: Array.from(clientsMap.values()),
          errors,
        });
      } catch (error: any) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse CSV file for client import
 */
export async function parseClientCSVFile(file: File): Promise<ClientParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize header names
        const normalized = header.trim();
        const lower = normalized.toLowerCase();
        if (lower.includes('client') || lower.includes('name')) return 'Client Name';
        if (lower.includes('product')) return 'Product Name';
        if (lower === 'quantity' || lower === 'qty') return 'Quantity';
        if (lower === 'type') return 'Type';
        return normalized;
      },
      complete: (results) => {
        try {
          const parsedRows: ParsedClientProduct[] = [];
          const errors: Array<{ row: number; message: string }> = [];
          
          results.data.forEach((row: any, index: number) => {
            const rowNumber = index + 2; // +2 because header is row 1, and index is 0-based
            
            const clientName = row['Client Name'] ? String(row['Client Name']).trim() : null;
            const productName = row['Product Name'] ? String(row['Product Name']).trim() : null;
            const quantity = row['Quantity'];
            const type = row['Type'] ? String(row['Type']).trim().toLowerCase() : null;
            
            // Validation
            if (!clientName || clientName === '') {
              errors.push({ row: rowNumber, message: 'Client Name is required' });
              return;
            }
            
            if (!productName || productName === '') {
              errors.push({ row: rowNumber, message: 'Product Name is required' });
              return;
            }
            
            const qtyNum = typeof quantity === 'number' ? quantity : parseFloat(String(quantity));
            if (isNaN(qtyNum) || qtyNum <= 0) {
              errors.push({ row: rowNumber, message: 'Quantity must be a positive number' });
              return;
            }
            
            if (type !== 'buy' && type !== 'rent') {
              errors.push({ row: rowNumber, message: 'Type must be "buy" or "rent"' });
              return;
            }
            
            parsedRows.push({
              clientName,
              productName,
              quantity: Math.floor(qtyNum),
              type: type as 'buy' | 'rent',
              rowIndex: rowNumber,
            });
          });
          
          // Group by client name
          const clientsMap = new Map<string, ParsedClientData>();
          
          parsedRows.forEach((row) => {
            if (!clientsMap.has(row.clientName)) {
              clientsMap.set(row.clientName, {
                clientName: row.clientName,
                products: [],
              });
            }
            
            const client = clientsMap.get(row.clientName)!;
            client.products.push({
              productName: row.productName,
              quantity: row.quantity,
              type: row.type,
            });
          });
          
          resolve({
            clients: Array.from(clientsMap.values()),
            errors,
          });
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
export async function parseClientFile(file: File): Promise<ClientParseResult> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseClientExcelFile(file);
  } else if (fileName.endsWith('.csv')) {
    return parseClientCSVFile(file);
  } else {
    throw new Error('Unsupported file type. Please use Excel (.xlsx, .xls) or CSV (.csv)');
  }
}

