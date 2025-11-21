// User Roles
export type UserRole = "passenger" | "admin" | "pos_agent" | "bus_owner" | "driver" | "assistant" | "financial" | "display";

// Trip Status
export type TripStatus = "scheduled" | "boarding" | "in_transit" | "completed" | "cancelled" | "delayed";

// Ticket Status
export type TicketStatus = "pending" | "paid" | "boarded" | "completed" | "cancelled" | "refunded";

// Payment Status
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

// Payment Method
export type PaymentMethod = "yappy" | "paguelofacil" | "tilopay" | "payu" | "banesco" | "cash" | "card";

// Bus Class
export type BusClass = "economico" | "ejecutivo" | "premium";

// Seat Configuration
export interface SeatPosition {
  x: number;
  y: number;
}

export interface SeatConfig {
  id: string;
  number: string;
  position: SeatPosition;
  type: "individual" | "double" | "row";
  row?: number;
  column?: number;
  metadata?: Record<string, unknown>;
}

export interface LayoutShape {
  id: string;
  type: "rectangle" | "path" | "icon";
  x: number;
  y: number;
  width?: number;
  height?: number;
  path?: { x: number; y: number }[];
  iconType?: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface SeatMap {
  seats: SeatConfig[];
  layout: {
    width: number;
    height: number;
    rows: number;
    columns: number;
  };
  visualLayout?: LayoutShape[]; // Visual layout shapes drawn by user
}

// Bus Features
export interface BusFeatures {
  wifi?: boolean;
  ac?: boolean;
  bathroom?: boolean;
  entertainment?: boolean;
  usb_ports?: boolean;
  reclining_seats?: boolean;
}

// Route Stop
export interface RouteStopData {
  id: string;
  routeId: string;
  name: string;
  kmPosition: number;
  orderIndex: number;
  priceAdjustment: number;
}

// Payment Provider Response
export interface PaymentProviderResponse {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

// GPS Coordinates
export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

// Analytics
export interface RevenueReport {
  totalRevenue: number;
  totalTickets: number;
  totalITBMS: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface OccupancyMetrics {
  totalSeats: number;
  occupiedSeats: number;
  occupancyPercentage: number;
  recordedAt: Date;
}

// Common Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Search Filters
export interface TripSearchFilters {
  origin?: string;
  destination?: string;
  date?: Date;
  minPrice?: number;
  maxPrice?: number;
  busClass?: BusClass;
  departureTime?: {
    from?: string;
    to?: string;
  };
}

