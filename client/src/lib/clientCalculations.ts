/**
 * Client calculation utilities
 * Handles investment coverage, months calculations, and profit status
 */

export interface ClientCalculationResult {
  months_passed: number;
  months_needed_to_cover: number;
  total_investment: number;
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
 * Calculate total investment for a client
 * Total investment = Starter Pack + Hardware + Monthly cumulative
 */
export function calculateTotalInvestment(client: {
  starter_pack_price?: number;
  hardware_price?: number;
  total_sold_amount?: number;
}): number {
  const starterPack = client.starter_pack_price || 0;
  const hardware = client.hardware_price || 0;
  const monthlyCumulative = client.total_sold_amount || 0;
  
  return starterPack + hardware + monthlyCumulative;
}

/**
 * Calculate months needed to cover investment
 * months_needed_to_cover = total_investment / monthly_revenue
 */
export function calculateMonthsNeededToCover(
  totalInvestment: number,
  monthlyRevenue: number
): number {
  if (monthlyRevenue <= 0) {
    return Infinity; // Never profitable if no monthly revenue
  }
  return Math.ceil(totalInvestment / monthlyRevenue);
}

/**
 * Calculate all client metrics
 */
export function calculateClientMetrics(client: {
  contract_start_date?: string;
  starter_pack_price?: number;
  hardware_price?: number;
  total_sold_amount?: number;
  monthly_fee?: number;
}): ClientCalculationResult {
  const totalInvestment = calculateTotalInvestment(client);
  const monthlyRevenue = client.monthly_fee || 0;
  const monthsNeededToCover = calculateMonthsNeededToCover(totalInvestment, monthlyRevenue);

  // Calculate months passed
  let monthsPassed = 0;
  if (client.contract_start_date) {
    const startDate = new Date(client.contract_start_date);
    const today = new Date();
    monthsPassed = diffInMonths(startDate, today);
  }

  const isProfitable = monthsPassed >= monthsNeededToCover;

  return {
    months_passed: monthsPassed,
    months_needed_to_cover: monthsNeededToCover,
    total_investment: totalInvestment,
    is_profitable: isProfitable,
    status: isProfitable ? "profitable" : "covering_investment",
  };
}

