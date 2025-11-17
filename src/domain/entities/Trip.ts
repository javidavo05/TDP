import { TripStatus } from "../types";

export class Trip {
  constructor(
    public id: string,
    public busId: string,
    public routeId: string,
    public departureTime: Date,
    public arrivalEstimate: Date | null,
    public status: TripStatus,
    public currentStopId: string | null,
    public availableSeats: number,
    public totalSeats: number,
    public price: number,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    busId: string;
    routeId: string;
    departureTime: Date;
    totalSeats: number;
    price: number;
    arrivalEstimate?: Date;
  }): Trip {
    const now = new Date();
    return new Trip(
      crypto.randomUUID(),
      data.busId,
      data.routeId,
      data.departureTime,
      data.arrivalEstimate || null,
      "scheduled",
      null,
      data.totalSeats,
      data.totalSeats,
      data.price,
      now,
      now
    );
  }

  isAvailable(): boolean {
    return this.status === "scheduled" && this.availableSeats > 0;
  }

  canBoard(): boolean {
    return this.status === "boarding" || this.status === "scheduled";
  }

  reserveSeat(): boolean {
    if (this.availableSeats > 0) {
      this.availableSeats -= 1;
      return true;
    }
    return false;
  }

  releaseSeat(): void {
    if (this.availableSeats < this.totalSeats) {
      this.availableSeats += 1;
    }
  }

  getOccupancyPercentage(): number {
    const occupied = this.totalSeats - this.availableSeats;
    return (occupied / this.totalSeats) * 100;
  }
}

