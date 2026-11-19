import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "walk_session";
const SESSION_DAYS = 30;

function scryptAsync(secret: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(secret, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(pin, salt);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPin(pin: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const key = await scryptAsync(pin, salt);
  const expected = Buffer.from(hex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: false,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: users.id,
      cashtag: users.cashtag,
      displayName: users.displayName,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Admin requests must send the ADMIN_PASSWORD in the x-admin-password header. */
export function isAdminRequest(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const given = req.headers.get("x-admin-password") ?? "";
  return safeEqual(given, expected);
}

/** Scheduled jobs (cron) can settle rooms by sending Authorization: Bearer CRON_SECRET. */
export function isCronRequest(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}
