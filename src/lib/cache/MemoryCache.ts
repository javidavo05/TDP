/**
 * In-memory cache with LRU eviction and TTL support
 * Optimized for high-traffic scenarios (30k-80k tickets/month)
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export class MemoryCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number; // in milliseconds

  constructor(maxSize: number = 1000, defaultTTL: number = 30000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // If cache is full, evict least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache size
   */
  size(): number {
    // Clean expired entries first
    this.cleanExpired();
    return this.cache.size;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Clean expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalAccesses: number;
  } {
    this.cleanExpired();
    let totalAccesses = 0;
    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalAccesses > 0 ? totalAccesses / this.cache.size : 0,
      totalAccesses,
    };
  }
}

// Singleton instance for application-wide caching
let globalCache: MemoryCache | null = null;

export function getGlobalCache(): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache(1000, 30000); // 1000 entries, 30s default TTL
  }
  return globalCache;
}

