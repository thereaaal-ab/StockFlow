import * as XLSX from 'xlsx';

/**
 * Generate Excel template file for product import
 * Template includes: Product Code, Product Name, Quantity, Buying Price, Selling Price, Rent Price, Category
 */
export function generateProductTemplate(): void {
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create data with headers and example rows
  const data = [
    // Headers
    ['Product Code', 'Product Name', 'Quantity', 'Buying Price', 'Selling Price', 'Rent Price', 'Category'],
    // Example rows
    ['KIO-001', 'Kiosk 21.5', 5, 500.00, 1699.99, 0, 'Kiosks'],
    ['PRT-001', 'Printer', 3, 300.00, 0, 50.00, 'Printers'],
    ['SCN-001', 'Scanner', 2, 200.00, 450.00, 0, 'Scanners'],
  ];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Product Code
    { wch: 25 }, // Product Name
    { wch: 12 }, // Quantity
    { wch: 15 }, // Buying Price
    { wch: 15 }, // Selling Price
    { wch: 15 }, // Rent Price
    { wch: 15 }, // Category
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  
  // Create instructions sheet
  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ['PRODUCT IMPORT TEMPLATE - INSTRUCTIONS'],
    [''],
    ['This template is used to import products into the system.'],
    [''],
    ['COLUMNS:'],
    ['- Product Code: Unique product code/identifier (required)'],
    ['- Product Name: Product name (required)'],
    ['- Quantity: Number of items (required, must be > 0)'],
    ['- Buying Price: Purchase price in euros (required, must be >= 0)'],
    ['- Selling Price: Selling price in euros (required, must be >= 0)'],
    ['- Rent Price: Rental price per month in euros (required, must be >= 0)'],
    ['- Category: Product category name (optional)'],
    [''],
    ['IMPORTANT NOTES:'],
    ['- Do not modify the header row (row 1)'],
    ['- Do not delete the example rows - they show the format'],
    ['- All prices must be numbers (use . for decimals, e.g., 500.00)'],
    ['- Quantity must be a positive integer'],
    ['- Category will be matched to existing categories or set to "Other"'],
    [''],
    ['After filling the template, save it and upload it through the system.'],
  ]);
  
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  
  // Generate file and download
  const fileName = `Product_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

