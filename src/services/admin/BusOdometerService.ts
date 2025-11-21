import { BusRepository } from "@/infrastructure/db/supabase/BusRepository";
import { TripRepository } from "@/infrastructure/db/supabase/TripRepository";
import { RouteRepository } from "@/infrastructure/db/supabase/RouteRepository";
import { Bus } from "@/domain/entities";

export class BusOdometerService {
  constructor(
    private busRepository: BusRepository,
    private tripRepository: TripRepository,
    private routeRepository: RouteRepository
  ) {}

  /**
   * Calculate total distance traveled by a bus based on completed trips
   */
  async calculateTotalDistance(busId: string): Promise<number> {
    // Get all completed trips for this bus
    const tripsResult = await this.tripRepository.findByBus(busId);
    const completedTrips = tripsResult.data.filter(t => t.status === 'completed');

    let totalDistance = 0;

    for (const trip of completedTrips) {
      const route = await this.routeRepository.findById(trip.routeId);
      if (route && route.distanceKm) {
        totalDistance += route.distanceKm;
      }
    }

    return totalDistance;
  }

  /**
   * Update bus odometer and total distance when a trip is completed
   */
  async updateBusOdometerOnTripCompletion(busId: string, tripId: string): Promise<Bus> {
    const bus = await this.busRepository.findById(busId);
    if (!bus) {
      throw new Error(`Bus with id ${busId} not found`);
    }

    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error(`Trip with id ${tripId} not found`);
    }

    const route = await this.routeRepository.findById(trip.routeId);
    if (!route || !route.distanceKm) {
      throw new Error(`Route distance not found for trip ${tripId}`);
    }

    // Update total distance traveled
    const newTotalDistance = bus.totalDistanceTraveled + route.distanceKm;
    
    // Update odometer (assuming odometer is the current reading, not total)
    // If odometer should be total, use newTotalDistance instead
    const newOdometer = bus.odometer + route.distanceKm;

    // Update bus
    bus.totalDistanceTraveled = newTotalDistance;
    bus.odometer = newOdometer;
    bus.lastTripDate = new Date();

    return await this.busRepository.update(bus);
  }

  /**
   * Recalculate total distance for a bus (useful for data migration or corrections)
   */
  async recalculateTotalDistance(busId: string): Promise<Bus> {
    const bus = await this.busRepository.findById(busId);
    if (!bus) {
      throw new Error(`Bus with id ${busId} not found`);
    }

    const totalDistance = await this.calculateTotalDistance(busId);
    
    bus.totalDistanceTraveled = totalDistance;
    
    return await this.busRepository.update(bus);
  }
}

