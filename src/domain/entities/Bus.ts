import { BusClass, SeatMap, BusFeatures } from "../types";

export class Bus {
  constructor(
    public id: string,
    public ownerId: string,
    public presetId: string | null,
    public plateNumber: string,
    public model: string | null,
    public year: number | null,
    public capacity: number,
    public seatMap: SeatMap,
    public busClass: BusClass,
    public features: BusFeatures,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    ownerId: string;
    plateNumber: string;
    capacity: number;
    seatMap: SeatMap;
    busClass?: BusClass;
    features?: BusFeatures;
    model?: string;
    year?: number;
    presetId?: string;
  }): Bus {
    const now = new Date();
    return new Bus(
      crypto.randomUUID(),
      data.ownerId,
      data.presetId || null,
      data.plateNumber,
      data.model || null,
      data.year || null,
      data.capacity,
      data.seatMap,
      data.busClass || "economico",
      data.features || {},
      true,
      now,
      now
    );
  }

  getAvailableSeatsCount(): number {
    return this.seatMap.seats.length;
  }

  validateSeatMap(): boolean {
    if (!this.seatMap.seats || this.seatMap.seats.length === 0) {
      return false;
    }
    if (this.seatMap.seats.length !== this.capacity) {
      return false;
    }
    return true;
  }
}

