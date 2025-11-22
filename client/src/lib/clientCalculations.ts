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
 * Calculate total monthly fee from all products assigned to a client
 * Total = sum of monthlyFee for each product (NOT multiplied by quantity)
 * The monthly fee is per product, not per unit
 */
export function calculateTotalMonthlyFeeFromProducts(
  client: {
    products?: ClientProduct[];
  }
): number {
  if (!client.products || client.products.length === 0) {
    return 0;
  }
  
  return client.products.reduce((total, product) => {
    const monthlyFee = typeof product.monthlyFee === 'number' ? product.monthlyFee : parseFloat(String(product.monthlyFee)) || 0;
    // Sum the monthlyFee directly, do NOT multiply by quantity
    return total + monthlyFee;
  }, 0);
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
 * first_month_revenue = starter_pack_price + hardware_price + monthly_fee
 * Where hardware_price = what the client pays for hardware (from client.hardware_price field)
 */
export function calculateFirstMonthRevenue(
  client: {
    starter_pack_price?: number;
    hardware_price?: number;
    monthly_fee?: number;
  },
  allProducts: Product[] = []
): number {
  // Use the hardware_price field directly (what client pays for hardware)
  const starterPack = client.starter_pack_price || 0;
  const hardwareSell = client.hardware_price || 0;
  const monthlyFee = client.monthly_fee || 0;

  return starterPack + hardwareSell + monthlyFee;
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
    hardware_price?: number;
    monthly_fee?: number;
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

  // Calculate first month revenue: Starter pack + Hardware + Monthly fee
  const starterPack = client.starter_pack_price || 0;
  const hardwareSell = client.hardware_price || 0;
  const monthlyFee = client.monthly_fee || 0;
  const firstMonthRevenue = starterPack + hardwareSell + monthlyFee;

  // Calculate months passed
  const today = new Date();
  const monthsPassed = diffInMonths(contractStartDate, today);

  // Cumulative revenue = first month revenue + (months_passed - 1) * monthly_fee
  // (subtract 1 because first month is already included)
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

  // Calculate total monthly fee from products (auto-calculated)
  const calculatedMonthlyFee = calculateTotalMonthlyFeeFromProducts(client);
  
  // Use manual monthly_fee if set, otherwise use calculated value from products
  const monthlyFee = client.monthly_fee && client.monthly_fee > 0 
    ? client.monthly_fee 
    : calculatedMonthlyFee;

  // Calculate first month revenue (using the effective monthly fee)
  const firstMonthRevenue = calculateFirstMonthRevenue(
    { ...client, monthly_fee: monthlyFee },
    allProducts
  );

  // Calculate cumulative revenue (using the effective monthly fee)
  const cumulativeRevenue = calculateCumulativeRevenue(
    { ...client, monthly_fee: monthlyFee },
    allProducts
  );

  // Calculate installation costs (NEGATIVE - what we spent)
  const installationCosts = calculateInstallationCosts(client, allProducts);
  
  // Investment Total = ONLY installation costs
  const totalInvestment = installationCosts;

  // Calculate Profit One Shot (first month benefits)
  // Starter pack + Hardware (what client pays) + Monthly fee
  // Use the hardware_price field directly (what client pays for hardware)
  const starterPack = client.starter_pack_price || 0;
  const hardwareSell = client.hardware_price || 0; // What client pays for hardware
  
  // Profit One Shot = first month benefits (ONLY first month)
  const profitOneShot = starterPack + hardwareSell + monthlyFee;
  
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
      // Show contract start date (covered in first month)
      profitabilityDate = contractStartDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
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
      
      // Calculate profitability date
      // monthsToCover = total months needed (including first month)
      // Example: Start Nov 22, monthsToCover = 3 → Nov 22 + 2 months = Jan 22
      const profitableDate = new Date(contractStartDate);
      // Add (monthsToCover - 1) months because month 1 is already the start date
      if (monthsToCover > 1) {
        profitableDate.setMonth(profitableDate.getMonth() + (monthsToCover - 1));
      }
      profitabilityDate = profitableDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
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
      // If no contract start date but covered, use today's date
      const today = new Date();
      profitabilityDate = today.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } else {
      // Calculate months to cover
      const remainingBalance = -netCashFlow;
      monthsToCover = Math.ceil(remainingBalance / monthlyFee);
      // If no contract start date, use today's date + monthsToCover
      const today = new Date();
      const profitableDate = new Date(today);
      profitableDate.setMonth(profitableDate.getMonth() + monthsToCover);
      profitabilityDate = profitableDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
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
