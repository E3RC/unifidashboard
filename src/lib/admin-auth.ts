import { createHash, randomBytes } from "crypto";

const ADMIN_PASSWORD = process.env.DASHBOARD_ADMIN_PASSWORD || "";

const sessions = new Map<string, number>();
const SESSION_DURATION = 1000 * 60 * 60 * 8;

export function createSession(): string {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_DURATION);
  return token;
}

export function validateSession(token: string | null | undefined): boolean {
  if (!token) return false;
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function verifyPassword(password: string): boolean {
  if (!ADMIN_PASSWORD) return false;
  return password === ADMIN_PASSWORD;
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function getSessionFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookie = request.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(/ubuquity_session=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}
