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
  total_investment: number;
  first_month_revenue: number;
  cumulative_revenue: number;
  is_profitable: boolean;
  status: "profitable" | "covering_investment";
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
 * Calculate total investment for a client
 * Investment = Starter Pack (month 1 only) + Montant d'installation (sum of hardware purchase prices)
 * Monthly fee is NOT investment
 */
export function calculateTotalInvestment(
  client: {
    contract_start_date?: string;
    starter_pack_price?: number;
    total_sold_amount?: number; // This is now "Montant d'installation" (sum of purchase prices)
    hardware_price?: number; // Keep for backward compatibility, but use total_sold_amount if available
    products?: ClientProduct[];
  },
  allProducts: Product[] = []
): number {
  let investment = 0;
  const contractStartDate = client.contract_start_date 
    ? new Date(client.contract_start_date) 
    : null;

  // Starter Pack is included ONLY in month 1
  if (contractStartDate) {
    investment += client.starter_pack_price || 0;
  }

  // Montant d'installation = sum of hardware purchase prices (what we invested)
  // Use total_sold_amount (which now stores installation amount) or hardware_price (backward compatibility)
  // This is included ONLY in month 1
  if (contractStartDate) {
    const installationAmount = client.total_sold_amount !== undefined 
      ? client.total_sold_amount 
      : (client.hardware_price || 0);
    investment += installationAmount;
  }

  return investment;
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
            clientPrice = clientProduct.type === "rent" 
              ? (product.rent_price || 0)
              : (product.purchase_price || 0); // Client pays purchase price when buying
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
          clientPrice = clientProduct.type === "rent" 
            ? (product.rent_price || 0)
            : (product.purchase_price || 0); // Client pays purchase price when buying
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
 * Calculate all client metrics
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

  // Profit status: green if cumulative_revenue >= investment
  const isProfitable = cumulativeRevenue >= totalInvestment;

  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Client Calculation Debug:', {
      client_name: client.client_name,
      contract_start_date: client.contract_start_date,
      months_passed: monthsPassed,
      total_investment: totalInvestment,
      first_month_revenue: firstMonthRevenue,
      cumulative_revenue: cumulativeRevenue,
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
  };
}
