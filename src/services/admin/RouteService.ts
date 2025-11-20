import { Route } from "@/domain/entities/Route";
import { IRouteRepository, RouteStop } from "@/domain/repositories/IRouteRepository";
import { PaginationParams, PaginatedResponse } from "@/domain/types";

export class RouteService {
  constructor(private routeRepository: IRouteRepository) {}

  async getRouteById(id: string): Promise<Route | null> {
    return this.routeRepository.findById(id);
  }

  async listRoutes(params?: PaginationParams): Promise<PaginatedResponse<Route>> {
    return this.routeRepository.findAll(params);
  }

  async createRoute(data: {
    name: string;
    origin: string;
    destination: string;
    basePrice: number;
    distanceKm?: number;
    estimatedDurationMinutes?: number;
  }): Promise<Route> {
    const route = Route.create(data);
    return this.routeRepository.create(route);
  }

  async updateRoute(id: string, data: {
    name?: string;
    origin?: string;
    destination?: string;
    basePrice?: number;
    distanceKm?: number;
    estimatedDurationMinutes?: number;
    isActive?: boolean;
  }): Promise<Route> {
    const route = await this.routeRepository.findById(id);
    if (!route) {
      throw new Error("Route not found");
    }

    if (data.name !== undefined) route.name = data.name;
    if (data.origin !== undefined) route.origin = data.origin;
    if (data.destination !== undefined) route.destination = data.destination;
    if (data.basePrice !== undefined) route.basePrice = data.basePrice;
    if (data.distanceKm !== undefined) route.distanceKm = data.distanceKm || null;
    if (data.estimatedDurationMinutes !== undefined) route.estimatedDurationMinutes = data.estimatedDurationMinutes || null;
    if (data.isActive !== undefined) route.isActive = data.isActive;

    return this.routeRepository.update(route);
  }

  async deleteRoute(id: string): Promise<void> {
    await this.routeRepository.delete(id);
  }

  async getRouteStops(routeId: string): Promise<RouteStop[]> {
    return this.routeRepository.getStops(routeId);
  }

  async addRouteStop(routeId: string, data: {
    name: string;
    kmPosition: number;
    orderIndex: number;
    priceAdjustment?: number;
  }): Promise<RouteStop> {
    return this.routeRepository.addStop(routeId, {
      name: data.name,
      kmPosition: data.kmPosition,
      orderIndex: data.orderIndex,
      priceAdjustment: data.priceAdjustment || 0,
    });
  }

  async updateRouteStop(stopId: string, data: {
    name?: string;
    kmPosition?: number;
    orderIndex?: number;
    priceAdjustment?: number;
  }): Promise<RouteStop> {
    return this.routeRepository.updateStop(stopId, data);
  }

  async deleteRouteStop(stopId: string): Promise<void> {
    await this.routeRepository.deleteStop(stopId);
  }

  async reorderRouteStops(routeId: string, stopIds: string[]): Promise<void> {
    await this.routeRepository.reorderStops(routeId, stopIds);
  }
}
