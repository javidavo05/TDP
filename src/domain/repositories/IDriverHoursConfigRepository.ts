import { DriverHoursConfig } from "../entities/DriverHoursConfig";

export interface IDriverHoursConfigRepository {
  getConfig(): Promise<DriverHoursConfig | null>;
  updateConfig(config: DriverHoursConfig): Promise<DriverHoursConfig>;
  createConfig(config: DriverHoursConfig): Promise<DriverHoursConfig>;
}

