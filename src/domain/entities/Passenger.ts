export type DocumentType = "cedula" | "pasaporte";

export class Passenger {
  constructor(
    public id: string,
    public documentId: string,
    public documentType: DocumentType,
    public fullName: string,
    public phone: string | null,
    public email: string | null,
    public dateOfBirth: Date | null,
    public address: string | null,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    documentId: string;
    documentType: DocumentType;
    fullName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: Date;
    address?: string;
  }): Passenger {
    const now = new Date();
    return new Passenger(
      crypto.randomUUID(),
      data.documentId,
      data.documentType,
      data.fullName,
      data.phone || null,
      data.email || null,
      data.dateOfBirth || null,
      data.address || null,
      now,
      now
    );
  }

  update(data: {
    fullName?: string;
    phone?: string;
    email?: string;
    dateOfBirth?: Date;
    address?: string;
  }): void {
    if (data.fullName !== undefined) this.fullName = data.fullName;
    if (data.phone !== undefined) this.phone = data.phone || null;
    if (data.email !== undefined) this.email = data.email || null;
    if (data.dateOfBirth !== undefined) this.dateOfBirth = data.dateOfBirth || null;
    if (data.address !== undefined) this.address = data.address || null;
    this.updatedAt = new Date();
  }

  // Validate Panamanian document format
  static validateDocument(documentId: string, documentType: DocumentType): boolean {
    if (documentType === "cedula") {
      // Panamanian cédula: 8-1234-5678 or 1-1234-5678 format
      const cedulaRegex = /^\d{1}-\d{4}-\d{4}$/;
      return cedulaRegex.test(documentId);
    } else if (documentType === "pasaporte") {
      // Passport: alphanumeric, typically 6-9 characters
      const passportRegex = /^[A-Z0-9]{6,9}$/;
      return passportRegex.test(documentId.toUpperCase());
    }
    return false;
  }
}

