import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const authCookie = request.cookies.get("gc_auth");
    const validToken = process.env.DASHBOARD_PASSWORD;

    // If no password is configured (dev mode), allow access
    if (!validToken) return NextResponse.next();

    if (!authCookie || authCookie.value !== validToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
