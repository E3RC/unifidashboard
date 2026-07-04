import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    const cookie = request.headers.get("cookie");
    if (cookie) {
      const match = cookie.match(/ubuquity_session=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!validateSession(token)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
