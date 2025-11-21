/**
 * PWA Local Authentication Service
 * Stores credentials locally in each PWA instance
 */

const STORAGE_KEY = "pwa_credentials";
const PWA_ID_KEY = "pwa_id";

export interface PWACredentials {
  userId: string;
  email: string;
  role: string;
  pwaId: string;
  token?: string;
  expiresAt?: number;
}

export class PWAAuthService {
  /**
   * Get the current PWA ID from the URL or storage
   */
  static getPWAId(): string | null {
    if (typeof window === "undefined") return null;

    // Try to get from subdomain first (most reliable)
    const hostname = window.location.hostname;
    const subdomain = hostname.split(".")[0];
    
    const subdomainMap: Record<string, string> = {
      admin: "admin",
      driver: "driver",
      assistant: "assistant",
      scanner: "scanner",
      pos: "pos",
    };
    
    if (subdomainMap[subdomain]) {
      return subdomainMap[subdomain];
    }

    // Fallback to URL path
    const path = window.location.pathname;
    if (path.startsWith("/dashboard")) return "admin";
    if (path.startsWith("/scanner")) return "scanner";
    if (path.startsWith("/mobile/driver")) return "driver";
    if (path.startsWith("/mobile/assistant")) return "assistant";
    if (path.startsWith("/pos")) return "pos";
    if (path === "/" || path.startsWith("/trips") || path.startsWith("/checkout")) return "public";

    // Fallback to storage
    return localStorage.getItem(PWA_ID_KEY);
  }

  /**
   * Set the PWA ID for this instance
   */
  static setPWAId(pwaId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(PWA_ID_KEY, pwaId);
  }

  /**
   * Save credentials for this PWA instance
   */
  static saveCredentials(credentials: PWACredentials): void {
    if (typeof window === "undefined") return;

    const pwaId = credentials.pwaId || this.getPWAId();
    if (!pwaId) {
      console.error("Cannot save credentials: PWA ID not set");
      return;
    }

    const key = `${STORAGE_KEY}_${pwaId}`;
    localStorage.setItem(key, JSON.stringify(credentials));
  }

  /**
   * Get saved credentials for this PWA instance
   */
  static getCredentials(pwaId?: string): PWACredentials | null {
    if (typeof window === "undefined") return null;

    const id = pwaId || this.getPWAId();
    if (!id) return null;

    const key = `${STORAGE_KEY}_${id}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
      const credentials = JSON.parse(stored) as PWACredentials;
      
      // Check if credentials are expired
      if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
        this.clearCredentials(id);
        return null;
      }

      return credentials;
    } catch {
      return null;
    }
  }

  /**
   * Clear credentials for this PWA instance
   */
  static clearCredentials(pwaId?: string): void {
    if (typeof window === "undefined") return;

    const id = pwaId || this.getPWAId();
    if (!id) return;

    const key = `${STORAGE_KEY}_${id}`;
    localStorage.removeItem(key);
  }

  /**
   * Check if user has access to this PWA based on role
   */
  static hasAccess(pwaId: string, userRole: string): boolean {
    // Super admin can access all PWAs
    if (userRole === "admin" || userRole === "super_admin") {
      return true;
    }

    // Role-based access
    const roleAccess: Record<string, string[]> = {
      admin: ["admin"],
      pos_agent: ["admin", "scanner"],
      driver: ["driver"],
      assistant: ["assistant"],
      public: ["public"],
    };

    const allowedPWAs = roleAccess[userRole] || [];
    return allowedPWAs.includes(pwaId);
  }

  /**
   * Check if current user can access this PWA
   */
  static canAccessCurrentPWA(): boolean {
    const pwaId = this.getPWAId();
    if (!pwaId) return false;

    const credentials = this.getCredentials(pwaId);
    if (!credentials) return false;

    return this.hasAccess(pwaId, credentials.role);
  }

  /**
   * Get all saved credentials (for admin view)
   */
  static getAllCredentials(): Record<string, PWACredentials> {
    if (typeof window === "undefined") return {};

    const credentials: Record<string, PWACredentials> = {};
    const pwaIds = ["admin", "public", "scanner", "driver", "assistant"];

    for (const pwaId of pwaIds) {
      const creds = this.getCredentials(pwaId);
      if (creds) {
        credentials[pwaId] = creds;
      }
    }

    return credentials;
  }
}

