const logger = require('../config/logger');

class MemoryCache {
  constructor(defaultTTL = 6 * 60 * 60 * 1000) {
    this.store = new Map();
    this.defaultTTL = defaultTTL;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  clear() {
    const size = this.store.size;
    this.store.clear();
    logger.info(`Cache cleared (${size} entries removed)`);
  }

  stats() {
    let active = 0;
    const now = Date.now();
    for (const entry of this.store.values()) {
      if (now <= entry.expiresAt) active++;
    }
    return { total: this.store.size, active };
  }
}

// Singleton — 6 hour TTL
module.exports = new MemoryCache();
