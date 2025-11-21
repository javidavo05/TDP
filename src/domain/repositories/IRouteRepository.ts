import { Route } from "../entities/Route";
import { PaginationParams, PaginatedResponse } from "../types";

export interface RouteStop {
  id: string;
  routeId: string;
  name: string;
  kmPosition: number;
  orderIndex: number;
  price: number; // Complete ticket price for this stop (not an adjustment)
  createdAt: Date;
}

export interface IRouteRepository {
  findById(id: string): Promise<Route | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResponse<Route>>;
  findByOriginAndDestination(origin: string, destination: string): Promise<Route | null>;
  create(route: Route): Promise<Route>;
  update(route: Route): Promise<Route>;
  delete(id: string): Promise<void>;
  
  // Route Stops
  getStops(routeId: string): Promise<RouteStop[]>;
  addStop(routeId: string, stop: Omit<RouteStop, "id" | "routeId" | "createdAt">): Promise<RouteStop>;
  updateStop(stopId: string, stop: Partial<RouteStop>): Promise<RouteStop>;
  deleteStop(stopId: string): Promise<void>;
  reorderStops(routeId: string, stopIds: string[]): Promise<void>;
}
