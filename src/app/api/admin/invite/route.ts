import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

async function checkAuth(request: NextRequest): Promise<boolean> {
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
  return validateSession(token);
}

const CLERK_API = "https://api.clerk.com/v1";
const headers = {
  Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
  "Content-Type": "application/json",
};

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const res = await fetch(`${CLERK_API}/invitations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email_address: email }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Clerk API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, invitation: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const res = await fetch(`${CLERK_API}/invitations?status=${status}`, { headers });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Clerk API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ invitations: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
