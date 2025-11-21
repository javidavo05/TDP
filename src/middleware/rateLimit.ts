/**
 * Rate Limiting Middleware
 * In-memory rate limiting for high-traffic scenarios
 * TODO: Migrate to Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request should be rate limited
   * @param identifier - IP address or user ID
   * @param limit - Maximum requests
   * @param windowMs - Time window in milliseconds
   * @returns true if rate limited, false otherwise
   */
  check(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetAt) {
      // Create new entry or reset expired entry
      this.store.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });
      return false;
    }

    if (entry.count >= limit) {
      return true; // Rate limited
    }

    entry.count++;
    return false;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string, limit: number, windowMs: number): number {
    const entry = this.store.get(identifier);
    if (!entry) return limit;

    const now = Date.now();
    if (now > entry.resetAt) {
      return limit;
    }

    return Math.max(0, limit - entry.count);
  }

  /**
   * Get reset time for identifier
   */
  getResetTime(identifier: string): number | null {
    const entry = this.store.get(identifier);
    if (!entry) return null;
    return entry.resetAt;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  limit: number; // Maximum requests
  windowMs: number; // Time window in milliseconds
  identifier?: (request: Request) => string; // Custom identifier function
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  // Public APIs - stricter limits
  public: {
    limit: 60, // 60 requests
    windowMs: 60000, // per minute
  },
  // Ticket creation - very strict
  ticketCreation: {
    limit: 10, // 10 requests
    windowMs: 60000, // per minute
  },
  // Admin APIs - more lenient
  admin: {
    limit: 200, // 200 requests
    windowMs: 60000, // per minute
  },
  // POS APIs - moderate
  pos: {
    limit: 100, // 100 requests
    windowMs: 60000, // per minute
  },
} as const;

/**
 * Get identifier from request (IP address or user ID)
 */
function getIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  return `ip:${ip}`;
}

/**
 * Rate limit middleware function
 */
export function rateLimit(
  request: Request,
  config: RateLimitConfig,
  userId?: string
): {
  limited: boolean;
  remaining: number;
  resetTime: number | null;
} {
  const identifier = config.identifier
    ? config.identifier(request)
    : getIdentifier(request, userId);

  const limited = rateLimiter.check(
    identifier,
    config.limit,
    config.windowMs
  );

  const remaining = rateLimiter.getRemaining(
    identifier,
    config.limit,
    config.windowMs
  );

  const resetTime = rateLimiter.getResetTime(identifier);

  return {
    limited,
    remaining,
    resetTime,
  };
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  remaining: number,
  resetTime: number | null,
  limit: number
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
  };

  if (resetTime) {
    headers["X-RateLimit-Reset"] = Math.ceil(resetTime / 1000).toString();
  }

  return headers;
}

