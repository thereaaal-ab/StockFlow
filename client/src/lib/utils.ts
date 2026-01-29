import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format large currency values professionally
 * Examples: 12000000 -> "12M €", 1500 -> "1.5K €", 500 -> "500 €"
 */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B €`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M €`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K €`;
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format currency with full precision for details view
 */
export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format number for chart Y-axis labels
 */
export function formatChartValue(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Calculate the date when client will be profitable
 * Returns the date after adding months_left to contract_start_date (or current date if no contract_start_date)
 */
export function calculateProfitableDate(
  contractStartDate?: string,
  monthsLeft?: number
): string | null {
  if (!monthsLeft || monthsLeft <= 0) {
    return null;
  }

  const startDate = contractStartDate 
    ? new Date(contractStartDate) 
    : new Date();

  if (isNaN(startDate.getTime())) {
    return null;
  }

  // Add months_left months to the start date
  const profitableDate = new Date(startDate);
  profitableDate.setMonth(profitableDate.getMonth() + monthsLeft);

  // Format as French date: "21 janvier 2026"
  return profitableDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
