// Cache em memória com TTL e limite de entradas — usado onde um Map cresceria
// pra sempre (uma chave por produto/página únicos consultados ao longo do tempo).
function createBoundedCache({ ttlMs, maxEntries }) {
  const store = new Map();

  function get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.ts >= ttlMs) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value) {
    store.delete(key); // reinsere no fim (mais recente) se já existia
    store.set(key, { value, ts: Date.now() });

    for (const [k, entry] of store) {
      if (Date.now() - entry.ts >= ttlMs) store.delete(k);
    }
    while (store.size > maxEntries) {
      store.delete(store.keys().next().value); // remove o mais antigo (LRU por inserção)
    }
  }

  return { get, set };
}

module.exports = { createBoundedCache };
