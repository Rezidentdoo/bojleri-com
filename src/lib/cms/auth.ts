import "server-only";

import { cookies } from "next/headers";
import crypto from "crypto";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken as verifySessionTokenAsync,
} from "@/lib/cms/session";

export { SESSION_COOKIE, createSessionToken };

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  return verifySessionTokenAsync(token);
}

export function verifyPassword(password: string): boolean {
  const expected = (process.env.CMS_PASSWORD || "bojleri2026").trim();
  const input = password.trim();
  if (input.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionTokenAsync(jar.get(SESSION_COOKIE)?.value);
}