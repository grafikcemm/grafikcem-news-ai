import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const validPassword = process.env.DASHBOARD_PASSWORD;

  if (!validPassword) {
    // No password configured — dev mode, allow everything
    return NextResponse.json({ success: true });
  }

  if (!password || password !== validPassword) {
    return NextResponse.json({ error: "Hatalı şifre" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "gc_auth",
    value: validPassword,
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return response;
}
