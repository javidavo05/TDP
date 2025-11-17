export const TERMINALS = ["David", "Santiago", "Panamá"] as const;

export const ITBMS_RATE = 0.07;

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
] as const;

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

