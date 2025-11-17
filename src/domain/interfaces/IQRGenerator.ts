export interface IQRGenerator {
  generate(data: string): Promise<string>; // Returns base64 encoded QR code image
  validate(qrCode: string): boolean;
  decode(qrCode: string): string | null;
}

