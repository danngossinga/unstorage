/// <reference types="@cloudflare/workers-types" />
import { defineDriver, joinKeys } from "./utils";
import { getKVBinding } from "./utils/cloudflare";
export interface KVOptions {
  binding?: string | KVNamespace;

  /** Adds prefix to all stored keys */
  base?: string;

  /**
   * Default TTL for all items in seconds.
   *
   * As of January 2022, expiration targets that are less than 60 seconds into the future are not supported.
   * @see https://developers.cloudflare.com/kv/api/write-key-value-pairs/#expiring-keys
   */
  ttl?: number;
}

// https://developers.cloudflare.com/workers/runtime-apis/kv

const DRIVER_NAME = "cloudflare-kv-binding";

export default defineDriver((opts: KVOptions) => {
  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  async function getKeys(base: string = "") {
    base = r(base);
    const binding = getKVBinding(opts.binding);
    const kvList = await binding.list(base ? { prefix: base } : undefined);
    return kvList.keys.map((key) => key.name);
  }

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key) {
      key = r(key);
      const binding = getKVBinding(opts.binding);
      return (await binding.get(key)) !== null;
    },
    getItem(key) {
      key = r(key);
      const binding = getKVBinding(opts.binding);
      return binding.get(key);
    },
    setItem(key, value, tOptions) {
      key = r(key);
      const binding = getKVBinding(opts.binding);
      const ttl = tOptions?.ttl ?? opts.ttl;
      return binding.put(key, value, ttl ? { expirationTtl: ttl } : undefined);
    },
    removeItem(key) {
      key = r(key);
      const binding = getKVBinding(opts.binding);
      return binding.delete(key);
    },
    getKeys() {
      return getKeys().then((keys) =>
        keys.map((key) => (opts.base ? key.slice(opts.base.length) : key))
      );
    },
    async clear(base) {
      const binding = getKVBinding(opts.binding);
      const keys = await getKeys(base);
      await Promise.all(keys.map((key) => binding.delete(key)));
    },
  };
});
