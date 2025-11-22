/**
 * Client calculation utilities
 * Handles investment coverage, revenue calculations, and profit status
 * 
 * Investment Logic:
 * - Investment = Starter Pack (month 1 only) + Hardware purchase price (month 1 or when added)
 * - Monthly fee is NOT investment, it's profit after first month
 * 
 * Revenue Logic:
 * - First month: starter_pack_price + sum(hardware_client_price) + monthly_fee
 * - Subsequent months: monthly_fee only
 * 
 * Profit Status:
 * - Green if cumulative_revenue >= investment
 * - Red if cumulative_revenue < investment
 */

import { Client, ClientProduct } from "@/hooks/useClients";
import { Product } from "@/hooks/useProducts";

export interface ClientCalculationResult {
  months_passed: number;
  total_investment: number; // ONLY installation costs (negative)
  first_month_revenue: number;
  cumulative_revenue: number;
  is_profitable: boolean;
  status: "profitable" | "covering_investment";
  // Cash flow metrics
  installation_costs: number; // Negative: what we spent (sum of purchase prices)
  profit_one_shot: number; // First month benefits: Starter pack + Hardware sell + Monthly fee
  profit_mensuel: number; // Monthly fee (benefit)
  total_revenue: number; // Positive: what we collected
  net_cash_flow: number; // Net: positive - negative (carries forward negative balance)
  months_to_cover: number; // Number of months until investment is covered (0 if covered in first month)
  profitability_date: string | null; // "Dans le mois" if covered in first month, or calculated date
}

/**
 * Calculate the difference in months between two dates
 */
export function diffInMonths(date1: Date, date2: Date): number {
  const years = date2.getFullYear() - date1.getFullYear();
  const months = date2.getMonth() - date1.getMonth();
  return years * 12 + months;
}

/**
 * Check if a date is in the same month as the contract start date
 */
function isInFirstMonth(date: Date, contractStartDate: Date): boolean {
  return (
    date.getFullYear() === contractStartDate.getFullYear() &&
    date.getMonth() === contractStartDate.getMonth()
  );
}

/**
 * Calculate installation costs (NEGATIVE - what we spent)
 * Installation costs = sum of purchase prices of all hardware installed
 * Example: Kiosk 500€ + Printer 500€ = -1000€
 */
export function calculateInstallationCosts(
  client: {
    products?: ClientProduct[];
  },
  allProducts: Product[] = []
): number {
  let costs = 0;
  
  if (client.products && client.products.length > 0) {
    client.products.forEach((clientProduct) => {
      // Use stored purchasePrice if available (what we paid)
      let purchasePrice = clientProduct.purchasePrice;
      if (purchasePrice === undefined) {
        // Fallback: get from product
        const product = allProducts.find((p) => p.id === clientProduct.productId);
        if (product) {
          purchasePrice = product.purchase_price || 0;
        } else {
          purchasePrice = 0;
        }
      }
      costs += purchasePrice * (clientProduct.quantity || 0);
    });
  }
  
  return costs; // This is a positive number representing costs (will be displayed as negative)
}

/**
 * Calculate total investment for a client
 * Investment = ONLY installation costs (what we spent on hardware purchase prices)
 * NOT starter pack or hardware sell price - those are benefits
 */
export function calculateTotalInvestment(
  client: {
    products?: ClientProduct[];
  },
  allProducts: Product[] = []
): number {
  // Investment is ONLY the installation costs (what we spent)
  return calculateInstallationCosts(client, allProducts);
}

/**
 * Calculate first month revenue
 * first_month_revenue = starter_pack_price + sum(hardware_client_price) + monthly_fee
 * Where hardware_client_price = the price the client pays (sell or rent)
 */
export function calculateFirstMonthRevenue(
  client: {
    contract_start_date?: string;
    starter_pack_price?: number;
    monthly_fee?: number;
    products?: ClientProduct[];
  },
  allProducts: Product[] = []
): number {
  let revenue = 0;
  const contractStartDate = client.contract_start_date 
    ? new Date(client.contract_start_date) 
    : null;

  // Starter pack price
  revenue += client.starter_pack_price || 0;

  // Sum of hardware client prices (what client pays - buy or rent) for month 1 only
  if (client.products && contractStartDate) {
    client.products.forEach((clientProduct) => {
      // Determine if this product was added in month 1
      let isMonth1 = true;
      if (clientProduct.addedAt) {
        const addedDate = new Date(clientProduct.addedAt);
        isMonth1 = isInFirstMonth(addedDate, contractStartDate);
      }

      if (isMonth1) {
        // Use stored clientPrice if available (what client actually paid)
        let clientPrice = clientProduct.clientPrice;
        if (clientPrice === undefined) {
          // Fallback: calculate from product prices
          const product = allProducts.find((p) => p.id === clientProduct.productId);
          if (product) {
            // Client pays: rent price if renting, or selling price if buying
            // Based on user's example: "Hardware sell 400" means selling price
            clientPrice = clientProduct.type === "rent" 
              ? (product.rent_price || 0)
              : (product.selling_price || 0);
          } else {
            clientPrice = 0;
          }
        }
        revenue += clientPrice * (clientProduct.quantity || 0);
      }
    });
  }

  // Monthly fee
  revenue += client.monthly_fee || 0;

  return revenue;
}

/**
 * Calculate cumulative revenue
 * Cumulative revenue = first month revenue + sum of all next months revenue
 * Next months revenue = monthly_fee only
 */
export function calculateCumulativeRevenue(
  client: {
    contract_start_date?: string;
    starter_pack_price?: number;
    monthly_fee?: number;
    products?: ClientProduct[];
  },
  allProducts: Product[] = []
): number {
  const contractStartDate = client.contract_start_date 
    ? new Date(client.contract_start_date) 
    : null;

  if (!contractStartDate) {
    // If no contract start date, return 0
    return 0;
  }

  // Calculate first month revenue
  let firstMonthRevenue = client.starter_pack_price || 0;
  firstMonthRevenue += client.monthly_fee || 0;

  // Add hardware client prices for month 1 only
  if (client.products) {
    client.products.forEach((clientProduct) => {
      const product = allProducts.find((p) => p.id === clientProduct.productId);
      if (!product) return;

      // Determine if this product was added in month 1
      let isMonth1 = true;
      if (clientProduct.addedAt) {
        const addedDate = new Date(clientProduct.addedAt);
        isMonth1 = isInFirstMonth(addedDate, contractStartDate);
      }

      if (isMonth1) {
        // Use stored clientPrice if available (what client actually paid)
        // Otherwise calculate from product prices
        let clientPrice = clientProduct.clientPrice;
        if (clientPrice === undefined) {
          // Fallback: calculate from product prices
          // Client pays: rent price if renting, or selling price if buying
          // Based on user's example: "Hardware sell 400" means selling price
          clientPrice = clientProduct.type === "rent" 
            ? (product.rent_price || 0)
            : (product.selling_price || 0);
        }
        firstMonthRevenue += clientPrice * (clientProduct.quantity || 0);
      }
    });
  }

  // Calculate months passed
  const today = new Date();
  const monthsPassed = diffInMonths(contractStartDate, today);

  // Cumulative revenue = first month revenue + (months_passed - 1) * monthly_fee
  // (subtract 1 because first month is already included)
  const monthlyFee = client.monthly_fee || 0;
  const subsequentMonthsRevenue = Math.max(0, monthsPassed - 1) * monthlyFee;

  return firstMonthRevenue + subsequentMonthsRevenue;
}

/**
 * Calculate all client metrics including cash flow
 */
export function calculateClientMetrics(
  client: Client,
  allProducts: Product[] = []
): ClientCalculationResult {
  const contractStartDate = client.contract_start_date 
    ? new Date(client.contract_start_date) 
    : null;

  // Calculate months passed
  let monthsPassed = 0;
  if (contractStartDate) {
    const today = new Date();
    monthsPassed = diffInMonths(contractStartDate, today);
  }

  // Calculate total investment
  const totalInvestment = calculateTotalInvestment(client, allProducts);

  // Calculate first month revenue
  const firstMonthRevenue = calculateFirstMonthRevenue(client, allProducts);

  // Calculate cumulative revenue
  const cumulativeRevenue = calculateCumulativeRevenue(client, allProducts);

  // Calculate installation costs (NEGATIVE - what we spent)
  const installationCosts = calculateInstallationCosts(client, allProducts);
  
  // Investment Total = ONLY installation costs
  const totalInvestment = installationCosts;

  // Calculate Profit One Shot (first month benefits)
  // Starter pack + Hardware sell price + Monthly fee
  const starterPack = client.starter_pack_price || 0;
  const monthlyFee = client.monthly_fee || 0;
  
  // Calculate hardware sell price (what client pays for hardware)
  let hardwareSellPrice = 0;
  if (client.products && contractStartDate) {
    client.products.forEach((clientProduct) => {
      // Determine if this product was added in month 1
      let isMonth1 = true;
      if (clientProduct.addedAt) {
        const addedDate = new Date(clientProduct.addedAt);
        isMonth1 = isInFirstMonth(addedDate, contractStartDate);
      }

      if (isMonth1) {
        // Use stored clientPrice if available (what client actually paid)
        let clientPrice = clientProduct.clientPrice;
        if (clientPrice === undefined) {
          const product = allProducts.find((p) => p.id === clientProduct.productId);
          if (product) {
            // Client pays: rent price if renting, or selling price if buying
            clientPrice = clientProduct.type === "rent" 
              ? (product.rent_price || 0)
              : (product.selling_price || 0);
          } else {
            clientPrice = 0;
          }
        }
        hardwareSellPrice += clientPrice * (clientProduct.quantity || 0);
      }
    });
  }
  
  // Profit One Shot = first month benefits
  const profitOneShot = starterPack + hardwareSellPrice + monthlyFee;
  
  // Profit Mensuel = monthly fee only
  const profitMensuel = monthlyFee;

  // Calculate total revenue and net cash flow with month-to-month carry forward
  let totalRevenue = 0;
  let netCashFlow = 0;
  let monthsToCover = 0;
  let profitabilityDate: string | null = null;
  
  if (contractStartDate) {
    // Month 1: Negative (installation costs) + Positive (profit one shot)
    const month1Net = profitOneShot - installationCosts;
    
    if (month1Net >= 0) {
      // Covered in first month
      totalRevenue = profitOneShot;
      netCashFlow = month1Net;
      monthsToCover = 0;
      profitabilityDate = "Dans le mois";
    } else {
      // Not covered in first month, need to calculate when it will be covered
      let remainingBalance = -month1Net; // Positive number (debt to cover)
      monthsToCover = 1; // First month is month 1 (already counted)
      
      // Each subsequent month: monthly fee reduces the remaining balance
      // Continue until balance is covered
      // Example: -1000 + 950 = -50, need 200 to cover, so month 2 covers it (monthsToCover = 2)
      while (remainingBalance > 0 && monthsToCover < 1000) { // Safety limit
        monthsToCover++; // Need another month
        remainingBalance -= monthlyFee; // This month's fee reduces the balance
        if (remainingBalance <= 0) {
          // Balance covered in this month
          break;
        }
      }
      
      // Calculate total revenue: first month + months needed to cover
      totalRevenue = profitOneShot + (monthsToCover * monthlyFee);
      
      // Calculate net cash flow (carry forward negative balance month-to-month)
      // Month 1: -installationCosts + profitOneShot
      // Month 2+: monthlyFee each month until covered
      netCashFlow = profitOneShot - installationCosts + (monthsToCover * monthlyFee);
      
      // Calculate profitability date (monthsToCover months from start)
      if (monthsToCover > 0) {
        const profitableDate = new Date(contractStartDate);
        profitableDate.setMonth(profitableDate.getMonth() + monthsToCover);
        profitabilityDate = profitableDate.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }
    
    // Add revenue from months already passed beyond coverage
    if (monthsPassed > monthsToCover) {
      const additionalMonths = monthsPassed - monthsToCover;
      totalRevenue += additionalMonths * monthlyFee;
      netCashFlow += additionalMonths * monthlyFee;
    }
  } else {
    // No contract start date, assume first month only
    totalRevenue = profitOneShot;
    netCashFlow = profitOneShot - installationCosts;
    if (netCashFlow >= 0) {
      monthsToCover = 0;
      profitabilityDate = "Dans le mois";
    } else {
      // Calculate months to cover
      const remainingBalance = -netCashFlow;
      monthsToCover = Math.ceil(remainingBalance / monthlyFee);
      profitabilityDate = null;
    }
  }

  // Profit status: green if net cash flow >= 0 (investment covered)
  const isProfitable = netCashFlow >= 0;

  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Client Calculation Debug:', {
      client_name: client.client_name,
      contract_start_date: client.contract_start_date,
      months_passed: monthsPassed,
      total_investment: totalInvestment,
      installation_costs: installationCosts,
      profit_one_shot: profitOneShot,
      profit_mensuel: profitMensuel,
      total_revenue: totalRevenue,
      net_cash_flow: netCashFlow,
      months_to_cover: monthsToCover,
      profitability_date: profitabilityDate,
      is_profitable: isProfitable,
      starter_pack_price: client.starter_pack_price,
      monthly_fee: client.monthly_fee,
      products_count: client.products?.length || 0,
    });
  }

  return {
    months_passed: monthsPassed,
    total_investment: totalInvestment,
    first_month_revenue: firstMonthRevenue,
    cumulative_revenue: cumulativeRevenue,
    is_profitable: isProfitable,
    status: isProfitable ? "profitable" : "covering_investment",
    installation_costs: installationCosts,
    profit_one_shot: profitOneShot,
    profit_mensuel: profitMensuel,
    total_revenue: totalRevenue,
    net_cash_flow: netCashFlow,
    months_to_cover: monthsToCover,
    profitability_date: profitabilityDate,
  };
}
