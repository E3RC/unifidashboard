import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createSession();
  const response = NextResponse.json({ token });
  response.cookies.set("ubuquity_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 28800,
    path: "/",
  });
  return response;
}
