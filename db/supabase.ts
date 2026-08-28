const PROJECT_URL = "https://lhhosezgalgzexgrcsjd.supabase.co";

function credentials() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Supabase no está configurado en el servidor.");
  return { url: process.env.SUPABASE_URL || PROJECT_URL, secret };
}

const camel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const snake = (key: string) => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

function mapKeys(value: unknown, direction: "camel" | "snake"): unknown {
  if (Array.isArray(value)) return value.map(item => mapKeys(item, direction));
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [direction === "camel" ? camel(key) : snake(key), mapKeys(item, direction)]));
  }
  return value instanceof Date ? value.toISOString() : value;
}

async function request(table: string, init: RequestInit = {}, query = "") {
  const { url, secret } = credentials();
  const response = await fetch(`${url}/rest/v1/${table}${query ? `?${query}` : ""}`, {
    ...init,
    headers: {
      apikey: secret,
      "user-agent": "jd-soluciones-backend/1.0",
      ...(secret.startsWith("sb_secret_") ? {} : { authorization: `Bearer ${secret}` }),
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  if (response.status === 204) return null;
  return mapKeys(await response.json(), "camel");
}

export async function selectRows<T>(table: string, query: string): Promise<T[]> {
  return await request(table, {}, query) as T[];
}

export async function insertRow<T>(table: string, values: Record<string, unknown>): Promise<T> {
  const rows = await request(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(mapKeys(values, "snake")) }) as T[];
  return rows[0];
}

export async function updateRows<T>(table: string, query: string, values: Record<string, unknown>): Promise<T[]> {
  return await request(table, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(mapKeys(values, "snake")) }, query) as T[];
}

export async function deleteRows(table: string, query: string) {
  await request(table, { method: "DELETE" }, query);
}

export const filterValue = (value: string | number | boolean) => encodeURIComponent(String(value));
