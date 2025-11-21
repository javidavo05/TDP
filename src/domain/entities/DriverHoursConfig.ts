export class DriverHoursConfig {
  constructor(
    public id: string,
    public maxHoursPerDay: number,
    public maxHoursPerWeek: number,
    public maxHoursPerMonth: number,
    public restHoursRequired: number,
    public updatedAt: Date
  ) {}

  static create(data: {
    maxHoursPerDay?: number;
    maxHoursPerWeek?: number;
    maxHoursPerMonth?: number;
    restHoursRequired?: number;
  }): DriverHoursConfig {
    const now = new Date();
    return new DriverHoursConfig(
      crypto.randomUUID(),
      data.maxHoursPerDay || 8.0,
      data.maxHoursPerWeek || 40.0,
      data.maxHoursPerMonth || 160.0,
      data.restHoursRequired || 11.0,
      now
    );
  }

  static default(): DriverHoursConfig {
    return DriverHoursConfig.create({});
  }
}

