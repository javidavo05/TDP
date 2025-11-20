import { IGPSRepository, ITripRepository, GPSLog } from "@/domain/repositories";
import { Trip } from "@/domain/entities";

export class GPSService {
  constructor(
    private gpsRepository: IGPSRepository,
    private tripRepository: ITripRepository
  ) {}

  async logLocation(data: GPSLog): Promise<void> {
    await this.gpsRepository.create({
      tripId: data.tripId,
      busId: data.busId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed ?? null,
      heading: data.heading ?? null,
      timestamp: data.timestamp,
    });

    // Update trip current location
    await this.tripRepository.updateLocation(data.tripId, {
      latitude: data.latitude,
      longitude: data.longitude,
      lastUpdate: data.timestamp,
    });
  }

  async getTripLocation(tripId: string): Promise<GPSLog | null> {
    return this.gpsRepository.getLatestByTrip(tripId);
  }

  async getTripHistory(tripId: string, limit: number = 100): Promise<GPSLog[]> {
    return this.gpsRepository.getHistoryByTrip(tripId, limit);
  }

  async calculateETA(tripId: string, destinationLat: number, destinationLng: number): Promise<number | null> {
    const currentLocation = await this.getTripLocation(tripId);
    if (!currentLocation) return null;

    const trip = await this.tripRepository.findById(tripId);
    if (!trip) return null;

    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      destinationLat,
      destinationLng
    );

    // Estimate speed (km/h) - use current speed or average
    const speed = currentLocation.speed != null ? currentLocation.speed * 3.6 : 60; // Default 60 km/h

    // Calculate ETA in minutes
    const etaMinutes = (distance / speed) * 60;
    return Math.round(etaMinutes);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

