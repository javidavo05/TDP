import { createHash } from "crypto";

export interface YappySession {
  token: string;
  state: "OPEN" | "CLOSED";
  openAt: string;
}

export interface YappySessionResponse {
  body: YappySession;
  status: {
    code: string;
    description: string;
  };
}

/**
 * Servicio para gestionar sesiones de Yappy Comercial
 * Según el manual de integración v1.0.0
 */
export class YappySessionService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private currentSession: YappySession | null = null;
  private sessionExpiry: Date | null = null;

  constructor() {
    this.apiKey = process.env.YAPPY_API_KEY || "";
    this.secretKey = process.env.YAPPY_SECRET_KEY || "";
    this.baseUrl = process.env.YAPPY_BASE_URL || "https://api.yappy.com.pa";

    if (!this.apiKey || !this.secretKey) {
      console.warn("Yappy credentials not configured. Yappy payments will not work.");
    }
  }

  /**
   * Genera el código hash para autenticación según el manual:
   * SHA-256(API_KEY + YYYY-MM-DD + SECRET_KEY)
   */
  private generateAuthCode(): string {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const concatenated = `${this.apiKey}${today}${this.secretKey}`;
    const hash = createHash("sha256").update(concatenated).digest("hex");
    return hash;
  }

  /**
   * Abre una sesión en Yappy
   * POST /v1/session/login
   */
  async openSession(): Promise<YappySession> {
    if (!this.apiKey || !this.secretKey) {
      throw new Error("Yappy credentials not configured");
    }

    // Check if we have a valid session
    if (this.currentSession && this.sessionExpiry && new Date() < this.sessionExpiry) {
      return this.currentSession;
    }

    const code = this.generateAuthCode();

    try {
      const response = await fetch(`${this.baseUrl}/v1/session/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "API Key": this.apiKey,
          "Secret Key": this.secretKey,
        },
        body: JSON.stringify({
          body: {
            code,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Yappy session login failed: ${response.status} ${response.statusText}. ${errorData.status?.description || ""}`
        );
      }

      const data: YappySessionResponse = await response.json();

      if (data.status.code !== "YP-0000") {
        throw new Error(`Yappy session error: ${data.status.code} - ${data.status.description}`);
      }

      this.currentSession = data.body;
      // Sessions typically expire after 24 hours, but we'll refresh after 23 hours to be safe
      this.sessionExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

      return this.currentSession;
    } catch (error) {
      console.error("Error opening Yappy session:", error);
      throw error;
    }
  }

  /**
   * Cierra la sesión actual en Yappy
   * GET /v1/session/logout
   */
  async closeSession(): Promise<void> {
    if (!this.currentSession) {
      return; // No session to close
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/session/logout`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.currentSession.token}`,
          "API Key": this.apiKey,
          "Secret Key": this.secretKey,
        },
      });

      if (!response.ok) {
        console.warn("Failed to close Yappy session:", response.statusText);
      }

      this.currentSession = null;
      this.sessionExpiry = null;
    } catch (error) {
      console.error("Error closing Yappy session:", error);
      // Don't throw - session closure failure shouldn't break the flow
    }
  }

  /**
   * Obtiene el token de sesión actual, abriendo una nueva sesión si es necesario
   */
  async getSessionToken(): Promise<string> {
    const session = await this.openSession();
    return session.token;
  }

  /**
   * Verifica si hay una sesión activa
   */
  hasActiveSession(): boolean {
    return (
      this.currentSession !== null &&
      this.sessionExpiry !== null &&
      new Date() < this.sessionExpiry
    );
  }

  /**
   * Limpia la sesión actual (útil para testing o reset)
   */
  clearSession(): void {
    this.currentSession = null;
    this.sessionExpiry = null;
  }
}

// Singleton instance
let sessionServiceInstance: YappySessionService | null = null;

export function getYappySessionService(): YappySessionService {
  if (!sessionServiceInstance) {
    sessionServiceInstance = new YappySessionService();
  }
  return sessionServiceInstance;
}

