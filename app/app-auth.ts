import { cookies } from "next/headers";
import { deleteRows, filterValue, insertRow, selectRows } from "../db/supabase";

const COOKIE = "jd_session";
const SESSION_SECONDS = 60 * 60 * 12;

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)?.map(x => parseInt(x, 16)) ?? []);

export async function sha256(value: string) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 50000 }, key, 256);
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

export function randomToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createSession(userId: number) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  await insertRow("app_sessions", { tokenHash, userId, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
  return { token, cookie: `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}` };
}

export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const [session] = await selectRows<{userId:number}>("app_sessions", `select=user_id&token_hash=eq.${filterValue(tokenHash)}&expires_at=gt.${filterValue(new Date().toISOString())}&limit=1`);
  if (!session) return null;
  const [user] = await selectRows<Record<string, unknown>>("app_users", `select=*&id=eq.${session.userId}&status=eq.active&limit=1`);
  return user ?? null;
}

export async function clearSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await deleteRows("app_sessions", `token_hash=eq.${filterValue(await sha256(token))}`);
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
