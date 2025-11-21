import { CASH_COUNT_TOLERANCE } from "@/lib/constants";

export interface CashCountValidationResult {
  isValid: boolean;
  difference: number;
  message: string;
  tolerance: number;
}

/**
 * Validates that the counted total matches the manual total within tolerance
 * @param counted - Total calculated from cash breakdown
 * @param manual - Total entered manually
 * @param tolerance - Allowed difference (default: $0.01)
 * @returns Validation result with details
 */
export function validateCashCount(
  counted: number,
  manual: number,
  tolerance: number = CASH_COUNT_TOLERANCE
): CashCountValidationResult {
  const difference = Math.abs(counted - manual);
  const isValid = difference <= tolerance;

  let message: string;
  if (isValid) {
    if (difference === 0) {
      message = "Los totales coinciden exactamente";
    } else {
      message = `Los totales coinciden (diferencia: $${difference.toFixed(2)})`;
    }
  } else {
    if (counted > manual) {
      message = `El total contado es mayor por $${difference.toFixed(2)}`;
    } else {
      message = `El total contado es menor por $${difference.toFixed(2)}`;
    }
  }

  return {
    isValid,
    difference,
    message,
    tolerance,
  };
}

/**
 * Validates cash count for closing session
 * @param counted - Total calculated from cash breakdown
 * @param manual - Total entered manually
 * @param expected - Expected total based on transactions
 * @param tolerance - Allowed difference (default: $0.01)
 * @returns Validation result with details about all comparisons
 */
export function validateCashCountForClosing(
  counted: number,
  manual: number,
  expected: number,
  tolerance: number = CASH_COUNT_TOLERANCE
): {
  countedVsManual: CashCountValidationResult;
  countedVsExpected: CashCountValidationResult;
  manualVsExpected: CashCountValidationResult;
  overallValid: boolean;
} {
  const countedVsManual = validateCashCount(counted, manual, tolerance);
  const countedVsExpected = validateCashCount(counted, expected, tolerance);
  const manualVsExpected = validateCashCount(manual, expected, tolerance);

  const overallValid =
    countedVsManual.isValid && countedVsExpected.isValid && manualVsExpected.isValid;

  return {
    countedVsManual,
    countedVsExpected,
    manualVsExpected,
    overallValid,
  };
}

