export class Route {
  constructor(
    public id: string,
    public name: string,
    public origin: string,
    public destination: string,
    public distanceKm: number | null,
    public estimatedDurationMinutes: number | null,
    public basePrice: number,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    name: string;
    origin: string;
    destination: string;
    basePrice: number;
    distanceKm?: number;
    estimatedDurationMinutes?: number;
  }): Route {
    const now = new Date();
    return new Route(
      crypto.randomUUID(),
      data.name,
      data.origin,
      data.destination,
      data.distanceKm || null,
      data.estimatedDurationMinutes || null,
      data.basePrice,
      true,
      now,
      now
    );
  }

  getRouteLabel(): string {
    return `${this.origin} → ${this.destination}`;
  }
}

