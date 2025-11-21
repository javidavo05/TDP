export const TERMINALS = ["David", "Santiago", "Panamá"] as const;

export const ITBMS_RATE = 0.07;

export function calculateITBMS(
  amount: number,
  rate: number = ITBMS_RATE
): number {
  return Math.round(amount * rate * 100) / 100;
}

export const CURRENCY = "USD";

export const SEAT_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const DISPLAY_SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const PAYMENT_METHODS = [
  "yappy",
  "paguelofacil",
  "tilopay",
  "payu",
  "banesco",
  "cash",
  "card",
] as const;

export const USER_ROLES = [
  "passenger",
  "admin",
  "pos_agent",
  "bus_owner",
  "driver",
  "assistant",
  "financial",
  "display",
] as const;

export const USER_ROLE_LABELS: Record<string, string> = {
  passenger: "Pasajero",
  admin: "Administrador",
  pos_agent: "Agente POS",
  bus_owner: "Dueño de Bus",
  driver: "Chofer",
  assistant: "Asistente de Bus",
  financial: "Financiero",
  display: "Pantalla",
};

export const USER_ROLE_DESCRIPTIONS: Record<string, string> = {
  passenger: "Usuario regular que compra boletos",
  admin: "Acceso completo al sistema",
  pos_agent: "Opera terminales POS para venta de boletos",
  bus_owner: "Gestiona su flota de buses",
  driver: "Conduce buses y gestiona viajes",
  assistant: "Asiste en buses durante los viajes",
  financial: "Acceso a reportes y datos financieros",
  display: "Acceso de solo lectura a pantallas de salidas públicas",
};

// Cash Denominations (USD)
export const CASH_DENOMINATIONS = {
  bills: [100, 50, 20, 10, 5, 1] as const,
  coins: [1.0, 0.5, 0.25, 0.1, 0.05, 0.01] as const,
} as const;

export const CASH_COUNT_TOLERANCE = 0.01; // $0.01 default tolerance

// Helper function to format denomination
export function formatDenomination(value: number): string {
  if (value >= 1) {
    return `$${value.toFixed(0)}`;
  }
  return `¢${(value * 100).toFixed(0)}`;
}

// Helper function to calculate total from breakdown
export function calculateCashTotal(breakdown: Array<{ denomination: number; count: number }>): number {
  return breakdown.reduce((total, item) => total + item.denomination * item.count, 0);
}

export const TRIP_STATUSES = [
  "scheduled",
  "boarding",
  "in_transit",
  "completed",
  "cancelled",
  "delayed",
] as const;

export const TICKET_STATUSES = [
  "pending",
  "paid",
  "boarded",
  "completed",
  "cancelled",
  "refunded",
] as const;

