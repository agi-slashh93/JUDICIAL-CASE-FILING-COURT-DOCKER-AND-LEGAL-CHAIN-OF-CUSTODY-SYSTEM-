import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { pool } from "./mysql";
import type { SessionUser } from "./types";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const cookieName = "jcc_session";

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret);
  (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60, path: "/" });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret)).payload as unknown as SessionUser; } catch { return null; }
}

export async function requireRole(role: "ADMIN" | "STAFF") {
  const session = await getSession();
  if (!session || (role === "ADMIN" && session.role !== "ADMIN")) throw new Error("FORBIDDEN");
  return session;
}

export async function findUser(email: string) {
  const [rows] = await pool.query("SELECT user_id, full_name, password_hash, role_name FROM v_user_roles WHERE email = ? AND status = 'ACTIVE'", [email]);
  return (rows as Array<{user_id:number; full_name:string; password_hash:string; role_name:"ADMIN"|"STAFF"}>)[0] ?? null;
}
