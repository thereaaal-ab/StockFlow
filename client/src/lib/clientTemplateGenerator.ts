import * as XLSX from 'xlsx';

/**
 * Generate Excel template file for client import
 * Template includes: Client Name, Product Name, Quantity, Type (buy/rent)
 */
export function generateClientTemplate(): void {
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create data with headers and example rows
  const data = [
    // Headers
    ['Client Name', 'Product Name', 'Quantity', 'Type'],
    // Example rows - same client with multiple products
    ['TechStore Paris', 'Kiosk 21.5 pouces', 3, 'buy'],
    ['TechStore Paris', 'Imprimante Portable', 2, 'rent'],
    ['TechStore Paris', 'Tablette 11 pouces', 5, 'buy'],
    // Different client
    ['ElectroShop Lyon', 'Scanner de codes-barres', 2, 'buy'],
    ['ElectroShop Lyon', 'Terminal de paiement', 1, 'rent'],
  ];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Client Name
    { wch: 30 }, // Product Name
    { wch: 12 }, // Quantity
    { wch: 12 }, // Type
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
  
  // Create instructions sheet
  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ['CLIENT IMPORT TEMPLATE - INSTRUCTIONS'],
    [''],
    ['This template is used to import clients with their product requests.'],
    [''],
    ['COLUMNS:'],
    ['- Client Name: Name of the client (required)'],
    ['- Product Name: Name of the product (must match existing product)'],
    ['- Quantity: Number of units (required, must be > 0)'],
    ['- Type: Either "buy" or "rent" (required)'],
    [''],
    ['IMPORTANT NOTES:'],
    ['- Do not modify the header row (row 1)'],
    ['- Multiple rows with the same Client Name = one client with multiple products'],
    ['- Type must be exactly "buy" or "rent" (lowercase)'],
    ['- Quantity must be a positive integer'],
    ['- Product Name must match an existing product in the system'],
    [''],
    ['AUTOMATIC CALCULATIONS:'],
    ['- Installation Amount and Hardware Price: calculated from buying_price × quantity for "buy" products'],
    ['- Monthly Fees: calculated from rent_price for "rent" products'],
    ['- Starter Pack: can be added manually after import'],
    [''],
    ['After filling the template, save it and upload it through the system.'],
  ]);
  
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  
  // Generate file and download
  const fileName = `Client_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

