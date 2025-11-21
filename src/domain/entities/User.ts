import { UserRole } from "../types";

export class User {
  constructor(
    public id: string,
    public email: string | null,
    public phone: string | null,
    public role: UserRole,
    public fullName: string | null,
    public avatarUrl: string | null,
    public emailVerifiedAt: Date | null,
    public phoneVerifiedAt: Date | null,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    id?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    fullName?: string;
  }): User {
    const now = new Date();
    return new User(
      data.id || crypto.randomUUID(),
      data.email || null,
      data.phone || null,
      data.role || "passenger",
      data.fullName || null,
      null,
      null,
      null,
      now,
      now
    );
  }

  isAdmin(): boolean {
    return this.role === "admin";
  }

  isOwner(): boolean {
    return this.role === "bus_owner";
  }

  isPOSAgent(): boolean {
    return this.role === "pos_agent";
  }

  isDriver(): boolean {
    return this.role === "driver";
  }

  isAssistant(): boolean {
    return this.role === "assistant";
  }

  isPassenger(): boolean {
    return this.role === "passenger";
  }

  canAccessAdmin(): boolean {
    return ["admin", "bus_owner", "pos_agent"].includes(this.role);
  }
}

