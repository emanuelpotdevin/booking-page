import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_SETTINGS } from "./defaults";
import type { GoogleTokens, Settings } from "./types";

/**
 * Tiny key-value store.
 * - On Vercel: Upstash Redis (env vars are added automatically when you connect it under Storage).
 * - Locally without Redis: a JSON file in .data/ so you can try everything on your laptop.
 */
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const FILE = path.join(process.cwd(), ".data", "store.json");

export const storageConfigured = Boolean(KV_URL && KV_TOKEN);

async function redis(command: (string | number)[]) {
  const res = await fetch(KV_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Storage error (${res.status})`);
  return (await res.json()).result;
}

async function readFile(): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

async function get<T>(key: string): Promise<T | null> {
  if (storageConfigured) {
    const raw = await redis(["GET", key]);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  const data = await readFile();
  return (data[key] as T) ?? null;
}

async function set(key: string, value: unknown) {
  if (storageConfigured) {
    await redis(["SET", key, JSON.stringify(value)]);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("No storage connected. In Vercel, open Storage and connect Upstash Redis, then redeploy.");
  }
  const data = await readFile();
  data[key] = value;
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2));
}

async function del(key: string) {
  if (storageConfigured) {
    await redis(["DEL", key]);
    return;
  }
  const data = await readFile();
  delete data[key];
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2));
}

export async function getSettings(): Promise<Settings> {
  const saved = await get<Settings>("settings");
  if (!saved) return structuredClone(DEFAULT_SETTINGS);
  // merge so new fields added in later versions get defaults
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    brand: { ...DEFAULT_SETTINGS.brand, ...saved.brand },
    rules: { ...DEFAULT_SETTINGS.rules, ...saved.rules },
    weeklyHours: { ...DEFAULT_SETTINGS.weeklyHours, ...saved.weeklyHours },
  };
}

export const saveSettings = (s: Settings) => set("settings", s);
export const getTokens = () => get<GoogleTokens>("google");
export const saveTokens = (t: GoogleTokens) => set("google", t);
export const clearTokens = () => del("google");
