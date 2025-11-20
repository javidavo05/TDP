export interface IThermalDriver {
  initialize(): Promise<void>;
  print(lines: string[]): Promise<void>;
  printQRCode(data: string): Promise<void>;
  printBarcode(data: string, type: "CODE128" | "CODE39" | "EAN13"): Promise<void>;
  cut(): Promise<void>;
  getStatus(): Promise<{ online: boolean; paperStatus: string; error?: string }>;
}

